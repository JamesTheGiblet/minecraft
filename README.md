# CobbleWright - Your AI Minecraft Architect

CobbleWright is an AI-powered companion bot for Minecraft that acts as a personal architectural consultant. It observes your in-game situation, analyzes your resources and environment, and provides creative, actionable building advice directly in the game chat.
It can even physically gather resources and build simple structures on command.
It features a modular plugin architecture, making it highly extensible.
It supports multiple players on a server, offering personalized advice to each one.

Powered by a local Large Language Model (LLM) via Ollama, CobbleWright is designed to be a lighthearted and encouraging muse, helping players overcome creative blocks and build structures they can be proud of.

## The Vision: The Wright Universe

CobbleWright is the first citizen of the **Wright Universe**, a simulation continuum where synthetic architects coexist, create, and evolve. The project's vision extends beyond a single bot to a **CobbleWright Collective**—a society of specialized AI agents (Terra, Forge, Vision, Chronos) who collaborate on complex architectural and civil engineering projects.

This project is an exploration into emergent creativity, multi-agent collaboration, and the creation of a persistent, synthetic culture within the canvas of Minecraft.

### Core Documentation

The entire project is governed by a machine-readable control plane of semantic capsules. To understand its deep lore and structure:

- **[Project Roadmap](doc/ROADMAP.md):** The strategic vision, from current priorities to the long-range "CobbleWright Civilization."
- **[Core Canon Overview](doc/lore/README.md):** The entry point into the foundational lore, cosmology, and agent specifications of the Wright Universe.
- **[Developer Guide](doc/DEVELOPER_GUIDE.md):** Technical details on extending the bot and its plugin architecture.

## Features

- **Real-Time Architectural Advice:** CobbleWright analyzes your inventory and surroundings to give relevant building tips.
- **Multi-Step Project Guidance:** CobbleWright analyzes your inventory and crafting capabilities to suggest logical, multi-step projects (e.g., "First craft a furnace, then smelt your ore").
- **In-Game Communication:** All advice and communication happens directly through Minecraft's chat.
- **Adaptive Learning:** Using a "Leighton Weight" self-correction loop, CobbleWright reflects on the outcomes of its advice and adapts its future suggestions to be more helpful over time.
- **Multi-Agent Architecture:** The system is designed around a future of specialized agents (Prime, Terra, Forge, Vision, Chronos) who will collaborate on large-scale projects.
- **ChronoSCRIBE Audit Ledger:** Key runtime events are append-only, hash-chained, and Ed25519-signed for tamper-evident provenance.
- **Advanced Player Activity Detection:** The bot is smart enough to detect when you're paused or AFK, and its critique loop intelligently analyzes changes in specific materials to accurately judge if its advice was followed.
- **Comprehensive Mob Knowledge:** Utilizes a detailed knowledge base of mob behaviors, threats, and utilities to provide advanced tactical and strategic advice.
- **Command Integration:** Suggests useful in-game commands (like `/fill` or `/time set day`) to help facilitate large projects.
- **Automation Advisor:** Recognizes when you have Redstone components and suggests simple, foundational automation projects like auto-smelters.
- **Geographic Awareness:** Identifies and incorporates nearby geographical features like cliffs, caves, and bodies of water into its building suggestions.
- **Deep Biome Knowledge:** Utilizes a knowledge base of biome-specific characteristics to provide highly tailored and thematic architectural ideas.
- **Context-Aware Memory:** The bot uses "Semantic Capsules" to maintain a structured memory of events, allowing it to provide more relevant advice based on past interactions.
- **Canonical Semantic Capsules:** The repo now includes explicit grounding capsules for Minecraft gameplay (`data/S.C/minecraft_gameplay_core.sc.json`) and Leighton Weight / trust scoring (`data/S.C/leighton_weight_core.sc.json`).
- **Capsule-First Knowledge Loading:** Startup ingests `*.sc.json` semantic capsules plus only the explicitly approved JSON knowledge files listed in config; runtime/state artifacts in `data/` are ignored unless allowlisted.
- **Interactive Commands:** Players can ask for help, check their materials, and get inspiration using simple chat commands (`build`, `materials`, `help`).
- **Blueprint Builder:** Can generate a JSON blueprint for a simple structure and build it in the world on command.
- **Blueprint Safety Guardrails:** AI blueprints are now validated with strict limits (dimensions, block count, coordinate bounds, and clear volume) before any build action runs.
- **Auto-Support Collection:** Detects when a player is low on basic resources and offers to gather more, then asks whether to store it in a chest or keep it in inventory.
- **Smart Tool Crafting:** While gathering, the bot can craft missing required tools from available materials and equip them automatically.
- **Auto Crafting Table Placement:** If a crafting-table recipe is required and no table is nearby, the bot can place one from inventory and continue crafting.
- **Automatic Night Patrol:** At night, the bot switches into a patrol mode, explores lightly, and reports back in the morning.
- **Night Ghost Mode:** During night patrol, CobbleWright can enable a command-driven ghost mode with invisibility, resistance, and creative movement when the server allows it.
- **Safer Vision Input:** Screenshot critique now validates file path, extension, and size before reading image data.
- **Memory Retention Controls:** Long-term memory now supports configurable retention by max entries and max age.
- **PostgreSQL Auto-Bootstrap:** If PostgreSQL is reachable but the configured database is missing, CobbleWright can create it automatically before initializing memory and project storage.
- **Plugin System:** Core features are broken into plugins, allowing for easy addition of new commands and capabilities.
- **Multiplayer Ready:** Tracks and advises multiple players independently on the same server.
- **Autonomous Actions:** Can be commanded to gather basic resources like wood and stone.
- **Encouraging Personality:** Designed to be a fun, witty, and supportive companion, not a backseat gamer.

