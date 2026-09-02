# BayShift Final Sprint Handoff

Last updated: 2026-09-02, Pakistan time  
Repository: https://github.com/Syedsaadhhh/BayShift-WebMCP-Container-Yard-Relocation  
Challenge: https://webmcp.devpost.com/  
Submission deadline: **2026-09-04 1:00 AM PKT** (2026-09-03 1:00 PM PT / 20:00 UTC)

This is the single source of context for the final BayShift sprint. A new coding agent must read this file completely before editing. Inspect the existing repository; do not replace the project with a new prototype.

## Immediate operating decision

Continue the frontend in **Google Antigravity using this exact folder**:

`C:\Users\ATEC\Desktop\WebMCP`

Use one lead coding model at a time. Claude Sonnet 4.6 or Gemini 3.1 Pro can lead the visual architecture and implementation. Use Gemini 3.7 Flash or 3.6 Flash for fast, bounded CSS/component iterations, test repairs, and copy cleanup. Do not let two agents edit `src/App.tsx` or `src/App.css` simultaneously.

Use ChatGPT Work or a fresh Codex task later for independent product review, deployed WebMCP testing, narration refinement, and submission preparation. Do not move the active implementation to an ordinary chat without direct access to this folder or GitHub.

The current Codex five-hour window is nearly exhausted and resets at approximately **11:53 PM PKT on September 2**. This is a temporary usage-window constraint, not a problem with the repository. Preserve Codex for the final deployed WebMCP test after reset.

## Product in one sentence

**BayShift is a live container-yard digital twin where a human operator and any WebMCP-capable browser agent safely plan, mutate, inspect, and recover against the same versioned operational state.**

## The ten-second judge understanding

Within ten seconds, a judge should understand all five truths:

1. This is a live container yard, not a dashboard.
2. A priority container is physically trapped under blockers.
3. An agent can inspect and plan through registered WebMCP tools.
4. A human can change the same yard and invalidate the plan.
5. The agent detects the stale state, replans, and completes the job safely.

If the interface needs paragraphs or a guided tour to communicate those truths, the interface is not finished.

## What BayShift is not

- Not an embedded chatbot. The external browser agent is the intelligence layer.
- Not a static logistics dashboard or a wall of KPI cards.
- Not a generic MCP CRUD demo.
- Not a visual mock whose buttons bypass the domain engine.
- Not a photorealistic background with decorative, disconnected overlays.
- Not cyberpunk. Use restrained industrial lighting, legible operational color, and selective glass.

## What is already built and verified

The functional core is complete and must be preserved:

- React 18, TypeScript, Vite 6, and Vitest.
- One authoritative client-side `YardState` shared by human UI actions and agent tool calls.
- Seeded hero scenario starts at `stateVersion` 37.
- Retrieval target `CX-204` is buried under `CX-188` and `CX-203` in `B02`.
- Successful mutations monotonically increment `stateVersion`.
- Destructive agent tools require `expectedStateVersion` and reject stale commands with `STALE_STATE`.
- Deterministic bounded relocation planner; simulation does not mutate the yard.
- Rules for top-only movement, stack height, locks, outages, weight order, reserved destinations, and target exposure.
- Human drag/drop, target selection, stack lock, outage, late-truck disruption, retrieval, history inspection, and physical rewind.
- Actor-attributed HUMAN / AGENT / SYSTEM action history with before/after snapshots and changed entities.
- Nine native WebMCP tools registered through `document.modelContext.registerTool`.
- 18 automated tests passing.
- `npm run build` passing.
- A live native WebMCP browser flow was already executed successfully: inspect, plan, human mutation, stale rejection, reinspect, replan, legal moves, retrieval, rewind, and late-truck mutation.
- Public GitHub repository and MIT license already exist.

Primary implementation files:

