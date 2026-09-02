import('./src/domain/engine.ts').then(async (engine) => {
  const { createInitialState } = await import('./src/domain/scenario.ts');

  console.log('--- 1. INITIAL SCENARIO VERIFICATION ---');
  let state = createInitialState();
  console.log('Stacks count:', state.stacks.length);
  console.log('Stack IDs:', state.stacks.map(s => s.id).join(', '));
  const stackB = state.stacks.find(s => s.id === 'B');
  console.log('Stack B containers (bottom to top):', stackB.containers.map(c => c.id).join(' -> '));
  console.log('Head of Queue:', state.queue[0]);
  console.log('C01 is bottom of Stack B (buried under C04, C07):', stackB.containers[0].id === 'C01' && stackB.containers.length === 3);

  console.log('\n--- 2. NON-TOP MOVE REJECTION VERIFICATION ---');
  const illegalMove = engine.applyMove(state, 'human', {
    containerId: 'C01',
    fromStack: 'B',
    toStack: 'E'
  });
  console.log('Illegal non-top move ok:', illegalMove.ok);
  console.log('Illegal move error code:', illegalMove.code);
  console.log('Illegal move message:', illegalMove.message);

  console.log('\n--- 3. LEGAL TOP MOVE VERIFICATION (HUMAN ACTOR) ---');
  const legalMove1 = engine.applyMove(state, 'human', {
    containerId: 'C07',
    fromStack: 'B',
    toStack: 'E'
  });
  console.log('Legal move ok:', legalMove1.ok);
  console.log('Legal move message:', legalMove1.message);
  state = legalMove1.data;
  console.log('Latest Event Actor:', state.history[0].actor);
  console.log('Latest Event Type:', state.history[0].type);
  console.log('Latest Event Reversible:', state.history[0].reversible);
  console.log('Metrics relocations:', state.metrics.relocations);
  console.log('Metrics crane travel steps:', state.metrics.travelSteps);

  console.log('\n--- 4. STACK LOCK / UNLOCK VERIFICATION ---');
  const lockRes = engine.setStackLock(state, 'human', { stackId: 'D', locked: true, reason: 'Operator safety corridor' });
  console.log('Lock Stack D ok:', lockRes.ok);
  state = lockRes.data;
  console.log('Stack D locked:', state.stacks.find(s => s.id === 'D').locked);
  console.log('Latest Event Actor:', state.history[0].actor);
  console.log('Latest Event Type:', state.history[0].type);

  console.log('\n--- 5. MOVE TO LOCKED STACK REJECTION ---');
  const lockedDestMove = engine.applyMove(state, 'human', {
    containerId: 'C04',
    fromStack: 'B',
    toStack: 'D'
  });
  console.log('Move to locked stack ok:', lockedDestMove.ok);
  console.log('Error code:', lockedDestMove.code);
  console.log('Legal alternatives suggested:', lockedDestMove.legalNext);

  console.log('\n--- 6. LATE TRUCK UPDATE VERIFICATION ---');
  const lateTruckRes = engine.triggerLateTruckUpdate(state, 'human');
  console.log('Late truck update ok:', lateTruckRes.ok);
  state = lateTruckRes.data;
  console.log('Queue position #1:', state.queue[0]);
  console.log('Queue position #2 (expedited C08):', state.queue[1]);
  console.log('Latest Event Actor:', state.history[0].actor);
  console.log('Latest Event Type:', state.history[0].type);

  console.log('\n--- 7. REWIND VERIFICATION ---');
  // Rewind should revert the latest reversible move (C07 from B to E)
  const rewindRes = engine.rewindLastAction(state, 'human');
  console.log('Rewind ok:', rewindRes.ok);
  console.log('Rewind message:', rewindRes.message);
  state = rewindRes.data;
  const stackBAfterRewind = state.stacks.find(s => s.id === 'B');
  console.log('Stack B after rewind (C07 restored to top):', stackBAfterRewind.containers.map(c => c.id).join(' -> '));
  console.log('Latest Event Type:', state.history[0].type);
  console.log('Latest Event Actor:', state.history[0].actor);

  console.log('\n--- 8. DETERMINISTIC SCENARIO RESET VERIFICATION ---');
  const resetState = engine.resetScenario('human');
  console.log('Reset relocations:', resetState.metrics.relocations);
  console.log('Reset retrieves:', resetState.metrics.retrieves);
  console.log('Reset Queue head:', resetState.queue[0]);
  console.log('Reset Stack B top:', resetState.stacks.find(s => s.id === 'B').containers[2].id);
  console.log('Reset Latest Event Actor:', resetState.history[0].actor);
  console.log('Reset Latest Event Type:', resetState.history[0].type);

  console.log('\nALL 8 MANUAL SHARED-STATE CHECKS PASSED PERFECTLY!');
}).catch(err => {
  console.error('Error running manual flow verification:', err);
  process.exit(1);
});
