import {
  ActionEvent,
  Actor,
  CommandResult,
  Container,
  Metrics,
  RelocationSimulation,
  Stack,
  TargetAnalysis,
  YardInspection,
  YardSnapshot,
  YardState
} from './types';
import {
  calculateBlockingScore,
  createInitialSnapshot,
  createInitialState,
  STACK_IDS
} from './scenario';

function cloneStacks(stacks: Stack[]): Stack[] {
  return stacks.map((s) => ({
    ...s,
    containers: s.containers.map((c) => ({ ...c }))
  }));
}

function cloneSnapshot(snapshot: YardSnapshot): YardSnapshot {
  return {
    stacks: cloneStacks(snapshot.stacks),
    queue: [...snapshot.queue],
    metrics: { ...snapshot.metrics }
  };
}

export function getStackIndex(stackId: string): number {
  return STACK_IDS.indexOf(stackId as typeof STACK_IDS[number]);
}

export function findContainerLocation(
  stacks: Stack[],
  containerId: string
): { stack: Stack; index: number; isTop: boolean; depth: number } | null {
  for (const stack of stacks) {
    const idx = stack.containers.findIndex((c) => c.id === containerId);
    if (idx !== -1) {
      const isTop = idx === stack.containers.length - 1;
      const depth = stack.containers.length - 1 - idx;
      return { stack, index: idx, isTop, depth };
    }
  }
  return null;
}

export function getLegalDestinations(stacks: Stack[], fromStackId: string): string[] {
  return stacks
    .filter((s) => s.id !== fromStackId && !s.locked && s.containers.length < s.capacity)
    .map((s) => s.id);
}

// 1. Inspect Yard (read-only)
export function inspectYard(state: YardState): YardInspection {
  const currentTarget = state.queue.length > 0 ? state.queue[0] : null;
  const stacksView = state.stacks.map((s) => ({
    id: s.id,
    capacity: s.capacity,
    locked: s.locked,
    total: s.containers.length,
    top: s.containers.length > 0 ? s.containers[s.containers.length - 1] : null,
    containers: s.containers.map((c) => ({ id: c.id, priority: c.priority, label: c.label }))
  }));

  let guidance = 'All operations nominal.';
  if (currentTarget) {
    const loc = findContainerLocation(state.stacks, currentTarget);
    if (loc) {
      if (loc.isTop) {
        guidance = `Target ${currentTarget} is TOPMOST in Stack ${loc.stack.id} and ready for immediate retrieval.`;
      } else {
        const blockerCount = loc.depth;
        const topBlocker = loc.stack.containers[loc.stack.containers.length - 1];
        const legalDest = getLegalDestinations(state.stacks, loc.stack.id);
        guidance = `Target ${currentTarget} is BURIED in Stack ${loc.stack.id} beneath ${blockerCount} blocker(s). Move top blocker ${topBlocker.id} to [${legalDest.join(', ')}].`;
      }
    }
  } else {
    guidance = 'All priority queue items retrieved successfully.';
  }

  return {
    currentTarget,
    queue: state.queue,
    stacks: stacksView,
    metrics: state.metrics,
    guidance
  };
}

// 2. Analyze Target (read-only)
export function analyzeTarget(state: YardState, containerId: string): CommandResult<TargetAnalysis> {
  const loc = findContainerLocation(state.stacks, containerId);
  if (!loc) {
    return {
      ok: false,
      code: 'ERR_TARGET_NOT_FOUND',
      message: `Container '${containerId}' was not found in any bay stack.`
    };
  }

  const blockersAbove = loc.stack.containers.slice(loc.index + 1);
  const isTopmost = loc.isTop;
  const isCurrentTarget = state.queue.length > 0 && state.queue[0] === containerId;
  const legalDestinationsForTopBlocker =
    blockersAbove.length > 0 ? getLegalDestinations(state.stacks, loc.stack.id) : [];

  return {
    ok: true,
    code: 'OK',
    message: isTopmost
      ? `Container ${containerId} is topmost on Stack ${loc.stack.id}.`
      : `Container ${containerId} is buried under ${blockersAbove.length} blocker(s) on Stack ${loc.stack.id}.`,
    data: {
      containerId,
      stackId: loc.stack.id,
      stackIndex: loc.index,
      depthFromTop: loc.depth,
      isTopmost,
      isCurrentTarget,
      blockersAbove,
      legalDestinationsForTopBlocker
    }
  };
}

