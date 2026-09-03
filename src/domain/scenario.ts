import { Container, Stack, YardSnapshot, YardState, WeightClass } from './types';

export const STACK_IDS = ['B01', 'B02', 'B03', 'B04', 'B05'] as const;
export const STACK_CAPACITY = 4;
// Kept as a named classic scenario for reproducible tests and documentation.
// Live sessions intentionally choose a different live retrieval mission on reset.
export const HERO_TARGET = 'CX-204';
export const INITIAL_STATE_VERSION = 37;

type SeedContainer = Omit<Container, 'stackId' | 'tier' | 'status'>;

function cargo(id: string, weightClass: WeightClass, type: string, destination: string, priority: number, truckEta: string, label: string): SeedContainer {
  return { id, weightClass, type, destination, priority, truckEta, label, locked: false };
}

function buildStack(id: typeof STACK_IDS[number], seeds: SeedContainer[], targetId: string, options: Partial<Pick<Stack, 'locked' | 'outage' | 'reservedForDestination'>> = {}): Stack {
  return {
    id,
    capacity: STACK_CAPACITY,
    locked: options.locked ?? false,
    outage: options.outage ?? false,
    reservedForDestination: options.reservedForDestination,
    containers: seeds.map((seed, index) => ({ ...seed, stackId: id, tier: index + 1, status: seed.id === targetId ? 'BLOCKED' : 'YARD' }))
  };
}

export function normalizeStacks(stacks: Stack[], targetId: string | null): Stack[] {
  return stacks.map((stack) => ({
    ...stack,
    containers: stack.containers.map((container, index) => {
      const isTarget = container.id === targetId;
      const isTop = index === stack.containers.length - 1;
      return { ...container, stackId: stack.id, tier: index + 1, status: isTarget ? (isTop ? 'EXPOSED' : 'BLOCKED') : 'YARD' };
    })
  }));
}

export type ScenarioId = 'classic' | 'busan-priority' | 'singapore-priority';

const BASE_QUEUE = ['CX-204', 'CX-276', 'CX-144', 'CX-188', 'CX-330', 'CX-203', 'CX-118', 'CX-411', 'CX-502', 'CX-620'];
let lastLiveScenario: ScenarioId | null = null;

function queueFor(targetId: string): string[] {
  return [targetId, ...BASE_QUEUE.filter((id) => id !== targetId)];
}

function chooseLiveScenario(): ScenarioId {
  const options: ScenarioId[] = ['classic', 'busan-priority', 'singapore-priority'];
  const eligible = options.filter((id) => id !== lastLiveScenario);
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  lastLiveScenario = chosen;
  return chosen;
}

function scenarioLayout(scenarioId: ScenarioId): { targetId: string; stacks: Array<{ id: typeof STACK_IDS[number]; seeds: SeedContainer[]; options?: Partial<Pick<Stack, 'locked' | 'outage' | 'reservedForDestination'>> }> } {
  const common = {
    b04: [cargo('CX-502', 'HEAVY', 'chemicals', 'HAMBURG', 10, '23:00', 'Chemicals / Hamburg'), cargo('CX-144', 'MEDIUM', 'dry-goods', 'HAMBURG', 4, '19:30', 'Dry goods / Hamburg')],
    b05: [cargo('CX-620', 'HEAVY', 'equipment', 'OSAKA', 11, '23:45', 'Equipment / Osaka')]
  };
  if (scenarioId === 'busan-priority') {
    return { targetId: 'CX-330', stacks: [
      { id: 'B01', seeds: [cargo('CX-118', 'HEAVY', 'machinery', 'OSAKA', 8, '18:40', 'Machinery / Osaka'), cargo('CX-330', 'MEDIUM', 'retail', 'BUSAN', 6, '19:05', 'Retail / Busan'), cargo('CX-203', 'LIGHT', 'textiles', 'OSAKA', 7, '21:20', 'Textiles / Osaka')] },
      { id: 'B02', seeds: [cargo('CX-204', 'HEAVY', 'cold-chain', 'ROTTERDAM', 1, '16:45', 'Cold-chain / Rotterdam'), cargo('CX-188', 'MEDIUM', 'automotive', 'BUSAN', 5, '20:10', 'Auto parts / Busan')] },
      { id: 'B03', seeds: [cargo('CX-411', 'HEAVY', 'steel', 'ROTTERDAM', 9, '22:30', 'Steel / Rotterdam'), cargo('CX-276', 'MEDIUM', 'pharma', 'SINGAPORE', 3, '18:05', 'Pharma / Singapore')], options: { reservedForDestination: 'SINGAPORE' } },
      { id: 'B04', seeds: common.b04 }, { id: 'B05', seeds: common.b05 }
    ] };
  }
  if (scenarioId === 'singapore-priority') {
    return { targetId: 'CX-276', stacks: [
      { id: 'B01', seeds: [cargo('CX-118', 'HEAVY', 'machinery', 'OSAKA', 8, '18:40', 'Machinery / Osaka'), cargo('CX-330', 'MEDIUM', 'retail', 'BUSAN', 6, '19:05', 'Retail / Busan')] },
      { id: 'B02', seeds: [cargo('CX-204', 'HEAVY', 'cold-chain', 'ROTTERDAM', 1, '16:45', 'Cold-chain / Rotterdam'), cargo('CX-188', 'MEDIUM', 'automotive', 'BUSAN', 5, '20:10', 'Auto parts / Busan')] },
      { id: 'B03', seeds: [cargo('CX-411', 'HEAVY', 'steel', 'ROTTERDAM', 9, '22:30', 'Steel / Rotterdam'), cargo('CX-276', 'MEDIUM', 'pharma', 'SINGAPORE', 3, '18:05', 'Pharma / Singapore'), cargo('CX-203', 'LIGHT', 'textiles', 'OSAKA', 7, '21:20', 'Textiles / Osaka')], options: { reservedForDestination: 'SINGAPORE' } },
      { id: 'B04', seeds: common.b04 }, { id: 'B05', seeds: common.b05 }
    ] };
  }
  return { targetId: HERO_TARGET, stacks: [
    { id: 'B01', seeds: [cargo('CX-118', 'HEAVY', 'machinery', 'OSAKA', 8, '18:40', 'Machinery / Osaka'), cargo('CX-330', 'MEDIUM', 'retail', 'BUSAN', 6, '19:05', 'Retail / Busan')] },
    { id: 'B02', seeds: [cargo(HERO_TARGET, 'HEAVY', 'cold-chain', 'ROTTERDAM', 1, '16:45', 'Cold-chain / Rotterdam'), cargo('CX-188', 'MEDIUM', 'automotive', 'BUSAN', 5, '20:10', 'Auto parts / Busan'), cargo('CX-203', 'LIGHT', 'textiles', 'OSAKA', 7, '21:20', 'Textiles / Osaka')] },
    { id: 'B03', seeds: [cargo('CX-411', 'HEAVY', 'steel', 'ROTTERDAM', 9, '22:30', 'Steel / Rotterdam'), cargo('CX-276', 'MEDIUM', 'pharma', 'SINGAPORE', 3, '18:05', 'Pharma / Singapore')], options: { reservedForDestination: 'SINGAPORE' } },
    { id: 'B04', seeds: common.b04 }, { id: 'B05', seeds: common.b05 }
  ] };
}

