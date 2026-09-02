export type Actor = 'human' | 'agent' | 'system';

export type ActionType =
  | 'move'
  | 'retrieve'
  | 'lock'
  | 'unlock'
  | 'target_change'
  | 'late_truck'
  | 'outage'
  | 'reset'
  | 'rewind';

export type WeightClass = 'LIGHT' | 'MEDIUM' | 'HEAVY';
export type ContainerStatus = 'YARD' | 'TARGET' | 'BLOCKED' | 'EXPOSED' | 'RETRIEVED';
export type DisruptionType = 'LATE_TRUCK' | 'STACK_LOCK' | 'LANE_OR_CRANE_OUTAGE';

export interface Container {
  id: string;
  stackId: string;
  tier: number;
  weightClass: WeightClass;
  type: string;
  destination: string;
  priority: number;
  truckEta: string;
  locked: boolean;
  status: ContainerStatus;
  label?: string;
}

export interface Stack {
  id: string;
  capacity: number;
  locked: boolean;
  outage: boolean;
  reservedForDestination?: string;
  containers: Container[];
}

export interface Metrics {
  relocations: number;
  retrieves: number;
  travelSteps: number;
  blockingScore: number;
}

export interface ActiveDisruption {
  id: string;
  type: DisruptionType;
  description: string;
  affectedEntities: string[];
  activatedAtVersion: number;
}

export interface YardConstraints {
  maxStackHeight: number;
  topOnlyMovement: boolean;
  enforceWeightOrder: boolean;
  reservedDestinations: Record<string, string>;
}

export interface YardSnapshot {
  stacks: Stack[];
  queue: string[];
  targetContainerId: string | null;
  metrics: Metrics;
  disruptions: ActiveDisruption[];
  constraints: YardConstraints;
}

export interface ActionEvent {
  id: string;
  timestamp: string;
  actor: Actor;
  action: ActionType;
  type: ActionType;
  stateVersionBefore: number;
  stateVersionAfter: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  changedEntities: string[];
  reversible: boolean;
  snapshotBefore?: YardSnapshot;
  snapshotAfter?: YardSnapshot;
}

export interface YardState extends YardSnapshot {
  stateVersion: number;
  history: ActionEvent[];
  selectedContainerId: string | null;
}

export interface RuleCheck {
  rule: 'LIFO' | 'HEIGHT' | 'LOCK' | 'WEIGHT' | 'DESTINATION' | 'URGENCY';
  passed: boolean;
  code: string;
  reason: string;
}

export interface CommandResult<T = unknown> {
  ok: boolean;
  code: string;
  message: string;
  stateVersion: number;
  data?: T;
  legalNext?: unknown[];
  expectedStateVersion?: number;
  currentStateVersion?: number;
  recommendation?: string;
  validation?: RuleCheck[];
}

export interface YardInspection {
  stateVersion: number;
  target: string | null;
  targetExposed: boolean;
  blockers: string[];
  queue: string[];
  stacks: {
    id: string;
    capacity: number;
    locked: boolean;
    outage: boolean;
    reservedForDestination?: string;
    total: number;
    top: Container | null;
    containers: Pick<Container, 'id' | 'tier' | 'weightClass' | 'destination' | 'priority' | 'status'>[];
  }[];
  activeConstraints: string[];
  activeDisruptions: ActiveDisruption[];
  candidateDestinationStacks: string[];
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
  legal: boolean;
  code: string;
  reason: string;
  stateVersion: number;
  fromStack: string;
  toStack: string;
  containerId: string;
  validation: RuleCheck[];
  projectedCost?: {
    craneTravelSteps: number;
    currentBlockingScore: number;
    projectedBlockingScore: number;
    deltaBlockingScore: number;
  };
  legalAlternatives?: string[];
}

export interface PlannedMove {
  step: number;
  containerId: string;
  fromStack: string;
  toStack: string;
  validation: RuleCheck[];
  targetExposedAfter: boolean;
}

export interface RelocationPlan {
  id: string;
  targetId: string;
  basedOnStateVersion: number;
  moves: PlannedMove[];
  moveCount: number;
  affectedStacks: string[];
  resultingTargetExposed: boolean;
  score: number;
}
