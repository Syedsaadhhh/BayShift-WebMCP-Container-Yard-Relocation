import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/domain/scenario';
import { YardState } from '../src/domain/types';
import { AgentTraceEvent, WebMCPBridge } from '../src/webmcp/bridge';

function harness() {
  let state: YardState = createInitialState('classic');
  const trace: AgentTraceEvent[] = [];
  const bridge = new WebMCPBridge(() => state, (updater) => { state = updater(state); }, undefined, (event) => trace.push(event));
  return { bridge, trace, get state() { return state; } };
}

describe('WebMCP semantic surface', () => {
  it('registers the intentional nine-tool surface', async () => {
    const run = harness();
    await run.bridge.registerAll();
    expect(run.bridge.getRegisteredToolsList().map((tool) => tool.name)).toEqual([
      'inspect_yard', 'get_container', 'analyze_blockers', 'validate_move', 'simulate_relocations',
      'execute_move', 'retrieve_target', 'inspect_changes', 'rewind_yard'
    ]);
  });

  it('returns stateVersion and hero blockers from inspect_yard', async () => {
    const run = harness();
    await run.bridge.registerAll();
    const response = JSON.parse(await run.bridge.executeSimulatedTool('inspect_yard', {}));
    expect(response.stateVersion).toBe(37);
    expect(response.data.target).toBe('CX-204');
    expect(response.data.blockers).toEqual(['CX-188', 'CX-203']);
  });

  it('validates expectedStateVersion for destructive tools', async () => {
    const run = harness();
    await run.bridge.registerAll();
    const response = JSON.parse(await run.bridge.executeSimulatedTool('execute_move', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01' }));
    expect(response.code).toBe('INVALID_INPUT');
    expect(run.state.stateVersion).toBe(37);
  });

  it('surfaces STALE_STATE in the auditable trace', async () => {
    const run = harness();
    await run.bridge.registerAll();
    await run.bridge.executeSimulatedTool('execute_move', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 36 });
    expect(run.trace.at(-1)?.status).toBe('rejected');
    expect(run.trace.at(-1)?.summary).toContain('prepared for yard v36');
    expect(run.state.stateVersion).toBe(37);
  });

  it('executes an agent move against the authoritative state', async () => {
    const run = harness();
    await run.bridge.registerAll();
    const response = JSON.parse(await run.bridge.executeSimulatedTool('execute_move', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37, rationale: 'Hero clearance' }));
    expect(response.ok).toBe(true);
    expect(run.state.stateVersion).toBe(38);
    expect(run.state.history.at(-1)?.actor).toBe('agent');
  });

  it('returns the real result even when a React-style updater is deferred', async () => {
    let state = createInitialState('classic');
    let pending: ((previous: YardState) => YardState) | undefined;
    const bridge = new WebMCPBridge(() => state, (updater) => { pending = updater; });
    await bridge.registerAll();
    const response = JSON.parse(await bridge.executeSimulatedTool('execute_move', { containerId: 'CX-203', fromStack: 'B02', toStack: 'B01', expectedStateVersion: 37 }));
    expect(response.ok).toBe(true);
    expect(response.stateVersion).toBe(38);
    expect(state.stateVersion).toBe(37);
    state = pending!(state);
    expect(state.stateVersion).toBe(38);
  });
});
