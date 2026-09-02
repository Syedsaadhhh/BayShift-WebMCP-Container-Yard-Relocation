# BayShift

BayShift is a shared container yard relocation canvas built for the OpenAI WebMCP Challenge.

The idea is simple: a yard operator and a browser agent should work on the same live operational state, not on separate copies of it. The human can move containers, lock stacks, change constraints, trigger a late truck event, rewind actions, and inspect what changed. The agent uses WebMCP tools to inspect the yard, analyze blockers, simulate legal relocations, execute moves, retrieve exposed targets, and recover from invalid actions.

This is not a chatbot wrapped around a dashboard. The website itself exposes the operational actions the agent is allowed to use.

## Why this problem

Container terminals stack containers vertically to save yard space. When the next container to retrieve is buried, blocking containers have to be moved first. Those extra reshuffles are the core of the Container Relocation Problem.

BayShift uses a small deterministic yard to demonstrate a new interaction model for this kind of operational planning. It is a hackathon prototype, not a production terminal operating system and not a claim of globally optimal port planning.

## What makes WebMCP useful here

Without WebMCP, an agent would have to infer stack positions, container IDs, lock states, and legal moves from page structure or screenshots.

BayShift exposes those capabilities directly as typed browser tools. That gives the agent stable domain operations while the human keeps full visual control of the same state.

Human UI and WebMCP both go through the same validated command layer:

```text
Human controls  ─┐
                 ├─> Domain commands -> Yard state -> UI + metrics + ledger
WebMCP tools   ──┘
```

A move is legal or illegal for the same reasons regardless of whether it came from the operator or the agent.

## Core WebMCP tools

| Tool | Type | Purpose |
| --- | --- | --- |
| `inspect_yard` | Read only | Reads the live stacks, queue, locks, metrics, and current target |
| `analyze_target` | Read only | Finds a target container, its blockers, and legal destinations |
| `simulate_relocation` | Read only | Checks a relocation without mutating the yard |
| `move_container` | Mutating | Performs one validated relocation with agent provenance |
| `retrieve_target` | Mutating, dynamic | Appears only when the current target is physically retrievable |
| `rewind_last_action` | Mutating, dynamic | Appears when a reversible yard action exists |

The application is built around `document.modelContext` and progressive enhancement. If native WebMCP is not available in the current browser, the manual operator experience remains usable.

## Shared state and safety

BayShift does not expose a raw "set state" tool.

Every command has domain rules:

- only the top container of a stack can move
- the destination must exist, have capacity, and not be locked
- a container cannot be moved back into the same stack
- only the current retrieval target can be retrieved
- the target must be physically exposed
- failed commands do not partially mutate state
- successful actions are recorded with `HUMAN`, `AGENT`, or `SYSTEM` provenance
- reversible actions can be rewound

This keeps the agent useful without making it invisible or unbounded.

## Demo scenario

The main scenario starts with five stacks and a retrieval queue. `C01` is buried under two blockers.

A typical judge flow is:

1. Ask the agent to inspect the yard and explain what blocks `C01`.
2. Ask it to clear `C01` without using a locked stack.
3. Watch each move update the same live canvas and provenance ledger.
4. Let the human change the situation using the Late Truck update.
5. Ask the agent to re-inspect the new state and adapt.
6. Trigger an invalid move and watch the structured WebMCP error guide recovery.
7. Rewind the last action and confirm the state is restored.

## Tech stack

- React
- TypeScript
- Vite
- Vitest
- WebMCP via `document.modelContext`
- Static deployment on Vercel or Netlify

No external AI API, database, login system, or proprietary dataset is required for the core demo.

## Local development

```bash
npm install
npm run dev
```

Run the test suite:

```bash
npm test
```

Create the production build:

```bash
npm run build
```

## Testing with WebMCP

The project is designed for ChatGPT's in-app browser and WebMCP-enabled Chrome.

Native WebMCP verification is being tracked separately from the built-in development simulator. The simulator is useful for testing domain behavior, but it is not treated as proof of native browser WebMCP execution.

Detailed evaluation prompts and verified client instructions will be kept in `docs/EVALS.md` and the final testing notes as the challenge build is hardened.

## Project status

The core implementation is under active challenge-period verification. Domain behavior, WebMCP source integration, browser behavior, deployment configuration, and the final judge flow are being tested before the submission is frozen.

## Repository structure

```text
src/domain/       deterministic yard model and validated commands
src/webmcp/       WebMCP tool definitions and lifecycle
src/components/   operator canvas and supporting UI
tests/            domain and WebMCP behavior tests
docs/             evals, testing notes, and judge walkthrough
```

## License

MIT. See [LICENSE](LICENSE).

## Challenge note

BayShift was created as a new project for the 2026 OpenAI WebMCP Challenge. The goal is to explore what becomes possible when a real web interface is designed for people and agents to operate together instead of forcing an agent to guess its way through the UI.
