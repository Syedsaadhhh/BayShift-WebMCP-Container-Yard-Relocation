import {
  ActionEvent, ActionType, Actor, CommandResult, Container, Metrics, PlannedMove,
  RelocationPlan, RelocationSimulation, RuleCheck, Stack, TargetAnalysis,
  WeightClass, YardInspection, YardSnapshot, YardState
} from './types';
import { calculateBlockingScore, createInitialSnapshot, createInitialState, normalizeStacks, STACK_IDS } from './scenario';

const weightRank: Record<WeightClass, number> = { LIGHT: 1, MEDIUM: 2, HEAVY: 3 };

function cloneStacks(stacks: Stack[]): Stack[] {
  return stacks.map((stack) => ({ ...stack, containers: stack.containers.map((container) => ({ ...container })) }));
}

export function snapshotYard(state: YardState | YardSnapshot): YardSnapshot {
  return {
    stacks: cloneStacks(state.stacks),
    queue: [...state.queue],
    targetContainerId: state.targetContainerId,
    metrics: { ...state.metrics },
    disruptions: state.disruptions.map((event) => ({ ...event, affectedEntities: [...event.affectedEntities] })),
    constraints: { ...state.constraints, reservedDestinations: { ...state.constraints.reservedDestinations } }
  };
}

function eventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function staleResult<T>(state: YardState, expectedStateVersion: number | undefined): CommandResult<T> | null {
  if (expectedStateVersion === undefined || expectedStateVersion === state.stateVersion) return null;
  return {
    ok: false,
    code: 'STALE_STATE',
    message: `Action was prepared for yard v${expectedStateVersion}, but the shared yard is now v${state.stateVersion}.`,
    stateVersion: state.stateVersion,
    expectedStateVersion,
    currentStateVersion: state.stateVersion,
    recommendation: 'Call inspect_yard again and replan against the current stateVersion.'
  };
}

function commitMutation(
  state: YardState,
  actor: Actor,
  action: ActionType,
  payload: Record<string, unknown>,
  changedEntities: string[],
  nextSnapshot: YardSnapshot,
  result: Record<string, unknown>,
  reversible = true
): YardState {
  const stateVersionAfter = state.stateVersion + 1;
  const before = snapshotYard(state);
  const after = snapshotYard(nextSnapshot);
  const event: ActionEvent = {
    id: eventId(), timestamp: new Date().toLocaleTimeString(), actor, action, type: action,
    stateVersionBefore: state.stateVersion, stateVersionAfter, payload, result,
    changedEntities: [...new Set(changedEntities)], reversible, snapshotBefore: reversible ? before : undefined,
    snapshotAfter: after
  };
  return { ...after, stateVersion: stateVersionAfter, history: [...state.history, event], selectedContainerId: null };
}

export function getStackIndex(stackId: string): number {
  return STACK_IDS.indexOf(stackId as typeof STACK_IDS[number]);
}

export function findContainerLocation(stacks: Stack[], containerId: string): { stack: Stack; index: number; isTop: boolean; depth: number } | null {
  for (const stack of stacks) {
    const index = stack.containers.findIndex((container) => container.id === containerId);
    if (index >= 0) return { stack, index, isTop: index === stack.containers.length - 1, depth: stack.containers.length - 1 - index };
  }
  return null;
}

function rule(rule: RuleCheck['rule'], passed: boolean, code: string, reason: string): RuleCheck {
  return { rule, passed, code, reason };
}

