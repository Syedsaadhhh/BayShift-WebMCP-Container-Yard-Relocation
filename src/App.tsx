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
import { MissionClarityStrip } from './components/MissionClarityStrip';
import { WhatsHappeningCard } from './components/WhatsHappeningCard';
import { QueuePanel } from './components/QueuePanel';
import { InterventionPanel } from './components/InterventionPanel';
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
  AlertTriangle,
  Cpu,
  Bot
} from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const [state, setState] = useState<YardState>(() => createInitialState());
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [registeredTools, setRegisteredTools] = useState<RegisteredToolInfo[]>([]);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isToolInspectorOpen, setIsToolInspectorOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ text: string; actor: 'human' | 'agent' | 'system' } | null>(null);

  // Ref for fresh state access in async WebMCP callbacks
  const stateRef = useRef<YardState>(state);
  stateRef.current = state;

  const bridgeRef = useRef<WebMCPBridge | null>(null);

  const showBanner = (text: string, actor: 'human' | 'agent' | 'system' = 'system') => {
    setBannerNotice({ text, actor });
    setTimeout(() => setBannerNotice(null), 3500);
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
      showBanner(`Move rejected: ${result.message}`, 'system');
      return;
    }
    setState(result.data!);
    showBanner(`HUMAN OPERATOR relocated ${containerId} from Stack ${fromStack} to Stack ${toStack}`, 'human');
  }, []);

  const handleToggleLock = useCallback((stackId: string, locked: boolean) => {
    const result = setStackLock(stateRef.current, 'human', { stackId, locked });
    if (result.ok && result.data) {
      setState(result.data);
      showBanner(`HUMAN OPERATOR ${locked ? 'LOCKED' : 'UNLOCKED'} Corridor Stack ${stackId}`, 'human');
    }
  }, []);

  const handleLateTruck = useCallback(() => {
    const result = triggerLateTruckUpdate(stateRef.current, 'human');
    if (result.ok && result.data) {
      setState(result.data);
      showBanner('LATE TRUCK ARRIVAL: C08 expedited to Queue #2; Stack D locked for staging', 'human');
    }
  }, []);

  const handleRetrieveCurrentTarget = useCallback(() => {
    if (state.queue.length === 0) return;
    const targetId = state.queue[0];
    const result = retrieveTarget(stateRef.current, 'human', { containerId: targetId });
    if (!result.ok) {
      showBanner(`Retrieval rejected: ${result.message}`, 'system');
      return;
    }
    setState(result.data!);
    showBanner(`TARGET RETRIEVED: Dispatched ${targetId} out of bay to terminal gate!`, 'human');
  }, [state.queue]);

  const handleRewind = useCallback((eventId?: string) => {
    const result = rewindLastAction(stateRef.current, 'human', { eventId });
    if (!result.ok) {
      showBanner(`Rewind failed: ${result.message}`, 'system');
      return;
    }
    setState(result.data!);
    showBanner(result.message, 'human');
  }, []);

  const handleReset = useCallback(() => {
    const fresh = resetScenario('human');
    setState(fresh);
    setSelectedContainerId(null);
    showBanner('Bay reset to deterministic initial scenario configuration', 'system');
  }, []);

  const handleSimulatePrompt = async (promptIndex: number) => {
    if (!bridgeRef.current) return;
    if (promptIndex === 0) {
      // Prompt A: Inspect yard and analyze C01 blocker chain (read-only)
      await bridgeRef.current.executeSimulatedTool('inspect_yard', {});
      await bridgeRef.current.executeSimulatedTool('analyze_target', { containerId: 'C01' });
      showBanner('AGENT (WebMCP): Inspected bay and analyzed C01 blocker chain (read-only)', 'agent');
    } else if (promptIndex === 1) {
      // Prompt B: Clear C01 without using Stack D, then retrieve
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
      showBanner('AGENT (WebMCP): Cleared blockers and retrieved priority container C01!', 'agent');
    } else if (promptIndex === 2) {
      // Prompt C: Late truck update operator constraint & agent re-inspection
      handleLateTruck();
      await bridgeRef.current.executeSimulatedTool('inspect_yard', {});
      await bridgeRef.current.executeSimulatedTool('analyze_target', { containerId: 'C08' });
      showBanner('AGENT (WebMCP): Detected Late Truck update and re-inspected yard constraints', 'agent');
    } else if (promptIndex === 3) {
      // Optional Failure Prompt: Move to locked Stack D, expect rejection, then recover
      setStackLock(stateRef.current, 'human', { stackId: 'D', locked: true });
      const rejRes = await bridgeRef.current.executeSimulatedTool('move_container', {
        containerId: 'C07',
        fromStack: 'B',
        toStack: 'D',
        rationale: 'Testing locked destination recovery'
      });
      const parsed = JSON.parse(rejRes);
      // Autonomous agent recovery to legal alternative Stack E
      await bridgeRef.current.executeSimulatedTool('move_container', {
        containerId: 'C07',
        fromStack: 'B',
        toStack: 'E',
        rationale: 'Agent recovery: Relocating to unlocked Stack E after Stack D rejection'
      });
      showBanner(`AGENT (WebMCP): Handled ${parsed.code} rejection & recovered to Stack E`, 'agent');
    }
  };

  const canRewind = state.history.some((e) => e.reversible && !!e.snapshotBefore);

  return (
    <div className="app-container">
      {/* Top Industrial Operational Header */}
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="logo-area">
            <Box className="logo-icon" size={22} />
            <div className="logo-text-group">
              <span className="product-title">BayShift</span>
              <span className="product-subtitle">Shared Container-Yard Relocation Canvas</span>
            </div>
          </div>

          <div
            className={`badge ${isWebMCPSupported ? 'badge-connected' : 'badge-manual'}`}
            title={
              isWebMCPSupported
                ? 'document.modelContext active and responding to agent semantic tools'
                : 'WebMCP document.modelContext unavailable in this browser session. Operating in manual operator mode with Developer Inspector available.'
            }
          >
            {isWebMCPSupported ? 'WebMCP: Connected' : 'Manual Mode (WebMCP Unavailable)'}
          </div>

          <span className="badge badge-scenario">
            5 Stacks &bull; 12 Containers &bull; NP-Hard Bay
          </span>

          <span className="badge badge-shared-state">
            <Bot size={11} style={{ marginRight: 3 }} /> Human + Agent Shared State
          </span>
        </div>

        <div className="top-bar-actions">
          <button
            type="button"
            className="btn-amber"
            onClick={handleLateTruck}
            title="Simulate unscheduled late truck expedited arrival at terminal gate"
          >
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

          <button
            type="button"
            onClick={handleReset}
            title="Reset scenario to deterministic initial state"
          >
            <RefreshCw size={14} /> Reset
          </button>

          <button
            type="button"
            className="btn-cyan btn-judge"
            onClick={() => setIsJudgeModalOpen(true)}
            title="Open Judge Walkthrough with copy-paste prompts"
          >
            Judge Walkthrough
          </button>

          <button
            type="button"
            className="btn-inspector"
            onClick={() => setIsToolInspectorOpen(true)}
            title="Developer / Judge Inspector (Simulation Only — not native WebMCP)"
          >
            <Wrench size={14} /> Developer Inspector ({registeredTools.length})
          </button>

          <button
            type="button"
            onClick={() => setIsWhyModalOpen(true)}
            title="Why This Matters operational context"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </header>

      {/* 10-Second Mission Clarity Explainer Strip */}
      <MissionClarityStrip />

      {/* Action / Event Pulse Banner */}
      {bannerNotice && (
        <div className={`event-pulse-banner banner-${bannerNotice.actor}`}>
          {bannerNotice.actor === 'agent' ? (
            <Bot size={15} />
          ) : bannerNotice.actor === 'human' ? (
            <CheckCircle size={15} />
          ) : (
            <AlertTriangle size={15} />
          )}
          <span>{bannerNotice.text}</span>
        </div>
      )}

      {/* Main Operations Workspace Area */}
      <div className="main-layout">
        {/* Center / Left: 2.5D Container Yard Canvas */}
        <BayCanvas
          state={state}
          onHumanMove={handleHumanMove}
          onToggleLock={handleToggleLock}
          selectedContainerId={selectedContainerId}
          onSelectContainer={setSelectedContainerId}
        />

        {/* Right Rail: Situation Analysis, Queue, Interventions, Metrics */}
        <aside className="right-rail">
          <WhatsHappeningCard
            state={state}
            onRetrieveCurrentTarget={handleRetrieveCurrentTarget}
          />

          <QueuePanel
            state={state}
            onRetrieveCurrentTarget={handleRetrieveCurrentTarget}
          />

          <InterventionPanel
            state={state}
            onLateTruck={handleLateTruck}
            onToggleLock={handleToggleLock}
          />

          <MetricsPanel metrics={state.metrics} />
        </aside>
      </div>

      {/* Bottom Area: Shared Provenance Ledger */}
      <LedgerPanel
        history={state.history}
        onRewind={handleRewind}
        canRewind={canRewind}
      />

      {/* Modals & Drawers */}
      <JudgeWalkthroughModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        registeredTools={registeredTools}
        onSimulatePrompt={handleSimulatePrompt}
      />

      <WhyItMattersDrawer
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
      />

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
