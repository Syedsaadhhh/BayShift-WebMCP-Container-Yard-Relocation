import { analyzeBlockers, applyMove, getContainer, inspectChanges, inspectYard, retrieveTarget, rewindYard, simulateRelocations, validateMove } from '../domain/engine';
import { CommandResult, RelocationPlan, YardState } from '../domain/types';
import { TOOL_DEFINITIONS, ToolDefinition } from './schemas';

export interface RegisteredToolInfo {
  name: string;
  title: string;
  description: string;
  readOnly: boolean;
  isDynamic: boolean;
}

export interface AgentTraceEvent {
  id: string;
  timestamp: string;
  tool: string;
  status: 'success' | 'rejected';
  summary: string;
  stateVersion: number;
}

type JsonObject = Record<string, unknown>;

function invalid(message: string, stateVersion: number): string {
  return JSON.stringify({ ok: false, code: 'INVALID_INPUT', message, stateVersion }, null, 2);
}

export class WebMCPBridge {
  private abortController: AbortController | null = null;
  private registeredTools = new Map<string, RegisteredToolInfo>();

  constructor(
    private stateGetter: () => YardState,
    private stateUpdater: (updater: (previous: YardState) => YardState) => void,
    private onToolsChange?: (tools: RegisteredToolInfo[]) => void,
    private onTrace?: (event: AgentTraceEvent) => void,
    private onPlanPreview?: (plan: RelocationPlan | null) => void
  ) {}

  public isSupported(): boolean {
    return typeof document !== 'undefined' && 'modelContext' in document && Boolean(document.modelContext);
  }

  public getRegisteredToolsList(): RegisteredToolInfo[] {
    return [...this.registeredTools.values()];
  }

  public syncWithState(_state: YardState): void {
    // All nine semantic capabilities stay discoverable. Domain state determines whether execution is legal.
  }

  public async registerAll(): Promise<void> {
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    this.registeredTools.clear();
    await Promise.all(TOOL_DEFINITIONS.map((definition) => this.registerTool(definition, controller.signal)));
    if (!controller.signal.aborted) this.onToolsChange?.(this.getRegisteredToolsList());
  }

  private async registerTool(definition: ToolDefinition, signal: AbortSignal): Promise<void> {
    this.registeredTools.set(definition.name, {
      name: definition.name, title: definition.title, description: definition.description,
      readOnly: definition.annotations.readOnlyHint, isDynamic: false
    });
    if (!this.isSupported() || !document.modelContext) return;
    try {
      await document.modelContext.registerTool({
        name: definition.name,
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: definition.annotations,
        execute: async (input: JsonObject, context: { signal?: AbortSignal }) => {
          if (signal.aborted || context?.signal?.aborted) return JSON.stringify({ ok: false, code: 'ABORTED', message: 'Tool execution was aborted.' });
          return this.invoke(definition.name, input ?? {});
        }
      }, { signal });
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.warn(`[WebMCP] Could not register ${definition.name}`, error);
    }
  }

  private validateInput(name: string, input: JsonObject): string | null {
    const requireString = (key: string) => typeof input[key] === 'string' && String(input[key]).trim().length > 0;
    const requireVersion = (key: string) => Number.isInteger(input[key]) && Number(input[key]) >= 0;
    if (['get_container', 'analyze_blockers', 'validate_move', 'simulate_relocations', 'execute_move', 'retrieve_target'].includes(name) && !requireString('containerId')) return 'containerId must be a non-empty string.';
    if (['validate_move', 'execute_move'].includes(name) && (!requireString('fromStack') || !requireString('toStack'))) return 'fromStack and toStack are required strings.';
    if (['execute_move', 'retrieve_target', 'rewind_yard'].includes(name) && !requireVersion('expectedStateVersion')) return 'expectedStateVersion must be a non-negative integer.';
    if (name === 'inspect_changes' && !requireVersion('sinceStateVersion')) return 'sinceStateVersion must be a non-negative integer.';
    if (name === 'simulate_relocations' && input.maxPlans !== undefined && (!Number.isInteger(input.maxPlans) || Number(input.maxPlans) < 1 || Number(input.maxPlans) > 5)) return 'maxPlans must be an integer from 1 to 5.';
    return null;
  }

