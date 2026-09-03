import React, { useState } from 'react';
import { X, Copy, Check, Play, Terminal, ShieldAlert } from 'lucide-react';
import { RegisteredToolInfo } from '../webmcp/bridge';

interface JudgeWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredTools: RegisteredToolInfo[];
  onSimulatePrompt?: (promptIndex: number) => void;
  targetId: string | null;
}

export const JudgeWalkthroughModal: React.FC<JudgeWalkthroughModalProps> = ({
  isOpen,
  onClose,
  registeredTools,
  onSimulatePrompt,
  targetId
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const activeTarget = targetId ?? 'the current target';

  const primaryPrompts = [
    {
      id: 'A',
      title: 'Prompt A: Inspect & Explain Blockers (Read-only Analysis)',
      text: `Inspect the yard and explain what blocks ${activeTarget}. Do not move anything yet.`,
      expected:
        `Agent invokes inspect_yard() and analyze_blockers(containerId="${activeTarget}"). It identifies the current physical blockers and reads the current stateVersion without mutating the yard.`
    },
    {
      id: 'B',
      title: 'Prompt B: Constraint-Aware Clearance & Retrieval',
      text: `Simulate the minimum relocation plan for ${activeTarget}. I will lock a destination before you execute; recover from STALE_STATE, re-inspect, then clear and retrieve the target.`,
      expected:
        'Agent calls simulate_relocations, then execute_move with expectedStateVersion. The operator lock increments the yard version, the old command returns STALE_STATE, and the agent re-inspects and replans.'
    },
    {
      id: 'C',
      title: 'Prompt C: Co-Operational Adaptation (Late Truck Event)',
      text: 'The yard just changed because I updated an operator constraint. Re-inspect the current state before doing anything else, explain what changed, then continue legally.',
      expected:
        'Agent invokes inspect_yard(). It discovers the operator mutation and that CX-330 was expedited to queue position #2, then plans against the new stateVersion.'
    }
  ];

  const failurePrompt = {
    title: 'Optional Failure Prompt: Invariant Violation & Error Recovery',
    text: 'Execute the previously simulated move using its old expectedStateVersion after I lock the destination. If rejected, inspect changes and recover.',
    expected:
      'execute_move rejects with STALE_STATE, returning expected and current versions plus re-inspection guidance. inspect_changes and inspect_yard reveal the human lock before a fresh plan is generated.'
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
