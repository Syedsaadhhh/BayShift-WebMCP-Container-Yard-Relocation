import React from 'react';
import { Truck, ShieldAlert, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { YardState } from '../domain/types';

interface InterventionPanelProps {
  state: YardState;
  onLateTruck: () => void;
  onToggleLock: (stackId: string, locked: boolean) => void;
  onToggleOutage: (stackId: string, active: boolean) => void;
}

export const InterventionPanel: React.FC<InterventionPanelProps> = ({
  state,
  onLateTruck,
  onToggleLock,
  onToggleOutage
}) => {
  const isLateTruckApplied = state.queue.indexOf('CX-330') === 1;
  const outageStack = state.stacks.find((stack) => stack.id === 'B05');

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
            {isLateTruckApplied ? 'DISPATCH INJECTED' : 'READY TO TRIGGER'}
          </span>
        </div>

        <button
          type="button"
          className={`late-truck-action-btn ${isLateTruckApplied ? 'btn-applied' : ''}`}
          onClick={onLateTruck}
          title="Simulate unscheduled late truck expedited arrival at terminal gate"
        >
          <Truck size={15} />
          <span>{isLateTruckApplied ? 'Late Truck Priority Applied' : 'Inject Late Truck Update'}</span>
        </button>

        <p className="intervention-explainer">
          Advances the truck ETA for <strong>CX-330</strong> and promotes it to queue position #2.
          The actual shared priority order changes immediately for both operator and agent.
        </p>
        <button type="button" className="late-truck-action-btn" onClick={() => onToggleOutage('B05', !outageStack?.outage)}>
          <AlertTriangle size={14} /> {outageStack?.outage ? 'Clear B05 crane outage' : 'Trigger B05 crane outage'}
        </button>
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
