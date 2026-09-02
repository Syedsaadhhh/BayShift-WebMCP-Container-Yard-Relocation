import React from 'react';
import { YardState } from '../domain/types';
import { findContainerLocation } from '../domain/engine';
import { Package, ArrowDownCircle, AlertTriangle, Layers, Clock } from 'lucide-react';

interface QueuePanelProps {
  state: YardState;
  onRetrieveCurrentTarget: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({ state, onRetrieveCurrentTarget }) => {
  const currentTargetId = state.targetContainerId;
  const targetLocation = currentTargetId
    ? findContainerLocation(state.stacks, currentTargetId)
    : null;

  const isTargetReady = targetLocation ? targetLocation.isTop : false;

  return (
    <div className="rail-section queue-section">
      <div className="rail-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Package size={14} color="var(--actor-agent)" />
          <span>VESSEL PICKUP QUEUE</span>
        </div>
        <span className="queue-count-badge">
          {state.queue.length} MANIFEST UNITS
        </span>
      </div>

      {state.queue.length === 0 ? (
        <div className="queue-completed-card">
          &check; All priority manifest units retrieved successfully.
        </div>
      ) : (
        <>
          {/* Priority Head of Queue Card */}
          {currentTargetId && (
            <div className={`head-pickup-card ${isTargetReady ? 'pickup-ready' : 'pickup-blocked'}`}>
              <div className="pickup-card-top">
                <div className="pickup-id-badge">
                  <span className="pickup-rank-label">NEXT PICKUP #1</span>
                  <span className="pickup-container-id">{currentTargetId}</span>
                </div>
                <span className={`pickup-status-chip ${isTargetReady ? 'chip-ready' : 'chip-blocked'}`}>
                  {isTargetReady ? 'READY FOR CRANE' : 'BURIED'}
                </span>
              </div>

              <div className="pickup-details">
                <div className="detail-item">
                  <span className="detail-label">Bay Location:</span>
                  <span className="detail-val">
                    {targetLocation ? `Stack ${targetLocation.stack.id} &bull; Tier ${targetLocation.index + 1}` : 'Unknown'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Blocker Depth:</span>
                  <span className={`detail-val ${isTargetReady ? 'text-emerald' : 'text-amber'}`}>
                    {targetLocation?.depth === 0 ? '0 (Topmost)' : `${targetLocation?.depth ?? 0} units above`}
                  </span>
                </div>
              </div>

              {isTargetReady ? (
                <button
                  type="button"
                  className="crane-dispatch-btn"
                  onClick={onRetrieveCurrentTarget}
                >
                  <ArrowDownCircle size={15} /> Dispatch Crane: Retrieve {currentTargetId}
                </button>
              ) : (
                <div className="pickup-guidance-hint">
                  <AlertTriangle size={12} color="#fbbf24" />
                  <span>Relocate top blockers to clear retrieval path</span>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Manifest Schedule */}
          <div className="upcoming-manifest">
            <div className="manifest-subhead">
              <Clock size={11} /> UPCOMING DISPATCH SCHEDULE
            </div>
            <div className="manifest-list">
              {state.queue.slice(1, 5).map((id, idx) => {
                const loc = findContainerLocation(state.stacks, id);
                return (
                  <div key={id} className="manifest-row">
                    <div className="manifest-left">
                      <span className="manifest-seq">#{idx + 2}</span>
                      <span className="manifest-id">{id}</span>
                    </div>
                    <div className="manifest-right">
                      {loc ? (
                        <span className="manifest-loc">
                          Stack {loc.stack.id} &bull; Tier {loc.index + 1}
                        </span>
                      ) : (
                        <span className="manifest-dispatched">Retrieved</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {state.queue.length > 5 && (
                <div className="manifest-more">
                  +{state.queue.length - 5} additional containers in vessel queue
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
