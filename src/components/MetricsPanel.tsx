import React from 'react';
import { Metrics } from '../domain/types';
import { Gauge, Shuffle, CheckCircle2, Navigation, AlertOctagon } from 'lucide-react';

interface MetricsPanelProps {
  metrics: Metrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  return (
    <div className="rail-section metrics-section">
      <div className="rail-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={14} color="var(--actor-agent)" />
          <span>DETERMINISTIC YARD ACCOUNTING</span>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Relocations</span>
            <Shuffle size={13} className="text-amber" />
          </div>
          <div className="metric-value">{metrics.relocations}</div>
          <div className="metric-sub">Shuffles executed</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Target Retrieves</span>
            <CheckCircle2 size={13} className="text-emerald" />
          </div>
          <div className="metric-value text-emerald">{metrics.retrieves}</div>
          <div className="metric-sub">Vessel units loaded</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Crane Travel</span>
            <Navigation size={13} className="text-cyan" />
          </div>
          <div className="metric-value text-cyan">{metrics.travelSteps}</div>
          <div className="metric-sub">&Sigma; |Stack_from - Stack_to|</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Blocking Score</span>
            <AlertOctagon size={13} style={{ color: metrics.blockingScore > 0 ? '#f87171' : '#34d399' }} />
          </div>
          <div className="metric-value" style={{ color: metrics.blockingScore > 0 ? '#f87171' : '#34d399' }}>
            {metrics.blockingScore}
          </div>
          <div className="metric-sub">Local heuristic score</div>
        </div>
      </div>

      <div className="metrics-footnote">
        *Deterministic operations accounting. Local heuristic score reflects buried high-priority cargo count, not an optimality claim.
      </div>
    </div>
  );
};
