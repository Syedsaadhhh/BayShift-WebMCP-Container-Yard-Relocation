import React, { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove, resetScenario, retrieveTarget, rewindYard, setLaneOrCraneOutage, setRetrievalTarget, setStackLock, triggerLateTruckUpdate } from './domain/engine';
import { createInitialState } from './domain/scenario';
import { RelocationPlan, YardState } from './domain/types';
import { AgentTraceEvent, RegisteredToolInfo, WebMCPBridge } from './webmcp/bridge';
import { BayCanvas } from './components/BayCanvas';
import { MissionClarityStrip } from './components/MissionClarityStrip';
import { WhatsHappeningCard } from './components/WhatsHappeningCard';
import { QueuePanel } from './components/QueuePanel';
import { InterventionPanel } from './components/InterventionPanel';
import { LedgerPanel } from './components/LedgerPanel';
import { JudgeWalkthroughModal } from './components/JudgeWalkthroughModal';
import { WhyItMattersDrawer } from './components/WhyItMattersDrawer';
import { ToolInspectorDrawer } from './components/ToolInspectorDrawer';
import { AgentOperationsPanel } from './components/AgentOperationsPanel';
import { AlertTriangle, Bot, Box, CheckCircle, HelpCircle, RefreshCw, RotateCcw, Truck, Wrench } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const [state, setState] = useState<YardState>(() => createInitialState());
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [registeredTools, setRegisteredTools] = useState<RegisteredToolInfo[]>([]);
  const [agentTrace, setAgentTrace] = useState<AgentTraceEvent[]>([]);
  const [activePlan, setActivePlan] = useState<RelocationPlan | null>(null);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isToolInspectorOpen, setIsToolInspectorOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ text: string; actor: 'human' | 'agent' | 'system' } | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const bridgeRef = useRef<WebMCPBridge | null>(null);

  const publishState = useCallback((next: YardState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const showBanner = useCallback((text: string, actor: 'human' | 'agent' | 'system' = 'system') => {
    setBannerNotice({ text, actor });
    window.setTimeout(() => setBannerNotice(null), 4200);
  }, []);

  useEffect(() => {
    const bridge = new WebMCPBridge(
      () => stateRef.current,
      (updater) => setState((previous) => {
        const next = updater(previous);
        stateRef.current = next;
        return next;
      }),
      setRegisteredTools,
      (event) => setAgentTrace((previous) => [...previous, event].slice(-30)),
      setActivePlan
    );
    bridgeRef.current = bridge;
    void bridge.registerAll();
    return () => bridge.cleanup();
  }, []);

  const applyResult = useCallback((result: ReturnType<typeof applyMove>, successMessage?: string) => {
    if (!result.ok || !result.data) {
      showBanner(`${result.code}: ${result.message}`, 'system');
      return false;
    }
    publishState(result.data);
    showBanner(successMessage ?? result.message, 'human');
    return true;
  }, [publishState, showBanner]);

  const handleHumanMove = useCallback((containerId: string, fromStack: string, toStack: string) => {
    applyResult(applyMove(stateRef.current, 'human', { containerId, fromStack, toStack, expectedStateVersion: stateRef.current.stateVersion }), `HUMAN moved ${containerId}: ${fromStack} → ${toStack}`);
  }, [applyResult]);

  const handleToggleLock = useCallback((stackId: string, locked: boolean) => {
    const result = setStackLock(stateRef.current, 'human', { stackId, locked, reason: 'Operator safety corridor control', expectedStateVersion: stateRef.current.stateVersion });
    if (result.ok && result.data) { publishState(result.data); showBanner(`HUMAN ${locked ? 'locked' : 'unlocked'} ${stackId}; shared yard is v${result.data.stateVersion}`, 'human'); }
    else showBanner(`${result.code}: ${result.message}`, 'system');
  }, [publishState, showBanner]);

  const handleOutage = useCallback((stackId: string, active: boolean) => {
    const result = setLaneOrCraneOutage(stateRef.current, 'human', { stackId, active, expectedStateVersion: stateRef.current.stateVersion });
    if (result.ok && result.data) { publishState(result.data); showBanner(result.message, 'human'); }
    else showBanner(`${result.code}: ${result.message}`, 'system');
  }, [publishState, showBanner]);

  const handleLateTruck = useCallback(() => {
    const result = triggerLateTruckUpdate(stateRef.current, 'human', stateRef.current.stateVersion);
    if (result.ok && result.data) { publishState(result.data); showBanner('LATE TRUCK: CX-330 promoted to queue #2 in the shared yard', 'human'); }
    else showBanner(`${result.code}: ${result.message}`, 'system');
  }, [publishState, showBanner]);

  const handleRetrieveCurrentTarget = useCallback(() => {
    const targetId = stateRef.current.targetContainerId;
    if (!targetId) return;
    const result = retrieveTarget(stateRef.current, 'human', { containerId: targetId, expectedStateVersion: stateRef.current.stateVersion });
    if (result.ok && result.data) { publishState(result.data); showBanner(`TARGET RETRIEVED: ${targetId} dispatched to the gate`, 'human'); }
    else showBanner(`${result.code}: ${result.message}`, 'system');
  }, [publishState, showBanner]);

  const handleSetTarget = useCallback((containerId: string) => {
    const result = setRetrievalTarget(stateRef.current, 'human', { containerId, expectedStateVersion: stateRef.current.stateVersion });
    if (result.ok && result.data) { publishState(result.data); setActivePlan(null); showBanner(`HUMAN selected ${containerId} as the retrieval target`, 'human'); }
    else showBanner(`${result.code}: ${result.message}`, 'system');
  }, [publishState, showBanner]);

  const handleRewind = useCallback((eventId?: string) => {
    const result = rewindYard(stateRef.current, 'human', { eventId, expectedStateVersion: stateRef.current.stateVersion });
    if (result.ok && result.data) { publishState(result.data); setActivePlan(null); showBanner(result.message, 'human'); }
    else showBanner(`${result.code}: ${result.message}`, 'system');
  }, [publishState, showBanner]);

  const handleReset = useCallback(() => {
    const fresh = resetScenario('human', stateRef.current);
    publishState(fresh); setSelectedContainerId(null); setActivePlan(null); setAgentTrace([]);
    showBanner(`Hero scenario restored at yard v${fresh.stateVersion}`, 'system');
  }, [publishState, showBanner]);

  const executeAgentTool = useCallback(async (name: string, input: Record<string, unknown>) => {
    const raw = await bridgeRef.current?.executeSimulatedTool(name, input);
    const parsed = JSON.parse(raw ?? '{}') as { ok?: boolean; code?: string; message?: string };
    showBanner(parsed.ok === false ? `${parsed.code}: ${parsed.message}` : parsed.message ?? `${name} completed`, parsed.ok === false ? 'system' : 'agent');
    return raw ?? '{}';
  }, [showBanner]);

  const handleAgentInspect = useCallback(async () => {
    await executeAgentTool('inspect_yard', {});
    if (stateRef.current.targetContainerId) await executeAgentTool('analyze_blockers', { containerId: stateRef.current.targetContainerId });
  }, [executeAgentTool]);

  const handleAgentSimulate = useCallback(async () => {
    const target = stateRef.current.targetContainerId;
    if (target) await executeAgentTool('simulate_relocations', { containerId: target, maxPlans: 3 });
  }, [executeAgentTool]);

  const handleAgentExecuteNext = useCallback(async () => {
    const move = activePlan?.moves[0];
    if (!move || !activePlan) return;
    await executeAgentTool('execute_move', { containerId: move.containerId, fromStack: move.fromStack, toStack: move.toStack, rationale: `Executing deterministic ${activePlan.id}`, expectedStateVersion: activePlan.basedOnStateVersion });
  }, [activePlan, executeAgentTool]);

  const handleSimulatePrompt = async (promptIndex: number) => {
    if (promptIndex === 0) await handleAgentInspect();
    if (promptIndex === 1) await handleAgentSimulate();
    if (promptIndex === 2) handleLateTruck();
    if (promptIndex === 3 && activePlan?.moves[0]) {
      handleToggleLock(activePlan.moves[0].toStack, true);
      window.setTimeout(() => void handleAgentExecuteNext(), 0);
    }
  };

  const canRewind = state.history.some((event) => event.reversible && event.snapshotBefore);
  const isWebMCPSupported = bridgeRef.current?.isSupported() ?? false;

  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="logo-area"><Box className="logo-icon" size={22} /><div className="logo-text-group"><span className="product-title">BayShift</span><span className="product-subtitle">Shared live container-yard relocation canvas</span></div></div>
          <div className={`badge ${isWebMCPSupported ? 'badge-connected' : 'badge-manual'}`}>{isWebMCPSupported ? 'WebMCP · Connected' : 'WebMCP · Simulator'}</div>
          <span className="badge badge-shared-state"><Bot size={11} /> ONE SHARED YARD · v{state.stateVersion}</span>
          <span className="badge badge-scenario">CX-204 · ETA 16:45 · 2 BLOCKERS</span>
        </div>
        <div className="top-bar-actions">
          <button type="button" className="btn-amber" onClick={handleLateTruck}><Truck size={14} /> Late Truck</button>
          <button type="button" onClick={() => handleRewind()} disabled={!canRewind}><RotateCcw size={14} /> Rewind</button>
          <button type="button" onClick={handleReset}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="btn-cyan btn-judge" onClick={() => setIsJudgeModalOpen(true)}>Demo Guide</button>
          <button type="button" className="btn-inspector" onClick={() => setIsToolInspectorOpen(true)}><Wrench size={14} /> Tools ({registeredTools.length})</button>
          <button type="button" onClick={() => setIsWhyModalOpen(true)} aria-label="Why BayShift matters"><HelpCircle size={14} /></button>
        </div>
      </header>

      <MissionClarityStrip target={state.targetContainerId} />
      {bannerNotice && <div className={`event-pulse-banner banner-${bannerNotice.actor}`}>{bannerNotice.actor === 'agent' ? <Bot size={15} /> : bannerNotice.actor === 'human' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}<span>{bannerNotice.text}</span></div>}

      <div className="main-layout">
        <BayCanvas state={state} onHumanMove={handleHumanMove} onToggleLock={handleToggleLock} selectedContainerId={selectedContainerId} onSelectContainer={setSelectedContainerId} onSetTarget={handleSetTarget} />
        <aside className="right-rail">
          <AgentOperationsPanel state={state} trace={agentTrace} plan={activePlan} onInspect={() => void handleAgentInspect()} onSimulate={() => void handleAgentSimulate()} onExecuteNext={() => void handleAgentExecuteNext()} onHumanIntervene={() => activePlan?.moves[0] && handleToggleLock(activePlan.moves[0].toStack, true)} />
          <WhatsHappeningCard state={state} onRetrieveCurrentTarget={handleRetrieveCurrentTarget} />
          <InterventionPanel state={state} onLateTruck={handleLateTruck} onToggleLock={handleToggleLock} onToggleOutage={handleOutage} />
          <QueuePanel state={state} onRetrieveCurrentTarget={handleRetrieveCurrentTarget} />
        </aside>
      </div>

      <LedgerPanel history={state.history} onRewind={handleRewind} canRewind={canRewind} />
      <JudgeWalkthroughModal isOpen={isJudgeModalOpen} onClose={() => setIsJudgeModalOpen(false)} registeredTools={registeredTools} onSimulatePrompt={handleSimulatePrompt} />
      <WhyItMattersDrawer isOpen={isWhyModalOpen} onClose={() => setIsWhyModalOpen(false)} />
      <ToolInspectorDrawer isOpen={isToolInspectorOpen} onClose={() => setIsToolInspectorOpen(false)} registeredTools={registeredTools} onExecuteTool={executeAgentTool} />
    </div>
  );
};
