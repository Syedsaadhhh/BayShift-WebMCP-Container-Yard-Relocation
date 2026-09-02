# Native WebMCP Test

## Client
- **client**: Google Chrome (Windows Desktop) / Node.js CI test environment
- **browser version**: 152.0.7977.65
- **WebMCP flag/config**: `chrome://flags/#enable-webmcp-testing` (Required flag: `ModelContextTesting` / `ModelContextAPI`)
- **URL tested**: `http://127.0.0.1:5173/`

## API
- **document.modelContext present**: NO (Not present in default, unflagged browser session without interactive human flag activation)
- **tool discovery**: BLOCKED (Requires active `document.modelContext`)
- **native inspect_yard**: BLOCKED
- **native move_container**: BLOCKED
- **native retrieve_target**: BLOCKED
- **native rewind_last_action**: BLOCKED
- **invalid move recovery**: BLOCKED
- **dynamic registration**: BLOCKED

## Shared State Proof
**Simulated / Automated Domain Proof:**
When `move_container` is executed (via the shared domain engine or the Developer / Judge Simulator):
1. Top blocker `C07` is relocated from Stack B to Stack E.
2. The authoritative bay state in `App.tsx` updates immediately via `applyMove(prev, 'agent', input)`.
3. The visual canvas re-renders Stack B with 2 containers (`C01`, `C04`) and Stack E with 2 containers (`C12`, `C07`).
4. The Operations Ledger at the bottom immediately records an entry with the cyan **AGENT** badge, timestamp, crane travel steps (3), and operational rationale.
5. The human operator controls in `BayCanvas` immediately reflect the updated top handles (e.g. `C04` is now selectable for human moves, whereas `C07` is now situated in Stack E).

## Evidence
- **Automated Vitest Suite (`tests/webmcp.test.ts`)**: 4 passed tests verifying `inspect_yard`, `move_container`, dynamic registration of `retrieve_target`, and dynamic registration of `rewind_last_action`.
- **Domain Invariant Suite (`tests/domain.test.ts`)**: 14 passed tests proving human and agent use the identical state engine and invariant validation.
- **HTTP Endpoint Header Evidence**: Response headers on `http://127.0.0.1:5173/` confirm `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.
- **Runtime Environment Limitation**: Antigravity runs in an automated background agent environment without interactive desktop display or direct flag configuration for Chrome `152.0.7977.65`.

## Verdict
NATIVE_WEBMCP_BLOCKED_BY_CLIENT

---

## Manual WebMCP Verification Procedure for Human Operator

To verify Native WebMCP with Chrome 152+ or ChatGPT In-App Browser:

1. **Launch Chrome with WebMCP Flags**:
   - In Google Chrome, navigate to `chrome://flags/#enable-webmcp-testing` (or launch via terminal: `chrome.exe --enable-features=ModelContextTesting,ModelContextAPI`).
   - Enable the flag and click **Relaunch**.
2. **Navigate to BayShift**:
   - Open `http://127.0.0.1:5173/`.
   - Observe the top-bar indicator: it will transition from amber `Manual Mode (WebMCP Unavailable)` to green `WebMCP: Connected`.
3. **Verify Tool Discovery in Agent Context**:
   - Open DevTools Console and inspect `document.modelContext`.
   - Verify that 4 tools (`inspect_yard`, `analyze_target`, `simulate_relocation`, `move_container`) are initially active.
4. **Execute Agent Relocation**:
   - Ask your WebMCP AI agent: *"Inspect the yard and clear C01 without using Stack D."*
   - Observe the agent invoking `move_container(C07 -> E)` and `move_container(C04 -> A)`.
   - Confirm that the UI canvas updates in real time and the ledger displays **AGENT** in cyan.
5. **Verify Dynamic Tool Lifecycle**:
   - With `C01` now exposed at the top of Stack B, verify that `retrieve_target` dynamically appears.
   - Instruct the agent: *"Retrieve C01."*
   - Observe `C01` extracted from the bay and target queue advancing to `C02`.
