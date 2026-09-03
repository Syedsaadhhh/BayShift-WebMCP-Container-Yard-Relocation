# BayShift Demo + Voice Script

**Target length:** 2 minutes 20 seconds to 2 minutes 40 seconds  
**Format:** screen recording of BayShift in Codex/ChatGPT's in-app browser, narrated live  
**Goal:** prove a useful, non-trivial WebMCP workflow—not merely show a dashboard.

## The one-sentence story

BayShift turns a container-yard relocation problem into a shared, versioned workspace where a human operator and a browser agent can inspect constraints, plan legal moves, adapt to a human change, and execute the clearance together.

## Record setup (before pressing record)

1. Open the production site: https://bayshift-webmcp.vercel.app/
2. Refresh once so a fresh, randomized mission is visible. Do not manually open the Agent card; it should be collapsed.
3. Start a new Codex chat and ask it to open the live URL in its in-app browser.
4. Keep the app and its action trail visible. The browser should report that the nine WebMCP tools are available.
5. Start recording. Do not mention a fixed container ID in your voiceover—the first mission is intentionally randomized.

## Live demo choreography

### 0:00–0:18 — Establish the problem

**On screen:** the fresh yard, priority mission, physical stacks.

**Voice:** use the matching section of the voice script below.

### 0:18–0:43 — Read-only understanding

**Paste into the new Codex chat:**

> Open the BayShift yard in the in-app browser. Inspect the live yard and analyze the current priority target. Explain its physical blockers, active constraints, and the shortest legal clearance plan. Do not move anything yet.

**On screen:** `inspect_yard`, `analyze_blockers`, and `simulate_relocations` appear in the live activity trail. Briefly hover the compact Agent tab only if you need to reveal the plan card.

### 0:43–0:53 — Human intervention

**On screen:** click **B05 outage** once. This is the human operator changing an operating condition; the yard version advances and the action trail attributes it to HUMAN.

**Voice:** “The operator can change the real operating state at any time. That invalidates assumptions instead of silently letting the agent act on old information.”

### 0:53–1:32 — Agent recovers and clears the priority mission

**Paste into Codex:**

> The operator has changed the yard. Reinspect it, account for the new condition, and execute the shortest legal sequence to expose and retrieve the current priority target. Use the exact current state version for every destructive action. Reinspect after every mutation and explain any blocked action rather than guessing.

**On screen:** native WebMCP `inspect_yard`, `simulate_relocations`, `execute_move`, and `retrieve_target` calls animate through the shared trail. The target is dispatched to the gate.

### 1:32–1:52 — Restore the lane and show the operational outcome

**On screen:** click **Clear outage**. The human has restored the lane after the priority retrieval. This keeps the full-clearance ending honest: the agent must not retrieve from an unavailable crane lane.

**Then paste into Codex:**

> Continue legally from the current state and clear the remaining retrieval queue. Keep the shared action trail visible and stop when the yard is clear.

**On screen:** agent actions complete; the page reaches **Yard clear — Complete**. Do not linger on implementation panels.

### 1:52–2:28 — Close on why WebMCP matters

**On screen:** cleared yard and AGENT/HUMAN action history.

**Voice:** use the closing section below.

## Full voice-over script

“Container yards have a deceptively hard problem: the container you need is often buried beneath other containers, and every relocation has physical and operational constraints. A move has to respect stack order, weight, capacity, locked lanes, outages, and reserved destinations. One wrong assumption can delay a truck or create an unsafe plan.

BayShift is a shared relocation canvas for that problem. The operator sees a living yard, while an AI agent can understand the same current state and act only through structured tools.

First, I ask the agent to inspect the yard and analyze the current priority retrieval. Notice that it is not clicking around and guessing from pixels. Through WebMCP, BayShift exposes purposeful capabilities: inspect the yard, analyze blockers, validate a move, simulate legal relocation routes, execute a move, retrieve an exposed target, and inspect the change history.

The agent finds the physical blockers and proposes the shortest legal sequence, but it does not move anything yet.

Now the human operator changes the yard by taking a crane lane offline. The shared yard version advances. That matters because an old plan is no longer trustworthy.

I ask the agent to re-inspect, adapt to the new condition, and execute only legal moves using the current version. Every mutation is checked against the same constraints the human uses, attributed to the agent in the live trail, and visible immediately to both collaborators.

The priority container is exposed and dispatched. Once the operator restores the lane, the agent continues through the remaining queue until the yard is clear.

That is why WebMCP is essential here. A normal chat assistant could suggest a route, but it would not have a safe, structured way to inspect the live operational state, respect version conflicts, or carry out auditable actions inside the application. BayShift makes the web app meaningfully better when people and agents work together: the human keeps authority over changing conditions, and the agent turns a complex, constrained yard into fast, explainable execution.”

## Judge-proof points to preserve in the edit

- **WebMCP leverage:** show real native tool activity, not only the on-page buttons. Say that the app registers nine structured tools through `document.modelContext`.
- **Execution:** show the live Vercel URL in the ChatGPT/Codex in-app browser; keep the narration focused on the working product and its visible action trail.
- **Potential impact:** name the real operational stakes: blocked retrievals, truck delay, safety constraints, and operator control.
- **Creativity and ambition:** frame BayShift as a shared operational canvas, not a chatbot pasted onto a dashboard. The interesting behavior is conflict-aware co-operation between a person and an agent.

## Claims to avoid

- Do not call the demonstration a deployment at a real port or claim live shipping-terminal data.
- Do not claim that the agent has autonomy outside the visible tool boundaries.
- Do not say the app is tied to Codex. It is a deployed WebMCP app; the in-app browser is the fastest way to demonstrate a compatible agent client.

## Official submission reminders

The WebMCP Challenge requires a working live URL, a public code repository with an open-source license, a text explanation of why WebMCP fits the use case and improves human–agent experience, and a public demo video under three minutes with audio covering what was built and how WebMCP was used. The judging criteria are WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition.
