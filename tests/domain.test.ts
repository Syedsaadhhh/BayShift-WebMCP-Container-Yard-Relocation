import { describe, expect, it } from 'vitest';
import { applyMove, findContainerLocation, inspectYard, retrieveTarget, rewindYard, setStackLock, simulateRelocations, validateMove } from '../src/domain/engine';
import { createInitialState, HERO_TARGET, normalizeStacks } from '../src/domain/scenario';

describe('BayShift authoritative yard domain', () => {
  it('seeds the hero target under exactly two blockers at v37', () => {
    const state = createInitialState('classic');
    const location = findContainerLocation(state.stacks, HERO_TARGET)!;
    expect(state.stateVersion).toBe(37);
    expect(location.stack.id).toBe('B02');
    expect(location.depth).toBe(2);
    expect(inspectYard(state).blockers).toEqual(['CX-188', 'CX-203']);
  });

  it('rejects a non-top container under the LIFO rule', () => {
    const result = validateMove(createInitialState('classic'), { containerId: 'CX-188', fromStack: 'B02', toStack: 'B01' });
    expect(result.legal).toBe(false);
    expect(result.code).toBe('NOT_TOP_CONTAINER');
    expect(result.reason).toContain('CX-203');
  });

  it('rejects a destination at maximum height', () => {
    const state = createInitialState('classic');
    const destination = state.stacks.find((stack) => stack.id === 'B05')!;
    const seed = destination.containers[0];
    while (destination.containers.length < destination.capacity) destination.containers.push({ ...seed, id: `CX-90${destination.containers.length}`, tier: destination.containers.length + 1 });
    expect(validateMove(state, { containerId: 'CX-203', fromStack: 'B02', toStack: 'B05' }).code).toBe('MAX_HEIGHT');
  });

  it('rejects a locked destination stack', () => {
    const state = createInitialState('classic');
    state.stacks.find((stack) => stack.id === 'B01')!.locked = true;
    expect(validateMove(state, { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01' }).code).toBe('STACK_LOCKED');
  });

  it('rejects a heavier container placed on a lighter one', () => {
    const state = createInitialState('classic');
    const source = state.stacks.find((stack) => stack.id === 'B01')!;
    source.containers = [source.containers[0]];
    state.stacks = normalizeStacks(state.stacks, state.targetContainerId);
    expect(validateMove(state, { containerId: 'CX-118', fromStack: 'B01', toStack: 'B04' }).code).toBe('WEIGHT_CLASS_VIOLATION');
  });

  it('rejects incompatible reserved destinations', () => {
    expect(validateMove(createInitialState('classic'), { containerId: 'CX-203', fromStack: 'B02', toStack: 'B03' }).code).toBe('INCOMPATIBLE_DESTINATION');
  });

  it('increments stateVersion after a successful move', () => {
    const result = applyMove(createInitialState('classic'), 'human', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37 });
    expect(result.ok).toBe(true);
    expect(result.data?.stateVersion).toBe(38);
    expect(result.data?.history.at(-1)?.actor).toBe('human');
  });

  it('rejects stale destructive commands without mutation', () => {
    const initial = createInitialState('classic');
    const locked = setStackLock(initial, 'human', { stackId: 'B04', locked: true, expectedStateVersion: 37 }).data!;
    const before = JSON.stringify(locked);
    const result = applyMove(locked, 'agent', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37 });
    expect(result.code).toBe('STALE_STATE');
    expect(result.expectedStateVersion).toBe(37);
    expect(result.currentStateVersion).toBe(38);
    expect(JSON.stringify(locked)).toBe(before);
  });

  it('plans without mutating the yard', () => {
    const state = createInitialState('classic');
    const before = JSON.stringify(state);
    const result = simulateRelocations(state, HERO_TARGET, 3);
    expect(result.ok).toBe(true);
    expect(result.data?.candidatePlans[0].moveCount).toBe(2);
    expect(result.data?.candidatePlans[0].resultingTargetExposed).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rewind restores the physical snapshot while version stays monotonic', () => {
    const initial = createInitialState('classic');
    const moved = applyMove(initial, 'human', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37 }).data!;
    const rewound = rewindYard(moved, 'human', { expectedStateVersion: 38 }).data!;
    expect(rewound.stacks).toEqual(initial.stacks);
    expect(rewound.metrics).toEqual(initial.metrics);
    expect(rewound.stateVersion).toBe(39);
    expect(rewound.history.at(-1)?.action).toBe('rewind');
  });

  it('exposes and retrieves CX-204 after two legal moves', () => {
    const first = applyMove(createInitialState('classic'), 'agent', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37 }).data!;
    const second = applyMove(first, 'agent', { containerId: 'CX-188', fromStack: 'B02', toStack: 'B04', expectedStateVersion: 38 }).data!;
    expect(inspectYard(second).targetExposed).toBe(true);
    const retrieved = retrieveTarget(second, 'agent', { containerId: HERO_TARGET, expectedStateVersion: 39 });
    expect(retrieved.ok).toBe(true);
    expect(retrieved.data?.metrics.retrieves).toBe(1);
  });

  it('human and agent mutations use identical physical transitions', () => {
    const human = applyMove(createInitialState('classic'), 'human', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37 }).data!;
    const agent = applyMove(createInitialState('classic'), 'agent', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37 }).data!;
    expect(agent.stacks).toEqual(human.stacks);
    expect(agent.metrics).toEqual(human.metrics);
    expect(agent.stateVersion).toBe(human.stateVersion);
    expect(agent.history.at(-1)?.actor).toBe('agent');
    expect(human.history.at(-1)?.actor).toBe('human');
  });
});
