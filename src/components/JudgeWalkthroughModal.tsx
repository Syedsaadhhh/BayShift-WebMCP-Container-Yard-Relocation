import React, { useState } from 'react';
import { X, Copy, Check, Play, Terminal, ShieldAlert } from 'lucide-react';
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

  const primaryPrompts = [
    {
      id: 'A',
      title: 'Prompt A: Inspect & Explain Blockers (Read-only Analysis)',
      text: 'Inspect the yard and explain what blocks C01. Do not move anything yet.',
      expected:
        'Agent invokes inspect_yard() and analyze_target(containerId="C01"). Identifies C01 is in Stack B, slot 0 (buried under C04 and top blocker C07). Notes open candidate stacks without performing mutations.'
    },
    {
      id: 'B',
      title: 'Prompt B: Constraint-Aware Clearance & Retrieval',
      text: 'Clear C01 without using Stack D. Make one legal relocation at a time, check the state after each move, and retrieve C01 when it becomes available.',
      expected:
        'Agent moves C07 from B to E (or A), checks state, moves C04 from B to A (or E). C01 becomes topmost; retrieve_target dynamically registers. Agent invokes retrieve_target(C01).'
    },
    {
      id: 'C',
      title: 'Prompt C: Co-Operational Adaptation (Late Truck Event)',
      text: 'The yard just changed because I updated an operator constraint. Re-inspect the current state before doing anything else, explain what changed, then continue legally.',
      expected:
        'Agent invokes inspect_yard(). Discovers Stack D is locked by operator and container C08 has been expedited to queue position #2. Synthesizes revised plan avoiding Stack D.'
    }
  ];

  const failurePrompt = {
    title: 'Optional Failure Prompt: Invariant Violation & Error Recovery',
    text: 'Try moving the current top blocker to locked Stack D. If rejected, use the structured error to recover.',
    expected:
      'Agent invokes move_container to Stack D. Engine rejects with ERR_DEST_LOCKED and returns legalNext: ["A", "C", "E"]. Agent parses structured error and successfully relocates to an unlocked stack.'
  };

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
            crane operator and the browser AI agent execute through the exact same deterministic domain engine.
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
              Registered WebMCP Tools ({registeredTools.length} currently active):
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
            Primary Copy-Paste Evaluator Prompts
          </h4>

          {primaryPrompts.map((p, idx) => (
            <div key={p.id} className="prompt-copy-block">
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

          <h4 style={{ fontSize: 13, margin: '14px 0 8px 0', color: 'var(--text-main)' }}>
            Optional Failure & Recovery Prompt
          </h4>

          <div className="prompt-copy-block" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="prompt-copy-header">
              <span className="prompt-copy-title" style={{ color: '#f87171' }}>
                <ShieldAlert size={12} style={{ display: 'inline', marginRight: 4 }} />
                {failurePrompt.title}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {onSimulatePrompt && (
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    className="btn-danger"
                    onClick={() => {
                      onSimulatePrompt(3);
                      onClose();
                    }}
                    title="Simulate move to locked stack and recovery"
                  >
                    <Play size={11} /> Simulate
                  </button>
                )}
                <button
                  type="button"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => handleCopy(failurePrompt.text, 99)}
                >
                  {copiedIndex === 99 ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  {copiedIndex === 99 ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="prompt-text">&ldquo;{failurePrompt.text}&rdquo;</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
              <strong>Expected Trajectory:</strong> {failurePrompt.expected}
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-main)', marginBottom: 4 }}>
              Testing Instructions for Evaluators:
            </div>
            <ol style={{ paddingLeft: 18, fontSize: 12, color: 'var(--text-muted)' }}>
              <li>Open in Chrome with <code>chrome://flags/#enable-webmcp-testing</code> enabled, or inside the ChatGPT in-app browser.</li>
              <li>When connected, the top-bar badge turns green: <strong>WebMCP: Connected</strong>.</li>
              <li>Submit any prompt above. The agent invokes semantic WebMCP tools on <code>document.modelContext</code> and all mutations render in the live bay with <strong>AGENT</strong> provenance.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
