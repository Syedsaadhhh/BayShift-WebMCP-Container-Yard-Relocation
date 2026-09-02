import {
  analyzeTarget,
  applyMove,
  findContainerLocation,
  inspectYard,
  retrieveTarget,
  rewindLastAction,
  simulateRelocation
} from '../domain/engine';
import { CommandResult, YardState } from '../domain/types';
import {
  ANALYZE_TARGET_TOOL,
  INSPECT_YARD_TOOL,
  MOVE_CONTAINER_TOOL,
  RETRIEVE_TARGET_TOOL,
  REWIND_LAST_ACTION_TOOL,
  SIMULATE_RELOCATION_TOOL,
  ToolDefinition
} from './schemas';

export interface RegisteredToolInfo {
  name: string;
  title: string;
  description: string;
  readOnly: boolean;
  isDynamic: boolean;
}

export class WebMCPBridge {
  private stateGetter: () => YardState;
  private stateUpdater: (updater: (prev: YardState) => YardState) => void;
  private staticAbortController: AbortController | null = null;
  private retrieveAbortController: AbortController | null = null;
  private rewindAbortController: AbortController | null = null;
  private registeredTools: Map<string, RegisteredToolInfo> = new Map();
  private onToolsChangeCallback?: (tools: RegisteredToolInfo[]) => void;

  constructor(
    stateGetter: () => YardState,
    stateUpdater: (updater: (prev: YardState) => YardState) => void,
    onToolsChange?: (tools: RegisteredToolInfo[]) => void
  ) {
    this.stateGetter = stateGetter;
    this.stateUpdater = stateUpdater;
    this.onToolsChangeCallback = onToolsChange;
  }

  public isSupported(): boolean {
    return typeof document !== 'undefined' && 'modelContext' in document && !!document.modelContext;
  }

  public getRegisteredToolsList(): RegisteredToolInfo[] {
    return Array.from(this.registeredTools.values());
  }

  private notifyToolsChange(): void {
    if (this.onToolsChangeCallback) {
      this.onToolsChangeCallback(this.getRegisteredToolsList());
    }
  }

  private isRegisteringRetrieve = false;
  private isRegisteringRewind = false;

  public syncWithState(state: YardState): void {
    // 1. Check retrieve_target eligibility:
    // Only registered if current queue target exists AND is physically topmost in its stack
    const currentTarget = state.queue.length > 0 ? state.queue[0] : null;
    let isTargetRetrievable = false;
    if (currentTarget) {
      const loc = findContainerLocation(state.stacks, currentTarget);
      if (loc && loc.isTop) {
        isTargetRetrievable = true;
      }
    }

    if (isTargetRetrievable && !this.retrieveAbortController && !this.isRegisteringRetrieve) {
      this.isRegisteringRetrieve = true;
      this.registerRetrieveTool().finally(() => {
        this.isRegisteringRetrieve = false;
      });
    } else if (!isTargetRetrievable && this.retrieveAbortController) {
      this.unregisterRetrieveTool();
    }

    // 2. Check rewind_last_action eligibility:
    // Only registered if a reversible action exists in recent history
    const hasReversibleAction = state.history.some((e) => e.reversible && !!e.snapshotBefore);
    if (hasReversibleAction && !this.rewindAbortController && !this.isRegisteringRewind) {
      this.isRegisteringRewind = true;
      this.registerRewindTool().finally(() => {
        this.isRegisteringRewind = false;
      });
    } else if (!hasReversibleAction && this.rewindAbortController) {
      this.unregisterRewindTool();
    }
  }

