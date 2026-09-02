import React from 'react';
import { Bot, Play, Radar, Route, ShieldAlert } from 'lucide-react';
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
  state, trace, plan, onInspect, onSimulate, onExecuteNext, onHumanIntervene
}) => {
  const nextMove = plan?.moves[0];
  const stale = Boolean(plan && plan.basedOnStateVersion !== state.stateVersion);

  return (
    <section className="agent-operations-panel">
      <div className="agent-panel-heading">
        <div><Bot size={15} /><span>AGENT OPERATIONS</span></div>
        <span className="version-chip">LIVE v{state.stateVersion}</span>
      </div>

      <div className="agent-command-row">
        <button type="button" onClick={onInspect}><Radar size={12} /> Inspect</button>
        <button type="button" className="btn-cyan" onClick={onSimulate}><Route size={12} /> Simulate</button>
      </div>

      {plan ? (
        <div className={`plan-preview-card ${stale ? 'plan-stale' : ''}`}>
          <div className="plan-title-row">
            <span>PLAN PREVIEW · v{plan.basedOnStateVersion}</span>
            <strong>{plan.moveCount} moves</strong>
          </div>
          {nextMove ? (
            <>
              <div className="plan-route">
                <span className="ghost-container">{nextMove.containerId}</span>
                <span>{nextMove.fromStack}</span><span>→</span><span className="destination-outline">{nextMove.toStack}</span>
              </div>
              <div className="validation-mini">
                {nextMove.validation.filter((check) => check.rule !== 'URGENCY').map((check) => (
                  <span key={check.rule} className={check.passed ? 'valid' : 'invalid'}>{check.passed ? '✓' : '×'} {check.rule}</span>
                ))}
              </div>
            </>
          ) : <div className="plan-ready">Target already exposed.</div>}

          {stale && <div className="stale-warning"><ShieldAlert size={12} /> Yard changed to v{state.stateVersion}; executing this v{plan.basedOnStateVersion} plan will prove STALE_STATE protection.</div>}
          {nextMove && (
            <div className="plan-actions">
              <button type="button" className="btn-amber" onClick={onHumanIntervene}>Human: lock {nextMove.toStack}</button>
              <button type="button" className="btn-cyan" onClick={onExecuteNext}><Play size={11} /> Execute step 1</button>
            </div>
          )}
        </div>
      ) : <div className="agent-empty">Inspect the shared yard, then simulate a minimum-relocation plan.</div>}

      <div className="agent-trace">
        <div className="trace-heading">AUDITABLE TOOL TRACE</div>
        {trace.length === 0 ? <div className="trace-empty">No agent calls yet.</div> : trace.slice(-5).reverse().map((event) => (
          <div key={event.id} className={`trace-row trace-${event.status}`}>
            <span className="trace-time">{event.timestamp}</span>
            <div><strong>{event.tool}</strong><small>{event.summary}</small></div>
            <span className="trace-version">v{event.stateVersion}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