- `src/domain/types.ts` — domain contracts.
- `src/domain/scenario.ts` — deterministic hero scenario.
- `src/domain/engine.ts` — validation, planning, mutation, history, and rewind.
- `src/webmcp/schemas.ts` — strict tool schemas and descriptions.
- `src/webmcp/bridge.ts` — native tool registration and UI trace callbacks.
- `src/App.tsx` — authoritative React composition and handlers.
- `src/components/BayCanvas.tsx` — current yard interaction surface.
- `src/components/ContainerUnit.tsx` — current container rendering.
- `src/components/AgentOperationsPanel.tsx` — current plan and tool trace UI.
- `src/components/LedgerPanel.tsx` — history, diff, and rewind.
- `src/App.css` — current visual system.
- `tests/domain.test.ts` and `tests/webmcp.test.ts` — regression contracts.

## Native WebMCP surface

Do not rename or remove these tools during the frontend pass:

| Tool | Role |
| --- | --- |
| `inspect_yard` | Summarize live state, target, blockers, constraints, disruptions, and destinations |
| `get_container` | Resolve one container and its physical location |
| `analyze_blockers` | Explain what prevents retrieval |
| `validate_move` | Dry-run one move against all rules |
| `simulate_relocations` | Produce non-mutating minimum-move candidate plans |
| `execute_move` | Perform one version-guarded authoritative relocation |
| `retrieve_target` | Retrieve an exposed target with a version guard |
| `inspect_changes` | Report concise changes since a known version |
| `rewind_yard` | Restore a real prior snapshot with a version guard |

## The differentiating proof

The central proof is not simply “an agent can call a website tool.” It is safe collaboration over a contested operational world:

```text
Agent inspects v37
-> agent simulates a legal route for v37
-> human locks the planned destination
-> shared yard becomes v38
-> agent's v37 move is rejected as STALE_STATE
-> agent inspects the delta
-> agent replans against v38
-> containers visibly relocate
-> CX-204 becomes exposed and is retrieved
```

The final UI and video must make this sequence unmistakable.

## Current visual problem — black-judge assessment

The current build is technically credible but visually reads as a dense developer dashboard. Too much text and too many parallel cards compete with the yard. The containers are small and schematic, so the real-world logistics problem is not emotionally or spatially obvious. Agent operations are shown, but the product does not yet feel like a living operational environment.

This creates judge risk:

- **WebMCP Leverage:** strong in code, but the visible cause-and-effect may be missed.
- **Execution:** functionality is complete, but the experience can look like a proof-of-concept dashboard.
- **Potential Impact:** the real port problem is described more than it is felt.
- **Creativity & Ambition:** the shared-state idea is novel, but the presentation does not yet reveal its ambition.

The final frontend pass should increase clarity, consequence, and cinematic credibility—not feature count.

## Visual north star

Use the first reference image for atmosphere and scale, not as a literal UI template:

- `C:\Users\ATEC\Downloads\ChatGPT Image Sep 2, 2026, 06_08_52 PM.png`
- `C:\Users\ATEC\Downloads\ChatGPT Image Sep 2, 2026, 06_05_28 PM.png`

Target composition:

- Roughly 80% live yard.
- Roughly 10% mission/status information.
- Roughly 10% expandable controls and audit trail.
- Night port atmosphere: wet asphalt, lane markings, distant cranes, sodium/white work lights, restrained haze.
- Large, readable, 2.5D container stacks with corrugated sides, roof ribs, door bars, corner castings, directional lighting, and grounded shadows.
- The target is unmistakably green only when selected/exposed.
- Active plan is cyan; human intervention is amber; rejected/blocked is red.
- Glassmorphism appears only on a few floating operational surfaces, never across every element.
- Motion is purposeful and derived from actual state transitions.

Prefer performant React DOM/SVG/CSS over introducing a heavy 3D engine this late. A convincing fixed-camera 2.5D stage is safer than a half-finished Three.js rewrite.

## Final information architecture

### Center: the living yard

The yard is the product. Five bays should occupy the full frame with visible lanes and depth. `B02` and `CX-204` should naturally draw attention without a paragraph explaining them. Containers must remain real DOM/domain objects and support selection and legal drag/drop.

### Top-left: one mission capsule

Show only essential context:

- `Retrieve CX-204`
- urgency / truck ETA
- `2 blockers` or `target exposed`
- live `v37`, `v38`, etc.

### Right edge: agent dock

