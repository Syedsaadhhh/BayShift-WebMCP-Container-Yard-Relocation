import { describe, expect, it } from 'vitest';
import {
  analyzeTarget,
  applyMove,
  findContainerLocation,
  inspectYard,
  retrieveTarget,
  rewindLastAction,
  setStackLock,
  simulateRelocation,
  triggerLateTruckUpdate,
  resetScenario
} from '../src/domain/engine';
import { createInitialState } from '../src/domain/scenario';

describe('BayShift Domain Engine & Invariants', () => {
  it('initializes deterministically with C01 buried under 2 blockers in Stack B', () => {
    const state = createInitialState();
    expect(state.stacks).toHaveLength(5);
    expect(state.queue[0]).toBe('C01');

    const stackB = state.stacks.find((s) => s.id === 'B')!;
    expect(stackB.containers).toHaveLength(3);
    expect(stackB.containers[0].id).toBe('C01');
    expect(stackB.containers[1].id).toBe('C04');
    expect(stackB.containers[2].id).toBe('C07');

    const analysis = analyzeTarget(state, 'C01');
    expect(analysis.ok).toBe(true);
    expect(analysis.data?.isTopmost).toBe(false);
    expect(analysis.data?.blockersAbove).toHaveLength(2);
    expect(analysis.data?.blockersAbove.map((b) => b.id)).toEqual(['C04', 'C07']);
  });

  it('rejects moving a non-top container with structured recovery guidance', () => {
    const state = createInitialState();
    // Attempt to move C01 directly while it is buried beneath C04 and C07
    const result = applyMove(state, 'agent', {
      containerId: 'C01',
      fromStack: 'B',
      toStack: 'E'
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('ERR_NOT_TOP_CONTAINER');
    expect(result.message).toContain('not topmost');
    expect(result.legalNext).toBeDefined();
    // Verify state was untouched
    const stackB = state.stacks.find((s) => s.id === 'B')!;
    expect(stackB.containers[0].id).toBe('C01');
  });

  it('rejects moving to a locked destination stack', () => {
    let state = createInitialState();
    // Lock Stack E
    const lockRes = setStackLock(state, 'human', { stackId: 'E', locked: true });
    expect(lockRes.ok).toBe(true);
    state = lockRes.data!;

    // Attempt to move top container C07 to locked Stack E
    const moveRes = applyMove(state, 'agent', {
      containerId: 'C07',
      fromStack: 'B',
      toStack: 'E'
    });

    expect(moveRes.ok).toBe(false);
    expect(moveRes.code).toBe('ERR_DEST_LOCKED');
    expect(moveRes.message).toContain('locked');
  });

  it('rejects moving to a full destination stack', () => {
    const state = createInitialState();
    // Fill Stack E to capacity (4)
    const stackE = state.stacks.find((s) => s.id === 'E')!;
    stackE.containers.push(
      { id: 'T1', priority: 20 },
      { id: 'T2', priority: 21 },
      { id: 'T3', priority: 22 }
    );
    expect(stackE.containers).toHaveLength(4);

    // Attempt move to full Stack E
    const res = applyMove(state, 'human', {
      containerId: 'C07',
      fromStack: 'B',
      toStack: 'E'
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe('ERR_DEST_FULL');
  });

  it('rejects moving to the same stack', () => {
    const state = createInitialState();
    const res = applyMove(state, 'human', {
      containerId: 'C07',
      fromStack: 'B',
      toStack: 'B'
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('ERR_SAME_STACK');
  });

  it('succeeds in legal relocation, computes crane travel steps and updates metrics', () => {
    const state = createInitialState();
    const initialRelocations = state.metrics.relocations;
    const initialTravel = state.metrics.travelSteps;

    // Move C07 from Stack B (index 1) to Stack E (index 4)
    // Travel steps = |1 - 4| = 3
    const res = applyMove(state, 'agent', {
      containerId: 'C07',
      fromStack: 'B',
      toStack: 'E',
      rationale: 'Unblocking C01 candidate clearance'
    });

    expect(res.ok).toBe(true);
    const nextState = res.data!;
    expect(nextState.metrics.relocations).toBe(initialRelocations + 1);
    expect(nextState.metrics.travelSteps).toBe(initialTravel + 3);

    // Verify container moved
    const stackB = nextState.stacks.find((s) => s.id === 'B')!;
    const stackE = nextState.stacks.find((s) => s.id === 'E')!;
    expect(stackB.containers.map((c) => c.id)).toEqual(['C01', 'C04']);
    expect(stackE.containers[stackE.containers.length - 1].id).toBe('C07');

    // Provenance check
    expect(nextState.history[0].actor).toBe('agent');
    expect(nextState.history[0].type).toBe('move');
    expect(nextState.history[0].reversible).toBe(true);
  });

  it('rejects retrieval of buried target container', () => {
    const state = createInitialState();
    // C01 is head of queue but buried
    const res = retrieveTarget(state, 'agent', { containerId: 'C01' });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('ERR_TARGET_BURIED');
    expect(res.message).toContain('buried under');
  });

  it('rejects retrieval of wrong container (not at head of queue)', () => {
    const state = createInitialState();
    // C05 is top of Stack A, but queue[0] is C01
    const res = retrieveTarget(state, 'agent', { containerId: 'C05' });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('ERR_NOT_ELIGIBLE_TARGET');
    expect(res.message).toContain('not the current eligible target');
  });

  it('succeeds in retrieving target once unblocked and exposed at top', () => {
    let state = createInitialState();
    // Step 1: Relocate top blocker C07 from B to E
    const m1 = applyMove(state, 'agent', { containerId: 'C07', fromStack: 'B', toStack: 'E' });
    expect(m1.ok).toBe(true);
    state = m1.data!;

    // Step 2: Relocate blocker C04 from B to A
    const m2 = applyMove(state, 'agent', { containerId: 'C04', fromStack: 'B', toStack: 'A' });
    expect(m2.ok).toBe(true);
    state = m2.data!;

    // C01 is now topmost in Stack B
    const loc = findContainerLocation(state.stacks, 'C01')!;
    expect(loc.isTop).toBe(true);

    // Step 3: Retrieve C01
    const ret = retrieveTarget(state, 'agent', { containerId: 'C01' });
    expect(ret.ok).toBe(true);
    state = ret.data!;

    expect(state.metrics.retrieves).toBe(1);
    expect(state.queue[0]).toBe('C02'); // Next target advanced
    const stackB = state.stacks.find((s) => s.id === 'B')!;
    expect(stackB.containers).toHaveLength(0); // C01 retrieved out of bay
  });

  it('faithfully restores prior state via rewindLastAction', () => {
    let state = createInitialState();
    const originalSnapshotStacks = JSON.stringify(state.stacks);

    // Apply move
    const m = applyMove(state, 'agent', { containerId: 'C07', fromStack: 'B', toStack: 'E' });
    expect(m.ok).toBe(true);
    state = m.data!;

    // Rewind move
    const rew = rewindLastAction(state, 'human');
    expect(rew.ok).toBe(true);
    state = rew.data!;

    // Verify stacks are exactly restored
    expect(JSON.stringify(state.stacks)).toBe(originalSnapshotStacks);
    expect(state.history[0].type).toBe('rewind');
    expect(state.history[0].actor).toBe('human');
  });

  it('human and agent command paths produce identical state transitions', () => {
    const s1 = createInitialState();
    const s2 = createInitialState();

    const hMove = applyMove(s1, 'human', { containerId: 'C07', fromStack: 'B', toStack: 'E' });
    const aMove = applyMove(s2, 'agent', { containerId: 'C07', fromStack: 'B', toStack: 'E' });

    expect(hMove.ok).toBe(true);
    expect(aMove.ok).toBe(true);

    // Verify operational stacks, queue, and metrics are identical
    expect(hMove.data?.stacks).toEqual(aMove.data?.stacks);
    expect(hMove.data?.queue).toEqual(aMove.data?.queue);
    expect(hMove.data?.metrics).toEqual(aMove.data?.metrics);

    // Only actor differs in provenance
    expect(hMove.data?.history[0].actor).toBe('human');
    expect(aMove.data?.history[0].actor).toBe('agent');
  });

  it('simulates candidate moves accurately without mutating state', () => {
    const state = createInitialState();
    const stateJsonBefore = JSON.stringify(state);

    const sim = simulateRelocation(state, 'C07', 'E');
    expect(sim.allowed).toBe(true);
    expect(sim.projectedCost?.craneTravelSteps).toBe(3);

    // State is completely untouched
    expect(JSON.stringify(state)).toBe(stateJsonBefore);
  });

  it('processes Late Truck update by expediting C08 and locking Stack D', () => {
    const state = createInitialState();
    const res = triggerLateTruckUpdate(state, 'human');
    expect(res.ok).toBe(true);

    const nextState = res.data!;
    expect(nextState.queue[1]).toBe('C08'); // Promoted to position 2
    const stackD = nextState.stacks.find((s) => s.id === 'D')!;
    expect(stackD.locked).toBe(true); // Stack D locked
    expect(nextState.history[0].type).toBe('priority_change');
  });

  it('resets scenario deterministically', () => {
    let state = createInitialState();
    const m = applyMove(state, 'agent', { containerId: 'C07', fromStack: 'B', toStack: 'E' });
    state = m.data!;
    expect(state.metrics.relocations).toBe(1);

    const reset = resetScenario('human');
    expect(reset.metrics.relocations).toBe(0);
    expect(reset.stacks.find((s) => s.id === 'B')?.containers).toHaveLength(3);
    expect(reset.queue[0]).toBe('C01');
  });
});
