# CobbleWright Changelog

## Build Timeline

### 2026-07-10 - Friday: Idea Day

- We came up with the core idea for CobbleWright's next stage: a more capable, more autonomous Minecraft companion.
- The focus was on turning the bot from a simple helper into something that could remember context and act on goals.

### 2026-07-11 - Saturday: Beta Running

- We got the beta running and proved the basic bot stack, startup flow, and core loop were working together.
- This was the first stable pass where the project moved from idea to something we could actually run end-to-end.

### 2026-07-12 - Sunday: Bug Fix Day

- We fixed the early beta issues and hardened the startup/runtime path.
- That included stabilizing the bot flow, cleaning up rough edges, and making sure the core loop behaved reliably.

### 2026-07-13 - Monday: 1.2 Planning

- We started fleshing out the 1.2 vision and mapped the next major systems to build.
- The work shifted toward memory, project flow, and more intelligent behavior instead of just basic stability.

### 2026-07-14 - Tuesday: 1.2 Expansion

- We expanded the 1.2 plan into concrete features like project management, natural-language routing, and resource automation.
- This was the day the roadmap started turning into actual implementation targets.

### 2026-07-15 - Wednesday Morning: Final Pass

- We tightened the release story, finished the remaining checklist items, and aligned the docs with the now-complete 1.2-complete state.
- The result is a feature-complete release record that captures the full week of work.

## Version 1.2-complete - "Sentient Architect"

---

### 🧠 Core AI & Memory Intelligence

- **Semantic long-term memory:** Persistent memory now runs on PostgreSQL and stores Ollama embeddings for meaning-based retrieval.
- **pgvector similarity search:** Memory recall uses vector similarity search instead of text-only ranking, with ANN index support when available.
- **Retention and fallback:** The memory system still prunes by age/count and falls back safely if vector search is unavailable.

### 🎯 Goal-Oriented Project Management

- **Project persistence:** Added PostgreSQL-backed project records for objective, phase, tasks, blockers, next action, and timestamps.
- **Project commands:** Players can manage active work with `project start`, `project status`, `project next`, and `project done`.
- **Advice alignment:** Build advice now consumes the active project context and updates the next recommended action over time.

### 🪵 Autonomous Resource Loop

- **Blueprint-aware gathering:** Build requests now trigger a resource loop that gathers and crafts common missing blueprint materials before construction starts.
- **Gather-friendly planning:** Blueprint generation now prefers common materials that the bot can collect or craft from collected resources.
- **Graceful fallback:** If some required materials still cannot be gathered automatically, the bot reports the unresolved items instead of failing mid-build.
- **Crafted block support:** The loop now handles slabs, stairs, torches, and glass by chaining base-material gathering, crafting, and smelting where needed.

### 🌾 Automated Farming

- **Crop tending:** The bot can now harvest mature wheat, carrots, potatoes, and beetroot near a configured farm center.
- **Replanting and tilling:** After harvesting, it reuses available seeds or crops to replant and can till nearby dirt or grass into new farmland.
- **Chest storage:** Surplus harvests are deposited into a nearby chest instead of filling the bot's inventory.
- **Farm commands:** Added `farm status`, `farm start`, `farm stop`, `farm set`, and `farm tend` for manual control.

### 🧱 Collaborative Building

- **Frame assistance:** The bot can detect nearby pillar-based frames and fill their wall spans with matching or common building materials.
- **Pillar completion:** If the structure is still in pillar form, the bot can extend uneven support columns to a common height.
- **Material prep:** The build helper uses the existing resource loop to gather or craft common wall materials before placing blocks.
- **Chat routing:** Added `assist` commands and natural-language routing for wall filling and pillar support requests.

### 💬 Natural Language Conversation

- **Intent routing:** Free-form chat is now routed into existing commands for advice, project actions, critique, gather, status, materials, and weather.
- **Memory-aware responses:** Advice generation pulls relevant past memories before prompting the LLM.
- **Command shortcuts preserved:** Existing one-word commands still work as before.
- **Conversation follow-up:** The bot now keeps short-lived per-user follow-up state so it can ask clarifying questions and resolve project task/blocker ambiguity across multiple chat turns.

### 🧩 S.C Capsule System

