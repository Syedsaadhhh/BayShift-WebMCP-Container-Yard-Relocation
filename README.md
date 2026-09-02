# BayShift

BayShift is a shared live container-yard relocation canvas for a human yard operator and a browser agent. Both actors mutate one authoritative client-side yard through the same deterministic logistics engine.

The seeded challenge scenario starts at yard `stateVersion` 37 with target `CX-204` buried under `CX-188` and `CX-203` in stack `B02`. A human intervention can invalidate an agent plan; destructive agent tools reject mismatched versions with `STALE_STATE` and explicit recovery guidance.

## Architecture

- `src/domain/types.ts` — domain records, snapshots, rule checks, plans, events, and versioned state.
- `src/domain/scenario.ts` — deterministic five-stack hero scenario.
- `src/domain/engine.ts` — shared validation, mutations, bounded planner, inspection, change history, and rewind.
- `src/webmcp/schemas.ts` — strict JSON schemas and tool descriptions.
- `src/webmcp/bridge.ts` — native `document.modelContext.registerTool` lifecycle and simulator fallback.
- `src/components/BayCanvas.tsx` — operator canvas with selection, drag/drop, locks, and target selection.
- `src/components/AgentOperationsPanel.tsx` — plan preview, validations, version conflict state, and auditable tool trace.
- `src/components/LedgerPanel.tsx` — HUMAN/AGENT/SYSTEM action trail with before/after/diff inspection and rewind.

## WebMCP tools

| Tool | Mode | Purpose |
| --- | --- | --- |
| `inspect_yard` | read | Version, target, blockers, constraints, disruptions, destinations |
| `get_container` | read | One container and its live physical location |
| `analyze_blockers` | read | Physical blocker chain and immediate legal destinations |
| `validate_move` | read | Full six-rule dry-run of one relocation |
| `simulate_relocations` | read | Deterministic minimum-move candidate plans without mutation |
| `execute_move` | write | Version-guarded authoritative relocation |
| `retrieve_target` | write | Version-guarded exposed-target retrieval |
| `inspect_changes` | read | Concise changes after a known version |
| `rewind_yard` | write | Version-guarded physical snapshot restore |

All write tools require `expectedStateVersion`. Every successful mutation increments `stateVersion`, regardless of actor.

## Local commands

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

## Challenge demo

1. Reset to the deterministic v37 scenario.
2. Use **Inspect**, then **Simulate** in Agent Operations.
3. Click **Human: lock B01** on the plan preview. The yard becomes v38.
4. Click **Execute step 1**. The v37 command is rejected with `STALE_STATE`.
5. Inspect again and simulate an alternative v38 plan.
6. Execute one move, inspect/replan, then execute the final blocker move.
7. Retrieve exposed `CX-204`.
8. Rewind the retrieval and inspect the restored live yard.
9. Trigger **Late Truck** or the B05 crane outage and inspect the changed priorities/constraints.

Native WebMCP is used when `document.modelContext` exists. The Tools drawer invokes the identical bridge contract for evaluator testing when native WebMCP is unavailable.
