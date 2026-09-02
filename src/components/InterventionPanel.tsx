import React from 'react';
import { Truck, ShieldAlert, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { YardState } from '../domain/types';

interface InterventionPanelProps {
  state: YardState;
  onLateTruck: () => void;
  onToggleLock: (stackId: string, locked: boolean) => void;
}

export const InterventionPanel: React.FC<InterventionPanelProps> = ({
  state,
  onLateTruck,
  onToggleLock
}) => {
  const isC08Expedited = state.queue.indexOf('C08') === 1;
  const isStackDLocked = state.stacks.find((s) => s.id === 'D')?.locked ?? false;

  return (
    <div className="rail-section intervention-section">
      <div className="rail-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Truck size={14} color="var(--actor-human)" />
          <span>OPERATOR DISPATCH INTERVENTIONS</span>
        </div>
      </div>

      <div className="intervention-card">
        <div className="intervention-header">
          <span className="intervention-tag">DYNAMIC EVENT</span>
          <span className="intervention-badge-status">
            {isC08Expedited ? 'DISPATCH INJECTED' : 'READY TO TRIGGER'}
          </span>
        </div>

        <button
          type="button"
          className={`late-truck-action-btn ${isC08Expedited ? 'btn-applied' : ''}`}
          onClick={onLateTruck}
          title="Simulate unscheduled late truck expedited arrival at terminal gate"
        >
          <Truck size={15} />
          <span>{isC08Expedited ? 'Re-apply Late Truck Dispatch' : 'Inject Late Truck Update'}</span>
        </button>

        <p className="intervention-explainer">
          Simulates an expedited arrival at Gate 3 for container <strong>C08</strong>. Promotes C08
          to queue position #2 and reserves/locks <strong>Stack D</strong> for crane staging,
          forcing the AI agent to re-inspect and alter its clearance plan.
        </p>
      </div>

      {/* Quick Corridor Locks Overview */}
      <div className="corridor-locks-strip">
        <span className="corridor-label">Safety Corridors:</span>
        <div className="corridor-buttons-row">
          {state.stacks.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`corridor-chip ${s.locked ? 'is-locked' : 'is-open'}`}
              onClick={() => onToggleLock(s.id, !s.locked)}
              title={`${s.locked ? 'Unlock' : 'Lock'} Stack ${s.id}`}
            >
              {s.locked ? <Lock size={10} /> : <Unlock size={10} />}
              <span>{s.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
