import React from 'react';
import { YardState } from '../domain/types';
import { findContainerLocation } from '../domain/engine';
import { CheckCircle2, ArrowDownCircle, AlertCircle } from 'lucide-react';

interface QueuePanelProps {
  state: YardState;
  onRetrieveCurrentTarget: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({ state, onRetrieveCurrentTarget }) => {
  const currentTargetId = state.queue.length > 0 ? state.queue[0] : null;
  const targetLocation = currentTargetId
    ? findContainerLocation(state.stacks, currentTargetId)
    : null;

  const isTargetReady = targetLocation ? targetLocation.isTop : false;

  return (
    <div className="rail-section">
      <div className="rail-title">
        <span>Retrieval Priority Queue</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-dim)' }}>
          {state.queue.length} pending
        </span>
      </div>

      {state.queue.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--status-success)', padding: '10px 0' }}>
          &check; All containers retrieved! Bay clearance complete.
        </div>
      ) : (
        <>
          {/* Current Head of Queue Card */}
          {currentTargetId && (
            <div
              style={{
                background: isTargetReady
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${isTargetReady ? '#059669' : '#b45309'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                marginBottom: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isTargetReady ? '#34d399' : '#fbbf24' }}>
                  NEXT PICKUP: {currentTargetId}
                </span>
                <span
                  className="badge"
                  style={{
                    background: isTargetReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: isTargetReady ? '#34d399' : '#fbbf24',
                    fontSize: 10
                  }}
                >
                  {isTargetReady ? 'EXPOSED / TOP' : `BURIED (${targetLocation?.depth ?? 0} BLOCKERS)`}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0' }}>
                Location: {targetLocation ? `Stack ${targetLocation.stack.id} (Slot ${targetLocation.index + 1})` : 'Unknown'}
              </div>

              {isTargetReady ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
                  onClick={onRetrieveCurrentTarget}
                >
                  <ArrowDownCircle size={14} /> Dispatch Crane: Retrieve {currentTargetId}
                </button>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <AlertCircle size={12} color="#fbbf24" /> Relocate blockers to expose for crane pickup
                </div>
              )}
            </div>
          )}

          {/* Upcoming items preview */}
          <div className="queue-list">
            {state.queue.slice(1, 6).map((id, idx) => {
              const loc = findContainerLocation(state.stacks, id);
              return (
                <div key={id} className="queue-item">
                  <div className="queue-item-left">
                    <span className="queue-rank">#{idx + 2}</span>
                    <span className="queue-id">{id}</span>
                  </div>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                    {loc ? `Stack ${loc.stack.id} (${loc.isTop ? 'Top' : 'Slot ' + (loc.index + 1)})` : 'Retrieved'}
                  </span>
                </div>
              );
            })}
            {state.queue.length > 6 && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 4 }}>
                +{state.queue.length - 6} more upcoming in queue
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
