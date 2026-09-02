# BayShift evaluator prompts

## Inspect only

> Inspect the shared yard and explain what physically blocks CX-204. Do not mutate anything.

Expected tools: `inspect_yard`, `analyze_blockers`.

## Plan and conflict recovery

> Simulate the minimum relocation plan for CX-204. I will lock the first destination before execution. Attempt the prepared move, handle any stale-state rejection, inspect what changed, and replan against the current yard.

Expected tools: `simulate_relocations`; human stack lock; `execute_move` returning `STALE_STATE`; `inspect_changes`; `inspect_yard`; fresh `simulate_relocations`.

## Execute and retrieve

> Clear CX-204 one legal relocation at a time. Re-inspect or re-simulate after every mutation, then retrieve the target when exposed.

Expected tools: alternating read tools and version-guarded `execute_move`, followed by `retrieve_target`.

## Rewind and disruption

> Rewind the last yard action, inspect the restored state, then explain how the late-truck or crane-outage event changes current priorities or legal destinations.

Expected tools: `rewind_yard`, `inspect_yard`, and optionally `inspect_changes` after a human event.
