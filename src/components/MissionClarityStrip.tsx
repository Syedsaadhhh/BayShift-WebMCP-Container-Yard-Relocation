import React from 'react';
import { Target, ArrowUpDown, UserCheck, Bot, History } from 'lucide-react';

export const MissionClarityStrip: React.FC<{ target?: string | null }> = ({ target = 'CX-204' }) => {
  return (
    <div className="mission-clarity-strip">
      <div className="mission-pill">
        <Target size={14} className="icon-target" />
        <div>
          <span className="pill-label">CURRENT GOAL</span>
          <span className="pill-value">Retrieve target pickup <strong>{target ?? '—'}</strong></span>
        </div>
      </div>

      <div className="mission-pill">
        <ArrowUpDown size={14} className="icon-rule" />
        <div>
          <span className="pill-label">PHYSICAL RULE</span>
          <span className="pill-value">Only topmost containers can move directly</span>
        </div>
      </div>

      <div className="mission-pill">
        <UserCheck size={14} className="icon-human" />
        <div>
          <span className="pill-label">HUMAN OPERATOR</span>
          <span className="pill-value">Relocate top units &bull; Lock corridors &bull; Late trucks</span>
        </div>
      </div>

      <div className="mission-pill">
        <Bot size={14} className="icon-agent" />
        <div>
          <span className="pill-label">AI AGENT (WebMCP)</span>
          <span className="pill-value">Inspect &bull; Simulate &bull; Clear blockers &bull; Retrieve</span>
        </div>
      </div>

      <div className="mission-pill">
        <History size={14} className="icon-rewind" />
        <div>
          <span className="pill-label">STATE & AUDIT</span>
          <span className="pill-value">Versioned shared state &bull; Provenance &bull; Reversible</span>
        </div>
      </div>
    </div>
  );
};
