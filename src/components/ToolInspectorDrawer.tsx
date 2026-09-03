import React, { useState } from 'react';
import { X, Wrench, Play, AlertTriangle, ShieldCheck } from 'lucide-react';
import { RegisteredToolInfo } from '../webmcp/bridge';

interface ToolInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  registeredTools: RegisteredToolInfo[];
  onExecuteTool: (toolName: string, input: any) => Promise<string>;
  targetId: string | null;
  stateVersion: number;
}

export const ToolInspectorDrawer: React.FC<ToolInspectorDrawerProps> = ({
  isOpen,
  onClose,
  registeredTools,
  onExecuteTool,
  targetId,
  stateVersion
}) => {
  const [selectedTool, setSelectedTool] = useState<string>(registeredTools[0]?.name || 'inspect_yard');
  const [inputJson, setInputJson] = useState<string>('{}');
  const [outputJson, setOutputJson] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  if (!isOpen) return null;

  const toolInfo = registeredTools.find((t) => t.name === selectedTool) || registeredTools[0];

  const handleToolSelect = (name: string) => {
    setSelectedTool(name);
    setOutputJson(null);
    if (name === 'inspect_yard') {
      setInputJson('{}');
    } else if (name === 'get_container' || name === 'analyze_blockers') {
      setInputJson(`{\n  "containerId": "${targetId ?? 'CX-000'}"\n}`);
    } else if (name === 'validate_move') {
      setInputJson('{\n  "containerId": "CX-203",\n  "fromStack": "B02",\n  "toStack": "B01"\n}');
    } else if (name === 'simulate_relocations') {
      setInputJson(`{\n  "containerId": "${targetId ?? 'CX-000'}",\n  "maxPlans": 3\n}`);
    } else if (name === 'execute_move') {
      setInputJson(`{\n  "containerId": "CX-203",\n  "fromStack": "B02",\n  "toStack": "B01",\n  "expectedStateVersion": ${stateVersion},\n  "rationale": "Inspect first, then clear the current target."\n}`);
    } else if (name === 'retrieve_target') {
      setInputJson(`{\n  "containerId": "${targetId ?? 'CX-000'}",\n  "expectedStateVersion": ${stateVersion}\n}`);
    } else if (name === 'inspect_changes') {
      setInputJson(`{\n  "sinceStateVersion": ${Math.max(0, stateVersion - 1)}\n}`);
    } else if (name === 'rewind_yard') {
      setInputJson(`{\n  "expectedStateVersion": ${stateVersion}\n}`);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const parsed = JSON.parse(inputJson || '{}');
      const res = await onExecuteTool(selectedTool, parsed);
      setOutputJson(res);
    } catch (err: any) {
      setOutputJson(JSON.stringify({ ok: false, error: err.message }, null, 2));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: 820 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={18} color="var(--actor-agent)" />
            <h3>Developer / Judge Inspector</h3>
          </div>
          <button type="button" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Unmissable distinction banner */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderBottom: '1px solid var(--actor-human-border)',
            padding: '8px 20px',
            fontSize: 12,
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
          <span>
            <strong>Simulation only — not native WebMCP.</strong> This developer panel tests tool
            contract execution and recovery logic directly. In a real AI browser, tools are invoked
            autonomously via <code>document.modelContext</code>.
          </span>
        </div>

        <div className="modal-body" style={{ display: 'flex', gap: 16 }}>
          {/* Tool List */}
          <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Active Tools ({registeredTools.length})
            </div>
            {registeredTools.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => handleToolSelect(t.name)}
                style={{
                  textAlign: 'left',
                  justifyContent: 'space-between',
                  background: selectedTool === t.name ? 'var(--bg-surface-hover)' : 'var(--bg-surface-elevated)',
                  borderColor: selectedTool === t.name ? 'var(--actor-agent)' : 'var(--border-subtle)',
                  padding: '8px 10px',
                  fontSize: 12
                }}
              >
                <span>{t.name}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: t.readOnly ? '#94a3b8' : 'var(--actor-agent)'
                  }}
                >
                  {t.readOnly ? 'RO' : 'MUT'}
                </span>
              </button>
            ))}
          </div>

          {/* Tool Runner & Inspector */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {toolInfo && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{toolInfo.title}</strong>
                  <span
                    className="badge"
                    style={{
                      background: toolInfo.readOnly ? 'rgba(100,116,139,0.2)' : 'rgba(6,182,212,0.2)',
                      color: toolInfo.readOnly ? '#94a3b8' : 'var(--actor-agent)',
                      fontSize: 10
                    }}
                  >
                    {toolInfo.readOnly ? 'read-only' : 'mutating'}
                  </span>
                  {toolInfo.isDynamic && (
                    <span className="badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 10 }}>
                      Dynamic
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {toolInfo.description}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>
                Input JSON Parameters:
              </div>
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#e6edf3',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: 8
                }}
              />
            </div>

            <div>
              <button
                type="button"
                className="btn-cyan"
                onClick={handleRun}
                disabled={isRunning}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Play size={13} /> {isRunning ? 'Executing...' : `Execute ${selectedTool} (Agent Provenance)`}
              </button>
            </div>

            {outputJson && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>
                  Result Output (Deterministic):
                </div>
                <pre
                  style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 8,
                    fontSize: 11,
                    maxHeight: 180,
                    overflowY: 'auto',
                    color: '#34d399'
                  }}
                >
                  {outputJson}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