// 3. Simulate Relocation (read-only)
export function simulateRelocation(
  state: YardState,
  containerId: string,
  toStackId: string
): RelocationSimulation {
  const loc = findContainerLocation(state.stacks, containerId);
  if (!loc) {
    return {
      allowed: false,
      code: 'ERR_CONTAINER_NOT_FOUND',
      reason: `Container '${containerId}' does not exist in the bay.`,
      fromStack: 'UNKNOWN',
      toStack: toStackId,
      containerId
    };
  }

  const fromStack = loc.stack;
  if (!loc.isTop) {
    const topContainer = fromStack.containers[fromStack.containers.length - 1];
    return {
      allowed: false,
      code: 'ERR_NOT_TOP_CONTAINER',
      reason: `Container '${containerId}' is not the top container of Stack ${fromStack.id}. Only the top container ('${topContainer.id}') can be moved.`,
      fromStack: fromStack.id,
      toStack: toStackId,
      containerId,
      legalAlternatives: [topContainer.id]
    };
  }

  const destStack = state.stacks.find((s) => s.id === toStackId);
  if (!destStack) {
    return {
      allowed: false,
      code: 'ERR_DEST_NOT_FOUND',
      reason: `Destination Stack '${toStackId}' does not exist.`,
      fromStack: fromStack.id,
      toStack: toStackId,
      containerId
    };
  }

  if (destStack.id === fromStack.id) {
    return {
      allowed: false,
      code: 'ERR_SAME_STACK',
      reason: `Destination Stack '${toStackId}' is the same as source Stack '${fromStack.id}'.`,
      fromStack: fromStack.id,
      toStack: toStackId,
      containerId
    };
  }

  if (destStack.locked) {
    const openStacks = getLegalDestinations(state.stacks, fromStack.id);
    return {
      allowed: false,
      code: 'ERR_DEST_LOCKED',
      reason: `Destination Stack '${toStackId}' is currently locked by the operator.`,
      fromStack: fromStack.id,
      toStack: toStackId,
      containerId,
      legalAlternatives: openStacks
    };
  }

  if (destStack.containers.length >= destStack.capacity) {
    const availableStacks = getLegalDestinations(state.stacks, fromStack.id);
    return {
      allowed: false,
      code: 'ERR_DEST_FULL',
      reason: `Destination Stack '${toStackId}' is at maximum capacity (${destStack.capacity}/${destStack.capacity}).`,
      fromStack: fromStack.id,
      toStack: toStackId,
      containerId,
      legalAlternatives: availableStacks
    };
  }

  // Cost projections
  const fromIdx = getStackIndex(fromStack.id);
  const toIdx = getStackIndex(destStack.id);
  const craneTravelSteps = Math.abs(fromIdx - toIdx);

  // Projected blocking score
  const tempStacks = cloneStacks(state.stacks);
  const tempFrom = tempStacks.find((s) => s.id === fromStack.id)!;
  const tempTo = tempStacks.find((s) => s.id === destStack.id)!;
  const moved = tempFrom.containers.pop()!;
  tempTo.containers.push(moved);
  const projectedBlockingScore = calculateBlockingScore(tempStacks, state.queue);
  const deltaBlockingScore = projectedBlockingScore - state.metrics.blockingScore;

  return {
    allowed: true,
    code: 'OK',
    reason: `Relocation of '${containerId}' from Stack ${fromStack.id} to Stack ${toStackId} is legal.`,
    fromStack: fromStack.id,
    toStack: toStackId,
    containerId,
    projectedCost: {
      craneTravelSteps,
      currentBlockingScore: state.metrics.blockingScore,
      projectedBlockingScore,
      deltaBlockingScore
    }
  };
}

