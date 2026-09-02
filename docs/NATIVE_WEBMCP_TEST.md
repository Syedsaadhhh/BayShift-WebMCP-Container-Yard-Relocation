# Native WebMCP test

1. Run `npm run dev` and open the printed local URL in a browser with `document.modelContext` support.
2. Confirm the header says `WebMCP · Connected` and Tools reports 9.
3. Discover `inspect_yard`, `get_container`, `analyze_blockers`, `validate_move`, `simulate_relocations`, `execute_move`, `retrieve_target`, `inspect_changes`, and `rewind_yard`.
4. Call `inspect_yard({})`; expect target CX-204, blockers CX-188/CX-203, and stateVersion 37.
5. Call `simulate_relocations({containerId:"CX-204",maxPlans:3})` and retain its v37 first move.
6. In the human UI, lock that destination. Expect v38.
7. Call the retained `execute_move` input with `expectedStateVersion:37`; expect `STALE_STATE` and no relocation.
8. Call `inspect_changes({sinceStateVersion:37})`, inspect again, and simulate a v38 alternative.
9. Execute one legal move per fresh version until CX-204 is exposed; retrieve it with the current version.
10. Call `rewind_yard` with the current version; confirm CX-204 is physically restored.

The Tools drawer is a contract simulator and should not be presented as native discovery evidence.
