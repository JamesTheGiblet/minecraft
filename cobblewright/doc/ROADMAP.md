# CobbleWright Project Roadmap

This document outlines the development history, current status, and future plans for CobbleWright.

---

## ✅ Completed Milestones (Version 1.x)

The initial versions of CobbleWright focused on establishing a stable foundation, core AI capabilities, and a modular architecture. The following major features were completed and are now part of the stable build.

- **[✓] Multiplayer Support:** The bot works on dedicated multiplayer servers and provides per-player advice.
- **[✓] Plugin Architecture:** The codebase was refactored into a modular plugin system for clean code and easy extensibility.
- **[✓] Enhanced Memory System:** Implemented "Semantic Capsules" for a structured memory log and created the "Leighton Weight Loop" for self-critique.
- **[✓] Expanded AI Capabilities:** Automation Advisor suggests simple Redstone circuits, Command Suggestion surfaces relevant in-game commands, Style-Specific Advice offers style-based build ideas, Mob Knowledge captures mob behaviors and threats, and Blueprint Generation can generate and build simple structures from a plan.
- **[✓] Interactive Commands:** Added commands like `status`, `inspire`, and `style` for deeper interaction.
- **[✓] Vision Capabilities (Llava):** Integrated a vision model to allow the bot to "see" screenshots and provide aesthetic feedback.
- **[✓] Voice Integration:** Added an optional text-to-speech feature.
- **[✓] Configuration File:** Moved settings to `config.json` for easy user customization.

---

## 🚀 Current Roadmap: Version 1.2-complete - The Sentient Architect

With a stable foundation, the vision for 1.2-complete is to grant CobbleWright true autonomy and deeper intelligence, making it a proactive and collaborative partner in the world.

> *"CobbleWright evolves from a companion who *talks* to a companion who *acts*, remembering your world, understanding your goals, and building alongside you as a true partner in creativity."*

### Remaining Tasks

### Completed In This Release

- [x] Persistent long-term memory with PostgreSQL storage.
- [x] pgvector semantic retrieval with ANN fallback indexing.
- [x] Goal-oriented project management with PostgreSQL-backed project records.
- [x] Richer project phase transitions and blocker-resolution flows.
- [x] Multi-turn conversational state tracking and ambiguity handling for chat and project flows.
- [x] Autonomous resource gathering now feeds blueprint resource collection and crafting, including slabs, stairs, torches, glass, fences, doors, and lanterns.
- [x] Automated farming with tilling, planting, harvesting, and chest storage.
- [x] Collaborative building support for filling walls and assisting on player-built frames/pillars.
- [x] Intent-based natural language routing for chat commands.
- [x] S.C multi-capsule architecture with runtime loading and scoped guidance.
- [x] One-command startup orchestration with duplicate-launch protection.
- [x] PostgreSQL auto-bootstrap when the configured database is missing.
- [x] Hardened night patrol with compatibility fallbacks, roaming recovery, and command-driven ghost mode.

### Core AI & Memory Enhancements

The brain is now mostly implemented; the remaining work here is refinement rather than first-pass feature delivery.

- **[✓] Persistent Long-Term Memory:** PostgreSQL-backed memory with Ollama embeddings and pgvector similarity search is live.
- **[✓] Goal-Oriented Project Management:** Project persistence, commands, and phase/blocker flows are live.
- **[✓] Natural Language Conversation:** Intent routing, pending follow-ups, and project ambiguity handling are live.
- **[✓] S.C Capsule Runtime:** Multi-capsule loading from `data/S.C` is live and available through shared runtime state.
- **[✓] Persona Voice via S.C (NPC):** NPC dialogue styling now prefers S.C voice/persona capsules with legacy fallback and config toggle.

### Advanced In-Game Autonomy

This phase focuses on giving CobbleWright the ability to physically interact with the world to help the player.

- **[✓] Autonomous Resource Gathering:** `/gather` now feeds blueprint resource collection and crafting so build plans can pull missing materials automatically.
- **[✓] Autonomous Resource Gathering:** Blueprint planning now resolves common crafted materials like slabs, stairs, torches, glass, fences, doors, and lanterns through their base materials, crafting, and smelting steps.
- **[✓] Collaborative Building:** The bot can now detect nearby frames and pillars, fill wall spans, and extend incomplete support columns.
- **[✓] Automated Farming:** Crop tending now handles tilling, harvesting, replanting, and chest storage near the farm center.
- **[✓] Survival Hardening:** Night patrol now survives missing terrain helpers, missing coal, and hostile pressure more gracefully.

### Migration Notes (V1 → V2)

**For existing users upgrading from V1:**

1. **Backup** your `memoryLog` (will be migrated to vector DB)
2. **Install new dependencies**:

    ```bash
    npm install pg mineflayer-pathfinder
    ```

3. **Update config.json** with PostgreSQL and embedding settings (`POSTGRES_URL`, `EMBEDDING_MODEL`).
4. **Ensure embedding model is available in Ollama**:

    ```bash
    ollama pull nomic-embed-text
    ```

---

## Appendix: Detailed Implementation Notes

The roadmap above is intentionally concise. The sections below preserve the older implementation notes and historical detail for reference.

### Memory & Project Detail

- **Persistent memory implementation:** PostgreSQL-backed `memory_stream` table with Ollama embeddings and pgvector similarity search.
- **ANN index support:** HNSW is preferred when available; IVFFlat is used as a fallback.
- **Database bootstrap:** PostgreSQL-backed systems create the configured database automatically when the server is reachable but the DB is absent.
- **Project management implementation:** PostgreSQL-backed `project_goals` table with project commands and active-project advice alignment.
- **Natural language routing implementation:** Free-form chat is routed into existing commands using intent matching and memory-aware advice context.
- **S.C capsule implementation:** `data/S.C/*.sc.json` drives scoped behavior and persona/voice context across architect and NPC flows.
- **Legacy persona fallback:** `cobblewright-npc/persona.sc.json` remains supported for backward compatibility.

### Autonomy Detail

- **Resource gathering:** `/gather` is the first step toward blueprint-driven collection and full automation.
- **Collaborative building:** Planned support for guided wall-filling and frame completion.
- **Automated farming:** Planned support for tilling, planting, harvesting, and chest storage.
- **Night patrol hardening:** Patrol now supports terrain-height fallbacks, delayed torch retries, and operator-backed ghost mode.