// 4. Apply Move (mutating)
export function applyMove(
  state: YardState,
  actor: Actor,
  input: { containerId: string; fromStack: string; toStack: string; rationale?: string }
): CommandResult<YardState> {
  const { containerId, fromStack: fromStackId, toStack: toStackId, rationale } = input;

  const srcStack = state.stacks.find((s) => s.id === fromStackId);
  if (!srcStack) {
    return {
      ok: false,
      code: 'ERR_SRC_NOT_FOUND',
      message: `Source Stack '${fromStackId}' does not exist.`
    };
  }

  if (srcStack.containers.length === 0) {
    return {
      ok: false,
      code: 'ERR_SRC_EMPTY',
      message: `Source Stack '${fromStackId}' is empty.`
    };
  }

  const top = srcStack.containers[srcStack.containers.length - 1];
  if (top.id !== containerId) {
    return {
      ok: false,
      code: 'ERR_NOT_TOP_CONTAINER',
      message: `Container '${containerId}' is not topmost in Stack ${fromStackId}. Current top is '${top.id}'.`,
      legalNext: [
        {
          action: 'move_container',
          suggestedContainerId: top.id,
          fromStack: fromStackId,
          legalDestinations: getLegalDestinations(state.stacks, fromStackId)
        }
      ]
    };
  }

  // Simulation checks destination existence, lock, capacity, same-stack
  const sim = simulateRelocation(state, containerId, toStackId);
  if (!sim.allowed) {
    return {
      ok: false,
      code: sim.code,
      message: sim.reason,
      legalNext: sim.legalAlternatives
    };
  }

  // Snapshot before mutation for deterministic rewind
  const snapshotBefore: YardSnapshot = {
    stacks: cloneStacks(state.stacks),
    queue: [...state.queue],
    metrics: { ...state.metrics }
  };

  const newStacks = cloneStacks(state.stacks);
  const newFrom = newStacks.find((s) => s.id === fromStackId)!;
  const newTo = newStacks.find((s) => s.id === toStackId)!;
  const movingContainer = newFrom.containers.pop()!;
  newTo.containers.push(movingContainer);

  const travelStepsIncrement = Math.abs(getStackIndex(fromStackId) - getStackIndex(toStackId));
  const newMetrics: Metrics = {
    relocations: state.metrics.relocations + 1,
    retrieves: state.metrics.retrieves,
    travelSteps: state.metrics.travelSteps + travelStepsIncrement,
    blockingScore: calculateBlockingScore(newStacks, state.queue)
  };

  const event: ActionEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    type: 'move',
    timestamp: new Date().toLocaleTimeString(),
    payload: {
      containerId,
      fromStack: fromStackId,
      toStack: toStackId,
      travelSteps: travelStepsIncrement,
      rationale: rationale || (actor === 'agent' ? 'Autonomous blocker clearance' : 'Operator relocation')
    },
    reversible: true,
    snapshotBefore
  };

  const nextState: YardState = {
    ...state,
    stacks: newStacks,
    metrics: newMetrics,
    history: [event, ...state.history]
  };

  return {
    ok: true,
    code: 'OK',
    message: `Moved ${containerId} from Stack ${fromStackId} to Stack ${toStackId} (${travelStepsIncrement} crane steps).`,
    data: nextState
  };
}

