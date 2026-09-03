import React, { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove, findContainerLocation, resetScenario, retrieveTarget, rewindYard, setLaneOrCraneOutage, setRetrievalTarget, setStackLock, triggerLateTruckUpdate } from './domain/engine';
import { createInitialState } from './domain/scenario';
import { RelocationPlan, YardState } from './domain/types';
import { AgentTraceEvent, RegisteredToolInfo, WebMCPBridge } from './webmcp/bridge';
import { BayCanvas } from './components/BayCanvas';
import { LedgerPanel } from './components/LedgerPanel';
import { JudgeWalkthroughModal } from './components/JudgeWalkthroughModal';
import { WhyItMattersDrawer } from './components/WhyItMattersDrawer';
import { ToolInspectorDrawer } from './components/ToolInspectorDrawer';
import { AgentOperationsPanel } from './components/AgentOperationsPanel';
import { AlertTriangle, Bot, Box, CheckCircle, HelpCircle, Radio, RefreshCw, RotateCcw, Target, Truck, Wrench } from 'lucide-react';
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
    const registrationRetry = window.setTimeout(() => void bridge.registerAll(), 350);
    return () => {
      window.clearTimeout(registrationRetry);
      bridge.cleanup();
    };
  }, []);

  useEffect(() => {
    // Plans are valid only for the version that produced them. Native WebMCP
    // calls and human actions both advance the shared yard independently.
    setActivePlan((plan) => plan && plan.basedOnStateVersion !== state.stateVersion ? null : plan);
  }, [state.stateVersion]);

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
    showBanner(`New live mission restored at yard v${fresh.stateVersion}`, 'system');
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
    const raw = await executeAgentTool('execute_move', { containerId: move.containerId, fromStack: move.fromStack, toStack: move.toStack, rationale: `Executing deterministic ${activePlan.id}`, expectedStateVersion: activePlan.basedOnStateVersion });
    const result = JSON.parse(raw) as { ok?: boolean };
    if (result.ok !== false) setActivePlan(null);
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
  const targetLocation = state.targetContainerId ? findContainerLocation(state.stacks, state.targetContainerId) : null;
  const targetRecord = targetLocation?.stack.containers[targetLocation.index] ?? null;
  const blockerCount = targetLocation?.depth ?? 0;
  const latestTrace = agentTrace[agentTrace.length - 1] ?? null;
  const b05 = state.stacks.find((stack) => stack.id === 'B05');

  return (
    <div className="app-container cinematic-shell">
      <header className="command-bar">
        <div className="brand-lockup">
          <span className="brand-mark"><Box size={21} /></span>
          <div><strong>BayShift</strong><small>Shared yard intelligence</small></div>
        </div>

        <section className={`mission-capsule ${blockerCount === 0 ? 'mission-ready' : ''}`} aria-label="Current retrieval mission">
          <div className="mission-target-icon"><Target size={17} /></div>
          <div className="mission-copy">
            <span>Priority retrieval</span>
            <strong>{state.targetContainerId ?? 'Yard clear'}</strong>
          </div>
          {state.targetContainerId ? (
            <div className="mission-condition">
              <strong>{blockerCount === 0 ? 'EXPOSED' : `${blockerCount} BLOCKERS`}</strong>
              <span>{targetLocation?.stack.id ?? '—'} · truck {targetRecord?.truckEta ?? '—'}</span>
            </div>
          ) : <div className="mission-condition"><strong>COMPLETE</strong><span>Dispatched to gate</span></div>}
          {blockerCount === 0 && state.targetContainerId ? (
            <button type="button" className="retrieve-cta" onClick={handleRetrieveCurrentTarget}>Retrieve now</button>
          ) : null}
        </section>

        <div className="live-state-cluster">
          <span className={`connection-signal ${isWebMCPSupported ? 'is-live' : ''}`}><Radio size={12} /> {isWebMCPSupported ? 'WebMCP live' : 'Simulator'}</span>
          <span className="state-version">YARD v{state.stateVersion}</span>
        </div>
      </header>

      {bannerNotice ? (
        <div className={`event-pulse-banner banner-${bannerNotice.actor}`}>
          {bannerNotice.actor === 'agent' ? <Bot size={15} /> : bannerNotice.actor === 'human' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          <span>{bannerNotice.text}</span>
        </div>
      ) : null}

      <main className="yard-stage">
        <BayCanvas
          state={state}
          plan={activePlan}
          latestTrace={latestTrace}
          onHumanMove={handleHumanMove}
          onToggleLock={handleToggleLock}
          selectedContainerId={selectedContainerId}
          onSelectContainer={setSelectedContainerId}
          onSetTarget={handleSetTarget}
        />

        <nav className="operator-dock" aria-label="Human yard controls">
          <span className="dock-label">HUMAN</span>
          <button type="button" className="dock-action is-warning" onClick={handleLateTruck} title="Inject a late-truck priority event"><Truck size={16} /><span>Late truck</span></button>
          <button type="button" className={b05?.outage ? 'dock-action is-danger' : 'dock-action'} onClick={() => handleOutage('B05', !b05?.outage)} title="Toggle B05 crane outage"><AlertTriangle size={16} /><span>{b05?.outage ? 'Clear outage' : 'B05 outage'}</span></button>
          <button type="button" className="dock-action" onClick={() => handleRewind()} disabled={!canRewind} title="Rewind the latest physical action"><RotateCcw size={16} /><span>Rewind</span></button>
          <button type="button" className="dock-action" onClick={handleReset} title="Restore the seeded v37 scenario"><RefreshCw size={16} /><span>Reset yard</span></button>
          <span className="dock-divider" />
          <button type="button" className="dock-action" onClick={() => setIsToolInspectorOpen(true)} title="Inspect all registered WebMCP tools"><Wrench size={16} /><span>{registeredTools.length} tools</span></button>
          <button type="button" className="dock-action" onClick={() => setIsJudgeModalOpen(true)} title="Open the recorded demo guide"><Bot size={16} /><span>Demo</span></button>
          <button type="button" className="dock-action" onClick={() => setIsWhyModalOpen(true)} title="Why BayShift matters"><HelpCircle size={16} /><span>About</span></button>
        </nav>

        <AgentOperationsPanel state={state} trace={agentTrace} plan={activePlan} onInspect={() => void handleAgentInspect()} onSimulate={() => void handleAgentSimulate()} onExecuteNext={() => void handleAgentExecuteNext()} onHumanIntervene={() => activePlan?.moves[0] && handleToggleLock(activePlan.moves[0].toStack, true)} />
        <LedgerPanel history={state.history} onRewind={handleRewind} canRewind={canRewind} />
      </main>

      <JudgeWalkthroughModal isOpen={isJudgeModalOpen} onClose={() => setIsJudgeModalOpen(false)} registeredTools={registeredTools} onSimulatePrompt={handleSimulatePrompt} />
      <WhyItMattersDrawer isOpen={isWhyModalOpen} onClose={() => setIsWhyModalOpen(false)} />
      <ToolInspectorDrawer isOpen={isToolInspectorOpen} onClose={() => setIsToolInspectorOpen(false)} registeredTools={registeredTools} onExecuteTool={executeAgentTool} targetId={state.targetContainerId} stateVersion={state.stateVersion} />
    </div>
  );
};