Default state is a thin glass edge tab such as `AGENT READY` or the active tool name. It expands on hover, keyboard focus, or click and auto-opens when a tool is running, rejected, or has a plan ready.

Expanded content stays compact:

- current tool/action
- one-sentence result
- two or three plan steps
- legality chips
- one relevant action button in manual/simulator mode

It must display an auditable event trace, never fabricated chain-of-thought.

### Top-left or contextual edge: operational event

Late truck, locked bay, and outage alerts should appear only when active. Use a compact amber/red signal connected visually to the affected bay.

### Bottom: compact history rail

Use a slim timeline with actor color, latest action, state transition, and rewind. Expand details on click. Avoid a permanently tall ledger.

### Contextual interaction

Container and bay details appear on hover, focus, or selection. Keep identifiers readable but avoid putting full labels on every object at all times.

## Required state-driven motion

Every animation must correspond to a real tool event or domain mutation:

1. `inspect_yard`: a restrained scan line or bay-by-bay illumination.
2. `analyze_blockers`: blockers above `CX-204` pulse amber in physical order.
3. `simulate_relocations`: ghost destinations and numbered cyan route arcs appear; state does not change.
4. Human locks destination: bay turns amber, lock marker engages, and version ticks to v38.
5. Stale `execute_move`: proposed route snaps/breaks red; small `STALE v37 -> v38` signal appears.
6. Reinspect/replan: red clears, cyan scan returns, alternative destination illuminates.
7. `execute_move`: container visibly lifts, traverses, and settles; source and destination highlight briefly.
8. Target exposed: `CX-204` changes from blocked treatment to a clear green extraction signal.
9. `retrieve_target`: target follows a visible route toward the gate and leaves the active stack.
10. `rewind_yard`: affected move visually reverses or transitions clearly back to the restored snapshot.

Animations should be short enough for a demo: generally 300–900 ms. Support `prefers-reduced-motion`.

## Preservation guardrails

- Do not rewrite `src/domain/engine.ts`, `src/webmcp/bridge.ts`, or schemas merely for styling.
- Human and agent actions must continue through the same engine.
- Do not add an internal LLM, API key, backend, auth, database, Chrome extension, or new deployment dependency.
- Do not fake agent activity with timers that are disconnected from WebMCP tool callbacks.
- Do not make the reference photo the only yard; interactive containers must remain legible and operable.
- Do not bury native tool registration behind UI conditionals.
- Do not rename the seeded target or change the deterministic demo unless all tests and narration are intentionally updated.
- Keep the page usable at 16:9 screen-recording dimensions and provide a reasonable narrower-screen fallback.
- Keep buttons available for local/manual testing even though the recorded hero demo should use a fresh external browser agent.

## Official judging map

The Devpost plugin returned four criteria, each scored on a five-point scale.

| Criterion | What BayShift must prove visibly |
| --- | --- |
| WebMCP Leverage | Nine structured tools solve a non-trivial physical planning task; reads, simulations, version-guarded writes, recovery, and rewind all work |
| Execution | A polished, runnable live URL; coherent yard experience; no broken controls; fresh-browser completion |
| Potential Impact | Container reshuffling is a real delay/cost problem; the shared state reduces unsafe or wasted moves under changing conditions |
| Creativity & Ambition | Human and agent share one mutable spatial world; optimistic concurrency and visible recovery go beyond ordinary agent forms or CRUD |

The strategy is not to add four new features. One excellent stale-plan recovery sequence should answer all four criteria.

## Twelve-task final checklist

### 1. Protect the verified baseline

- [ ] Run `git status --short --branch` and confirm only intended files are changing.
- [ ] Run the current test/build commands before visual edits.
- [ ] Keep changes in small commits after each verified milestone.

Acceptance: 18 tests and production build pass before the visual rewrite.  
Verify: `npm test && npm run build`

### 2. Establish the cinematic stage

- [ ] Recompose `App.tsx` around a full-viewport yard rather than a dashboard grid.
- [ ] Add a layered atmospheric background with a dark operational apron behind interactive stacks.
- [ ] Preserve sufficient contrast when the reference image is used.

