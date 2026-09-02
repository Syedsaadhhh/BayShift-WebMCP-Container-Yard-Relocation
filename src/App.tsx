import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  applyMove,
  resetScenario,
  retrieveTarget,
  rewindLastAction,
  setStackLock,
  triggerLateTruckUpdate
} from './domain/engine';
import { createInitialState } from './domain/scenario';
import { YardState } from './domain/types';
import { RegisteredToolInfo, WebMCPBridge } from './webmcp/bridge';
import { BayCanvas } from './components/BayCanvas';
import { QueuePanel } from './components/QueuePanel';
import { MetricsPanel } from './components/MetricsPanel';
import { LedgerPanel } from './components/LedgerPanel';
import { JudgeWalkthroughModal } from './components/JudgeWalkthroughModal';
import { WhyItMattersDrawer } from './components/WhyItMattersDrawer';
import { ToolInspectorDrawer } from './components/ToolInspectorDrawer';
import {
  Box,
  RotateCcw,
  RefreshCw,
  HelpCircle,
  Wrench,
  Truck,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const [state, setState] = useState<YardState>(() => createInitialState());
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [registeredTools, setRegisteredTools] = useState<RegisteredToolInfo[]>([]);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isToolInspectorOpen, setIsToolInspectorOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Keep ref for fresh state access in async WebMCP callbacks
  const stateRef = useRef<YardState>(state);
  stateRef.current = state;

  const bridgeRef = useRef<WebMCPBridge | null>(null);

  const showBanner = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 3500);
  };

  // Initialize WebMCP Bridge
  useEffect(() => {
    const bridge = new WebMCPBridge(
      () => stateRef.current,
      (updater) => {
        setState((prev) => {
          const next = updater(prev);
          stateRef.current = next;
          return next;
        });
      },
      (tools) => {
        setRegisteredTools(tools);
      }
    );

    bridgeRef.current = bridge;
    bridge.registerAll().then(() => {
      setRegisteredTools(bridge.getRegisteredToolsList());
    });

    return () => {
      bridge.cleanup();
    };
  }, []);

  // Sync dynamic tools with state changes
  useEffect(() => {
    if (bridgeRef.current) {
      bridgeRef.current.syncWithState(state);
      setRegisteredTools(bridgeRef.current.getRegisteredToolsList());
    }
  }, [state]);

  const isWebMCPSupported = bridgeRef.current?.isSupported() ?? false;

  // Shared Domain Handlers (Human Actor)
  const handleHumanMove = useCallback((containerId: string, fromStack: string, toStack: string) => {
    const result = applyMove(stateRef.current, 'human', { containerId, fromStack, toStack });
    if (!result.ok) {
      showBanner(`Move rejected: ${result.message}`);
      return;
    }
    setState(result.data!);
    showBanner(`Relocated ${containerId} from Stack ${fromStack} to Stack ${toStack}`);
  }, []);

  const handleToggleLock = useCallback((stackId: string, locked: boolean) => {
    const result = setStackLock(stateRef.current, 'human', { stackId, locked });
    if (result.ok && result.data) {
      setState(result.data);
      showBanner(`Stack ${stackId} ${locked ? 'Locked' : 'Unlocked'}`);
    }
  }, []);

  const handleLateTruck = useCallback(() => {
    const result = triggerLateTruckUpdate(stateRef.current, 'human');
    if (result.ok && result.data) {
      setState(result.data);
      showBanner('Late truck arrived: C08 priority expedited to #2; Stack D reserved/locked.');
    }
  }, []);

  const handleRetrieveCurrentTarget = useCallback(() => {
    if (state.queue.length === 0) return;
    const targetId = state.queue[0];
    const result = retrieveTarget(stateRef.current, 'human', { containerId: targetId });
    if (!result.ok) {
      showBanner(`Retrieval rejected: ${result.message}`);
      return;
    }
    setState(result.data!);
    showBanner(`Successfully retrieved ${targetId} out of the bay!`);
  }, [state.queue]);

  const handleRewind = useCallback((eventId?: string) => {
    const result = rewindLastAction(stateRef.current, 'human', { eventId });
    if (!result.ok) {
      showBanner(`Rewind failed: ${result.message}`);
      return;
    }
    setState(result.data!);
    showBanner(result.message);
  }, []);

  const handleReset = useCallback(() => {
    const fresh = resetScenario('human');
    setState(fresh);
    setSelectedContainerId(null);
    showBanner('Bay reset to initial scenario configuration.');
  }, []);

  const handleSimulatePrompt = async (promptIndex: number) => {
    if (!bridgeRef.current) return;
    if (promptIndex === 0) {
      // Inspect and analyze C01
      await bridgeRef.current.executeSimulatedTool('inspect_yard', {});
      await bridgeRef.current.executeSimulatedTool('analyze_target', { containerId: 'C01' });
      showBanner('Simulated Prompt 1: Inspected yard and analyzed C01 blocker chain.');
    } else if (promptIndex === 1) {
      // Clear C01 without using Stack D: move C07 to E, move C04 to A, then retrieve C01
      await bridgeRef.current.executeSimulatedTool('move_container', {
        containerId: 'C07',
        fromStack: 'B',
        toStack: 'E',
        rationale: 'Unblocking C01: Relocating top blocker to low-risk Stack E'
      });
      await bridgeRef.current.executeSimulatedTool('move_container', {
        containerId: 'C04',
        fromStack: 'B',
        toStack: 'A',
        rationale: 'Unblocking C01: Relocating secondary blocker to Stack A'
      });
      await bridgeRef.current.executeSimulatedTool('retrieve_target', {
        containerId: 'C01'
      });
      showBanner('Simulated Prompt 2: Autonomous clearance and retrieval of C01 complete!');
    } else if (promptIndex === 2) {
      // Lock Stack D if not locked, then try moving C07 to D (expect rejection)
      setStackLock(stateRef.current, 'human', { stackId: 'D', locked: true });
      const res = await bridgeRef.current.executeSimulatedTool('move_container', {
        containerId: 'C07',
        fromStack: 'B',
        toStack: 'D',
        rationale: 'Testing locked stack recovery'
      });
      const parsed = JSON.parse(res);
      showBanner(`Simulated Prompt 3: Invariant check rejected (${parsed.code}). Recovery suggested.`);
    }
  };

  const canRewind = state.history.some((e) => e.reversible && !!e.snapshotBefore);

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="logo-area">
            <Box className="logo-icon" size={20} />
            <span>BayShift</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>
              &bull; WebMCP Relocation Canvas
            </span>
          </div>

          <div
            className={`badge ${isWebMCPSupported ? 'badge-connected' : 'badge-manual'}`}
            title={
              isWebMCPSupported
                ? 'document.modelContext active and responding to agent semantic tools'
                : 'WebMCP document.modelContext unavailable in this browser. Operating in manual operator mode with embedded tool simulator.'
            }
          >
            {isWebMCPSupported ? 'WebMCP: Connected' : 'Manual Mode (WebMCP Unavailable)'}
          </div>

          <span
            className="badge"
            style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}
          >
            Scenario: 5 Stacks &bull; 12 Containers
          </span>
        </div>

        <div className="top-bar-actions">
          <button type="button" className="btn-amber" onClick={handleLateTruck} title="Simulate late truck priority change">
            <Truck size={14} /> Late Truck Update
          </button>

          <button
            type="button"
            onClick={() => handleRewind()}
            disabled={!canRewind}
            title="Rewind most recent reversible move/retrieve"
          >
            <RotateCcw size={14} /> Rewind
          </button>

          <button type="button" onClick={handleReset} title="Reset scenario to deterministic initial state">
            <RefreshCw size={14} /> Reset
          </button>

          <button
            type="button"
            className="btn-cyan"
            onClick={() => setIsJudgeModalOpen(true)}
            title="Open Judge Walkthrough with copy-paste prompts"
          >
            Judge Walkthrough
          </button>

          <button
            type="button"
            onClick={() => setIsToolInspectorOpen(true)}
            title="Inspect registered WebMCP semantic tools and test execution"
          >
            <Wrench size={14} /> Tools ({registeredTools.length})
          </button>

          <button type="button" onClick={() => setIsWhyModalOpen(true)} title="Why This Matters operational context">
            <HelpCircle size={14} />
          </button>
        </div>
      </header>

      {/* Banner message alert */}
      {bannerMessage && (
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            borderBottom: '1px solid var(--border-active)',
            padding: '6px 20px',
            fontSize: 12,
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <CheckCircle size={14} color="#38bdf8" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Main Operations Canvas Area */}
      <div className="main-layout">
        <BayCanvas
          state={state}
          onHumanMove={handleHumanMove}
          onToggleLock={handleToggleLock}
          selectedContainerId={selectedContainerId}
          onSelectContainer={setSelectedContainerId}
        />

        {/* Right Sidebar: Queue, Controls, Metrics */}
        <aside className="right-rail">
          <QueuePanel state={state} onRetrieveCurrentTarget={handleRetrieveCurrentTarget} />

          <div className="rail-section">
            <div className="rail-title">
              <span>Operator Interventions</span>
            </div>
            <div className="operator-controls">
              <button type="button" className="btn-amber" onClick={handleLateTruck}>
                <Truck size={14} /> Inject Late Truck Update
              </button>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Expedites pickup for C08 to position #2 and reserves/locks Stack D. Forces agent to re-inspect and adapt plans.
              </div>
            </div>
          </div>

          <MetricsPanel metrics={state.metrics} />
        </aside>
      </div>

      {/* Bottom Ledger Area */}
      <LedgerPanel history={state.history} onRewind={handleRewind} canRewind={canRewind} />

      {/* Drawers / Modals */}
      <JudgeWalkthroughModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        registeredTools={registeredTools}
        onSimulatePrompt={handleSimulatePrompt}
      />

      <WhyItMattersDrawer isOpen={isWhyModalOpen} onClose={() => setIsWhyModalOpen(false)} />

      <ToolInspectorDrawer
        isOpen={isToolInspectorOpen}
        onClose={() => setIsToolInspectorOpen(false)}
        registeredTools={registeredTools}
        onExecuteTool={async (toolName, input) => {
          if (bridgeRef.current) {
            return await bridgeRef.current.executeSimulatedTool(toolName, input);
          }
          return JSON.stringify({ ok: false, message: 'Bridge unavailable.' });
        }}
      />
    </div>
  );
};