  public async registerAll(): Promise<void> {
    this.cleanup();
    this.staticAbortController = new AbortController();

    // Register Static Tools
    await this.registerToolSafely(INSPECT_YARD_TOOL, this.staticAbortController.signal, async () => {
      const state = this.stateGetter();
      const inspection = inspectYard(state);
      return JSON.stringify({ ok: true, data: inspection }, null, 2);
    });

    await this.registerToolSafely(
      ANALYZE_TARGET_TOOL,
      this.staticAbortController.signal,
      async (input: { containerId: string }) => {
        const state = this.stateGetter();
        const res = analyzeTarget(state, input?.containerId);
        return JSON.stringify(res, null, 2);
      }
    );

    await this.registerToolSafely(
      SIMULATE_RELOCATION_TOOL,
      this.staticAbortController.signal,
      async (input: { containerId: string; toStack: string }) => {
        const state = this.stateGetter();
        const res = simulateRelocation(state, input?.containerId, input?.toStack);
        return JSON.stringify(res, null, 2);
      }
    );

    await this.registerToolSafely(
      MOVE_CONTAINER_TOOL,
      this.staticAbortController.signal,
      async (input: { containerId: string; fromStack: string; toStack: string; rationale?: string }) => {
        let result: CommandResult<YardState> = {
          ok: false,
          code: 'ERR_UNKNOWN',
          message: 'Move failed to execute.'
        };

        this.stateUpdater((prev) => {
          result = applyMove(prev, 'agent', input);
          return result.ok && result.data ? result.data : prev;
        });

        if (!result.ok) {
          return JSON.stringify(
            {
              ok: false,
              code: result.code,
              message: result.message,
              legalNext: result.legalNext
            },
            null,
            2
          );
        }

        return JSON.stringify(
          {
            ok: true,
            code: 'OK',
            message: result.message,
            relocations: result.data?.metrics.relocations,
            travelSteps: result.data?.metrics.travelSteps,
            blockingScore: result.data?.metrics.blockingScore
          },
          null,
          2
        );
      }
    );

    // Sync dynamic tools based on initial state
    this.syncWithState(this.stateGetter());
    this.notifyToolsChange();
  }

  private async registerRetrieveTool(): Promise<void> {
    this.retrieveAbortController = new AbortController();
    await this.registerToolSafely(
      RETRIEVE_TARGET_TOOL,
      this.retrieveAbortController.signal,
      async (input: { containerId: string }) => {
        let result: CommandResult<YardState> = {
          ok: false,
          code: 'ERR_UNKNOWN',
          message: 'Retrieve failed to execute.'
        };

        this.stateUpdater((prev) => {
          result = retrieveTarget(prev, 'agent', input);
          return result.ok && result.data ? result.data : prev;
        });

        if (!result.ok) {
          return JSON.stringify(
            {
              ok: false,
              code: result.code,
              message: result.message,
              legalNext: result.legalNext
            },
            null,
            2
          );
        }

        return JSON.stringify(
          {
            ok: true,
            code: 'OK',
            message: result.message,
            retrieves: result.data?.metrics.retrieves,
            nextTarget: result.data?.queue[0] ?? null
          },
          null,
          2
        );
      },
      true
    );
    this.notifyToolsChange();
  }

  private unregisterRetrieveTool(): void {
    if (this.retrieveAbortController) {
      this.retrieveAbortController.abort();
      this.retrieveAbortController = null;
      this.registeredTools.delete(RETRIEVE_TARGET_TOOL.name);
      this.notifyToolsChange();
    }
  }

  private async registerRewindTool(): Promise<void> {
    this.rewindAbortController = new AbortController();
    await this.registerToolSafely(
      REWIND_LAST_ACTION_TOOL,
      this.rewindAbortController.signal,
      async (input?: { eventId?: string }) => {
        let result: CommandResult<YardState> = {
          ok: false,
          code: 'ERR_UNKNOWN',
          message: 'Rewind failed to execute.'
        };

        this.stateUpdater((prev) => {
          result = rewindLastAction(prev, 'agent', input);
          return result.ok && result.data ? result.data : prev;
        });

        if (!result.ok) {
          return JSON.stringify(
            {
              ok: false,
              code: result.code,
              message: result.message
            },
            null,
            2
          );
        }

        return JSON.stringify(
          {
            ok: true,
            code: 'OK',
            message: result.message,
            metrics: result.data?.metrics
          },
          null,
          2
        );
      },
      true
    );
    this.notifyToolsChange();
  }