export function validateMove(state: YardState, input: { containerId: string; fromStack?: string; toStack: string }, includeAlternatives = true): RelocationSimulation {
  const location = findContainerLocation(state.stacks, input.containerId);
  const source = location?.stack;
  const destination = state.stacks.find((stack) => stack.id === input.toStack);
  const validation: RuleCheck[] = [];

  if (!location || !source) {
    return { allowed: false, legal: false, code: 'CONTAINER_NOT_FOUND', reason: `${input.containerId} is not present in the yard.`, stateVersion: state.stateVersion, fromStack: input.fromStack ?? 'UNKNOWN', toStack: input.toStack, containerId: input.containerId, validation };
  }
  if (input.fromStack && input.fromStack !== source.id) {
    return { allowed: false, legal: false, code: 'SOURCE_MISMATCH', reason: `${input.containerId} is in ${source.id}, not ${input.fromStack}.`, stateVersion: state.stateVersion, fromStack: input.fromStack, toStack: input.toStack, containerId: input.containerId, validation };
  }
  if (!destination) {
    return { allowed: false, legal: false, code: 'DESTINATION_NOT_FOUND', reason: `Destination ${input.toStack} does not exist.`, stateVersion: state.stateVersion, fromStack: source.id, toStack: input.toStack, containerId: input.containerId, validation };
  }

  validation.push(rule('LIFO', location.isTop, 'NOT_TOP_CONTAINER', location.isTop ? `${input.containerId} is topmost.` : `${input.containerId} cannot move because ${source.containers[source.containers.length - 1].id} is above it.`));
  validation.push(rule('HEIGHT', destination.containers.length < Math.min(destination.capacity, state.constraints.maxStackHeight), 'MAX_HEIGHT', destination.containers.length < Math.min(destination.capacity, state.constraints.maxStackHeight) ? `${destination.id} has an open tier.` : `${destination.id} is at maximum height ${state.constraints.maxStackHeight}.`));
  const lockPass = !source.locked && !destination.locked && !source.outage && !destination.outage && !location.stack.containers[location.index].locked;
  validation.push(rule('LOCK', lockPass, destination.outage || source.outage ? 'LANE_OR_CRANE_OUTAGE' : 'STACK_LOCKED', lockPass ? 'Source, destination, and container are operational.' : `${source.locked || source.outage ? source.id : destination.id} is locked or unavailable.`));
  const destinationTop = destination.containers[destination.containers.length - 1];
  const weightPass = !destinationTop || weightRank[location.stack.containers[location.index].weightClass] <= weightRank[destinationTop.weightClass];
  validation.push(rule('WEIGHT', weightPass, 'WEIGHT_CLASS_VIOLATION', weightPass ? 'Weight order is stable.' : `${input.containerId} (${location.stack.containers[location.index].weightClass}) cannot be stacked on lighter ${destinationTop.id} (${destinationTop.weightClass}).`));
  const reservationPass = !destination.reservedForDestination || destination.reservedForDestination === location.stack.containers[location.index].destination;
  validation.push(rule('DESTINATION', reservationPass && destination.id !== source.id, destination.id === source.id ? 'SAME_STACK' : 'INCOMPATIBLE_DESTINATION', destination.id === source.id ? 'Source and destination must differ.' : reservationPass ? 'Destination reservation is compatible.' : `${destination.id} is reserved for ${destination.reservedForDestination} cargo.`));
  validation.push(rule('URGENCY', true, 'URGENCY_NOTED', `Priority P${location.stack.containers[location.index].priority}; truck ETA ${location.stack.containers[location.index].truckEta}.`));

  const failed = validation.find((check) => !check.passed);
  if (failed) {
    const alternatives = includeAlternatives
      ? state.stacks.filter((stack) => stack.id !== source.id && stack.id !== destination.id).filter((stack) => validateMove(state, { containerId: input.containerId, fromStack: source.id, toStack: stack.id }, false).legal).map((stack) => stack.id)
      : [];
    return { allowed: false, legal: false, code: failed.code, reason: failed.reason, stateVersion: state.stateVersion, fromStack: source.id, toStack: destination.id, containerId: input.containerId, validation, legalAlternatives: alternatives };
  }

  const tempStacks = cloneStacks(state.stacks);
  const tempSource = tempStacks.find((stack) => stack.id === source.id)!;
  const tempDestination = tempStacks.find((stack) => stack.id === destination.id)!;
  tempDestination.containers.push(tempSource.containers.pop()!);
  const normalized = normalizeStacks(tempStacks, state.targetContainerId);
  const projectedBlockingScore = calculateBlockingScore(normalized, state.queue);
  const craneTravelSteps = Math.abs(getStackIndex(source.id) - getStackIndex(destination.id));
  return {
    allowed: true, legal: true, code: 'OK', reason: `${input.containerId} can move from ${source.id} to ${destination.id}.`,
    stateVersion: state.stateVersion, fromStack: source.id, toStack: destination.id, containerId: input.containerId, validation,
    projectedCost: { craneTravelSteps, currentBlockingScore: state.metrics.blockingScore, projectedBlockingScore, deltaBlockingScore: projectedBlockingScore - state.metrics.blockingScore }
  };
}

