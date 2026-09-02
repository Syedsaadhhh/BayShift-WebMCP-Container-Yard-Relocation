import React from 'react';
import { ActionEvent } from '../domain/types';
import { RotateCcw, Activity, ShieldCheck, CornerDownLeft } from 'lucide-react';

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
          <Activity size={14} className="text-cyan" />
          <span>SHARED OPERATIONAL &amp; PROVENANCE LEDGER</span>
          <span className="ledger-event-counter">({history.length} logged events)</span>
        </div>

        <div className="ledger-actions-group">
          <button
            type="button"
            className="btn-amber ledger-rewind-btn"
            disabled={!canRewind}
            onClick={() => onRewind()}
            title="Undo most recent reversible action"
          >
            <RotateCcw size={12} /> Rewind Latest Action
          </button>
        </div>
      </div>

      <div className="ledger-table-wrapper">
        <table className="ledger-table">
          <thead>
            <tr>
              <th style={{ width: 85 }}>TIMESTAMP</th>
              <th style={{ width: 100 }}>ACTOR</th>
              <th style={{ width: 115 }}>ACTION</th>
              <th>OPERATIONAL DETAILS &amp; RATIONALE</th>
              <th style={{ width: 110, textAlign: 'right' }}>REVERSIBILITY</th>
            </tr>
          </thead>
          <tbody>
            {history.map((evt, idx) => {
              let actorBadgeClass = 'badge-system';
              if (evt.actor === 'human') actorBadgeClass = 'badge-human';
              else if (evt.actor === 'agent') actorBadgeClass = 'badge-agent';

              let detailContent: React.ReactNode = null;
              if (evt.type === 'move') {
                detailContent = (
                  <span>
                    Relocated container <strong className="text-white">{String(evt.payload.containerId)}</strong> from{' '}
                    <strong>Stack {String(evt.payload.fromStack)}</strong> &rarr;{' '}
                    <strong>Stack {String(evt.payload.toStack)}</strong>{' '}
                    <span className="detail-meta">({String(evt.payload.travelSteps)} crane steps)</span>
                    {Boolean(evt.payload.rationale) && (
                      <span className="detail-rationale">&mdash; &ldquo;{String(evt.payload.rationale)}&rdquo;</span>
                    )}
                  </span>
                );
              } else if (evt.type === 'retrieve') {
                detailContent = (
                  <span>
                    Retrieved priority container <strong className="text-emerald">{String(evt.payload.containerId)}</strong> from{' '}
                    <strong>Stack {String(evt.payload.retrievedFrom)}</strong> to terminal dispatch gate.
                  </span>
                );
              } else if (evt.type === 'lock' || evt.type === 'unlock') {
                detailContent = (
                  <span>
                    Corridor <strong>Stack {String(evt.payload.stackId)}</strong> {evt.payload.locked ? 'LOCKED' : 'UNLOCKED'}:{' '}
                    <span className="text-muted">{String(evt.payload.reason)}</span>
                  </span>
                );
              } else if (evt.type === 'priority_change') {
                detailContent = (
                  <span>
                    <strong className="text-amber">{String(evt.payload.event)}:</strong> {String(evt.payload.detail)}
                  </span>
                );
              } else if (evt.type === 'rewind') {
                detailContent = (
                  <span>
                    Restored pre-action yard snapshot for event <code className="code-tag">{String(evt.payload.rewoundEventId)}</code>.
                  </span>
                );
              } else if (evt.type === 'reset') {
                detailContent = <span>{String(evt.payload.message)}</span>;
              } else {
                detailContent = <span>{JSON.stringify(evt.payload)}</span>;
              }

              return (
                <tr key={evt.id} className={`ledger-row ${idx === 0 ? 'is-latest' : ''}`}>
                  <td className="timestamp-cell">{evt.timestamp}</td>
                  <td>
                    <span className={`badge ${actorBadgeClass}`}>
                      {evt.actor === 'agent' ? '🤖 AGENT' : evt.actor === 'human' ? '👤 HUMAN' : '⚙️ SYSTEM'}
                    </span>
                  </td>
                  <td className="action-type-cell">{evt.type}</td>
                  <td className="detail-cell">{detailContent}</td>
                  <td style={{ textAlign: 'right' }}>
                    {evt.reversible ? (
                      <button
                        type="button"
                        className="inline-undo-btn"
                        onClick={() => onRewind(evt.id)}
                        title={`Undo this ${evt.actor} action`}
                      >
                        <CornerDownLeft size={10} /> Undo
                      </button>
                    ) : (
                      <span className="permanent-tag">Permanent</span>
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