// 5. Retrieve Target (mutating)
export function retrieveTarget(
  state: YardState,
  actor: Actor,
  input: { containerId: string }
): CommandResult<YardState> {
  const { containerId } = input;

  if (state.queue.length === 0) {
    return {
      ok: false,
      code: 'ERR_QUEUE_EMPTY',
      message: 'Retrieval queue is already completely fulfilled.'
    };
  }

  const currentExpected = state.queue[0];
  if (containerId !== currentExpected) {
    return {
      ok: false,
      code: 'ERR_NOT_ELIGIBLE_TARGET',
      message: `Container '${containerId}' is not the current eligible target. Current priority pickup is '${currentExpected}'.`,
      legalNext: [{ currentTarget: currentExpected }]
    };
  }

  const loc = findContainerLocation(state.stacks, containerId);
  if (!loc) {
    return {
      ok: false,
      code: 'ERR_TARGET_NOT_IN_BAY',
      message: `Target container '${containerId}' was not found in any stack.`
    };
  }

  if (!loc.isTop) {
    const blockers = loc.stack.containers.slice(loc.index + 1);
    const topBlocker = loc.stack.containers[loc.stack.containers.length - 1];
    return {
      ok: false,
      code: 'ERR_TARGET_BURIED',
      message: `Cannot retrieve target '${containerId}': buried under ${blockers.length} container(s) in Stack ${loc.stack.id}. Top blocker '${topBlocker.id}' must be relocated first.`,
      legalNext: [
        {
          mustRelocate: topBlocker.id,
          fromStack: loc.stack.id,
          legalDestinations: getLegalDestinations(state.stacks, loc.stack.id)
        }
      ]
    };
  }

  const snapshotBefore: YardSnapshot = {
    stacks: cloneStacks(state.stacks),
    queue: [...state.queue],
    metrics: { ...state.metrics }
  };

  const newStacks = cloneStacks(state.stacks);
  const targetStack = newStacks.find((s) => s.id === loc.stack.id)!;
  const retrievedContainer = targetStack.containers.pop()!;
  const newQueue = state.queue.slice(1);

  const newMetrics: Metrics = {
    relocations: state.metrics.relocations,
    retrieves: state.metrics.retrieves + 1,
    travelSteps: state.metrics.travelSteps,
    blockingScore: calculateBlockingScore(newStacks, newQueue)
  };

  const event: ActionEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    type: 'retrieve',
    timestamp: new Date().toLocaleTimeString(),
    payload: {
      containerId,
      retrievedFrom: loc.stack.id,
      label: retrievedContainer.label,
      nextQueueTarget: newQueue.length > 0 ? newQueue[0] : null
    },
    reversible: true,
    snapshotBefore
  };

  const nextState: YardState = {
    ...state,
    stacks: newStacks,
    queue: newQueue,
    metrics: newMetrics,
    history: [event, ...state.history]
  };

  return {
    ok: true,
    code: 'OK',
    message: `Successfully retrieved target container ${containerId} from Stack ${loc.stack.id}.`,
    data: nextState
  };
}

// 6. Set Stack Lock (mutating)
export function setStackLock(
  state: YardState,
  actor: Actor,
  input: { stackId: string; locked: boolean; reason?: string }
): CommandResult<YardState> {
  const { stackId, locked, reason } = input;
  const stack = state.stacks.find((s) => s.id === stackId);
  if (!stack) {
    return {
      ok: false,
      code: 'ERR_STACK_NOT_FOUND',
      message: `Stack '${stackId}' does not exist.`
    };
  }

  if (stack.locked === locked) {
    return {
      ok: true,
      code: 'NO_CHANGE',
      message: `Stack ${stackId} is already ${locked ? 'locked' : 'unlocked'}.`,
      data: state
    };
  }

  const newStacks = cloneStacks(state.stacks);
  const targetStack = newStacks.find((s) => s.id === stackId)!;
  targetStack.locked = locked;

  const event: ActionEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    type: locked ? 'lock' : 'unlock',
    timestamp: new Date().toLocaleTimeString(),
    payload: {
      stackId,
      locked,
      reason: reason || (locked ? 'Safety corridor / maintenance lock' : 'Corridor reopened')
    },
    reversible: false
  };

  return {
    ok: true,
    code: 'OK',
    message: `Stack ${stackId} is now ${locked ? 'LOCKED' : 'UNLOCKED'}.`,
    data: {
      ...state,
      stacks: newStacks,
      history: [event, ...state.history]
    }
  };
}