export const simulateRelocation = (state: YardState, containerId: string, toStackId: string) => validateMove(state, { containerId, toStack: toStackId });

export function getLegalDestinations(stacks: Stack[], fromStackId: string, containerId?: string, state?: YardState): string[] {
  if (containerId && state) return stacks.filter((stack) => validateMove(state, { containerId, fromStack: fromStackId, toStack: stack.id }).legal).map((stack) => stack.id);
  return stacks.filter((stack) => stack.id !== fromStackId && !stack.locked && !stack.outage && stack.containers.length < stack.capacity).map((stack) => stack.id);
}

export function inspectYard(state: YardState): YardInspection {
  const target = state.targetContainerId;
  const location = target ? findContainerLocation(state.stacks, target) : null;
  const blockers = location ? location.stack.containers.slice(location.index + 1).map((container) => container.id) : [];
  const topBlocker = blockers[blockers.length - 1];
  const candidateDestinationStacks = topBlocker ? getLegalDestinations(state.stacks, location!.stack.id, topBlocker, state) : [];
  return {
    stateVersion: state.stateVersion,
    target,
    targetExposed: Boolean(location?.isTop),
    blockers,
    queue: [...state.queue],
    stacks: state.stacks.map((stack) => ({
      id: stack.id, capacity: stack.capacity, locked: stack.locked, outage: stack.outage,
      reservedForDestination: stack.reservedForDestination, total: stack.containers.length,
      top: stack.containers.at(-1) ?? null,
      containers: stack.containers.map(({ id, tier, weightClass, destination, priority, status }) => ({ id, tier, weightClass, destination, priority, status }))
    })),
    activeConstraints: [
      'LIFO: only topmost containers may move',
      `Maximum stack height: ${state.constraints.maxStackHeight}`,
      'Heavier containers may not be placed on lighter containers',
      'Locked/outage stacks cannot be sources or destinations',
      'Reserved stacks accept only matching destination cargo'
    ],
    activeDisruptions: state.disruptions.map((event) => ({ ...event, affectedEntities: [...event.affectedEntities] })),
    candidateDestinationStacks,
    metrics: { ...state.metrics },
    guidance: !target ? 'Select a retrieval target.' : location?.isTop ? `${target} is exposed and ready for retrieval.` : `${target} is buried under ${blockers.length} blocker(s). Re-plan from yard v${state.stateVersion}.`
  };
}

export function getContainer(state: YardState, containerId: string): CommandResult<Record<string, unknown>> {
  const location = findContainerLocation(state.stacks, containerId);
  if (!location) return { ok: false, code: 'CONTAINER_NOT_FOUND', message: `${containerId} is not present in the yard.`, stateVersion: state.stateVersion };
  return { ok: true, code: 'OK', message: `${containerId} found in ${location.stack.id}.`, stateVersion: state.stateVersion, data: { ...location.stack.containers[location.index], depthFromTop: location.depth, isTopmost: location.isTop, stackLocked: location.stack.locked, stackOutage: location.stack.outage } };
}

