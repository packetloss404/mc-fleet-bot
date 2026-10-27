# Project and service directory

| Purpose | URL | Source |
|---|---|---|
| Fleet dashboard | http://10.80.13.18:3000 | https://github.com/packetloss404/mc-fleet-bot |
| Published maps and reports | http://10.80.13.16 | https://github.com/packetloss404/world-showcase |
| World operations and development tools | Repository and operator CLI | https://github.com/packetloss404/mc-world-ops |
| PacketCraft gameplay platform | In-game; API is host-local on 10.80.13.14 | https://github.com/packetloss404/packetcraft |

The fleet backend is host-local at 127.0.0.1:3001 on 10.80.13.18. Minecraft clients connect to 10.80.13.14:25565. PacketCraft's API (:3000) and PostgreSQL (:5432) are bound to localhost on the Minecraft host; they are not public websites. Fleet Devtools' optional port 4310 is not currently deployed.

Repositories were separated with history. Runtime fleet data, world evidence, current service locations, accepted historical bytes, and rollback records are retained. Operator compatibility links preserve old paths while source ownership follows migration/ownership.json.