Acceptance: at 1920x1080, the yard is the dominant first impression and overlays occupy a minority of the frame.  
Verify: visual capture at 1920x1080 and 1440x900.

### 3. Rebuild the containers as credible physical objects

- [ ] Upgrade `ContainerUnit.tsx` and related CSS to large 2.5D containers.
- [ ] Add corrugation, top plane, end doors, locks/corners, material variation, shadow, and stack depth.
- [ ] Preserve selection, target state, drag/drop, IDs, and accessibility.

Acceptance: an unprompted viewer immediately identifies shipping containers and understands which objects are stacked.  
Verify: manual selection and one legal/illegal human drag.

### 4. Compose a readable five-bay yard

- [ ] Give bays real lanes, boundary markings, ground labels, and depth separation.
- [ ] Make `B02` and buried `CX-204` readable without enlarging every label.
- [ ] Add subtle ambient crane/light/vehicle motion that never obscures operational state.

Acceptance: target, blockers, origin, and destination remain readable over the port atmosphere.  
Verify: screenshot plus human scan test: identify target problem in under ten seconds.

### 5. Collapse UI chrome into contextual glass controls

- [ ] Replace the persistent right-rail card stack with an edge agent dock.
- [ ] Reduce top status to one mission capsule and minimal utility controls.
- [ ] Convert the ledger to a slim expandable bottom timeline.
- [ ] Show alerts and details only when relevant.

Acceptance: there is no “dashboard wall”; yard remains usable when all panels are collapsed.  
Verify: keyboard focus, hover, click, and pinned-open behavior.

### 6. Connect tool events to visual choreography

- [ ] Drive scan, blocker, plan, stale, move, exposure, retrieval, and rewind states from real `agentTrace`, `activePlan`, history, and yard data.
- [ ] Add visible but brief transitions for the ten required states above.
- [ ] Never animate a mutation before the engine confirms success.

Acceptance: a recorded viewer can infer the agent’s action and result even with the sound muted.  
Verify: execute the complete seeded scenario locally.

### 7. Preserve human interaction and conflict

- [ ] Keep container selection and legal drag/drop discoverable.
- [ ] Keep stack lock/unlock and outage controls contextual.
- [ ] Make the planned destination easy for the operator to lock during the hero demo.
- [ ] Make v37 to v38 and stale rejection visually obvious.

Acceptance: the human intervention visibly changes the same world and invalidates the saved agent plan.  
Verify: simulate at v37, lock planned destination, execute retained v37 step, observe `STALE_STATE`.

### 8. Responsive, accessible, and recording-ready pass

- [ ] Optimize the primary composition for 16:9 recording.
- [ ] Keep controls legible at 1440x900 and common laptop widths.
- [ ] Add focus-visible styles, accessible names, adequate contrast, and reduced-motion behavior.
- [ ] Prevent overflow, clipping, and hover-only dead ends.

Acceptance: core actions remain available without a mouse and at the recording viewport.  
Verify: keyboard pass, responsive resize, and browser console check.

### 9. Regression and performance gate

- [ ] Run tests and production build after each structural milestone.
- [ ] Run the deterministic manual flow script.
- [ ] Repair warnings, console errors, layout shifts, and obvious frame drops.
- [ ] Confirm all nine tools still register.

Acceptance: functional proof is unchanged and the first scene appears promptly on a normal connection.  
Verify:

```bash
npm test
npm run build
node scripts/verify_manual_flow.mjs
```

### 10. Deploy and verify outside the development session

- [ ] Deploy the repository to Vercel using the existing `vercel.json`.
- [ ] Record the production URL in `README.md` and Devpost draft.
- [ ] Open the URL in a fresh incognito/WebMCP-capable browser.
- [ ] Verify asset paths, reload routing, responsive layout, and tool discovery.

Acceptance: the public URL loads without local state, login, tunnel, or cached development assumptions.  
Verify: complete the hero task from the production URL in a fresh session.

### 11. Capture the proof video and narration

- [ ] Record a clean 16:9 take showing the working app in the first 10–15 seconds.
- [ ] Keep the final video below three minutes and include spoken audio.
- [ ] Show real agent tool use, human intervention, stale recovery, execution, and retrieval.
- [ ] Upload publicly to YouTube and verify playback while logged out.

