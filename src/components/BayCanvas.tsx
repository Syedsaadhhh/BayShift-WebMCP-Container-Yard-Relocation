import React, { useState } from 'react';
import { Container, Stack, YardState } from '../domain/types';
import { Lock, Unlock, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { findContainerLocation } from '../domain/engine';

interface BayCanvasProps {
  state: YardState;
  onHumanMove: (containerId: string, fromStack: string, toStack: string) => void;
  onToggleLock: (stackId: string, locked: boolean) => void;
  selectedContainerId: string | null;
  onSelectContainer: (id: string | null) => void;
}

export const BayCanvas: React.FC<BayCanvasProps> = ({
  state,
  onHumanMove,
  onToggleLock,
  selectedContainerId,
  onSelectContainer
}) => {
  const [hoveredStackId, setHoveredStackId] = useState<string | null>(null);

  const currentTarget = state.queue.length > 0 ? state.queue[0] : null;

  // Selected container info
  const selectedLocation = selectedContainerId
    ? findContainerLocation(state.stacks, selectedContainerId)
    : null;

  const handleContainerClick = (container: Container, stack: Stack, isTop: boolean) => {
    if (!isTop) {
      // Just select for detail inspection
      onSelectContainer(container.id);
      return;
    }

    if (selectedContainerId === container.id) {
      // Toggle off
      onSelectContainer(null);
    } else {
      onSelectContainer(container.id);
    }
  };

  const handleStackClick = (destStack: Stack) => {
    if (!selectedLocation || !selectedLocation.isTop) return;
    if (destStack.id === selectedLocation.stack.id) {
      onSelectContainer(null);
      return;
    }

    // Attempt move
    onHumanMove(selectedLocation.stack.containers[selectedLocation.index].id, selectedLocation.stack.id, destStack.id);
    onSelectContainer(null);
  };

  return (
    <div className="bay-canvas-section">
      <div className="bay-header">
        <div className="bay-title">
          <span>Container Bay Grid (5 Stacks &bull; Max Capacity 4)</span>
          {selectedLocation && (
            <span style={{ fontSize: 12, color: 'var(--actor-human)', marginLeft: 12 }}>
              &rarr; Selected top container <strong>{selectedContainerId}</strong>. Click an open destination stack to relocate.
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Only top container of each stack can be moved directly
        </div>
      </div>

      <div className="stacks-grid">
        {state.stacks.map((stack) => {
          const isSourceOfSelection = selectedLocation?.stack.id === stack.id;
          const isLegalTargetForSelection =
            selectedLocation &&
            selectedLocation.isTop &&
            !isSourceOfSelection &&
            !stack.locked &&
            stack.containers.length < stack.capacity;

          return (
            <div
              key={stack.id}
              className={`stack-column ${stack.locked ? 'locked-stack' : ''} ${
                isLegalTargetForSelection ? 'selected-dest' : ''
              }`}
              onMouseEnter={() => setHoveredStackId(stack.id)}
              onMouseLeave={() => setHoveredStackId(null)}
              onClick={() => {
                if (isLegalTargetForSelection) {
                  handleStackClick(stack);
                }
              }}
              style={{ cursor: isLegalTargetForSelection ? 'pointer' : 'default' }}
            >
              <div className="stack-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="stack-label">STACK {stack.id}</span>
                  {stack.locked ? (
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                      LOCKED
                    </span>
                  ) : null}
                </div>
                <span className="stack-capacity-badge">
                  {stack.containers.length} / {stack.capacity}
                </span>
              </div>

              {/* Stacks slots: 4 slots total */}
              <div className="stack-slots">
                {Array.from({ length: stack.capacity }).map((_, slotIndex) => {
                  const container = stack.containers[slotIndex];
                  const isTop = container && slotIndex === stack.containers.length - 1;
                  const isTarget = container && container.id === currentTarget;
                  const isBuried = isTarget && !isTop;
                  const isSelected = container && container.id === selectedContainerId;

                  if (!container) {
                    const isNextDropSlot = slotIndex === stack.containers.length && isLegalTargetForSelection;
                    return (
                      <div
                        key={`empty-${slotIndex}`}
                        className={`slot-box slot-empty ${isNextDropSlot ? 'droppable-target' : ''}`}
                      >
                        {isNextDropSlot ? (
                          <span style={{ color: 'var(--actor-agent)', fontWeight: 600 }}>Click to Drop</span>
                        ) : (
                          `Slot ${slotIndex + 1} (Empty)`
                        )}
                      </div>
                    );
                  }

                  let priorityClass = '';
                  if (container.priority <= 2) priorityClass = 'p-urgent';
                  else if (container.priority <= 5) priorityClass = 'p-high';

                  return (
                    <div
                      key={container.id}
                      className="slot-box"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContainerClick(container, stack, isTop);
                      }}
                    >
                      <div
                        className={`container-card ${isTop ? 'is-top' : ''} ${
                          isSelected ? 'is-selected' : ''
                        } ${isTarget ? 'is-current-target' : ''} ${isBuried ? 'is-buried' : ''}`}
                      >
                        <div className="container-header">
                          <span className="container-id">{container.id}</span>
                          <span className={`container-priority ${priorityClass}`}>
                            P{container.priority}
                          </span>
                        </div>

                        <div className="container-label" title={container.label}>
                          {container.label || 'Cargo Container'}
                        </div>

                        <div className="container-badges">
                          {isTop && <span className="tag-top">TOP</span>}
                          {isTarget && (
                            <span className="tag-target">
                              {isTop ? 'TARGET READY' : 'TARGET (BURIED)'}
                            </span>
                          )}
                          {!isTarget &&
                            currentTarget &&
                            selectedLocation?.stack.id === stack.id &&
                            slotIndex > (selectedLocation?.index ?? 99) && (
                              <span className="tag-blocker">BLOCKER</span>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="stack-footer">
                <button
                  type="button"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(stack.id, !stack.locked);
                  }}
                  title={stack.locked ? 'Unlock this stack for crane moves' : 'Lock this stack (operator reservation)'}
                >
                  {stack.locked ? (
                    <>
                      <Unlock size={12} /> Unlock
                    </>
                  ) : (
                    <>
                      <Lock size={12} /> Lock Stack
                    </>
                  )}
                </button>

                {isLegalTargetForSelection && (
                  <span style={{ fontSize: 11, color: 'var(--actor-agent)', fontWeight: 600 }}>
                    Relocate here &rarr;
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
