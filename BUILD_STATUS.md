# BayShift build status

Status: runnable reconstruction complete.

- Hero scenario: `CX-204`, two blockers, starts at v37.
- Shared authoritative state: implemented for human UI and WebMCP agent.
- Optimistic concurrency: all destructive tools require `expectedStateVersion`; `STALE_STATE` verified in a native WebMCP browser.
- Logistics rules: LIFO, height, stack/container locks, outage, weight order, destination reservation, urgency metadata.
- Planner: deterministic bounded candidate search; simulation is non-mutating.
- History: actor-attributed before/after snapshots, changed entities, diff inspector, physical rewind with monotonic versions.
- Disruptions: late truck, stack lock, lane/crane outage.
- Native tools: all nine registered through `document.modelContext`.
- Automated tests: 18 passing after reconstruction.
- Production build: `tsc && vite build` passing.
- Live browser smoke: native inspect, plan, stale rejection, recovery moves, retrieval, rewind, and late-truck mutation verified.

Known limits:

- Planner search is deliberately bounded for the challenge-sized yard.
- State is client-local and resets on page reload.
- The visual yard uses lightweight DOM/CSS 2.5D rendering instead of React Konva to preserve the working Vite infrastructure and small bundle.
