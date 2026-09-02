import { Container, Stack, YardSnapshot, YardState, WeightClass } from './types';

export const STACK_IDS = ['B01', 'B02', 'B03', 'B04', 'B05'] as const;
export const STACK_CAPACITY = 4;
export const HERO_TARGET = 'CX-204';
export const INITIAL_STATE_VERSION = 37;

type SeedContainer = Omit<Container, 'stackId' | 'tier' | 'status'>;

function cargo(id: string, weightClass: WeightClass, type: string, destination: string, priority: number, truckEta: string, label: string): SeedContainer {
  return { id, weightClass, type, destination, priority, truckEta, label, locked: false };
}

function buildStack(id: typeof STACK_IDS[number], seeds: SeedContainer[], options: Partial<Pick<Stack, 'locked' | 'outage' | 'reservedForDestination'>> = {}): Stack {
  return {
    id,
    capacity: STACK_CAPACITY,
    locked: options.locked ?? false,
    outage: options.outage ?? false,
    reservedForDestination: options.reservedForDestination,
    containers: seeds.map((seed, index) => ({ ...seed, stackId: id, tier: index + 1, status: seed.id === HERO_TARGET ? 'BLOCKED' : 'YARD' }))
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

export function createInitialStacks(): Stack[] {
  return normalizeStacks([
    buildStack('B01', [
      cargo('CX-118', 'HEAVY', 'machinery', 'OSAKA', 8, '18:40', 'Machinery / Osaka'),
      cargo('CX-330', 'MEDIUM', 'retail', 'BUSAN', 6, '19:05', 'Retail / Busan')
    ]),
    buildStack('B02', [
      cargo(HERO_TARGET, 'HEAVY', 'cold-chain', 'ROTTERDAM', 1, '16:45', 'Cold-chain / Rotterdam'),
      cargo('CX-188', 'MEDIUM', 'automotive', 'BUSAN', 5, '20:10', 'Auto parts / Busan'),
      cargo('CX-203', 'LIGHT', 'textiles', 'OSAKA', 7, '21:20', 'Textiles / Osaka')
    ]),
    buildStack('B03', [
      cargo('CX-411', 'HEAVY', 'steel', 'ROTTERDAM', 9, '22:30', 'Steel / Rotterdam'),
      cargo('CX-276', 'MEDIUM', 'pharma', 'SINGAPORE', 3, '18:05', 'Pharma / Singapore')
    ], { reservedForDestination: 'SINGAPORE' }),
    buildStack('B04', [
      cargo('CX-502', 'HEAVY', 'chemicals', 'HAMBURG', 10, '23:00', 'Chemicals / Hamburg'),
      cargo('CX-144', 'MEDIUM', 'dry-goods', 'HAMBURG', 4, '19:30', 'Dry goods / Hamburg')
    ]),
    buildStack('B05', [cargo('CX-620', 'HEAVY', 'equipment', 'OSAKA', 11, '23:45', 'Equipment / Osaka')])
  ], HERO_TARGET);
}

export const INITIAL_QUEUE = [HERO_TARGET, 'CX-276', 'CX-144', 'CX-188', 'CX-330', 'CX-203', 'CX-118', 'CX-411', 'CX-502', 'CX-620'];

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

export function createInitialSnapshot(): YardSnapshot {
  const stacks = createInitialStacks();
  const queue = [...INITIAL_QUEUE];
  return {
    stacks,
    queue,
    targetContainerId: HERO_TARGET,
    metrics: { relocations: 0, retrieves: 0, travelSteps: 0, blockingScore: calculateBlockingScore(stacks, queue) },
    disruptions: [],
    constraints: { maxStackHeight: STACK_CAPACITY, topOnlyMovement: true, enforceWeightOrder: true, reservedDestinations: { B03: 'SINGAPORE' } }
  };
}

export function createInitialState(): YardState {
  const snapshot = createInitialSnapshot();
  return {
    ...snapshot,
    stateVersion: INITIAL_STATE_VERSION,
    history: [{
      id: 'evt-init', actor: 'system', action: 'reset', type: 'reset', timestamp: new Date().toLocaleTimeString(),
      stateVersionBefore: INITIAL_STATE_VERSION, stateVersionAfter: INITIAL_STATE_VERSION,
      payload: { message: 'BayShift hero yard initialized: CX-204 buried under two blockers.' },
      result: { target: HERO_TARGET, blockers: ['CX-188', 'CX-203'] }, changedEntities: [...STACK_IDS, HERO_TARGET], reversible: false
    }],
    selectedContainerId: null
  };
}