  private trace(name: string, response: JsonObject): void {
    const ok = response.ok !== false;
    this.onTrace?.({
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      tool: name,
      status: ok ? 'success' : 'rejected',
      summary: String(response.message ?? (ok ? 'Completed' : response.code ?? 'Rejected')),
      stateVersion: Number(response.stateVersion ?? this.stateGetter().stateVersion)
    });
  }

  private mutate(run: (state: YardState) => CommandResult<YardState>): CommandResult<YardState> {
    const current = this.stateGetter();
    const result = run(current);
    if (result.ok && result.data) this.stateUpdater(() => result.data!);
    return result;
  }

  private async invoke(name: string, input: JsonObject): Promise<string> {
    const state = this.stateGetter();
    const validationError = this.validateInput(name, input);
    if (validationError) {
      const response = JSON.parse(invalid(validationError, state.stateVersion)) as JsonObject;
      this.trace(name, response);
      return JSON.stringify(response, null, 2);
    }

    let response: JsonObject;
    switch (name) {
      case 'inspect_yard':
        response = { ok: true, code: 'OK', message: `Inspected yard v${state.stateVersion}.`, stateVersion: state.stateVersion, data: inspectYard(state) };
        break;
      case 'get_container':
        response = getContainer(state, String(input.containerId)) as unknown as JsonObject;
        break;
      case 'analyze_blockers':
        response = analyzeBlockers(state, String(input.containerId)) as unknown as JsonObject;
        break;
      case 'validate_move':
        response = { ok: validateMove(state, { containerId: String(input.containerId), fromStack: String(input.fromStack), toStack: String(input.toStack) }).legal, ...validateMove(state, { containerId: String(input.containerId), fromStack: String(input.fromStack), toStack: String(input.toStack) }) };
        break;
      case 'simulate_relocations': {
        const result = simulateRelocations(state, String(input.containerId), Number(input.maxPlans ?? 3));
        response = result as unknown as JsonObject;
        this.onPlanPreview?.(result.data?.candidatePlans[0] ?? null);
        break;
      }
      case 'execute_move':
        response = this.mutate((current) => applyMove(current, 'agent', { containerId: String(input.containerId), fromStack: String(input.fromStack), toStack: String(input.toStack), rationale: input.rationale ? String(input.rationale) : undefined, expectedStateVersion: Number(input.expectedStateVersion) })) as unknown as JsonObject;
        break;
      case 'retrieve_target':
        response = this.mutate((current) => retrieveTarget(current, 'agent', { containerId: String(input.containerId), expectedStateVersion: Number(input.expectedStateVersion) })) as unknown as JsonObject;
        break;
      case 'inspect_changes':
        response = inspectChanges(state, Number(input.sinceStateVersion)) as unknown as JsonObject;
        break;
      case 'rewind_yard':
        response = this.mutate((current) => rewindYard(current, 'agent', { eventId: input.eventId ? String(input.eventId) : undefined, expectedStateVersion: Number(input.expectedStateVersion) })) as unknown as JsonObject;
        break;
      default:
        response = { ok: false, code: 'TOOL_NOT_FOUND', message: `${name} is not registered.`, stateVersion: state.stateVersion };
    }
    this.trace(name, response);
    return JSON.stringify(response, (_key, value) => _key === 'data' && value && typeof value === 'object' && 'history' in value ? { stateVersion: (value as YardState).stateVersion, metrics: (value as YardState).metrics, target: (value as YardState).targetContainerId } : value, 2);
  }

  public executeSimulatedTool(name: string, input: JsonObject): Promise<string> {
    return this.invoke(name, input);
  }

  public cleanup(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.registeredTools.clear();
    this.onToolsChange?.([]);
  }
}