export function analyzeTarget(state: YardState, containerId: string): CommandResult<TargetAnalysis> {
  const location = findContainerLocation(state.stacks, containerId);
  if (!location) return { ok: false, code: 'TARGET_NOT_FOUND', message: `${containerId} is not present in the yard.`, stateVersion: state.stateVersion };
  const blockersAbove = location.stack.containers.slice(location.index + 1);
  const topBlocker = blockersAbove.at(-1);
  return {
    ok: true, code: 'OK', message: location.isTop ? `${containerId} is exposed.` : `${containerId} has ${blockersAbove.length} blocker(s).`, stateVersion: state.stateVersion,
    data: { containerId, stackId: location.stack.id, stackIndex: location.index, depthFromTop: location.depth, isTopmost: location.isTop, isCurrentTarget: state.targetContainerId === containerId, blockersAbove, legalDestinationsForTopBlocker: topBlocker ? getLegalDestinations(state.stacks, location.stack.id, topBlocker.id, state) : [] }
  };
}

export const analyzeBlockers = analyzeTarget;

function applyMoveToSnapshot(snapshot: YardSnapshot, containerId: string, fromStack: string, toStack: string): YardSnapshot {
  const stacks = cloneStacks(snapshot.stacks);
  const source = stacks.find((stack) => stack.id === fromStack)!;
  const destination = stacks.find((stack) => stack.id === toStack)!;
  destination.containers.push(source.containers.pop()!);
  const normalized = normalizeStacks(stacks, snapshot.targetContainerId);
  return { ...snapshot, stacks: normalized, metrics: { ...snapshot.metrics, blockingScore: calculateBlockingScore(normalized, snapshot.queue) } };
}

export function simulateRelocations(state: YardState, targetId = state.targetContainerId ?? '', maxPlans = 5): CommandResult<{ candidatePlans: RelocationPlan[]; evaluatedSequences: number }> {
  const targetLocation = findContainerLocation(state.stacks, targetId);
  if (!targetLocation) return { ok: false, code: 'TARGET_NOT_FOUND', message: `${targetId} is not present in the yard.`, stateVersion: state.stateVersion };
  if (targetLocation.isTop) return { ok: true, code: 'OK', message: `${targetId} is already exposed.`, stateVersion: state.stateVersion, data: { candidatePlans: [{ id: `plan-v${state.stateVersion}-ready`, targetId, basedOnStateVersion: state.stateVersion, moves: [], moveCount: 0, affectedStacks: [targetLocation.stack.id], resultingTargetExposed: true, score: 0 }], evaluatedSequences: 1 } };

  const blockers = targetLocation.stack.containers.slice(targetLocation.index + 1).map((container) => container.id).reverse();
  const plans: RelocationPlan[] = [];
  let evaluatedSequences = 0;

  const search = (working: YardSnapshot, blockerIndex: number, moves: PlannedMove[]) => {
    if (plans.length >= maxPlans * 4) return;
    if (blockerIndex >= blockers.length) {
      evaluatedSequences += 1;
      const exposed = Boolean(findContainerLocation(working.stacks, targetId)?.isTop);
      if (exposed) {
        const travel = moves.reduce((sum, move) => sum + Math.abs(getStackIndex(move.fromStack) - getStackIndex(move.toStack)), 0);
        const affectedStacks = [...new Set(moves.flatMap((move) => [move.fromStack, move.toStack]))];
        plans.push({ id: `plan-v${state.stateVersion}-${plans.length + 1}`, targetId, basedOnStateVersion: state.stateVersion, moves, moveCount: moves.length, affectedStacks, resultingTargetExposed: true, score: moves.length * 100 + travel });
      }
      return;
    }
    const blockerId = blockers[blockerIndex];
    const workingState: YardState = { ...working, stateVersion: state.stateVersion, history: state.history, selectedContainerId: null };
    const location = findContainerLocation(working.stacks, blockerId);
    if (!location || !location.isTop) return;
    for (const destination of working.stacks) {
      if (destination.id === location.stack.id || destination.id === targetLocation.stack.id) continue;
      const simulation = validateMove(workingState, { containerId: blockerId, fromStack: location.stack.id, toStack: destination.id });
      if (!simulation.legal) continue;
      const next = applyMoveToSnapshot(working, blockerId, location.stack.id, destination.id);
      const targetNowExposed = Boolean(findContainerLocation(next.stacks, targetId)?.isTop);
      search(next, blockerIndex + 1, [...moves, { step: moves.length + 1, containerId: blockerId, fromStack: location.stack.id, toStack: destination.id, validation: simulation.validation, targetExposedAfter: targetNowExposed }]);
    }
  };

  search(snapshotYard(state), 0, []);
  plans.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  const candidatePlans = plans.slice(0, maxPlans);
  return { ok: candidatePlans.length > 0, code: candidatePlans.length ? 'OK' : 'NO_LEGAL_PLAN', message: candidatePlans.length ? `${candidatePlans.length} deterministic relocation plan(s) found.` : `No legal relocation sequence exposes ${targetId} under current constraints.`, stateVersion: state.stateVersion, data: { candidatePlans, evaluatedSequences } };
}