export function createInitialStacks(scenarioId: ScenarioId = chooseLiveScenario()): Stack[] {
  const scenario = scenarioLayout(scenarioId);
  return normalizeStacks(scenario.stacks.map(({ id, seeds, options }) => buildStack(id, seeds, scenario.targetId, options)), scenario.targetId);
}

export function calculateBlockingScore(stacks: Stack[], queue: string[]): number {
  const rank = Object.fromEntries(queue.map((id, index) => [id, index]));
  let score = 0;
  for (const stack of stacks) {
    for (let lower = 0; lower < stack.containers.length; lower += 1) {
      for (let upper = lower + 1; upper < stack.containers.length; upper += 1) {
        if ((rank[stack.containers[upper].id] ?? 999) > (rank[stack.containers[lower].id] ?? 999)) score += 1;
      }
    }
  }
  return score;
}

export function createInitialSnapshot(scenarioId: ScenarioId = chooseLiveScenario()): YardSnapshot {
  const scenario = scenarioLayout(scenarioId);
  const stacks = createInitialStacks(scenarioId);
  const queue = queueFor(scenario.targetId);
  return {
    stacks,
    queue,
    targetContainerId: scenario.targetId,
    metrics: { relocations: 0, retrieves: 0, travelSteps: 0, blockingScore: calculateBlockingScore(stacks, queue) },
    disruptions: [],
    constraints: { maxStackHeight: STACK_CAPACITY, topOnlyMovement: true, enforceWeightOrder: true, reservedDestinations: { B03: 'SINGAPORE' } }
  };
}

export function createInitialState(scenarioId: ScenarioId = chooseLiveScenario()): YardState {
  const snapshot = createInitialSnapshot(scenarioId);
  return {
    ...snapshot,
    stateVersion: INITIAL_STATE_VERSION,
    history: [{
      id: 'evt-init', actor: 'system', action: 'reset', type: 'reset', timestamp: new Date().toLocaleTimeString(),
      stateVersionBefore: INITIAL_STATE_VERSION, stateVersionAfter: INITIAL_STATE_VERSION,
      payload: { message: `BayShift live mission initialized: ${snapshot.targetContainerId} is queued for clearance.` },
      result: { target: snapshot.targetContainerId, blockers: snapshot.targetContainerId ? findSeedBlockers(snapshot.stacks, snapshot.targetContainerId) : [] }, changedEntities: [...STACK_IDS, snapshot.targetContainerId ?? 'yard'], reversible: false
    }],
    selectedContainerId: null
  };
}

function findSeedBlockers(stacks: Stack[], targetId: string): string[] {
  for (const stack of stacks) {
    const index = stack.containers.findIndex((container) => container.id === targetId);
    if (index >= 0) return stack.containers.slice(index + 1).map((container) => container.id);
  }
  return [];
}
