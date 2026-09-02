import React, { useState } from 'react';
import { Container, Stack, YardState } from '../domain/types';
import { Lock, Unlock, ArrowDown, ShieldAlert, Target } from 'lucide-react';
import { findContainerLocation } from '../domain/engine';
import { ContainerUnit } from './ContainerUnit';

interface BayCanvasProps {
  state: YardState;
  onHumanMove: (containerId: string, fromStack: string, toStack: string) => void;
  onToggleLock: (stackId: string, locked: boolean) => void;
  selectedContainerId: string | null;
  onSelectContainer: (id: string | null) => void;
  onSetTarget: (id: string) => void;
}

export const BayCanvas: React.FC<BayCanvasProps> = ({
  state,
  onHumanMove,
  onToggleLock,
  selectedContainerId,
  onSelectContainer,
  onSetTarget
}) => {
  const currentTarget = state.queue.length > 0 ? state.queue[0] : null;
  const targetLocation = currentTarget ? findContainerLocation(state.stacks, currentTarget) : null;

  // Selected container info
  const selectedLocation = selectedContainerId
    ? findContainerLocation(state.stacks, selectedContainerId)
    : null;

  const handleContainerClick = (container: Container, stack: Stack, isTop: boolean) => {
    if (!isTop) {
      onSelectContainer(container.id);
      return;
    }

    if (selectedContainerId === container.id) {
      onSelectContainer(null);
    } else {
      onSelectContainer(container.id);
    }
  };

  const handleStackClick = (destStack: Stack) => {
    if (!selectedLocation) return;
    if (destStack.id === selectedLocation.stack.id) {
      onSelectContainer(null);
      return;
    }

    onHumanMove(
      selectedLocation.stack.containers[selectedLocation.index].id,
      selectedLocation.stack.id,
      destStack.id
    );
    onSelectContainer(null);
  };

  // Find the active crane trolley position (defaults to selected container stack, or target stack)
  const activeTrolleyStackId = selectedLocation?.stack.id || targetLocation?.stack.id || 'B02';
  const trolleyIndex = Math.max(0, state.stacks.findIndex((stack) => stack.id === activeTrolleyStackId));

  return (
    <div className="bay-canvas-section">
      {/* Overhead RTG Crane Runway Gantry */}
      <div className="crane-gantry-beam">
        <div className="crane-rail-line">
          <div className="crane-hazard-stripes" />
        </div>
        <div className="crane-trolley-track">
          <div className="crane-spreader" style={{ left: `${8 + trolleyIndex * 20}%` }}>
            <div className="spreader-cable" />
            <div className="spreader-head">
              <span className="spreader-label">RTG-CRANE #01</span>
              {selectedContainerId && <span className="spreader-hook-active">&bull; HOOK ENGAGED</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Yard Floor & Bays Grid */}
      {selectedLocation && (
        <div className="selected-container-bar">
          <span><strong>{selectedContainerId}</strong> · {selectedLocation.stack.containers[selectedLocation.index].weightClass} · {selectedLocation.stack.containers[selectedLocation.index].destination}</span>
          <span>{selectedLocation.isTop ? 'Topmost · drag or click a destination' : `Blocked by ${selectedLocation.depth} container(s) · try a move to see the rule explanation`}</span>
          <button type="button" className="btn-cyan" onClick={() => onSetTarget(selectedContainerId!)}><Target size={11} /> Set retrieval target</button>
        </div>
      )}
      <div className="terminal-yard-plane">
        <div className="stacks-grid">
          {state.stacks.map((stack) => {
            const isSourceOfSelection = selectedLocation?.stack.id === stack.id;
            const isLegalTargetForSelection =
              selectedLocation &&
              !isSourceOfSelection &&
              selectedLocation.stack.id !== stack.id;

            return (
              <div
                key={stack.id}
                className={`bay-stack-column ${stack.locked || stack.outage ? 'bay-locked' : ''} ${
                  isLegalTargetForSelection ? 'bay-droppable' : ''
                } ${isSourceOfSelection ? 'bay-source' : ''}`}
                onClick={() => {
                  if (isLegalTargetForSelection) {
                    handleStackClick(stack);
                  }
                }}
                role={isLegalTargetForSelection ? 'button' : undefined}
                tabIndex={isLegalTargetForSelection ? 0 : undefined}
                aria-label={isLegalTargetForSelection ? `Attempt move to ${stack.id}` : `Stack ${stack.id}`}
                onKeyDown={(event) => {
                  if (isLegalTargetForSelection && (event.key === 'Enter' || event.key === ' ')) {
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
                style={{ cursor: isLegalTargetForSelection ? 'pointer' : 'default' }}
              >
                {/* Bay Header */}
                <div className="bay-header-strip">
                  <div className="bay-id-group">
                    <span className="bay-lane-tag">BLOCK {stack.id}</span>
                    <span className="bay-name">STACK {stack.id}</span>
                  </div>

                  {/* Vertical Capacity LED Meter */}
                  <div className="bay-meter" title={`Occupancy: ${stack.containers.length} of ${stack.capacity}`}>
                    {Array.from({ length: stack.capacity }).map((_, i) => (
                      <span
                        key={i}
                        className={`meter-dot ${i < stack.containers.length ? 'dot-active' : ''}`}
                      />
                    ))}
                    <span className="meter-count">{stack.containers.length}/{stack.capacity}</span>
                  </div>
                </div>

                {/* Locked Hazard Overlay if stack is locked */}
                {(stack.locked || stack.outage) && (
                  <div className="bay-lock-banner">
                    <div className="hazard-tape" />
                    <div className="lock-content">
                      <ShieldAlert size={16} />
                      <span>{stack.outage ? 'OUTAGE: CRANE LANE' : 'LOCKED: SAFETY CORRIDOR'}</span>
                    </div>
                  </div>
                )}

                {/* Stacks slots: 4 vertical tiers (tier 0 at bottom, tier 3 at top) */}
                <div className="bay-tier-slots">
                  {Array.from({ length: stack.capacity }).map((_, slotIndex) => {
                    const container = stack.containers[slotIndex];
                    const isTop = container && slotIndex === stack.containers.length - 1;
                    const isTarget = container && container.id === currentTarget;
                    const isBuried = isTarget && !isTop;
                    const isSelected = container && container.id === selectedContainerId;

                    // Active blocker index
                    let blockerIndex: number | null = null;
                    if (
                      container &&
                      targetLocation &&
                      targetLocation.stack.id === stack.id &&
                      slotIndex > targetLocation.index
                    ) {
                      blockerIndex = slotIndex - targetLocation.index;
                    }

                    if (!container) {
                      const isNextDropSlot = slotIndex === stack.containers.length && isLegalTargetForSelection;
                      return (
                        <div
                          key={`empty-${slotIndex}`}
                          className={`bay-slot-box slot-empty ${isNextDropSlot ? 'drop-target-active' : ''}`}
                        >
                          {/* Corner Twistlock Shoes */}
                          <div className="twistlock-shoe tl" />
                          <div className="twistlock-shoe tr" />
                          <div className="twistlock-shoe bl" />
                          <div className="twistlock-shoe br" />

                          {isNextDropSlot ? (
                            <div className="drop-prompt">
                              <ArrowDown size={14} className="bounce-anim" />
                              <span>CLICK TO RELOCATE HERE</span>
                            </div>
                          ) : (
                            <span className="empty-slot-label">TIER {slotIndex + 1} (OPEN)</span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={container.id} className="bay-slot-box slot-filled">
                        <ContainerUnit
                          container={container}
                          isTop={Boolean(isTop)}
                          isTarget={Boolean(isTarget)}
                          isBuried={Boolean(isBuried)}
                          isSelected={Boolean(isSelected)}
                          blockerIndex={blockerIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContainerClick(container, stack, Boolean(isTop));
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

                {/* Bay Foundation & Operator Control */}
                <div className="bay-foundation">
                  <div className="foundation-curb">
                    <span className="ground-marker">LANE-{stack.id}</span>
                    <button
                      type="button"
                      className={`lock-toggle-btn ${stack.locked ? 'is-locked' : 'is-unlocked'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(stack.id, !stack.locked);
                      }}
                      title={stack.locked ? 'Unlock stack corridor for crane moves' : 'Lock stack corridor (safety reservation)'}
                    >
                      {stack.locked ? (
                        <>
                          <Unlock size={11} /> Unlock Corridor
                        </>
                      ) : (
                        <>
                          <Lock size={11} /> Lock Corridor
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
