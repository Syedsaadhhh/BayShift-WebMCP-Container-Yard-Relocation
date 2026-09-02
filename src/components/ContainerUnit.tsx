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
  // Determine color scheme based on container type/priority
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
      className={`container-unit ${colorTheme} ${isTop ? 'is-top' : ''} ${
        isSelected ? 'is-selected' : ''
      } ${isTarget ? 'is-target' : ''}`}
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
      title={`${container.id} - ${container.label || 'Cargo Container'} (Priority: P${container.priority})`}
    >
      {/* 2.5D Roof / Top Lip */}
      <div className="container-roof">
        <div className="corner-casting top-left" />
        <div className="roof-ridge" />
        <div className="corner-casting top-right" />
      </div>

      {/* Main Corrugated Front Body */}
      <div className="container-body">
        {/* Corrugated Vertical Ribs Overlay */}
        <div className="corrugation-overlay" />

        {/* Left Specification Column */}
        <div className="container-left-col">
          <div className="container-id-row">
            <span className="container-serial-prefix">ISO-</span>
            <span className="container-id-text">{container.id}</span>
          </div>
          <span className="container-spec-label">{container.label || 'Freight 40HC'}</span>
        </div>

        {/* Center Operational Status Badges */}
        <div className="container-center-col">
          {isTarget && (
            <span className={`status-pill ${isTop ? 'pill-target-ready' : 'pill-target-buried'}`}>
              {isTop ? '🎯 TARGET READY' : '🎯 TARGET (BURIED)'}
            </span>
          )}
          {!isTarget && blockerIndex !== null && (
            <span className="status-pill pill-blocker">
              ⚠️ BLOCKER #{blockerIndex}
            </span>
          )}
          {isTop && !isTarget && blockerIndex === null && (
            <span className="status-pill pill-movable">
              TOP &bull; MOVABLE
            </span>
          )}
        </div>

        {/* Right Corner Casting & Priority Badge */}
        <div className="container-right-col">
          <span className={`priority-tag p-${container.priority <= 2 ? 'urgent' : container.priority <= 5 ? 'high' : 'standard'}`}>
            P{container.priority}
          </span>
          {/* Vertical Container Locking Rods */}
          <div className="door-rods">
            <div className="rod" />
            <div className="rod" />
          </div>
        </div>
      </div>

      {/* 2.5D Bottom Sill with Corner Castings */}
      <div className="container-bottom-sill">
        <div className="corner-casting bottom-left" />
        <div className="bottom-sill-line" />
        <div className="corner-casting bottom-right" />
      </div>
    </div>
  );
};
