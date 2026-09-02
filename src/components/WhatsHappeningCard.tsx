import React from 'react';
import { YardState } from '../domain/types';
import { findContainerLocation } from '../domain/engine';
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

interface WhatsHappeningCardProps {
  state: YardState;
  onRetrieveCurrentTarget: () => void;
}

export const WhatsHappeningCard: React.FC<WhatsHappeningCardProps> = ({
  state,
  onRetrieveCurrentTarget
}) => {
  const currentTargetId = state.queue.length > 0 ? state.queue[0] : null;
  const targetLocation = currentTargetId ? findContainerLocation(state.stacks, currentTargetId) : null;

  if (!currentTargetId) {
    return (
      <div className="whats-happening-card complete">
        <div className="wh-header">
          <CheckCircle2 size={16} className="text-emerald" />
          <span className="wh-title">Terminal Bay Operations Complete</span>
        </div>
        <p className="wh-desc">All scheduled queue containers successfully retrieved from bay.</p>
      </div>
    );
  }

  const isTargetTopmost = targetLocation?.isTop ?? false;
  const blockers = targetLocation && !isTargetTopmost
    ? targetLocation.stack.containers.slice(targetLocation.index + 1)
    : [];

  const topBlocker = blockers.length > 0 ? blockers[blockers.length - 1] : null;

  return (
    <div className={`whats-happening-card ${isTargetTopmost ? 'target-ready' : 'target-buried'}`}>
      <div className="wh-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={15} color={isTargetTopmost ? '#34d399' : '#fbbf24'} />
          <span className="wh-title">LIVE SITUATION ANALYSIS</span>
        </div>
        <span
          className="badge"
          style={{
            background: isTargetTopmost ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: isTargetTopmost ? '#34d399' : '#fbbf24',
            fontSize: 10
          }}
        >
          {isTargetTopmost ? 'PICKUP READY' : `${blockers.length} BLOCKERS IN BAY`}
        </span>
      </div>

      <div className="wh-body">
        <div className="wh-stat-row">
          <span className="wh-label">Target Container:</span>
          <span className="wh-value highlight-target">
            <strong>{currentTargetId}</strong>{' '}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ({targetLocation ? `Stack ${targetLocation.stack.id}, Slot ${targetLocation.index + 1}` : 'N/A'})
            </span>
          </span>
        </div>

        {isTargetTopmost ? (
          <div className="wh-stat-row">
            <span className="wh-label">Status:</span>
            <span className="wh-value text-emerald font-semibold">
              Exposed &amp; Topmost &mdash; Ready for crane pickup!
            </span>
          </div>
        ) : (
          <>
            <div className="wh-stat-row">
              <span className="wh-label">Blockers Above:</span>
              <span className="wh-value text-amber">
                <strong>{blockers.map((b) => b.id).join(', ')}</strong> (Top: <strong>{topBlocker?.id}</strong>)
              </span>
            </div>
            <div className="wh-stat-row">
              <span className="wh-label">Suggested Move:</span>
              <span className="wh-value text-cyan">
                Relocate top blocker <strong>{topBlocker?.id}</strong> to Stack E (3 open slots)
              </span>
            </div>
          </>
        )}
      </div>

      {isTargetTopmost && (
        <button
          type="button"
          className="btn-primary wh-action-btn"
          onClick={onRetrieveCurrentTarget}
        >
          Dispatch Crane: Retrieve {currentTargetId} Out of Bay <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
};
