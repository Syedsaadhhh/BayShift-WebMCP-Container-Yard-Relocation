import { Container, Stack, YardSnapshot, YardState } from './types';

export const STACK_IDS = ['A', 'B', 'C', 'D', 'E'] as const;
export const STACK_CAPACITY = 4;

export function createInitialStacks(): Stack[] {
  // 5-stack bay, capacity 4, 12 containers
  // C01 is buried in Stack B under exactly 2 blockers: C04 and C07
  // Stack E is low-occupancy (1 container, 3 free slots)
  // Stack A has 2 containers (2 free slots)
  return [
    {
      id: 'A',
      capacity: STACK_CAPACITY,
      locked: false,
      containers: [
        { id: 'C09', priority: 9, label: 'Electronics 40ft' },
        { id: 'C05', priority: 5, label: 'Auto Parts 20ft' }
      ]
    },
    {
      id: 'B',
      capacity: STACK_CAPACITY,
      locked: false,
      containers: [
        { id: 'C01', priority: 1, label: 'Perishables Exp-1' }, // Buried at index 0
        { id: 'C04', priority: 4, label: 'Industrial Steel' },  // Blocker 1
        { id: 'C07', priority: 7, label: 'Dry Bulk 20ft' }     // Blocker 2 (top)
      ]
    },
    {
      id: 'C',
      capacity: STACK_CAPACITY,
      locked: false,
      containers: [
        { id: 'C11', priority: 11, label: 'Construction Mat' },
        { id: 'C02', priority: 2, label: 'Pharma Cold-Chain' }, // Future target #2
        { id: 'C06', priority: 6, label: 'Textiles 40ft' }
      ]
    },
    {
      id: 'D',
      capacity: STACK_CAPACITY,
      locked: false,
      containers: [
        { id: 'C10', priority: 10, label: 'Machinery Crate' },
        { id: 'C08', priority: 8, label: 'Retail Goods' },
        { id: 'C03', priority: 3, label: 'Chemical Drums' }
      ]
    },
    {
      id: 'E',
      capacity: STACK_CAPACITY,
      locked: false,
      containers: [
        { id: 'C12', priority: 12, label: 'Empty Storage' } // 3 open slots!
      ]
    }
  ];
}

export const INITIAL_QUEUE = [
  'C01',
  'C02',
  'C03',
  'C04',
  'C05',
  'C06',
  'C07',
  'C08',
  'C09',
  'C10',
  'C11',
  'C12'
];

export function calculateBlockingScore(stacks: Stack[], queue: string[]): number {
  // Deterministic local heuristic score:
  // For each stack, count how many containers sitting above container X
  // have an earlier retrieval schedule (lower queue index or higher priority) than container X.
  // When high-priority containers are buried under lower-priority ones, this score increases.
  let score = 0;
  const queueRank: Record<string, number> = {};
  queue.forEach((id, index) => {
    queueRank[id] = index;
  });

  for (const stack of stacks) {
    const len = stack.containers.length;
    for (let i = 0; i < len; i++) {
      const lower = stack.containers[i];
      const lowerRank = queueRank[lower.id] ?? 999;
      for (let j = i + 1; j < len; j++) {
        const higher = stack.containers[j];
        const higherRank = queueRank[higher.id] ?? 999;
        // If the container above (higher) needs to be retrieved AFTER the container below (lower),
        // it is a blocking hazard.
        if (higherRank > lowerRank) {
          score += 1;
        }
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
    metrics: {
      relocations: 0,
      retrieves: 0,
      travelSteps: 0,
      blockingScore: calculateBlockingScore(stacks, queue)
    }
  };
}

export function createInitialState(): YardState {
  const snapshot = createInitialSnapshot();
  return {
    stacks: snapshot.stacks,
    queue: snapshot.queue,
    metrics: snapshot.metrics,
    history: [
      {
        id: 'evt-init',
        actor: 'system',
        type: 'reset',
        timestamp: new Date().toLocaleTimeString(),
        payload: { message: 'BayShift operational bay initialized (5 stacks, 12 containers).' },
        reversible: false
      }
    ],
    selectedContainerId: null
  };
}