## Current State: Version 1.2-complete - Feature-Complete Beta

The project is in a feature-complete Beta stage (v1.2-complete). It is stable, well-documented, and includes a rich set of advanced features.

- **Stability:** Stable for both single-player and multiplayer use on dedicated servers.
- **Modularity:** A robust plugin architecture makes the codebase clean and highly extensible.
- **User Experience:** Voice integration and a one-click installer make the bot accessible and easy to use for everyone.
- **Advanced Capabilities:** Includes vision (screenshot analysis), blueprint building, and autonomous resource gathering.

See the `doc/ROADMAP.md` file for the full project history and future vision.

## User Commands

| Command | Description |
| --- | --- |
| `build` (or `house`, `base`) | Get building advice based on current context |
| `materials` | Check inventory summary |
| `help` | Display available commands |
| `roast` | Gentle, constructive criticism |
| `inspire` | Random creative building prompt |
| `blueprint <structure>` | Generate and build a small structure |
| `gather <item> [amount]` | Ask the bot to find and collect a resource |
| `weather` | Check or clear the current weather |
| `critique` | Aesthetic feedback on latest screenshot |
| `status` | Diagnostic check (uptime, Ollama status, memory) |
| `audit` (or `verify`) | Verify ChronoSCRIBE chain integrity/signatures |
| `style <name>` | Set architectural style |
| `sethome` | Save bot safety-home position for flee behavior |
| `home` | Show the currently saved home anchor |
| `gohome` (or `returnhome`) | Force immediate return to saved home |
| `bed` (or `sleep`, `rest`) | Find/place bed and sleep when conditions allow |

## Support Behavior

If the bot notices that a player is low on stone, wood, or dirt, it will ask whether you want the collected items kept in its inventory or stored in a chest. You can answer with `inventory` or `chest` when prompted.

At night, the bot automatically enters patrol mode instead of staying in place. It explores nearby areas safely and gives a morning report when daylight returns.
If it cannot find coal for torches, it keeps roaming and retries later instead of stalling the patrol loop.
If the server grants the bot command permissions, night patrol also enables a ghost-mode safety profile so hostile mobs cannot easily kill it while roaming.

## Safety Defaults

- **Blueprint validation:** Generated blueprints are rejected if they exceed safety constraints.
- **Vision file validation:** Only supported image files in the configured screenshot directory are accepted.
- **Building protection during gathering:** The bot avoids harvesting blocks that look like they belong to player-built structures.
- **Memory retention policy:** Configure retention with `MEMORY_RETENTION_ENABLED`, `MEMORY_MAX_ENTRIES`, and `MEMORY_MAX_AGE_DAYS` in `config.json`.
- **Night ghost mode:** Configure with `GHOST_MODE_AT_NIGHT` in `config.json`. This requires the bot account to have permission to run `/gamemode` and `/effect`.
- **Embedding dimensions:** Configure `EMBEDDING_DIMENSIONS` when you use a non-default embedding model so pgvector indexes can be created with the correct width.
- **ChronoSCRIBE audit controls:** Configure with `CHRONOSCRIBE_ENABLED`, `CHRONOSCRIBE_KEY_ID`, and `CHRONOSCRIBE_MAX_PAYLOAD_CHARS` in `config.json`.
- **Knowledge loading allowlist:** Configure `APPROVED_KNOWLEDGE_JSON` in `config.json` to explicitly approve additional plain JSON knowledge files.
- **Semantic capsule grounding:** `data/S.C/*.sc.json` capsules are loaded automatically; keep core gameplay and trust-model capsules there so prompt grounding stays consistent.
- **Building-protection config:** Configure with `PROTECT_BUILDINGS_FOR_GATHERING` and `BUILDING_DETECTOR_RADIUS` in `config.json`.

See `doc/CHRONOSCRIBE.md` for the full audit-ledger details.

## Testing

- **Current baseline:** 8 suites, 112 tests.
- **Run all tests:** `npm test`
- **Detect open handles:** `npm test -- --detectOpenHandles`

See `cobblewright/doc/TEST_SUITE.md` for test layout, troubleshooting flow, and maintenance rules.
See `cobblewright/sc-overview/test-suite-overview.sc.json` for the semantic capsule summary of the test suite contract.