export function applyMove(state: YardState, actor: Actor, input: { containerId: string; fromStack: string; toStack: string; rationale?: string; expectedStateVersion?: number }): CommandResult<YardState> {
  const stale = staleResult<YardState>(state, input.expectedStateVersion);
  if (stale) return stale;
  const simulation = validateMove(state, input);
  if (!simulation.legal) return { ok: false, code: simulation.code, message: simulation.reason, stateVersion: state.stateVersion, validation: simulation.validation, legalNext: simulation.legalAlternatives };
  const nextSnapshot = applyMoveToSnapshot(snapshotYard(state), input.containerId, input.fromStack, input.toStack);
  nextSnapshot.metrics = { ...nextSnapshot.metrics, relocations: state.metrics.relocations + 1, travelSteps: state.metrics.travelSteps + (simulation.projectedCost?.craneTravelSteps ?? 0) };
  const nextState = commitMutation(state, actor, 'move', { ...input }, [input.containerId, input.fromStack, input.toStack], nextSnapshot, { legal: true, validation: simulation.validation });
  return { ok: true, code: 'OK', message: `Moved ${input.containerId} from ${input.fromStack} to ${input.toStack}.`, stateVersion: nextState.stateVersion, data: nextState, validation: simulation.validation };
}

export function retrieveTarget(state: YardState, actor: Actor, input: { containerId: string; expectedStateVersion?: number }): CommandResult<YardState> {
  const stale = staleResult<YardState>(state, input.expectedStateVersion);
  if (stale) return stale;
  if (input.containerId !== state.targetContainerId) return { ok: false, code: 'NOT_CURRENT_TARGET', message: `${input.containerId} is not the selected retrieval target.`, stateVersion: state.stateVersion };
  const location = findContainerLocation(state.stacks, input.containerId);
  if (!location) return { ok: false, code: 'TARGET_NOT_FOUND', message: `${input.containerId} is not present in the yard.`, stateVersion: state.stateVersion };
  if (!location.isTop) return { ok: false, code: 'TARGET_BLOCKED', message: `${input.containerId} is blocked by ${location.stack.containers.slice(location.index + 1).map((container) => container.id).join(', ')}.`, stateVersion: state.stateVersion };
  if (location.stack.locked || location.stack.outage || location.stack.containers[location.index].locked) return { ok: false, code: 'TARGET_UNAVAILABLE', message: `${input.containerId} or ${location.stack.id} is locked/unavailable.`, stateVersion: state.stateVersion };
  const next = snapshotYard(state);
  const stack = next.stacks.find((candidate) => candidate.id === location.stack.id)!;
  stack.containers.pop();
  next.stacks = normalizeStacks(next.stacks, null);
  next.queue = next.queue.filter((id) => id !== input.containerId);
  next.targetContainerId = next.queue[0] ?? null;
  next.metrics = { ...next.metrics, retrieves: next.metrics.retrieves + 1, blockingScore: calculateBlockingScore(next.stacks, next.queue) };
  const nextState = commitMutation(state, actor, 'retrieve', input, [input.containerId, location.stack.id], next, { retrieved: input.containerId, nextTarget: next.targetContainerId });
  return { ok: true, code: 'OK', message: `Retrieved ${input.containerId} from ${location.stack.id}.`, stateVersion: nextState.stateVersion, data: nextState };
}

