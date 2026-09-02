import React, { useState } from 'react';
import { X, Copy, Check, Play, Terminal } from 'lucide-react';
import { RegisteredToolInfo } from '../webmcp/bridge';

interface JudgeWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredTools: RegisteredToolInfo[];
  onSimulatePrompt?: (promptIndex: number) => void;
}

export const JudgeWalkthroughModal: React.FC<JudgeWalkthroughModalProps> = ({
  isOpen,
  onClose,
  registeredTools,
  onSimulatePrompt
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const prompts = [
    {
      title: 'Prompt 1: Baseline Inspection & Blocker Analysis',
      text: 'Inspect the yard and tell me what blocks C01, where it is located, and which stack is best to clear the top blocker to.',
      expected:
        'Agent invokes inspect_yard and analyze_target(containerId="C01"). Learns C01 is in Stack B buried under C04 and C07 (top). Notes Stack E has 3 open slots as low-risk candidate.'
    },
    {
      title: 'Prompt 2: Safe Autonomous Clearance & Target Retrieval',
      text: 'Clear C01 without using Stack D, then retrieve it.',
      expected:
        'Agent moves C07 to Stack E (or A), then moves C04 to Stack A (or E). C01 becomes topmost. Dynamic tool retrieve_target unlocks. Agent invokes retrieve_target(containerId="C01").'
    },
    {
      title: 'Prompt 3: Invariant Violation & Structured Recovery',
      text: 'Move the top container from Stack B to locked Stack D.',
      expected:
        'Agent invokes move_container to Stack D. Domain engine rejects with ERR_DEST_LOCKED, returning open alternative stacks [A, C, E]. Agent recovers gracefully by picking an unlocked stack.'
    }
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} color="var(--actor-agent)" />
            <h3>Judge Walkthrough & WebMCP Evaluation Guide</h3>
          </div>
          <button type="button" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
            BayShift implements the modern WebMCP specification via{' '}
            <code style={{ color: 'var(--actor-agent)' }}>document.modelContext</code>. Both the human
            operator and the browser AI agent execute through the exact same deterministic domain engine.
          </p>

          <div
            style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid var(--actor-agent-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              marginBottom: 16
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--actor-agent)', fontSize: 12, marginBottom: 4 }}>
              Active WebMCP Tool Registry ({registeredTools.length} tools registered)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {registeredTools.map((t) => (
                <span
                  key={t.name}
                  className="badge"
                  style={{
                    background: t.readOnly ? 'rgba(100, 116, 139, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                    color: t.readOnly ? '#cbd5e1' : '#22d3ee',
                    fontSize: 10
                  }}
                >
                  {t.name} {t.isDynamic ? '(Dynamic)' : ''} &bull; {t.readOnly ? 'read-only' : 'mutating'}
                </span>
              ))}
            </div>
          </div>

          <h4 style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-main)' }}>
            Evaluator Test Prompts (Copy-paste into WebMCP Browser Agent)
          </h4>

          {prompts.map((p, idx) => (
            <div key={idx} className="prompt-copy-block">
              <div className="prompt-copy-header">
                <span className="prompt-copy-title">{p.title}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onSimulatePrompt && (
                    <button
                      type="button"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      className="btn-cyan"
                      onClick={() => {
                        onSimulatePrompt(idx);
                        onClose();
                      }}
                      title="Run automated simulation of this prompt in browser"
                    >
                      <Play size={11} /> Simulate
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => handleCopy(p.text, idx)}
                  >
                    {copiedIndex === idx ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                    {copiedIndex === idx ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="prompt-text">&ldquo;{p.text}&rdquo;</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                <strong>Expected Trajectory:</strong> {p.expected}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-main)', marginBottom: 4 }}>
              How to Test in Chrome or ChatGPT In-App Browser:
            </div>
            <ol style={{ paddingLeft: 18, fontSize: 12, color: 'var(--text-muted)' }}>
              <li>Open Chrome with the WebMCP ModelContext flag enabled, or open inside a compatible AI agent browser.</li>
              <li>Observe the top-bar indicator: if WebMCP is enabled, it displays <strong>CONNECTED</strong>; otherwise <strong>MANUAL MODE</strong>.</li>
              <li>Ask the agent to run any prompt above. Observe that state changes and crane relocations update live with <strong>AGENT</strong> provenance.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