  private unregisterRewindTool(): void {
    if (this.rewindAbortController) {
      this.rewindAbortController.abort();
      this.rewindAbortController = null;
      this.registeredTools.delete(REWIND_LAST_ACTION_TOOL.name);
      this.notifyToolsChange();
    }
  }

  private async registerToolSafely(
    def: ToolDefinition,
    signal: AbortSignal,
    handler: (input: any) => Promise<string>,
    isDynamic = false
  ): Promise<void> {
    this.registeredTools.set(def.name, {
      name: def.name,
      title: def.title,
      description: def.description,
      readOnly: def.annotations.readOnlyHint,
      isDynamic
    });

    if (this.isSupported() && document.modelContext) {
      try {
        await document.modelContext.registerTool(
          {
            name: def.name,
            title: def.title,
            description: def.description,
            inputSchema: def.inputSchema,
            annotations: def.annotations,
            execute: async (input: any, context: { signal?: AbortSignal }) => {
              if (context?.signal?.aborted || signal.aborted) {
                return JSON.stringify({ ok: false, code: 'ABORTED', message: 'Tool execution was aborted.' });
              }
              return await handler(input);
            }
          },
          { signal }
        );
      } catch (err: any) {
        if (err && err.name !== 'AbortError') {
          console.warn(`[WebMCP] registerTool failed for ${def.name}:`, err);
        }
      }
    }
  }

  // Simulated execution for manual judge drawer testing when WebMCP is unavailable in the browser
  public async executeSimulatedTool(name: string, input: any): Promise<string> {
    switch (name) {
      case 'inspect_yard':
        return JSON.stringify({ ok: true, data: inspectYard(this.stateGetter()) }, null, 2);
      case 'analyze_target':
        return JSON.stringify(analyzeTarget(this.stateGetter(), input?.containerId), null, 2);
      case 'simulate_relocation':
        return JSON.stringify(simulateRelocation(this.stateGetter(), input?.containerId, input?.toStack), null, 2);
      case 'move_container': {
        let result: CommandResult<YardState> = { ok: false, code: 'ERR_UNKNOWN', message: 'Simulated move failed.' };
        this.stateUpdater((prev) => {
          result = applyMove(prev, 'agent', input);
          return result.ok && result.data ? result.data : prev;
        });
        return JSON.stringify(result.ok ? { ok: true, message: result.message, metrics: result.data?.metrics } : result, null, 2);
      }
      case 'retrieve_target': {
        let result: CommandResult<YardState> = { ok: false, code: 'ERR_UNKNOWN', message: 'Simulated retrieve failed.' };
        this.stateUpdater((prev) => {
          result = retrieveTarget(prev, 'agent', input);
          return result.ok && result.data ? result.data : prev;
        });
        return JSON.stringify(result.ok ? { ok: true, message: result.message, queue: result.data?.queue } : result, null, 2);
      }
      case 'rewind_last_action': {
        let result: CommandResult<YardState> = { ok: false, code: 'ERR_UNKNOWN', message: 'Simulated rewind failed.' };
        this.stateUpdater((prev) => {
          result = rewindLastAction(prev, 'agent', input);
          return result.ok && result.data ? result.data : prev;
        });
        return JSON.stringify(result.ok ? { ok: true, message: result.message, metrics: result.data?.metrics } : result, null, 2);
      }
      default:
        return JSON.stringify({ ok: false, code: 'ERR_TOOL_NOT_FOUND', message: `Tool '${name}' is not registered.` }, null, 2);
    }
  }

  public cleanup(): void {
    if (this.staticAbortController) {
      this.staticAbortController.abort();
      this.staticAbortController = null;
    }
    if (this.retrieveAbortController) {
      this.retrieveAbortController.abort();
      this.retrieveAbortController = null;
    }
    if (this.rewindAbortController) {
      this.rewindAbortController.abort();
      this.rewindAbortController = null;
    }
    this.registeredTools.clear();
    this.notifyToolsChange();
  }
}
