# mc-fleet-bot

Owns the Mineflayer fleet backend (`src/`), dashboard (`web/`), bot skills, schematics, fleet configuration, and application tests.

- Follow the existing code and read CLAUDE.md. TypeScript is strict; backend modules are CommonJS. Keep imports at the top, use type-only imports where useful, two spaces, and existing quote style. Source changes belong in src/ or web/src/; do not hand-edit dist/.
- Preserve unrelated working-tree changes and live data. `skills/` and `data/` are runtime state; do not overwrite them with checkout defaults.
- Node 22+. Install with npm ci; build with npm run build; application tests with npm test. Dashboard: npm ci --prefix web, npm run lint --prefix web, npm run build --prefix web, npm test --prefix web; web/AGENTS.md has browser-test details.
- The running stack uses mc-fleet-bot.service (:3001) and mc-fleet-web.service (:3000). Never hand-start a second bot instance. Restart via systemctl after a relevant build. `POST /api/admin/restart` now exits non-zero so `Restart=on-failure` respawns it, but prefer `systemctl restart` when you have root.
- World operations belong to https://github.com/packetloss404/mc-world-ops; publication website to https://github.com/packetloss404/world-showcase; PacketCraft to https://github.com/packetloss404/packetcraft.
- For construction, open `../mc-world-ops/AGENTS.md` and `../mc-world-ops/docs/masterplans/BUILD-NOW.md`. Use the selected scope's current evidence and guarded runner; archived monorepo instructions and old queue cards are not additional approval or scan gates.
- Fleet-owned BuildCoordinator, SiteSelector, SchematicStore, SchematicMatcher, and WorldEditOps tests stay here and run in normal CI. Explicit cross-project checks live in test/world-ops/; run npm run test:world-ops with MC_WORLD_OPS_ROOT configured. Historical evidence checks additionally use npm run test:world-ops:snapshots; see test/world-ops/README.md.
- Keep application-to-PacketCraft integration over the existing HTTP interface; do not import its source.
- migration/ownership.json records the extraction. Local compatibility links are deployment aids, not source dependencies. Complete pre-extraction notes remain in docs/architecture/.
