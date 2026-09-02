# Foundation audit

## Current architecture

BayShift is a React/TypeScript/Vite single-page app. The domain engine is pure and client-side. React owns one `YardState`; both human handlers and WebMCP callbacks call the same exported engine mutations.

## Invariants

- `stateVersion` is monotonic and every successful mutation advances it exactly once.
- `execute_move`, `retrieve_target`, and `rewind_yard` require `expectedStateVersion`.
- Stale commands return `STALE_STATE`, expected/current versions, a reason, and re-inspection guidance without mutation.
- Simulation deep-clones working snapshots and never writes state or history.
- Rewind restores actual stacks, queue, target, constraints, disruptions, and metrics while assigning a new version.
- History is chronological and actor-attributed with before/after evidence and changed entities.

## Verified scenario

Native WebMCP was available in the Codex in-app browser. The following live sequence passed: inspect v37, simulate two moves, human lock B01 to v38, stale v37 execution rejection, inspect changes, replan around B01, execute CX-203 to B04, execute CX-188 to B05, retrieve CX-204, rewind retrieval, and apply late-truck priority mutation.
