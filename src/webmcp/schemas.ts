export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
}

const objectSchema = (properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> => ({
  type: 'object', properties, ...(required.length ? { required } : {}), additionalProperties: false
});
const containerId = { type: 'string', pattern: '^CX-[0-9]{3}$', description: 'Container ID, for example CX-204.' };
const stackId = { type: 'string', enum: ['B01', 'B02', 'B03', 'B04', 'B05'], description: 'Operational stack ID.' };
const expectedStateVersion = { type: 'integer', minimum: 0, description: 'Exact stateVersion observed before planning this destructive action.' };

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'inspect_yard', title: 'Inspect live shared yard',
    description: 'Summarizes the authoritative BayShift yard: stateVersion, selected target and exposure, blockers, active constraints/disruptions, and currently legal candidate destination stacks. Call this before planning and again after STALE_STATE.',
    inputSchema: objectSchema({}), annotations: { readOnlyHint: true }
  },
  {
    name: 'get_container', title: 'Get one container',
    description: 'Returns the current domain record and physical location for one container without exposing irrelevant application state.',
    inputSchema: objectSchema({ containerId }, ['containerId']), annotations: { readOnlyHint: true }
  },
  {
    name: 'analyze_blockers', title: 'Analyze physical blockers',
    description: 'Explains which containers physically prevent a requested target from retrieval, their order, and legal destinations for the immediate top blocker.',
    inputSchema: objectSchema({ containerId }, ['containerId']), annotations: { readOnlyHint: true }
  },
  {
    name: 'validate_move', title: 'Validate one relocation',
    description: 'Dry-runs one move against LIFO, height, lock/outage, weight, destination compatibility, and urgency rules. Never mutates the yard.',
    inputSchema: objectSchema({ containerId, fromStack: stackId, toStack: stackId }, ['containerId', 'fromStack', 'toStack']), annotations: { readOnlyHint: true }
  },
  {
    name: 'simulate_relocations', title: 'Plan deterministic relocations',
    description: 'Searches bounded deterministic legal relocation sequences that expose a target, ranks minimum-move plans, and previews affected stacks without mutating state.',
    inputSchema: objectSchema({ containerId, maxPlans: { type: 'integer', minimum: 1, maximum: 5, default: 3 } }, ['containerId']), annotations: { readOnlyHint: true }
  },
  {
    name: 'execute_move', title: 'Execute one authoritative relocation',
    description: 'Moves one topmost container through the shared domain validator, records AGENT provenance, and increments stateVersion. Requires the exact inspected expectedStateVersion and returns STALE_STATE on conflict.',
    inputSchema: objectSchema({ containerId, fromStack: stackId, toStack: stackId, rationale: { type: 'string', minLength: 1, maxLength: 240 }, expectedStateVersion }, ['containerId', 'fromStack', 'toStack', 'expectedStateVersion']), annotations: { readOnlyHint: false }
  },
  {
    name: 'retrieve_target', title: 'Retrieve the exposed target',
    description: 'Retrieves the selected target only when physically exposed and operationally available. Requires expectedStateVersion, records AGENT provenance, and increments stateVersion.',
    inputSchema: objectSchema({ containerId, expectedStateVersion }, ['containerId', 'expectedStateVersion']), annotations: { readOnlyHint: false }
  },
  {
    name: 'inspect_changes', title: 'Inspect yard changes',
    description: 'Returns the concise auditable action trail after a supplied stateVersion, including actors, affected entities, and before/after version numbers.',
    inputSchema: objectSchema({ sinceStateVersion: { type: 'integer', minimum: 0 } }, ['sinceStateVersion']), annotations: { readOnlyHint: true }
  },
  {
    name: 'rewind_yard', title: 'Rewind an actual yard action',
    description: 'Restores the physical yard snapshot before a reversible action while preserving monotonic versioning and appending a SYSTEM-visible rewind record. Requires expectedStateVersion.',
    inputSchema: objectSchema({ eventId: { type: 'string' }, expectedStateVersion }, ['expectedStateVersion']), annotations: { readOnlyHint: false }
  }
];
