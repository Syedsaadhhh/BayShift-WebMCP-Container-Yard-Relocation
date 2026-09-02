import React from 'react';
import { Metrics } from '../domain/types';

interface MetricsPanelProps {
  metrics: Metrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  return (
    <div className="rail-section">
      <div className="rail-title">
        <span>Deterministic Yard Metrics</span>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Relocations</div>
          <div className="metric-value">{metrics.relocations}</div>
          <div className="metric-sub">Shuffles performed</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Target Retrieves</div>
          <div className="metric-value" style={{ color: 'var(--status-success)' }}>
            {metrics.retrieves}
          </div>
          <div className="metric-sub">Containers dispatched</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Crane Travel Steps</div>
          <div className="metric-value" style={{ color: 'var(--actor-agent)' }}>
            {metrics.travelSteps}
          </div>
          <div className="metric-sub">&Sigma; |Stack_from - Stack_to|</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Blocking Score</div>
          <div className="metric-value" style={{ color: metrics.blockingScore > 0 ? '#f87171' : '#34d399' }}>
            {metrics.blockingScore}
          </div>
          <div className="metric-sub">Local heuristic score</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
        *Deterministic operations accounting. Local heuristic score reflects buried high-priority cargo count, not an optimality claim.
      </div>
    </div>
  );
};
