import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/domain/scenario';
import { WebMCPBridge } from '../src/webmcp/bridge';
import { YardState } from '../src/domain/types';

describe('WebMCP Bridge & Tool Lifecycles', () => {
  it('registers the 4 static tools initially and omits retrieve_target when target is buried', async () => {
    let currentState: YardState = createInitialState();
    const bridge = new WebMCPBridge(
      () => currentState,
      (updater) => {
        currentState = updater(currentState);
      }
    );

    await bridge.registerAll();
    const tools = bridge.getRegisteredToolsList();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain('inspect_yard');
    expect(toolNames).toContain('analyze_target');
    expect(toolNames).toContain('simulate_relocation');
    expect(toolNames).toContain('move_container');

    // Initially C01 is buried under 2 blockers, so retrieve_target should NOT be registered!
    expect(toolNames).not.toContain('retrieve_target');
    // Initially no reversible action, so rewind_last_action should NOT be registered
    expect(toolNames).not.toContain('rewind_last_action');
  });

  it('dynamically registers rewind_last_action after a reversible move', async () => {
    let currentState: YardState = createInitialState();
    const bridge = new WebMCPBridge(
      () => currentState,
      (updater) => {
        currentState = updater(currentState);
      }
    );

    await bridge.registerAll();
    expect(bridge.getRegisteredToolsList().map((t) => t.name)).not.toContain('rewind_last_action');

    // Execute move_container via bridge
    const moveRes = await bridge.executeSimulatedTool('move_container', {
      containerId: 'C07',
      fromStack: 'B',
      toStack: 'E'
    });

    const parsed = JSON.parse(moveRes);
    expect(parsed.ok).toBe(true);

    // Sync bridge with new state
    bridge.syncWithState(currentState);

    // Now rewind_last_action MUST be registered
    const toolsAfterMove = bridge.getRegisteredToolsList().map((t) => t.name);
    expect(toolsAfterMove).toContain('rewind_last_action');
  });

  it('dynamically registers retrieve_target only when head of queue is unblocked', async () => {
    let currentState: YardState = createInitialState();
    const bridge = new WebMCPBridge(
      () => currentState,
      (updater) => {
        currentState = updater(currentState);
      }
    );

    await bridge.registerAll();
    expect(bridge.getRegisteredToolsList().map((t) => t.name)).not.toContain('retrieve_target');

    // Move blocker C07 from B to E
    await bridge.executeSimulatedTool('move_container', {
      containerId: 'C07',
      fromStack: 'B',
      toStack: 'E'
    });
    bridge.syncWithState(currentState);
    expect(bridge.getRegisteredToolsList().map((t) => t.name)).not.toContain('retrieve_target');

    // Move blocker C04 from B to A
    await bridge.executeSimulatedTool('move_container', {
      containerId: 'C04',
      fromStack: 'B',
      toStack: 'A'
    });
    bridge.syncWithState(currentState);

    // C01 is now exposed and topmost!
    expect(bridge.getRegisteredToolsList().map((t) => t.name)).toContain('retrieve_target');

    // Execute retrieve_target
    const retRes = await bridge.executeSimulatedTool('retrieve_target', {
      containerId: 'C01'
    });
    const parsedRet = JSON.parse(retRes);
    expect(parsedRet.ok).toBe(true);
    expect(currentState.metrics.retrieves).toBe(1);

    // Target advances to C02, which is buried under C06 in Stack C!
    bridge.syncWithState(currentState);
    // So retrieve_target should be dynamically removed again!
    expect(bridge.getRegisteredToolsList().map((t) => t.name)).not.toContain('retrieve_target');
  });

  it('inspect_yard returns complete bay operational state and guidance', async () => {
    const currentState: YardState = createInitialState();
    const bridge = new WebMCPBridge(
      () => currentState,
      () => {}
    );
    await bridge.registerAll();

    const inspectRes = await bridge.executeSimulatedTool('inspect_yard', {});
    const parsed = JSON.parse(inspectRes);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.currentTarget).toBe('C01');
    expect(parsed.data.stacks).toHaveLength(5);
    expect(parsed.data.guidance).toContain('BURIED');
  });
});