Acceptance: a judge can understand the problem, WebMCP fit, shared-state novelty, and outcome without reading the repository.  
Verify: final duration, public visibility, audible narration, and URL.

### 12. Complete submission with a safety buffer

- [ ] Finish the Devpost draft before the final hours.
- [ ] Add live URL, public repo, public YouTube video, and concise implementation story.
- [ ] Answer which agents/clients were tested and which AI tools were used.
- [ ] Confirm the MIT license is detected in GitHub’s About area.
- [ ] Submit, then verify it is not merely saved as a draft.

Acceptance: public project page exists and every required link works logged out.  
Verify: inspect the submitted page and all outbound links before the deadline.

## Recommended 28-hour schedule

Do not spend all remaining time on animation.

| Window | Outcome |
| --- | --- |
| Now to +6h | Cinematic shell, realistic containers, dominant yard |
| +6h to +10h | Agent dock, timeline, contextual controls, state-driven animation |
| +10h to +12h | Responsive/accessibility/performance cleanup |
| +12h to +14h | Full tests, build, manual regression, repair |
| +14h to +16h | Vercel deployment and fresh-browser WebMCP verification |
| +16h to +19h | Record multiple clean demo takes |
| +19h to +21h | Record phone narration, edit, synchronize, export |
| +21h to +23h | YouTube upload and logged-out verification |
| +23h to +25h | Devpost description, fields, screenshots, final repo cleanup |
| Final buffer | Submission verification and emergency repair only |

If implementation slips, cut environmental flourishes first. Never cut deployment verification, real WebMCP proof, narration, public video, or submission buffer.

## Hero demo: exact external-agent prompts

Start a fresh Codex or ChatGPT Work task with a WebMCP-capable in-app browser.

Prompt 1:

> Open BayShift at [LIVE URL]. Inspect the live yard and find the minimum legal plan to retrieve CX-204. Simulate the route first and wait for my approval before executing anything.

While the plan is visible, use the BayShift human UI to lock the proposed destination stack.

Prompt 2:

> Execute the saved plan. If the yard changed, recover safely: inspect what changed, replan against the current state, execute the legal relocations, and retrieve CX-204.

Optional closing prompt:

> Summarize the actions you performed, the stale-state conflict you detected, and the final yard version.

The key is that the agent receives ordinary natural-language instructions in a fresh task and discovers the site’s structured tools. Do not use the internal Demo Guide as the primary recorded proof.

## Demo shot plan and working voice script

Target duration: 2:20–2:40. Record the screen first if needed, then record each narration block separately on the phone so timing can be adjusted in editing.

### 0:00–0:15 — hook and immediate working product

Visual: open directly on the living night yard, target and two blockers visible.

Voice:

> This is BayShift, a live container yard where a human operator and an AI agent work on the same operational state. CX-204 must reach its truck, but two containers are physically blocking it.

### 0:15–0:38 — why WebMCP

Visual: fresh agent opens the deployed URL and invokes inspect/analyze; yard scans and blockers illuminate.

Voice:

> Instead of making the agent guess through pixels or filling the app with a chatbot, BayShift exposes nine structured WebMCP tools. The agent can inspect the yard, understand constraints, and identify the exact blocker chain directly from the website.

### 0:38–0:58 — deterministic plan

Visual: simulation route, numbered moves, ghost destinations, validation signals.

Voice:

> The site’s deterministic planner now simulates the minimum legal relocation sequence. This is only a preview: LIFO, height, weight, locks, reserved bays, and outages are checked without mutating the yard.

### 0:58–1:23 — shared-state conflict

Visual: human locks the proposed destination; version changes; agent tries saved move; route rejects red.

Voice:

> But real yards do not stand still. Before execution, the human operator locks the planned destination for safety. The shared state advances from version 37 to 38. When the agent attempts its saved move, BayShift rejects it as stale instead of applying an unsafe action.

### 1:23–1:52 — recovery and execution

Visual: agent reinspects, alternative plan lights, two containers visibly relocate.

Voice:

> The agent is told exactly what changed. It reinspects version 38, finds an alternative legal route, and executes each move through the same validation engine used by the human operator. Every action is visible, versioned, and auditable.

### 1:52–2:08 — outcome

Visual: target exposed green, retrieval route to gate, success state.

Voice:

> With both blockers relocated, CX-204 becomes exposed and the agent retrieves it to the gate. The operator can inspect every before-and-after change or physically rewind the yard.

### 2:08–2:30 — close on novelty and impact

Visual: wide final yard, compact tool/activity trace, project title.

Voice:

> BayShift turns WebMCP into a safe collaboration protocol for a changing physical operation. It is not an AI overlay on a dashboard. It is one live world where human judgment and agent execution stay synchronized—even when reality changes the plan.

Leave five to fifteen seconds of margin under the three-minute limit for cuts, loading, and title cards.

## Deployment choice

Use **Vercel first** because this is an existing static Vite repository with `vercel.json`; no backend is required. ChatGPT Sites is an allowed option, but changing build/hosting systems now adds unnecessary migration risk. Render is also valid but offers no clear advantage for this client-only app.

Do not build a Chrome extension for the submission. WebMCP is an open browser-facing capability, and the challenge explicitly accepts a normal deployed URL tested in ChatGPT’s in-app browser or Chrome with WebMCP enabled. An extension would consume time without strengthening the core judging proof.

## Local commands

```bash
npm install
npm run dev
```

Local URL:

`http://127.0.0.1:5173/`

Validation:

```bash
npm test
npm run build
node scripts/verify_manual_flow.mjs
```

## Copy/paste prompt for a new Antigravity chat

> Work directly in `C:\Users\ATEC\Desktop\WebMCP`. First read `BAYSHIFT_FINAL_SPRINT_HANDOFF.md`, `README.md`, `BUILD_STATUS.md`, and the existing source/tests. This is a verified React/TypeScript/Vite WebMCP app; do not replace it with a new prototype and do not rewrite the domain or WebMCP core unless a regression requires it. Implement checklist tasks 1 through 9 from the handoff, focusing on a cinematic, dominant, realistic 2.5D night container yard; large credible interactive containers; minimal glass overlays; an edge-hover agent dock; a compact history rail; and state-driven inspect/plan/stale/replan/move/retrieve animations. Preserve all human interactions, nine native tools, stateVersion semantics, and the deterministic CX-204 scenario. Use the two local reference images named in the handoff as art direction. Work autonomously in small checkpoints, run `npm test`, `npm run build`, and `node scripts/verify_manual_flow.mjs`, repair regressions, and leave the repository runnable. Do not add a backend, internal chatbot, Chrome extension, or heavy 3D engine. At the end, report files changed, verification results, and remaining visual risks.

## Copy/paste prompt for a fresh review chat

> Review BayShift from the perspective of the four official WebMCP Challenge criteria. Read `BAYSHIFT_FINAL_SPRINT_HANDOFF.md` and inspect the current deployed app and public repository. Do not implement new scope. Identify only launch-blocking clarity, WebMCP proof, reliability, demo, or submission gaps. Rank findings by severity and give the fastest evidence-based correction for each.

## Final definition of done

BayShift is done when all of the following are true:

- The first frame looks like a live industrial container yard, not a dashboard.
- A judge understands target, blockers, human control, and agent control within ten seconds.
- The real stale-plan recovery sequence is visible and repeatable.
- All nine tools register on the deployed production URL.
- Tests, build, and manual flow pass.
- The public URL works in a fresh WebMCP-capable browser.
- The public GitHub repository contains all source/assets/instructions and a detected MIT license.
- The public YouTube video is under three minutes and has clear narration.
- Devpost description directly answers why WebMCP, better UX, human-plus-agent capability, and implementation.
- The Devpost entry is actually submitted and verified before the deadline.

## Official references

- Challenge and submission: https://webmcp.devpost.com/
- OpenAI WebMCP guide: https://learn.chatgpt.com/docs/webmcp
- Chrome WebMCP documentation: https://developer.chrome.com/docs/ai/webmcp
- WebMCP community draft: https://webmachinelearning.github.io/webmcp/

