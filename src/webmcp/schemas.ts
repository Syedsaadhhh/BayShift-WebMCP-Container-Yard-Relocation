export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
  };
}

export const INSPECT_YARD_TOOL: ToolDefinition = {
  name: 'inspect_yard',
  title: 'Inspect Container Bay',
  description:
    'Returns operational state of the container bay: current pickup target, priority queue, stack heights/top containers/locks, metrics (relocations, travel steps, blocking score), and dynamic operational guidance.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: true
  }
};

export const ANALYZE_TARGET_TOOL: ToolDefinition = {
  name: 'analyze_target',
  title: 'Analyze Container Blocker Chain',
  description:
    'Inspects a target container to determine its current stack location, depth, whether it is physically topmost, list of blocking containers above it, and legal destination stacks for immediate blockers.',
  inputSchema: {
    type: 'object',
    properties: {
      containerId: {
        type: 'string',
        description: 'The unique ID of the container to inspect (e.g. "C01", "C02").'
      }
    },
    required: ['containerId'],
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: true
  }
};

export const SIMULATE_RELOCATION_TOOL: ToolDefinition = {
  name: 'simulate_relocation',
  title: 'Simulate Container Move (Dry-run)',
  description:
    'Dry-runs a candidate container relocation without mutating bay state. Validates all physical invariants (top-of-stack, destination capacity, lock status) and projects the crane travel steps and delta blocking score.',
  inputSchema: {
    type: 'object',
    properties: {
      containerId: {
        type: 'string',
        description: 'The container ID proposed to move (must be physically topmost in its stack).'
      },
      toStack: {
        type: 'string',
        description: 'The destination stack ID (e.g. "A", "B", "C", "D", "E").'
      }
    },
    required: ['containerId', 'toStack'],
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: true
  }
};

export const MOVE_CONTAINER_TOOL: ToolDefinition = {
  name: 'move_container',
  title: 'Execute Container Relocation',
  description:
    'Physically relocates the top container from its current stack to an unlocked destination stack with remaining capacity. Records agent provenance in the operations ledger and updates crane travel metrics.',
  inputSchema: {
    type: 'object',
    properties: {
      containerId: {
        type: 'string',
        description: 'The container ID to move (must be topmost in fromStack).'
      },
      fromStack: {
        type: 'string',
        description: 'The source stack ID (e.g. "A", "B", "C", "D", "E").'
      },
      toStack: {
        type: 'string',
        description: 'The destination stack ID (must not be full or locked).'
      },
      rationale: {
        type: 'string',
        description: 'Short operational explanation of why this relocation is being performed.'
      }
    },
    required: ['containerId', 'fromStack', 'toStack'],
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: false
  }
};

export const RETRIEVE_TARGET_TOOL: ToolDefinition = {
  name: 'retrieve_target',
  title: 'Retrieve Exposed Priority Target',
  description:
    'Dispatches the crane to retrieve the current head-of-queue priority container out of the bay. Dynamic: only available when the eligible container is completely unblocked and topmost in its stack.',
  inputSchema: {
    type: 'object',
    properties: {
      containerId: {
        type: 'string',
        description: 'The container ID to retrieve (must match current head of queue).'
      }
    },
    required: ['containerId'],
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: false
  }
};

export const REWIND_LAST_ACTION_TOOL: ToolDefinition = {
  name: 'rewind_last_action',
  title: 'Rewind Last Reversible Action',
  description:
    'Undoes the most recent reversible relocation or retrieval action, restoring the bay state to its exact pre-action snapshot. Dynamic: only available when a reversible action exists in recent history.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        description: 'Optional ID of the specific reversible event to rewind.'
      }
    },
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: false
  }
};
