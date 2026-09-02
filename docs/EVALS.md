# WebMCP Benchmark & Evaluation Trajectories: BayShift

This document details the standard evaluation scenarios and expected WebMCP tool calling trajectories for testing autonomous AI browser agents against BayShift via `document.modelContext`.

---

## Primary Judge Evaluation Prompts

| Prompt ID | Evaluator Prompt | Expected Tool Trajectory | Evaluation / Pass Criteria |
|:---|:---|:---|:---|
| **Prompt A** | *"Inspect the yard and explain what blocks C01. Do not move anything yet."* | `inspect_yard()` &rarr; `analyze_target(containerId="C01")` | Agent inspects without mutating. Identifies C01 in Stack B, slot 0 (buried under C04 and top blocker C07). Notes legal candidate destinations (Stack E and Stack A). |
| **Prompt B** | *"Clear C01 without using Stack D. Make one legal relocation at a time, check the state after each move, and retrieve C01 when it becomes available."* | `move_container(C07 &rarr; E)` &rarr; `move_container(C04 &rarr; A)` &rarr; `retrieve_target(C01)` | Agent executes sequential legal moves, verifying state. C01 becomes topmost; dynamic tool `retrieve_target` becomes available; container retrieved to gate. |
| **Prompt C** | *"The yard just changed because I updated an operator constraint. Re-inspect the current state before doing anything else, explain what changed, then continue legally."* | `inspect_yard()` &rarr; `analyze_target(containerId="C08")` | Agent detects that Stack D was locked by operator and C08 was expedited to queue position #2. Synthesizes revised clearance plan avoiding Stack D. |
| **Failure Prompt (Optional)** | *"Try moving the current top blocker to locked Stack D. If rejected, use the structured error to recover."* | `move_container(C07 &rarr; D)` &rarr; `ERR_DEST_LOCKED` &rarr; `move_container(C07 &rarr; E)` | Rejection received with code `ERR_DEST_LOCKED` and legal alternatives; agent recovers gracefully without crashing. |

---

## Detailed Tool Trajectories

### Prompt A: Baseline Inspection & Blocker Analysis (Read-Only)

**User Prompt:**
> *"Inspect the yard and explain what blocks C01. Do not move anything yet."*

**Expected Tool Trajectory:**
1. **Call:** `inspect_yard({})`
   - **Returns:** Full 5-stack occupancy, current target `"C01"`, guidance indicating C01 is buried.
2. **Call:** `analyze_target({ containerId: "C01" })`
   - **Response Output:**
     ```json
     {
       "ok": true,
       "code": "OK",
       "message": "Container C01 is buried under 2 blocker(s) on Stack B.",
       "data": {
         "containerId": "C01",
         "stackId": "B",
         "stackIndex": 0,
         "depthFromTop": 2,
         "isTopmost": false,
         "isCurrentTarget": true,
         "blockersAbove": [
           { "id": "C04", "priority": 4, "label": "Industrial Steel" },
           { "id": "C07", "priority": 7, "label": "Dry Bulk 20ft" }
         ],
         "legalDestinationsForTopBlocker": ["A", "C", "D", "E"]
       }
     }
     ```
3. **Agent Synthesis:**
   - Explains that C01 is at the bottom of Stack B (slot 0).
   - Identifies blockers C04 (slot 1) and C07 (slot 2, topmost).
   - Notes Stack E has 3 open slots (lowest risk) and Stack A has 2 open slots.
   - Performs zero mutations.

---

### Prompt B: Constraint-Aware Sequential Clearance & Retrieval

**User Prompt:**
> *"Clear C01 without using Stack D. Make one legal relocation at a time, check the state after each move, and retrieve C01 when it becomes available."*

**Expected Tool Trajectory:**
1. **Call:** `simulate_relocation({ containerId: "C07", toStack: "E" })`
   - Returns `allowed: true`, `craneTravelSteps: 3`.
2. **Call:** `move_container({ containerId: "C07", fromStack: "B", toStack: "E", rationale: "Relocate top blocker C07 to Stack E" })`
   - Returns `ok: true`, moves C07 to E.
3. **Call:** `move_container({ containerId: "C04", fromStack: "B", toStack: "A", rationale: "Relocate secondary blocker C04 to Stack A" })`
   - Returns `ok: true`, moves C04 to A.
   - **Dynamic Lifecycle Event:** With C01 now topmost in Stack B and head of queue, `retrieve_target` dynamically registers on `document.modelContext`.
4. **Call:** `retrieve_target({ containerId: "C01" })`
   - Returns:
     ```json
     {
       "ok": true,
       "code": "OK",
       "message": "Successfully retrieved target container C01 from Stack B.",
       "retrieves": 1,
       "nextTarget": "C02"
     }
     ```
   - Target queue advances to `C02`.

---

### Prompt C: Late Truck Update & Co-Operational Re-Inspection

**Context:**
Human operator clicks **"Late Truck Update"** in the top bar. Container C08 is expedited to queue position #2, and Stack D is locked for emergency crane staging.

**User Prompt:**
> *"The yard just changed because I updated an operator constraint. Re-inspect the current state before doing anything else, explain what changed, then continue legally."*

**Expected Tool Trajectory:**
1. **Call:** `inspect_yard({})`
   - Agent detects:
     - Priority queue now has `C08` as the second pickup immediately after `C01`.
     - Stack D is now `locked: true`.
2. **Call:** `analyze_target({ containerId: "C08" })`
   - Discovers C08 is in Stack D, which is currently locked.
3. **Agent Synthesis:**
   - Reports the updated operational picture to the human operator: "Stack D is locked and C08 is now expedited for pickup #2. I will avoid using Stack D for relocations and prepare clearance accordingly."

---

### Optional Failure Prompt: Invariant Violation & Structured Recovery

**User Prompt:**
> *"Try moving the current top blocker to locked Stack D. If rejected, use the structured error to recover."*

**Expected Tool Trajectory:**
1. **Call:** `move_container({ containerId: "C07", fromStack: "B", toStack: "D" })`
   - **Response Output (Invariant Rejection):**
     ```json
     {
       "ok": false,
       "code": "ERR_DEST_LOCKED",
       "message": "Destination Stack 'D' is currently locked by the operator.",
       "legalNext": ["A", "C", "E"]
     }
     ```
2. **Agent Recovery Behavior:**
   - Rather than halting or making unauthorized DOM edits, the agent reads `legalNext` and executes a recovery move to an unlocked destination:
   - **Call:** `move_container({ containerId: "C07", fromStack: "B", toStack: "E", rationale: "Fallback relocation after Stack D rejection" })`
   - Returns `ok: true`.

---

## Rollback & Target Order Benchmark

- **Rewind Tool:** Calling `rewind_last_action({})` undoes the latest reversible relocation or retrieval action, restoring the bay to the exact pre-action snapshot.
- **Out-of-Order Retrieval:** Calling `retrieve_target({ containerId: "C09" })` before C01 is extracted is strictly rejected with `ERR_NOT_ELIGIBLE_TARGET`.