export function setRetrievalTarget(state: YardState, actor: Actor, input: { containerId: string; expectedStateVersion?: number }): CommandResult<YardState> {
  const stale = staleResult<YardState>(state, input.expectedStateVersion);
  if (stale) return stale;
  if (!findContainerLocation(state.stacks, input.containerId)) return { ok: false, code: 'TARGET_NOT_FOUND', message: `${input.containerId} is not present in the yard.`, stateVersion: state.stateVersion };
  if (state.targetContainerId === input.containerId) return { ok: false, code: 'NO_CHANGE', message: `${input.containerId} is already the retrieval target.`, stateVersion: state.stateVersion };
  const next = snapshotYard(state);
  next.queue = [input.containerId, ...next.queue.filter((id) => id !== input.containerId)];
  next.targetContainerId = input.containerId;
  next.stacks = normalizeStacks(next.stacks, input.containerId);
  const nextState = commitMutation(state, actor, 'target_change', input, [input.containerId], next, { target: input.containerId });
  return { ok: true, code: 'OK', message: `Set ${input.containerId} as the retrieval target.`, stateVersion: nextState.stateVersion, data: nextState };
}

export function setStackLock(state: YardState, actor: Actor, input: { stackId: string; locked: boolean; reason?: string; expectedStateVersion?: number }): CommandResult<YardState> {
  const stale = staleResult<YardState>(state, input.expectedStateVersion);
  if (stale) return stale;
  const stack = state.stacks.find((candidate) => candidate.id === input.stackId);
  if (!stack) return { ok: false, code: 'STACK_NOT_FOUND', message: `${input.stackId} does not exist.`, stateVersion: state.stateVersion };
  if (stack.locked === input.locked) return { ok: false, code: 'NO_CHANGE', message: `${input.stackId} is already ${input.locked ? 'locked' : 'unlocked'}.`, stateVersion: state.stateVersion };
  const next = snapshotYard(state);
  next.stacks.find((candidate) => candidate.id === input.stackId)!.locked = input.locked;
  next.disruptions = input.locked
    ? [...next.disruptions, { id: `lock-${input.stackId}`, type: 'STACK_LOCK', description: input.reason ?? `${input.stackId} locked by operator`, affectedEntities: [input.stackId], activatedAtVersion: state.stateVersion + 1 }]
    : next.disruptions.filter((event) => event.id !== `lock-${input.stackId}`);
  const action: ActionType = input.locked ? 'lock' : 'unlock';
  const nextState = commitMutation(state, actor, action, input, [input.stackId], next, { locked: input.locked });
  return { ok: true, code: 'OK', message: `${input.stackId} ${input.locked ? 'locked' : 'unlocked'} at yard v${nextState.stateVersion}.`, stateVersion: nextState.stateVersion, data: nextState };
}

export function triggerLateTruckUpdate(state: YardState, actor: Actor, expectedStateVersion = state.stateVersion): CommandResult<YardState> {
  const stale = staleResult<YardState>(state, expectedStateVersion);
  if (stale) return stale;
  const urgentId = 'CX-330';
  const next = snapshotYard(state);
  next.queue = [next.targetContainerId!, urgentId, ...next.queue.filter((id) => id !== next.targetContainerId && id !== urgentId)].filter(Boolean);
  const cargo = findContainerLocation(next.stacks, urgentId)?.stack.containers.find((container) => container.id === urgentId);
  if (cargo) { cargo.priority = 2; cargo.truckEta = '16:55'; }
  next.disruptions = [...next.disruptions.filter((event) => event.type !== 'LATE_TRUCK'), { id: 'late-truck-cx330', type: 'LATE_TRUCK', description: 'CX-330 truck ETA advanced; priority raised to P2.', affectedEntities: [urgentId], activatedAtVersion: state.stateVersion + 1 }];
  const nextState = commitMutation(state, actor, 'late_truck', { containerId: urgentId }, [urgentId, 'queue'], next, { queuePosition: 2, priority: 2, truckEta: '16:55' });
  return { ok: true, code: 'OK', message: `Late truck event moved ${urgentId} to queue position 2.`, stateVersion: nextState.stateVersion, data: nextState };
}

