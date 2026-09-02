import React from 'react';
import { ArrowDown, Lock, ShieldAlert, Target, Unlock } from 'lucide-react';
import { findContainerLocation } from '../domain/engine';
import { Container, RelocationPlan, Stack, YardState } from '../domain/types';
import { AgentTraceEvent } from '../webmcp/bridge';
import { ContainerUnit } from './ContainerUnit';

interface BayCanvasProps {
  state: YardState;
  plan: RelocationPlan | null;
  latestTrace: AgentTraceEvent | null;
  onHumanMove: (containerId: string, fromStack: string, toStack: string) => void;
  onToggleLock: (stackId: string, locked: boolean) => void;
  selectedContainerId: string | null;
  onSelectContainer: (id: string | null) => void;
  onSetTarget: (id: string) => void;
}

export const BayCanvas: React.FC<BayCanvasProps> = ({
  state,
  plan,
  latestTrace,
  onHumanMove,
  onToggleLock,
  selectedContainerId,
  onSelectContainer,
  onSetTarget
}) => {
  const currentTarget = state.targetContainerId;
  const targetLocation = currentTarget ? findContainerLocation(state.stacks, currentTarget) : null;
  const selectedLocation = selectedContainerId ? findContainerLocation(state.stacks, selectedContainerId) : null;
  const nextMove = plan?.moves[0] ?? null;
  const stalePlan = Boolean(plan && plan.basedOnStateVersion !== state.stateVersion);
  const toolClass = latestTrace ? `tool-${latestTrace.tool.replaceAll('_', '-')}` : 'tool-idle';
  const sourceIndex = nextMove ? state.stacks.findIndex((stack) => stack.id === nextMove.fromStack) : -1;
  const destinationIndex = nextMove ? state.stacks.findIndex((stack) => stack.id === nextMove.toStack) : -1;
  const sourceX = sourceIndex >= 0 ? 100 + sourceIndex * 200 : 100;
  const destinationX = destinationIndex >= 0 ? 100 + destinationIndex * 200 : 900;
  const middleX = (sourceX + destinationX) / 2;
  const latestMutation = state.history[state.history.length - 1] ?? null;
  const animatedMove = latestMutation?.type === 'move' ? latestMutation : null;
  const animatedSourceIndex = animatedMove ? state.stacks.findIndex((stack) => stack.id === String(animatedMove.payload.fromStack)) : -1;
  const animatedDestinationIndex = animatedMove ? state.stacks.findIndex((stack) => stack.id === String(animatedMove.payload.toStack)) : -1;
  const animatedMoveStyle = animatedMove ? ({
    '--move-from': `${10 + Math.max(0, animatedSourceIndex) * 20}%`,
    '--move-to': `${10 + Math.max(0, animatedDestinationIndex) * 20}%`
  } as React.CSSProperties) : undefined;

  const handleContainerClick = (container: Container, isTop: boolean) => {
    if (!isTop) {
      onSelectContainer(container.id);
      return;
    }
    onSelectContainer(selectedContainerId === container.id ? null : container.id);
  };

  const handleStackClick = (destination: Stack) => {
    if (!selectedLocation) return;
    if (destination.id === selectedLocation.stack.id) {
      onSelectContainer(null);
      return;
    }
    onHumanMove(
      selectedLocation.stack.containers[selectedLocation.index].id,
      selectedLocation.stack.id,
      destination.id
    );
    onSelectContainer(null);
  };

  const activeTrolleyStackId = selectedLocation?.stack.id ?? nextMove?.fromStack ?? targetLocation?.stack.id ?? 'B02';
  const trolleyIndex = Math.max(0, state.stacks.findIndex((stack) => stack.id === activeTrolleyStackId));

  return (
    <section className={`bay-canvas-section operational-yard ${toolClass} ${stalePlan ? 'yard-stale' : ''}`} aria-label="Live BayShift container yard">
      <div className="yard-atmosphere" aria-hidden="true">
        <div className="yard-haze" />
        <div className="work-light work-light-left" />
        <div className="work-light work-light-right" />
        <div className="yard-vehicle vehicle-one"><i /><i /></div>
        <div className="yard-vehicle vehicle-two"><i /><i /></div>
      </div>

      <div className="crane-superstructure" aria-hidden="true">
        <div className="crane-leg crane-leg-left" />
        <div className="crane-leg crane-leg-right" />
        <div className="crane-gantry-beam">
          <span>RTG 01 · ACTIVE RUNWAY</span>
          <div className="crane-spreader" style={{ left: `${7 + trolleyIndex * 21}%` }}>
            <div className="spreader-cable" />
            <div className="spreader-head">{selectedContainerId || nextMove ? 'HOOK ACTIVE' : 'STANDBY'}</div>
          </div>
        </div>
      </div>

      <div key={latestTrace?.id ?? 'idle-scan'} className="yard-scan" aria-hidden="true" />

      {selectedLocation ? (
        <div className="selected-container-bar">
          <div><span>HUMAN SELECTION</span><strong>{selectedContainerId}</strong></div>
          <p>{selectedLocation.isTop ? 'Topmost · choose a highlighted bay to relocate' : `Buried beneath ${selectedLocation.depth} container${selectedLocation.depth === 1 ? '' : 's'}`}</p>
          <button type="button" onClick={() => onSetTarget(selectedContainerId!)}><Target size={13} /> Make target</button>
        </div>
      ) : null}

      {nextMove ? (
        <svg className="plan-route-overlay" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-label={`Planned move ${nextMove.containerId} from ${nextMove.fromStack} to ${nextMove.toStack}`}>
          <defs>
            <marker id="route-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" /></marker>
          </defs>
          <path className="route-shadow" d={`M ${sourceX} 245 Q ${middleX} 66 ${destinationX} 245`} />
          <path className="route-line" d={`M ${sourceX} 245 Q ${middleX} 66 ${destinationX} 245`} markerEnd="url(#route-arrow)" />
          <g className="route-step" transform={`translate(${middleX - 17} 90)`}>
            <circle cx="17" cy="17" r="16" />
            <text x="17" y="22" textAnchor="middle">{nextMove.step}</text>
          </g>
        </svg>
      ) : null}

      {animatedMove ? (
        <div key={animatedMove.id} className={`moving-container-ghost actor-${animatedMove.actor}`} style={animatedMoveStyle} aria-hidden="true">
          <small>{animatedMove.actor}</small><strong>{String(animatedMove.payload.containerId)}</strong>
        </div>
      ) : null}

      <div className="terminal-yard-plane">
        <div className="yard-grid-lines" aria-hidden="true" />
        <div className="stacks-grid">
          {state.stacks.map((stack) => {
            const isSourceOfSelection = selectedLocation?.stack.id === stack.id;
            const isDropTarget = Boolean(selectedLocation && !isSourceOfSelection);
            const isTargetBay = targetLocation?.stack.id === stack.id;
            const isPlanSource = nextMove?.fromStack === stack.id;
            const isPlanDestination = nextMove?.toStack === stack.id;

            return (
              <article
                key={stack.id}
                className={`bay-stack-column ${stack.locked ? 'bay-locked' : ''} ${stack.outage ? 'bay-outage' : ''} ${isDropTarget ? 'bay-droppable' : ''} ${isSourceOfSelection ? 'bay-source' : ''} ${isTargetBay ? 'target-bay' : ''} ${isPlanSource ? 'plan-origin' : ''} ${isPlanDestination ? 'plan-destination' : ''}`}
                onClick={() => { if (isDropTarget) handleStackClick(stack); }}
                role={isDropTarget ? 'button' : undefined}
                tabIndex={isDropTarget ? 0 : undefined}
                aria-label={isDropTarget ? `Attempt move to ${stack.id}` : `Stack ${stack.id}`}
                onKeyDown={(event) => {
                  if (isDropTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    handleStackClick(stack);
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const raw = event.dataTransfer.getData('application/x-bayshift-container');
                  if (!raw) return;
                  const dragged = JSON.parse(raw) as { containerId: string; fromStack: string };
                  onHumanMove(dragged.containerId, dragged.fromStack, stack.id);
                  onSelectContainer(null);
                }}
              >
                <header className="bay-header-strip">
                  <div className="bay-id-group"><span>BLOCK</span><strong>{stack.id}</strong></div>
                  <div className="bay-status-lights" title={`${stack.containers.length} of ${stack.capacity} positions occupied`}>
                    {Array.from({ length: stack.capacity }).map((_, index) => <i key={index} className={index < stack.containers.length ? 'is-on' : ''} />)}
                  </div>
                </header>

                {stack.locked || stack.outage ? (
                  <div className="bay-lock-banner"><ShieldAlert size={13} /><span>{stack.outage ? 'CRANE OUTAGE' : 'SAFETY LOCK'}</span></div>
                ) : null}

                <div className="bay-tier-slots">
                  {Array.from({ length: stack.capacity }).map((_, slotIndex) => {
                    const container = stack.containers[slotIndex];
                    const isTop = Boolean(container && slotIndex === stack.containers.length - 1);
                    const isTarget = Boolean(container && container.id === currentTarget);
                    const isBuried = Boolean(isTarget && !isTop);
                    const isSelected = Boolean(container && container.id === selectedContainerId);
                    let blockerIndex: number | null = null;
                    if (container && targetLocation && targetLocation.stack.id === stack.id && slotIndex > targetLocation.index) {
                      blockerIndex = slotIndex - targetLocation.index;
                    }

                    if (!container) {
                      const isNextDropSlot = slotIndex === stack.containers.length && isDropTarget;
                      return (
                        <div key={`empty-${slotIndex}`} className={`bay-slot-box slot-empty ${isNextDropSlot ? 'drop-target-active' : ''}`}>
                          {isNextDropSlot ? <div className="drop-prompt"><ArrowDown size={15} /><span>DROP T{slotIndex + 1}</span></div> : <span className="tier-marker">T{slotIndex + 1}</span>}
                        </div>
                      );
                    }

                    return (
                      <div key={container.id} className="bay-slot-box slot-filled">
                        <ContainerUnit
                          container={container}
                          isTop={isTop}
                          isTarget={isTarget}
                          isBuried={isBuried}
                          isSelected={isSelected}
                          blockerIndex={blockerIndex}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleContainerClick(container, isTop);
                          }}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('application/x-bayshift-container', JSON.stringify({ containerId: container.id, fromStack: stack.id }));
                            event.dataTransfer.effectAllowed = 'move';
                            onSelectContainer(container.id);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <footer className="bay-foundation">
                  <span className="ground-marker">LANE {stack.id.slice(1)}</span>
                  {stack.reservedForDestination ? <span className="reserve-marker">{stack.reservedForDestination}</span> : null}
                  <button
                    type="button"
                    className={`lock-toggle-btn ${stack.locked ? 'is-locked' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleLock(stack.id, !stack.locked);
                    }}
                    title={stack.locked ? `Unlock ${stack.id}` : `Lock ${stack.id} safety corridor`}
                    aria-label={stack.locked ? `Unlock ${stack.id}` : `Lock ${stack.id}`}
                  >
                    {stack.locked ? <Unlock size={13} /> : <Lock size={13} />}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </div>

      <div className="yard-legend" aria-label="Operational color legend"><span><i className="agent-color" />Agent plan</span><span><i className="human-color" />Human change</span><span><i className="target-color" />Target</span></div>
    </section>
  );
};
