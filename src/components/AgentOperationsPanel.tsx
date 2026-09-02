import React, { useEffect, useState } from 'react';
import { Activity, Bot, ChevronLeft, ChevronRight, Play, Radar, Route, ShieldAlert } from 'lucide-react';
import { RelocationPlan, YardState } from '../domain/types';
import { AgentTraceEvent } from '../webmcp/bridge';

interface AgentOperationsPanelProps {
  state: YardState;
  trace: AgentTraceEvent[];
  plan: RelocationPlan | null;
  onInspect: () => void;
  onSimulate: () => void;
  onExecuteNext: () => void;
  onHumanIntervene: () => void;
}

export const AgentOperationsPanel: React.FC<AgentOperationsPanelProps> = ({
  state,
  trace,
  plan,
  onInspect,
  onSimulate,
  onExecuteNext,
  onHumanIntervene
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const nextMove = plan?.moves[0] ?? null;
  const stale = Boolean(plan && plan.basedOnStateVersion !== state.stateVersion);
  const latest = trace[trace.length - 1] ?? null;
  const latestMutation = state.history[state.history.length - 1];
  const planId = plan?.id ?? null;
  const agentStatus = stale
    ? 'PLAN STALE'
    : plan
      ? 'PLAN READY'
      : latest?.status === 'rejected'
        ? 'ACTION REJECTED'
        : latest?.tool === 'execute_move'
          ? 'MOVE COMPLETE'
          : latest?.tool === 'retrieve_target'
            ? 'TARGET RETRIEVED'
            : trace.length
              ? 'YARD INSPECTED'
              : 'READY';

  useEffect(() => {
    if (trace.length > 0 || planId || stale) setIsOpen(true);
  }, [trace.length, planId, stale]);

  return (
    <aside className={`agent-dock ${isOpen ? 'is-open' : ''} ${stale ? 'has-alert' : ''}`} aria-label="WebMCP agent operations">
      <button
        type="button"
        className="agent-dock-tab"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="agent-dock-surface"
      >
        <span className="agent-orbit"><Bot size={17} /></span>
        <span className="agent-tab-copy"><small>{latest?.tool ?? 'WEBMCP AGENT'}</small><strong>{agentStatus}</strong></span>
        {isOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      <div id="agent-dock-surface" className="agent-dock-surface">
        <header className="agent-panel-heading">
          <div><span className="agent-live-dot" /><div><small>CONNECTED TO YARD</small><strong>BayShift Agent</strong></div></div>
          <span className="version-chip">v{state.stateVersion}</span>
        </header>

        <div className="agent-command-row">
          <button type="button" onClick={onInspect}><Radar size={14} /> Inspect yard</button>
          <button type="button" className="btn-cyan" onClick={onSimulate}><Route size={14} /> Plan route</button>
        </div>

        {plan ? (
          <section className={`plan-preview-card ${stale ? 'plan-stale' : ''}`}>
            <div className="plan-title-row"><span>{stale ? 'INVALIDATED PLAN' : 'MINIMUM ROUTE'}</span><strong>{plan.moveCount} move{plan.moveCount === 1 ? '' : 's'}</strong></div>
            <div className="plan-move-list">
              {plan.moves.slice(0, 3).map((move) => (
                <div key={`${move.step}-${move.containerId}`} className="plan-move-row">
                  <span>{move.step}</span>
                  <strong>{move.containerId}</strong>
                  <code>{move.fromStack}</code>
                  <i>→</i>
                  <code>{move.toStack}</code>
                </div>
              ))}
              {plan.moves.length === 0 ? <div className="plan-ready">Target is already exposed.</div> : null}
            </div>

            {nextMove ? (
              <div className="validation-mini">
                {nextMove.validation.filter((check) => check.rule !== 'URGENCY').map((check) => (
                  <span key={check.rule} className={check.passed ? 'valid' : 'invalid'}>{check.passed ? '✓' : '×'} {check.rule}</span>
                ))}
              </div>
            ) : null}

            {stale ? (
              <div className="stale-warning"><ShieldAlert size={14} /><div><strong>STALE v{plan.basedOnStateVersion} → v{state.stateVersion}</strong><span>{latestMutation?.actor.toUpperCase() ?? 'SHARED'} action advanced the yard. Inspect and replan before execution.</span></div></div>
            ) : null}

            {nextMove ? (
              <div className="plan-actions">
                <button type="button" className="btn-amber" onClick={onHumanIntervene}>Human locks {nextMove.toStack}</button>
                <button type="button" className="btn-cyan" onClick={onExecuteNext}><Play size={12} /> Execute step 1</button>
              </div>
            ) : null}
          </section>
        ) : (
          <div className="agent-empty"><Route size={18} /><span>Ask an external agent—or use these controls—to inspect the live yard and plan the shortest legal route.</span></div>
        )}

        <section className="agent-trace">
          <div className="trace-heading"><Activity size={12} /> LIVE TOOL ACTIVITY</div>
          {trace.length === 0 ? <div className="trace-empty">Waiting for the first WebMCP call.</div> : trace.slice(-4).reverse().map((event) => (
            <div key={event.id} className={`trace-row trace-${event.status}`}>
              <span className="trace-status-dot" />
              <div><strong>{event.tool}</strong><small>{event.summary}</small></div>
              <span className="trace-version">v{event.stateVersion}</span>
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
};