export function setLaneOrCraneOutage(state: YardState, actor: Actor, input: { stackId: string; active: boolean; expectedStateVersion?: number }): CommandResult<YardState> {
  const stale = staleResult<YardState>(state, input.expectedStateVersion);
  if (stale) return stale;
  const stack = state.stacks.find((candidate) => candidate.id === input.stackId);
  if (!stack) return { ok: false, code: 'STACK_NOT_FOUND', message: `${input.stackId} does not exist.`, stateVersion: state.stateVersion };
  if (stack.outage === input.active) return { ok: false, code: 'NO_CHANGE', message: `${input.stackId} outage state is unchanged.`, stateVersion: state.stateVersion };
  const next = snapshotYard(state);
  next.stacks.find((candidate) => candidate.id === input.stackId)!.outage = input.active;
  next.disruptions = input.active
    ? [...next.disruptions, { id: `outage-${input.stackId}`, type: 'LANE_OR_CRANE_OUTAGE', description: `Crane lane at ${input.stackId} unavailable.`, affectedEntities: [input.stackId], activatedAtVersion: state.stateVersion + 1 }]
    : next.disruptions.filter((event) => event.id !== `outage-${input.stackId}`);
  const nextState = commitMutation(state, actor, 'outage', input, [input.stackId], next, { active: input.active });
  return { ok: true, code: 'OK', message: `${input.stackId} outage ${input.active ? 'activated' : 'cleared'}.`, stateVersion: nextState.stateVersion, data: nextState };
}

export function inspectChanges(state: YardState, sinceStateVersion: number): CommandResult<{ changes: ActionEvent[] }> {
  const changes = state.history.filter((event) => event.stateVersionAfter > sinceStateVersion).map((event) => ({ ...event, snapshotBefore: undefined, snapshotAfter: undefined }));
  return { ok: true, code: 'OK', message: `${changes.length} change(s) since v${sinceStateVersion}.`, stateVersion: state.stateVersion, data: { changes } };
}

export function rewindYard(state: YardState, actor: Actor, input: { eventId?: string; expectedStateVersion?: number }): CommandResult<YardState> {
  const stale = staleResult<YardState>(state, input.expectedStateVersion);
  if (stale) return stale;
  const candidate = input.eventId ? state.history.find((event) => event.id === input.eventId) : [...state.history].reverse().find((event) => event.reversible && event.snapshotBefore);
  if (!candidate?.snapshotBefore) return { ok: false, code: 'NOTHING_TO_REWIND', message: 'No reversible yard action is available.', stateVersion: state.stateVersion };
  const next = snapshotYard(candidate.snapshotBefore);
  const nextState = commitMutation(state, actor, 'rewind', { eventId: candidate.id, rewoundAction: candidate.action }, candidate.changedEntities, next, { restoredFromVersion: candidate.stateVersionBefore }, false);
  return { ok: true, code: 'OK', message: `Rewound ${candidate.action} ${candidate.id}; yard is now v${nextState.stateVersion}.`, stateVersion: nextState.stateVersion, data: nextState };
}

export const rewindLastAction = rewindYard;

export function resetScenario(actor: Actor = 'human', currentState?: YardState): YardState {
  if (!currentState) return createInitialState();
  const next = createInitialSnapshot();
  return commitMutation(currentState, actor, 'reset', { scenario: 'CX-204 hero' }, [...STACK_IDS], next, { restored: true }, false);
}
