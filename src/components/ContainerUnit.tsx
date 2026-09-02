import React from 'react';
import { Container } from '../domain/types';

interface ContainerUnitProps {
  container: Container;
  isTop: boolean;
  isTarget: boolean;
  isBuried: boolean;
  isSelected: boolean;
  blockerIndex: number | null; // null if not blocker, 1, 2 etc if blocker
  onClick: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export const ContainerUnit: React.FC<ContainerUnitProps> = ({
  container,
  isTop,
  isTarget,
  isBuried,
  isSelected,
  blockerIndex,
  onClick,
  onDragStart
}) => {
  let colorTheme = 'theme-standard';
  if (isTarget) {
    colorTheme = isTop ? 'theme-target-ready' : 'theme-target-buried';
  } else if (blockerIndex !== null) {
    colorTheme = 'theme-blocker';
  } else if (container.priority <= 2) {
    colorTheme = 'theme-urgent';
  } else if (container.priority <= 5) {
    colorTheme = 'theme-high';
  } else if (container.priority >= 10) {
    colorTheme = 'theme-low';
  }

  return (
    <div
      className={`container-unit ${colorTheme} cargo-${Number(container.id.slice(-1)) % 4} ${isTop ? 'is-top' : ''} ${isSelected ? 'is-selected' : ''} ${isTarget ? 'is-target' : ''} ${isBuried ? 'is-buried' : ''}`}
      onClick={onClick}
      draggable={isTop}
      onDragStart={onDragStart}
      role="button"
      tabIndex={0}
      aria-label={`${container.id}${isTop ? ', topmost and movable' : ', blocked in stack'}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(event as unknown as React.MouseEvent);
        }
      }}
      title={`${container.id} · ${container.label || 'Cargo container'} · Priority ${container.priority}`}
    >
      <div className="container-roof">
        <div className="corner-casting top-left" />
        <div className="roof-ridges"><i /><i /><i /><i /><i /><i /></div>
        <div className="corner-casting top-right" />
      </div>

      <div className="container-body">
        <div className="corrugation-overlay" />
        <div className="container-left-col">
          <span className="cargo-brand">BAYSHIFT CARGO</span>
          <div className="container-id-row">
            <span className="container-id-text">{container.id}</span>
            <span className={`priority-tag p-${container.priority <= 2 ? 'urgent' : container.priority <= 5 ? 'high' : 'standard'}`}>P{container.priority}</span>
          </div>
          <span className="container-spec-label">{container.destination} · {container.type}</span>
        </div>

        <div className="container-center-col">
          {isTarget && (
            <span className={`status-pill ${isTop ? 'pill-target-ready' : 'pill-target-buried'}`}>
              {isTop ? 'TARGET EXPOSED' : 'TARGET BURIED'}
            </span>
          )}
          {!isTarget && blockerIndex !== null && (
            <span className="status-pill pill-blocker">BLOCKER {blockerIndex}</span>
          )}
          {isTop && !isTarget && blockerIndex === null && (
            <span className="status-pill pill-movable">TOP · MOVABLE</span>
          )}
        </div>

        <div className="container-right-col">
          <div className="door-rods">
            <div className="rod" />
            <div className="rod" />
            <span className="door-latch latch-one" />
            <span className="door-latch latch-two" />
          </div>
        </div>
      </div>

      <div className="container-bottom-sill">
        <div className="corner-casting bottom-left" />
        <div className="bottom-sill-line" />
        <div className="corner-casting bottom-right" />
      </div>
    </div>
  );
};
