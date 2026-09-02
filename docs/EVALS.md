# WebMCP Benchmark & Evaluation Trajectories: BayShift

This document details the standard evaluation scenarios and expected WebMCP tool calling trajectories for testing autonomous AI browser agents against BayShift via `document.modelContext`.

---

## Evaluation Scenarios Summary

| Eval # | Objective | Input Prompt | Expected Tool Trajectory | Pass Criteria |
|:---|:---|:---|:---|:---|
| **EVAL-1** | Baseline Inspection & Depth Analysis | *"Inspect the yard and tell me what blocks C01."* | `inspect_yard()` &rarr; `analyze_target(containerId="C01")` | Identifies C01 in Stack B buried under 2 blockers (C04 and C07 at top). Suggests legal destination stacks. |
| **EVAL-2** | Multi-step Clearance & Retrieval | *"Clear C01 without using Stack D, then retrieve it."* | `move_container(C07 &rarr; E)` &rarr; `move_container(C04 &rarr; A)` &rarr; `retrieve_target(C01)` | C01 is exposed; dynamic tool `retrieve_target` becomes available; container retrieved to gate. |
| **EVAL-3** | Invariant Violation & Error Recovery | *"Move the top container from Stack B to locked Stack D."* | `move_container(C07 &rarr; D)` &rarr; `ERR_DEST_LOCKED` &rarr; `move_container(C07 &rarr; E)` | Rejection received with code `ERR_DEST_LOCKED` and legal alternatives; agent recovers gracefully without crashing. |
| **EVAL-4** | Reversible Rollback | *"Undo your last move."* | `rewind_last_action()` | State restored to exact pre-move snapshot; metrics travel steps and relocations decremented appropriately. |
| **EVAL-5** | Business Rule Target Order Enforcement | *"Retrieve C09 before C01."* | `retrieve_target(C09)` &rarr; `ERR_NOT_ELIGIBLE_TARGET` | Rejection received; engine reports C01 is mandatory head of retrieval queue. |
| **EVAL-6** | Dynamic Co-Operational Adaptation | After human clicks "Late truck update": *"Continue, but first re-check the yard."* | `inspect_yard()` &rarr; detects C08 expedited to #2 in queue and Stack D locked | Agent updates plan dynamically without attempting moves to locked Stack D. |

---

## Detailed Evaluation Trajectories

### EVAL-1: Yard Inspection & Blocker Analysis

**User Prompt:**
> *"Inspect the yard and tell me what blocks C01."*

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
   - Mentions C01 is at the bottom of Stack B (slot 1).
   - Lists blockers C04 and C07 (top).
   - Identifies Stack E (low occupancy, 3 open slots) and Stack A (2 open slots) as candidate relocation destinations.

---

### EVAL-2: Multi-step Clearance & Retrieval (Constraint Avoidance)

**User Prompt:**
> *"Clear C01 without using Stack D, then retrieve it."*

**Expected Tool Trajectory:**
1. **Call:** `simulate_relocation({ containerId: "C07", toStack: "E" })`
   - Returns `allowed: true`, `craneTravelSteps: 3`.
2. **Call:** `move_container({ containerId: "C07", fromStack: "B", toStack: "E", rationale: "Relocate top blocker to Stack E" })`
   - Returns `ok: true`, moves C07 to E.
3. **Call:** `move_container({ containerId: "C04", fromStack: "B", toStack: "A", rationale: "Relocate secondary blocker to Stack A" })`
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

### EVAL-3: Invariant Violation & Error Recovery

**User Prompt:**
> *"Move the top container from Stack B to locked Stack D."*

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

### EVAL-4: Reversible Rollback

**User Prompt:**
> *"Undo your last move."*

**Prerequisite:** At least one reversible move or retrieve action exists in the operations ledger.
**Expected Tool Trajectory:**
1. **Call:** `rewind_last_action({})`
   - **Response Output:**
     ```json
     {
       "ok": true,
       "code": "OK",
       "message": "Rewound AGENT move action (evt-...).",
       "metrics": {
         "relocations": 0,
         "retrieves": 0,
         "travelSteps": 0,
         "blockingScore": 3
       }
     }
     ```
2. **Result:** The bay stacks, queue, and metrics are restored to the exact pre-move snapshot. The ledger records a `SYSTEM/HUMAN` rewind event.

---

### EVAL-5: Out-of-Sequence Retrieval Business Rule Rejection

**User Prompt:**
> *"Retrieve C09 before C01."*

**Expected Tool Trajectory:**
1. If `retrieve_target` is invoked:
   - **Call:** `retrieve_target({ containerId: "C09" })`
   - **Response Output:**
     ```json
     {
       "ok": false,
       "code": "ERR_NOT_ELIGIBLE_TARGET",
       "message": "Container 'C09' is not the current eligible target. Current priority pickup is 'C01'.",
       "legalNext": [{ "currentTarget": "C01" }]
     }
     ```
2. **Agent Explanation:**
   - Agent reports terminal pickup rules require strict priority queue fulfillment: C01 must be extracted first.

---

### EVAL-6: Late Truck Update & Co-Operational Re-Inspection

**Context:**
Human operator clicks **"Late Truck Update"** in the top bar. Container C08 is expedited to queue position #2, and Stack D is locked for emergency crane staging.

**User Prompt:**
> *"Continue, but first re-check the yard."*

**Expected Tool Trajectory:**
1. **Call:** `inspect_yard({})`
   - Agent detects:
     - Priority queue now has `C08` as the second pickup immediately after `C01`.
     - Stack D is now `locked: true`.
2. **Call:** `analyze_target({ containerId: "C08" })`
   - Discovers C08 is in Stack D, which is currently locked.
3. **Agent Synthesis:**
   - Reports the updated operational picture to the human operator: "Stack D is locked and C08 is now expedited for pickup #2. I will avoid using Stack D for relocations and prepare clearance accordingly."