- **Multi-capsule runtime:** CobbleWright now loads semantic capsules from `data/S.C/*.sc.json` and shares them through runtime state.
- **Scoped guidance in advice:** Architect prompt context now includes scoped capsule summaries for core, build, project, memory, conversation, farming, and collaboration areas.
- **NPC voice from S.C:** The lite NPC bot now prefers voice/persona capsules from `data/S.C` and keeps safe fallback behavior.
- **Legacy compatibility:** If no suitable S.C voice capsule is found, the NPC still falls back to `cobblewright-npc/persona.sc.json` and then to plain dialogue.
- **Config toggle:** Persona styling can be enabled or disabled with `persona.enabled` in `cobblewright-npc/config.json`.

### 🏁 Startup Orchestration

- **One-command launch:** `start.bat` now starts the Minecraft server, PostgreSQL container, and bot from one script.
- **Readiness checks:** The startup flow waits for PostgreSQL and the Minecraft server before launching the bot.
- **Duplicate protection:** Re-running `start.bat` avoids spawning duplicate server or bot windows.
- **Database bootstrap:** If PostgreSQL is reachable but the configured `cobblewright` database is missing, memory and project storage now create it automatically.

### 🌙 Survival Hardening

- **Patrol compatibility fixes:** Night patrol now uses mineflayer-compatible terrain fallback logic instead of assuming every world helper API exists.
- **Coal fallback roaming:** If coal for torches is unavailable, CobbleWright keeps roaming and retries later instead of looping or stalling.
- **Night ghost mode:** Patrol can now enable a real ghost-mode safety profile with `/gamemode` and `/effect` when server permissions allow it.
- **Flee fallback during patrol:** If ghost mode is unavailable or fails, the bot can still flee home during night patrol rather than remaining exposed.

### 📦 Dependencies and Setup

| Dependency | Version | Purpose |
| --- | --- | --- |
| `pg` | latest via npm | PostgreSQL client for persistent memory and project storage. |

### 🔧 Current Config Keys

- `POSTGRES_URL` for PostgreSQL connectivity.
- `EMBEDDING_MODEL` for Ollama embedding generation.
- `EMBEDDING_DIMENSIONS` for pgvector column/index dimension alignment.
- `GHOST_MODE_AT_NIGHT` to enable or disable command-driven night ghost mode.
- `persona.enabled` for NPC persona styling.

---

## Archived Releases

Older release notes are summarized here to keep the latest release easy to scan while preserving the project history.

## Version 1.1.2 - "Structure-Aware Gathering"

---

### 1.1.2 Highlights

- PostgreSQL replaced ChromaDB for long-term memory.
- Semantic retrieval moved to pgvector with Ollama embeddings.
- Structure-aware gather protection was added.
- Docs were updated to match the new safety and memory behavior.

## Version 1.1.1 - "Safety and Reliability Hardening"

---

### 1.1.1 Highlights

- Vision critique and blueprint validation were hardened.
- Memory retention pruning by age/count was added.
- PostgreSQL connection config was introduced.
- Tool crafting and crafting-table fallback improved gather reliability.
- `mineflayer` was pinned for reproducibility.

---

## Version 1.1.0 - "The Autonomous Assistant"

---

### 1.1.0 Highlights

- Autonomous resource gathering via `/gather` and pathfinding.
- Player event reactions for welcome, death, and diamond finds.
- A `/weather` command for simple environmental control.

---

## Version 1.0.0 - Feature-Complete Beta Release

---

### 1.0.0 Highlights

- Blueprint generation and build execution.
- Plugin architecture and multiplayer support.
- Vision, voice, style advice, and core command set.
- The first stability pass, including feedback-loop fixes and error handling.

---

## Historical Notes

For full implementation detail, see the detailed notes in the roadmap appendix and the code history in the repo.

---

### 🎯 Summary

CobbleWright has evolved from a single-purpose advice bot into a **full-featured AI Minecraft companion** with:

- ✅ **Multiplayer support** with per-player state
- ✅ **Self-learning** via Leighton Weight critique loop
- ✅ **Vision capabilities** for aesthetic feedback
- ✅ **Voice integration** for immersive experience
- ✅ **Blueprint generation** and building
- ✅ **One-click installer** for non-developers
- ✅ **Plugin architecture** for extensibility

**Current Status:** Feature-complete Beta ready for distribution and community use.
