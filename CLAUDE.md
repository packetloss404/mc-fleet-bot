# mc-fleet-bot

AI-powered Mineflayer bot fleet with an Express/Socket.IO API and a Next.js dashboard. Read AGENTS.md and README.md.

Current deployment: pdian02mc03 / 10.80.13.18, /opt/stacks/mc-fleet-bot. mc-fleet-bot.service runs dist/index.js; mc-fleet-web.service runs web/. Minecraft and PacketCraft run on 10.80.13.14; the report website runs on 10.80.13.16.

Build: npm run build. Test: npm test. Never start a second fleet process. Runtime configuration is config.yml; application secrets are .env; runtime data is data/ and learned skills are skills/. Real mining protection, leash, and rescue constraints apply.

World construction, masterplans, release kernels, World Builder, Fleet Devtools, and publication producers have moved to ../mc-world-ops. The website source is ../world-showcase. See docs/PROJECTS.md for repository and service URLs. Historical notes remain in docs/architecture/legacy-project-notes.md; their old monorepo paths describe the archived layout.
