export type Actor = 'human' | 'agent' | 'system';

export type ActionType =
  | 'move'
  | 'retrieve'
  | 'lock'
  | 'unlock'
  | 'priority_change'
  | 'reset'
  | 'rewind';

export interface Container {
  id: string;
  priority: number;
  label?: string;
}

export interface Stack {
  id: string;
  capacity: number;
  locked: boolean;
  containers: Container[]; // bottom -> top
}

export interface Metrics {
  relocations: number;
  retrieves: number;
  travelSteps: number;
  blockingScore: number;
}

export interface YardSnapshot {
  stacks: Stack[];
  queue: string[]; // container IDs in order of expected retrieval
  metrics: Metrics;
}

export interface ActionEvent {
  id: string;
  actor: Actor;
  type: ActionType;
  timestamp: string;
  payload: Record<string, unknown>;
  reversible: boolean;
  snapshotBefore?: YardSnapshot;
}

export interface YardState {
  stacks: Stack[];
  queue: string[];
  metrics: Metrics;
  history: ActionEvent[];
  selectedContainerId: string | null;
}

export interface CommandResult<T = unknown> {
  ok: boolean;
  code: string;
  message: string;
  data?: T;
  legalNext?: unknown[];
}

export interface YardInspection {
  currentTarget: string | null;
  queue: string[];
  stacks: {
    id: string;
    capacity: number;
    locked: boolean;
    total: number;
    top: Container | null;
    containers: { id: string; priority: number; label?: string }[];
  }[];
  metrics: Metrics;
  guidance: string;
}

export interface TargetAnalysis {
  containerId: string;
  stackId: string;
  stackIndex: number;
  depthFromTop: number;
  isTopmost: boolean;
  isCurrentTarget: boolean;
  blockersAbove: Container[];
  legalDestinationsForTopBlocker: string[];
}

export interface RelocationSimulation {
  allowed: boolean;
  code: string;
  reason: string;
  fromStack: string;
  toStack: string;
  containerId: string;
  projectedCost?: {
    craneTravelSteps: number;
    currentBlockingScore: number;
    projectedBlockingScore: number;
    deltaBlockingScore: number;
  };
  legalAlternatives?: string[];
}
