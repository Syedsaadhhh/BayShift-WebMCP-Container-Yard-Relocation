# BayShift

BayShift is a shared live container-yard relocation canvas built for the OpenAI WebMCP Challenge. A human yard operator and a browser agent work against the same authoritative operational state through one deterministic logistics engine.

This is not a chatbot or a static logistics dashboard. The yard itself is the shared working surface: humans can move containers, select retrieval targets, lock stacks, trigger disruptions, inspect changes, and rewind actions while an agent discovers structured WebMCP tools for the same world.

## The shared-state differentiator

The seeded challenge scenario starts at yard `stateVersion` 37 with target `CX-204` buried under `CX-188` and `CX-203` in stack `B02`.

Every successful mutation increments `stateVersion`. All destructive agent tools require the exact `expectedStateVersion` that was inspected before planning. If a human changes the yard first, the agent receives `STALE_STATE`, the expected/current versions, and explicit guidance to inspect and replan.

```text
Agent inspects v37 -> Agent plans for v37 -> Human locks B01 -> Yard becomes v38
        -> Agent's v37 move is rejected -> Agent inspects v38 -> Agent replans
```

## Architecture

- `src/domain/types.ts` — container, stack, snapshot, constraint, plan, and audit records.
- `src/domain/scenario.ts` — deterministic five-stack hero scenario.
- `src/domain/engine.ts` — shared validation, mutations, bounded planning, change inspection, and rewind.
- `src/webmcp/schemas.ts` — strict JSON schemas and agent-facing tool descriptions.
- `src/webmcp/bridge.ts` — native `document.modelContext.registerTool` integration and evaluator fallback.
- `src/components/BayCanvas.tsx` — operator canvas with selection, drag/drop, stack locks, and target control.
- `src/components/AgentOperationsPanel.tsx` — plan preview, rule validation, stale-state status, and tool trace.
- `src/components/LedgerPanel.tsx` — HUMAN/AGENT/SYSTEM history with before/after/diff inspection and physical rewind.

Human and agent mutations call the same domain functions. There is no separate agent copy of the yard.

## WebMCP tools

| Tool | Mode | Purpose |
| --- | --- | --- |
| `inspect_yard` | Read | Version, target, exposure, blockers, constraints, disruptions, and destinations |
| `get_container` | Read | One container and its live physical location |
| `analyze_blockers` | Read | Physical blocker chain and immediate legal destinations |
| `validate_move` | Read | Six-rule dry-run of one relocation |
| `simulate_relocations` | Read | Deterministic minimum-move candidate plans without mutation |
| `execute_move` | Write | Version-guarded authoritative relocation |
| `retrieve_target` | Write | Version-guarded exposed-target retrieval |
| `inspect_changes` | Read | Concise changes after a known version |
| `rewind_yard` | Write | Version-guarded physical snapshot restoration |

## Logistics rules

- LIFO / top-container-only movement
- maximum stack height
- locked stack, locked container, and crane-lane outage rejection
- heavier cargo cannot be placed on lighter cargo
- reserved destination compatibility
- priority and truck-deadline urgency metadata
- target must be physically exposed before retrieval

Failures are structured and never partially mutate state.

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

Validation:

```bash
npm test
npm run build
node scripts/verify_manual_flow.mjs
```

The current automated suite contains 18 passing domain and WebMCP contract tests.

## Challenge demo

1. Reset to the deterministic v37 scenario.
2. Use **Inspect**, then **Simulate** in Agent Operations.
3. Click **Human: lock B01** on the plan preview. The shared yard becomes v38.
4. Click **Execute step 1**. The retained v37 command is rejected with `STALE_STATE`.
5. Inspect changes and simulate an alternative v38 plan.
6. Execute one move, inspect/replan, then execute the final blocker move.
7. Retrieve exposed `CX-204`.
8. Rewind retrieval and inspect the physically restored yard.
9. Trigger **Late Truck** or the B05 crane outage and inspect the new priorities or constraints.

This full sequence has been verified through native WebMCP in a live browser, including real tool discovery and mutations.

## Project status

The shared-state domain, native nine-tool WebMCP surface, seeded conflict/recovery scenario, browser flow, and production build are verified. The next production phase is focused on UI/UX animation polish, high-impact demo direction, recorded narration, and final voiceover synchronization.

See [BUILD_STATUS.md](BUILD_STATUS.md), [docs/EVALS.md](docs/EVALS.md), and [docs/NATIVE_WEBMCP_TEST.md](docs/NATIVE_WEBMCP_TEST.md) for implementation and evaluator details.

## License

MIT. See [LICENSE](LICENSE).
