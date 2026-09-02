import React from 'react';
import { ActionEvent } from '../domain/types';
import { RotateCcw, Activity } from 'lucide-react';

interface LedgerPanelProps {
  history: ActionEvent[];
  onRewind: (eventId?: string) => void;
  canRewind: boolean;
}

export const LedgerPanel: React.FC<LedgerPanelProps> = ({ history, onRewind, canRewind }) => {
  return (
    <div className="ledger-section">
      <div className="ledger-header">
        <div className="ledger-title">
          <Activity size={14} /> Shared Provenance & Operational Ledger
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-amber"
            style={{ fontSize: 11, padding: '3px 8px' }}
            disabled={!canRewind}
            onClick={() => onRewind()}
            title="Rewind most recent reversible action"
          >
            <RotateCcw size={12} /> Rewind Last Action
          </button>
        </div>
      </div>

      <div className="ledger-table-wrapper">
        <table className="ledger-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Time</th>
              <th style={{ width: 90 }}>Actor</th>
              <th style={{ width: 110 }}>Action</th>
              <th>Details & Operational Rationale</th>
              <th style={{ width: 90, textAlign: 'right' }}>Reversible</th>
            </tr>
          </thead>
          <tbody>
            {history.map((evt) => {
              let badgeClass = 'badge-system';
              if (evt.actor === 'human') badgeClass = 'badge-human';
              else if (evt.actor === 'agent') badgeClass = 'badge-agent';

              let detailText = '';
              if (evt.type === 'move') {
                detailText = `Relocated container ${evt.payload.containerId} from Stack ${evt.payload.fromStack} to Stack ${evt.payload.toStack} (${evt.payload.travelSteps} crane steps). Rationale: ${evt.payload.rationale || 'N/A'}`;
              } else if (evt.type === 'retrieve') {
                detailText = `Retrieved target container ${evt.payload.containerId} from Stack ${evt.payload.retrievedFrom} to dispatch gate.`;
              } else if (evt.type === 'lock' || evt.type === 'unlock') {
                detailText = `Stack ${evt.payload.stackId} ${evt.payload.locked ? 'LOCKED' : 'UNLOCKED'}: ${evt.payload.reason}`;
              } else if (evt.type === 'priority_change') {
                detailText = `${evt.payload.event}: ${evt.payload.detail}`;
              } else if (evt.type === 'rewind') {
                detailText = `Undid action ${evt.payload.rewoundType} (${evt.payload.rewoundEventId}), restoring bay snapshot.`;
              } else if (evt.type === 'reset') {
                detailText = `${evt.payload.message}`;
              } else {
                detailText = JSON.stringify(evt.payload);
              }

              return (
                <tr key={evt.id}>
                  <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{evt.timestamp}</td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{evt.actor}</span>
                  </td>
                  <td style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>
                    {evt.type}
                  </td>
                  <td style={{ color: 'var(--text-main)', fontSize: 12 }}>{detailText}</td>
                  <td style={{ textAlign: 'right' }}>
                    {evt.reversible ? (
                      <span style={{ fontSize: 10, color: 'var(--actor-human)' }}>Reversible</span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Permanent</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
