import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, CornerDownLeft, RotateCcw, Search } from 'lucide-react';
import { ActionEvent } from '../domain/types';

interface LedgerPanelProps {
  history: ActionEvent[];
  onRewind: (eventId?: string) => void;
  canRewind: boolean;
}

function eventSummary(event: ActionEvent): string {
  if (event.type === 'move') return String(event.payload.containerId) + ' · ' + String(event.payload.fromStack) + ' → ' + String(event.payload.toStack);
  if (event.type === 'retrieve') return String(event.payload.containerId) + ' dispatched to gate';
  if (event.type === 'lock' || event.type === 'unlock') return String(event.payload.stackId) + (event.payload.locked ? ' safety locked' : ' reopened');
  if (event.type === 'late_truck') return String(event.payload.containerId) + ' promoted in pickup queue';
  if (event.type === 'outage') return String(event.payload.stackId) + ' crane availability changed';
  if (event.type === 'target_change') return String(event.payload.containerId) + ' set as target';
  if (event.type === 'rewind') return 'Restored state before ' + String(event.payload.eventId);
  if (event.type === 'reset') return event.payload.message ? String(event.payload.message) : 'Hero scenario restored';
  return event.type;
}

export const LedgerPanel: React.FC<LedgerPanelProps> = ({ history, onRewind, canRewind }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const latest = history[history.length - 1];
  const inspected = history.find((event) => event.id === inspectedId) ?? null;
  const recentEvents = history.slice(-5).reverse();
  const stackSummary = (snapshot: ActionEvent['snapshotBefore']) => snapshot?.stacks
    .filter((stack) => inspected?.changedEntities.includes(stack.id))
    .map((stack) => stack.id + ': [' + stack.containers.map((container) => container.id).join(', ') + ']')
    .join('\n') || 'No physical stack snapshot for this event.';

  return (
    <section className={'ledger-section ' + (isExpanded ? 'is-expanded' : '')} aria-label="Shared action history">
      <div className="ledger-header">
        <button type="button" className="ledger-expand" onClick={() => setIsExpanded((expanded) => !expanded)} aria-expanded={isExpanded}>
          <Activity size={14} />
          <span>LIVE ACTION TRAIL</span>
          <strong>{history.length}</strong>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        {latest ? (
          <div className={'latest-event actor-' + latest.actor}>
            <span>{latest.actor}</span>
            <strong>{latest.type}</strong>
            <p>{eventSummary(latest)}</p>
            <code>v{latest.stateVersionBefore}→{latest.stateVersionAfter}</code>
          </div>
        ) : null}

        <button type="button" className="ledger-rewind-btn" disabled={!canRewind} onClick={() => onRewind()} title="Rewind latest reversible action">
          <RotateCcw size={13} /> Rewind
        </button>
      </div>

      <div className="ledger-expanded-content">
        {inspected ? (
          <div className="change-inspector">
            <div><span>BEFORE · v{inspected.stateVersionBefore}</span><pre>{stackSummary(inspected.snapshotBefore)}</pre></div>
            <div><span>AFTER · v{inspected.stateVersionAfter}</span><pre>{stackSummary(inspected.snapshotAfter)}</pre></div>
            <div><span>CHANGED</span><pre>{inspected.changedEntities.join(' · ')}{'\n'}{eventSummary(inspected)}</pre></div>
          </div>
        ) : null}

        <div className="timeline-events">
          {recentEvents.map((event) => (
            <article key={event.id} className={'timeline-event actor-' + event.actor}>
              <div className="timeline-event-top"><span>{event.timestamp}</span><strong>{event.actor}</strong><code>v{event.stateVersionAfter}</code></div>
              <h3>{event.type.replace('_', ' ')}</h3>
              <p>{eventSummary(event)}</p>
              <div className="timeline-event-actions">
                <button type="button" onClick={() => setInspectedId(inspectedId === event.id ? null : event.id)}><Search size={11} /> Inspect</button>
                {event.reversible ? <button type="button" onClick={() => onRewind(event.id)}><CornerDownLeft size={11} /> Undo</button> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