// 7. Late Truck Update (secondary live event)
export function triggerLateTruckUpdate(
  state: YardState,
  actor: Actor = 'human'
): CommandResult<YardState> {
  // Late truck update:
  // Container C08 (currently in Stack D, index 1) pickup is expedited!
  // It jumps to priority 1.5 (right behind C01), and Stack D is temporarily reserved/locked for crane staging.
  const newQueue = [...state.queue];
  const c08Idx = newQueue.indexOf('C08');
  if (c08Idx > -1) {
    newQueue.splice(c08Idx, 1);
    // Insert right after current head
    newQueue.splice(1, 0, 'C08');
  }

  const newStacks = cloneStacks(state.stacks);
  // Also update container priority and label in Stack D
  for (const s of newStacks) {
    for (const c of s.containers) {
      if (c.id === 'C08') {
        c.priority = 2; // expedited
        c.label = 'Expedited Retail (Late Truck)';
      }
    }
  }

  // Reserve / lock Stack D
  const stackD = newStacks.find((s) => s.id === 'D');
  if (stackD) {
    stackD.locked = true;
  }

  const newMetrics: Metrics = {
    ...state.metrics,
    blockingScore: calculateBlockingScore(newStacks, newQueue)
  };

  const event: ActionEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    type: 'priority_change',
    timestamp: new Date().toLocaleTimeString(),
    payload: {
      event: 'Late truck update',
      detail: 'Truck for C08 arrived early at Gate 3! C08 priority promoted to position #2 in queue; Stack D locked for staging.',
      promotedContainer: 'C08',
      lockedStack: 'D'
    },
    reversible: false
  };

  return {
    ok: true,
    code: 'OK',
    message: 'Late truck update applied: C08 priority expedited to #2; Stack D locked for staging.',
    data: {
      ...state,
      stacks: newStacks,
      queue: newQueue,
      metrics: newMetrics,
      history: [event, ...state.history]
    }
  };
}

// 8. Rewind Last Action (mutating)
export function rewindLastAction(
  state: YardState,
  actor: Actor,
  input?: { eventId?: string }
): CommandResult<YardState> {
  const targetEventIndex = state.history.findIndex((e) => {
    if (input?.eventId) {
      return e.id === input.eventId && e.reversible && !!e.snapshotBefore;
    }
    return e.reversible && !!e.snapshotBefore;
  });

  if (targetEventIndex === -1) {
    return {
      ok: false,
      code: 'ERR_NO_REVERSIBLE_ACTION',
      message: 'No reversible action (move or retrieve) found in recent history.'
    };
  }

  const targetEvent = state.history[targetEventIndex];
  const snapshot = targetEvent.snapshotBefore!;

  const restoredStacks = cloneStacks(snapshot.stacks);
  const restoredQueue = [...snapshot.queue];
  const restoredMetrics = { ...snapshot.metrics };

  const rewindEvent: ActionEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    type: 'rewind',
    timestamp: new Date().toLocaleTimeString(),
    payload: {
      rewoundEventId: targetEvent.id,
      rewoundType: targetEvent.type,
      rewoundPayload: targetEvent.payload
    },
    reversible: false
  };

  // Reversible action is undone, append rewind event to ledger
  const nextHistory = [rewindEvent, ...state.history];

  return {
    ok: true,
    code: 'OK',
    message: `Rewound ${targetEvent.actor.toUpperCase()} ${targetEvent.type} action (${targetEvent.id}).`,
    data: {
      ...state,
      stacks: restoredStacks,
      queue: restoredQueue,
      metrics: restoredMetrics,
      history: nextHistory
    }
  };
}

// 9. Reset Scenario (deterministic)
export function resetScenario(actor: Actor = 'system'): YardState {
  const fresh = createInitialState();
  if (actor !== 'system') {
    fresh.history = [
      {
        id: `evt-${Date.now()}`,
        actor,
        type: 'reset',
        timestamp: new Date().toLocaleTimeString(),
        payload: { message: 'Yard bay reset to initial scenario configuration.' },
        reversible: false
      },
      ...fresh.history
    ];
  }
  return fresh;
}
