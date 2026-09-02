import React from 'react';
import { X, HelpCircle, Compass, Cpu, UserCheck } from 'lucide-react';

interface WhyItMattersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhyItMattersDrawer: React.FC<WhyItMattersDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} color="var(--actor-human)" />
            <h3>Operational Context: Why This Matters</h3>
          </div>
          <button type="button" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <blockquote
            style={{
              padding: '12px 16px',
              borderLeft: '3px solid var(--actor-human)',
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#f0f6fc',
              fontSize: 13,
              fontStyle: 'italic',
              marginBottom: 16
            }}
          >
            &ldquo;Containers are stacked to save yard space. When the next pickup is buried, operators must
            reshuffle blockers. Extra reshuffles consume crane time and reduce yard productivity. This demo
            uses a small deterministic bay to show a new human-agent operating model, not a production
            terminal optimizer.&rdquo;
          </blockquote>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Compass size={20} color="var(--actor-agent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>The NP-Hard Relocation Problem</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  In real maritime container terminals, only the topmost container in a stack can be reached by
                  the rubber-tired gantry (RTG) crane. Extracting buried cargo requires reshuffling blockers into
                  adjacent stacks without causing secondary blockages.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <UserCheck size={20} color="var(--actor-human)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>The Co-Operational Advantage</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  Human operators manage unexpected constraints: a sudden rail maintenance corridor, or a
                  &ldquo;Late truck arrival&rdquo; that shifts delivery schedules. The AI agent adapts
                  autonomously by simulating alternate legal moves using structured tools rather than fragile
                  DOM clicks.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Cpu size={20} color="var(--status-success)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Why WebMCP Over Screen Scraping</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  DOM-based browser agents break on responsive layouts, CSS changes, and race conditions. WebMCP
                  gives the agent a verifiable semantic contract directly through{' '}
                  <code>document.modelContext</code>, with immediate validation, structured error codes, and
                  deterministic rollback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
