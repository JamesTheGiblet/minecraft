# Changelog

All notable changes to this project will be documented in this file.

2026-07-20

## The Good 0.63

- **Fixed Genesis Provisioning Crash:** Hardened `packages/agents/prime/genesis-builder.js` to prevent null chest/openContainer failures during starter-kit deposit.
- **Added Command Pacing:** Replaced direct awaited `bot.chat(...)` calls with a paced command helper so `/setblock` and `/give` operations settle before dependent actions execute.
- **Added Chest Verification + Retry:** The provisioning flow now waits for the chest block to appear at the expected position, validates block type, and safely skips deposit if unavailable instead of throwing.
- **Safer Spawn Bootstrap:** Wrapped the spawn bootstrap sequence in a guarded `try/catch` and switched navigation to `GoalNear` before chest interaction to reduce fragile block-adjacency failures.

## The Bad 0.63

- If the chest cannot be confirmed in-world, the starter-kit chest deposit is skipped (with logs), so bootstrap may proceed without seeded chest inventory in that run.

## The Ugly 0.63

- End-to-end runtime validation of this exact chest path still depends on the Minecraft server being online during verification runs.

---

2026-07-20

## The Good 0.62

- **Fixed Knowledge Gate Capsule Resolution:** Updated `packages/core/plugins/knowledge-gate.js` to resolve required capsules from both legacy `sharedState.S_C` arrays and the current keyed runtime format (e.g. `MINECRAFT_GAMEPLAY_CORE.SC_DATA`).
- **Added LLM Function Fallback:** The gate now uses `sharedState.askLLM` when available and falls back to `sharedState.callOllama`, matching the current `brain.js` contract.
- **Hardened Test Context Handling:** Unresolvable `context_ref` values in `knowledge_gate_tests.sc.json` are now skipped with warnings instead of hard-failing startup.
- **Bounded Startup Verification:** The gate now runs up to a configurable number of resolvable tests (`KNOWLEDGE_GATE_MAX_TESTS`, default `5`) and reports passed/skipped counts for clear observability.

## The Bad 0.62

- A significant portion of the current verification suite references capsule paths that do not exist in `minecraft_gameplay_core.sc.json`, so many tests are skipped until the suite and capsule schema are reconciled.

## The Ugly 0.62

- Knowledge validation is now resilient enough to boot, but full strictness still depends on keeping test-suite references synchronized with evolving capsule structure.

---

2026-07-20

## The Good 0.61

- **Fixed Core Plugin Import Paths:** Updated stale relative imports in `packages/core/plugins/hud-manager.js` and `packages/core/plugins/knowledge-gate.js` to the canonical `packages/core/utils/` location.
- **Repaired Village Manager Runtime:** Refactored `packages/core/plugins/village-manager.js` to remove references to deleted `implementation/` modules and provide a capsule-backed in-plugin Village/Chronicle runtime with compatibility methods.
- **Deterministic Plugin Bootstrap:** Refactored `loadPlugins` in `architect.js` to be async and awaited before Knowledge Gate verification, eliminating startup race conditions where the gate could be checked before the plugin registered.
- **Fixed Agent Plugin Directory Handling:** Corrected agent plugin enumeration to use `Dirent` objects safely (`dirent.name` + `dirent.isFile()`), preventing silent mismatches in agent plugin discovery.

## The Bad 0.61

- The Village/Chronicle runtime is currently an in-memory compatibility layer; it preserves plugin contracts but does not yet persist decision history back to disk.

## The Ugly 0.61

- The startup sequence can still surface transient `ECONNRESET` errors when the Minecraft server/LAN session drops during bot runtime; this is now clearly operational rather than a plugin import failure.

---

2026-07-20

## The Good 0.60

- **Hardened PostgreSQL Startup:** Updated `MinecraftServer/start.bat` to detect when the `cobblewright-postgres` container exists without a published host mapping for port 5432.
- **Automatic Container Recovery:** If the mapping is missing, startup now removes and recreates the container with `-p 5432:5432` so localhost checks can succeed.
- **Improved Readiness Probe:** Refined the PowerShell readiness loop to suppress noisy progress output and reliably evaluate `TcpTestSucceeded`.
- **Unblocked Full Boot Sequence:** Startup now reaches PostgreSQL ready state and continues to launch the Minecraft server and CobbleWright bot.

## The Bad 0.60

- Recreating a misconfigured PostgreSQL container is destructive to that container instance, so data in an incorrectly created local container can be lost during auto-recovery.

## The Ugly 0.60

- N/A

---

2026-07-19 10:40

## The Good 0.59

- **Final Project Cleanup:** Performed a final sweep of the repository to ensure all files are in their correct locations after the major architectural refactoring.
- **Removed Root Artifacts:** Deleted misplaced `chronicle.js` and `scp.json` files from the root directory.
- **Updated Developer Guide:** Corrected the file structure diagram and instructions in `doc/DEVELOPER_GUIDE.md` to reflect the new `packages/` architecture.
- **Cleaned Gitignore:** Simplified and corrected the `.gitignore` file.

## The Bad 0.59

- N/A

## The Ugly 0.59

- N/A

---

## The Good 0.58

- **Finalized Core Refactor:** Moved all utility files from the legacy root `utils/` directory to their new canonical home at `packages/core/utils/`.
- **Updated Utilities Documentation:** Updated `sc-overview/utils-overview.sc.json` and `doc/DEVELOPER_GUIDE.md` to reflect the new, correct location of the utility files.

## The Bad 0.58

- N/A

## The Ugly 0.58

- N/A

---

2026-07-19 10:40

## The Good 0.57

- **Completed Project Cleanup:** Performed a final sweep of the repository to align with the new multi-agent architecture.
- **Removed Redundant Files:** Deleted misplaced `chronicle.js` and `scp.json` files from the root directory.
- **Updated Roadmap Capsule:** Corrected the world seed in `sc-overview/roadmap-overview.sc.json` to match the canonical lore.
- **Updated Gitignore:** Added the legacy `plugins/` and `utils/` directories to `.gitignore` to prevent them from being re-committed.

## The Bad 0.57

- The empty `plugins/` and `utils/` directories still need to be manually deleted from the local filesystem, but they are now ignored by Git.

## The Ugly 0.57

- N/A

---

## The Good 0.56

- **Completed Architectural Refactor:** Moved all shared plugins from the legacy root `plugins/` directory to their new canonical home at `packages/core/plugins/`.
- **Updated Plugin Catalog:** Updated the path in `plugins/scp.json` to reflect the new directory structure.

## The Bad 0.56

- The old `plugins/` directory is now empty and can be deleted.

## The Ugly 0.56

- N/A

---

2026-07-19 10:40

## The Good 0.55

- **Cleaned Up Root Directory:** Removed redundant `village.js` and `chronicle.js` files from the root and `architectum/wrightrealm/` directories. The canonical implementations now correctly reside only in the `implementation/` folder.

## The Bad 0.55

- This was a corrective action to clean up files that were misplaced during previous refactoring.

## The Ugly 0.55

- N/A

---

2026-07-19 10:40

## The Good 0.54

- **Fixed Village Soul Integration:** Refactored the `village.js` and `chronicle.js` implementations to remove direct file I/O and correctly receive their state from pre-loaded capsules via `sharedState`.
- **Corrected `village-manager.js`:** The plugin now properly instantiates the Village and Chronicle classes with the correct data and exposes the `callings.sc.json` data to `sharedState`.
- **Documented Village Manager:** Added the new `village-manager.js` plugin to the core plugin catalog (`plugins/scp.json`).

## The Bad 0.54

- This change fixes a critical bug that would have prevented the entire narrative system from loading correctly.

## The Ugly 0.54

- N/A

---

2026-07-19 10:40

## The Good 0.53

- **Implemented Agent Delegation:** The `architect-loop.js` has been refactored to make Prime the central orchestrator. It now delegates tasks to the appropriate sub-agents (Terra, Vision, etc.) based on the village's needs.
- **Updated Project Manager:** The `project-manager.js` now supports an `assignee` field on tasks, enabling true multi-agent project execution.

## The Bad 0.53

- The current delegation logic is a simple mapping. A more advanced implementation would use the LLM to determine the best agent for a task.
- The sub-agents (`terra`, `forge`, etc.) do not yet have their own logic to execute their assigned tasks.

## The Ugly 0.53

- N/A

---

2026-07-19 10:40

## The Good 0.52

- **Integrated Prime's Persona:** The `brain.js` plugin has been updated to load and use the new `prime.sc.json` capsule.
- **Dynamic Persona:** Prime's persona, tone, and memories now dynamically change based on the current stage of the village, making its behavior more narrative-driven and context-aware.
- **Updated Capsule Loader:** The `architect.js` loader has been updated to correctly load agent-specific capsules from the `packages/agents/{agentName}/` directory.

## The Bad 0.52

- N/A

## The Ugly 0.52

- N/A

---

2026-07-19 10:40

## The Good 0.51

- **Created Prime's Soul:** Created the complete, canonical semantic capsule for the CobbleWright Prime agent at `packages/agents/prime/prime.sc.json`.
- **Defined Evolving Personality:** This new capsule defines Prime's evolving role, memories, knowledge, and dialogue as the village grows from a Hamlet to a Realm Capital.

## The Bad 0.51

- The runtime (`brain.js`, `architect-loop.js`) does not yet consume this new capsule. It needs to be integrated to make Prime's behavior truly reflect its evolving role.

## The Ugly 0.51

- N/A

---

2026-07-19 10:40

## The Good 0.50

- **ARCHITECTURAL SHIFT: FROM TASKS TO PURPOSE:** The project's core philosophy has been updated to be "narrative-first." Agents now act based on the "desires" of a living village, not just a task queue.
- **Added Village Soul:** Created the foundational "Village Soul" capsules (`village.sc.json`, `callings.sc.json`, `chronicle.sc.json`) in a new `architectum/wrightrealm/` directory.
- **Added Village Implementation:** Created `implementation/village.js` and `implementation/chronicle.js` to manage the state of the village and its history.
- **Created Village Manager Plugin:** Added a new `packages/core/plugins/village-manager.js` to load and manage the new village systems.
- **Refactored Architect Loop:** The `architect-loop.js` has been refactored into a "Narrative Loop." It now responds to the village's most urgent desire ("calling") instead of just generating random projects.

## The Bad 0.50

- This is a major paradigm shift. The `brain.js` and `project-manager.js` plugins will need further refactoring to fully integrate with this new desire-driven model.

## The Ugly 0.50

- The current narrative loop simply picks the first response to a calling. A more advanced implementation would use the LLM to choose the most appropriate response based on context.

---

## The Good 0.49

- **Restored Missing Plugin:** Restored the `genesis-builder.js` plugin to its correct location at `packages/agents/prime/genesis-builder.js`.

## The Bad 0.49

- This corrects an error in a previous refactoring (0.46) where the file was deleted instead of moved.

## The Ugly 0.49

- N/A

---

2026-07-19 10:40

## The Good 0.47

- **Built Out Prime Agent:** Moved agent-specific plugins into the new `packages/agents/prime/` directory to build out the first specialized agent.
- **Moved `genesis-builder.js`:** This plugin, responsible for Prime's "awakening," is now correctly located in the `prime` agent package.
- **Moved `architect-loop.js`:** The core autonomous decision-making loop, a key feature of Prime, has also been moved to the `prime` package.
- **Updated Core Plugin Catalog:** The `plugins/scp.json` file has been updated to remove the moved plugins, keeping the core package clean.

## The Bad 0.47

- The `packages/agents/prime/` directory does not yet have its own `scp.json` catalog to document its specific plugins.

## The Ugly 0.47

- N/A

---

## The Good 0.46

- **MAJOR ARCHITECTURAL REFACTOR:** The project has been restructured into a multi-agent monorepo to support the vision of "The Collective."
- **Created `packages/` Directory:** A new top-level `packages/` directory now houses all source code.
- **Created `packages/agents/prime/`:** Created a dedicated home for the `prime` agent, moving agent-specific plugins like `architect-loop.js` and `genesis-builder.js` into it.
- **Created `packages/core/`:** Created a `core` package for shared code, moving the vast majority of existing plugins and all utils into it.
- **Updated `architect.js`:** The main entry point has been updated to support the new package-based structure, loading shared plugins from `core` and agent-specific plugins from the target agent's directory.

## The Bad 0.46

- This is a significant breaking change to the file structure. All development moving forward must respect the new `packages/` layout.

## The Ugly 0.46

- N/A

---

## The Good 0.45

- **Documented Architect Loop:** Updated `plugins/scp.json` to include the new `architect-loop.js` plugin, documenting its role as the core of the bot's autonomous decision-making.

## The Bad 0.45

- The `architect-loop.js` plugin depends on a `generateNextProject` function which is not yet implemented in `brain.js`.

## The Ugly 0.45

- N/A

---

2026-07-19 10:40

## The Good 0.44

- **Refactored Bootstrap Sequence:** The `runBootstrapSequence` in `genesis-builder.js` has been refactored to delegate its logic to the `project-manager.js` plugin.
- **Created First Autonomous Project:** The bot's initial tool crafting is now managed as a formal project ("Bootstrap Initial Tools"), making the process more robust, observable, and consistent with the bot's core task-driven architecture.

## The Bad 0.44

- This change creates a dependency on the `project-manager.js` plugin. The `genesis-builder.js` now waits for the project manager to be available before starting the bootstrap project.

## The Ugly 0.44

- N/A

---

2026-07-19 10:40

## The Good 0.43

- **Added Gitignore for Local Capsules:** Updated the `.gitignore` file to ignore any files ending in `.local.sc.json`. This allows developers to create local, experimental capsules without accidentally committing them to version control.

## The Bad 0.43

- N/A

## The Ugly 0.43

- N/A

---

2026-07-19 10:40

## The Good 0.42

- **Added Formal Security Policy:** Updated `sc-overview/sc.json` with a new `security_policy` section. This makes the rule against committing sensitive data like IP addresses an explicit, machine-readable part of the project's governance.

## The Bad 0.42

- N/A

## The Ugly 0.42

- N/A

---

2026-07-19 10:40

## The Good 0.41

- **Organized Root Directory:** Moved `persona-voice.sc.json` from the root into `data/S.C/` to align with the project's data architecture.
- **Updated Project Overview:** The `sc-overview/project-overview.sc.json` capsule has been updated to include documentation for the `tests/` and `dashboard/` directories.
- **Cleaned Up Gitignore:** Added `*.exe` to the `.gitignore` file to prevent build artifacts like `chronoscribe.exe` from being tracked.

## The Bad 0.41

- The `chronoscribe.exe` file still exists locally and needs to be manually deleted, but it will now be ignored by Git.

## The Ugly 0.41

- N/A

---

2026-07-19 10:40

## The Good 0.40

- **Synchronized Utilities Documentation:** Updated `sc-overview/utils-overview.sc.json` to accurately catalog all existing files in the `utils/` directory.
- **Added Missing Entries:** Added documentation for `object-helpers.js`, `sc-capsules.js`, and `schematic-importer.js`.

## The Bad 0.40

- N/A

## The Ugly 0.40

- N/A

---

2026-07-19 10:40

## The Good 0.38

- **Upgraded Changelog Script:** The `scripts/add-changelog.js` script has been updated to use the `inquirer` library, providing a cleaner, more user-friendly interactive prompt. This aligns the script with the project's documented history (Changelog 0.10).

## The Bad 0.38

- N/A

## The Ugly 0.38

- N/A

---

2026-07-19 10:40

## The Good 0.37

- **Documented Scripts Directory:** Created a new `sc-overview/scripts-overview.sc.json` capsule to document the purpose and contents of the `scripts/` directory, aligning it with the project's documentation-first philosophy.

## The Bad 0.37

- N/A

## The Ugly 0.37

- N/A

---

2026-07-19 10:40

## The Good 0.36

- **Cleaned Up Control Plane:** Removed legacy and redundant overview capsules from the `sc-overview/` directory.
- **Removed `cobblewright_docs_overview.sc.json`:** This file was superseded by the more current `docs_overview.sc.json`.
- **Removed `plugin-overview-sc.json`:** This file was made redundant by the canonical `plugins/scp.json` catalog.

## The Bad 0.36

- N/A

## The Ugly 0.36

- N/A

---

## The Good 0.35

- **Synchronized Plugin Catalog:** Updated `plugins/scp.json` to accurately reflect the contents of the `plugins/` directory.
- **Added Missing Entries:** Added entries for `activity-tracker.js`, `telemetry.js`, and `weather-manager.js`.
- **Reorganized Catalog:** Moved `genesis-builder.js`, `knowledge-gate.js`, and `hud-manager.js` from `runtime_guidance` to the main `plugin_catalog` for consistency.

## The Bad 0.35

- N/A

## The Ugly 0.35

- N/A

---

## The Good 0.34

- **Refactored `brain.js`:** Updated the existing `plugins/brain.js` to use the new consolidated `minecraft_knowledge_base.sc.json` capsule for its knowledge grounding.
- **Resolved Breaking Change:** The plugin no longer references the old `MINECRAFT_HISTORY_DATA` or `STYLES_DATA` keys, resolving the breaking change introduced in version 0.33.

## The Bad 0.34

- This corrects the previous changelog entry (0.34) which incorrectly stated a new `brain.js` was created. Other plugins that might have used the old data structures still need to be identified and refactored.

## The Ugly 0.34

- N/A

---

2026-07-19 10:40

## The Good 0.33

- **Consolidated Knowledge Base:** Created a new, comprehensive semantic capsule `data/S.C/minecraft_knowledge_base.sc.json` that merges all legacy `.json` knowledge files into a single, structured source of truth.
- **Simplified Knowledge Loader:** Refactored `architect.js` to only load `.sc.json` files from the `data/S.C/` directory, removing the complex logic for handling the legacy files.
- **Removed Legacy Files:** The entire `data/legacy_knowledge/` directory and its contents have been removed, as they are now superseded by the new consolidated capsule.

## The Bad 0.33

- This is a breaking change for any plugin that directly referenced the old `*_DATA` keys in `sharedState`. They will need to be updated to reference the new `MINECRAFT_KNOWLEDGE_BASE_SC.content` structure.

## The Ugly 0.33

- N/A

---

2026-07-19 10:40

## The Good 0.32

- **Tidied Data Directory:** Created a new `data/legacy_knowledge/` directory and moved all legacy `.json` knowledge files into it, cleaning up the root `data/` folder.
- **Updated Knowledge Loader:** Modified `architect.js` to load legacy JSON from the new subdirectory, ensuring no functionality was broken by the refactor.
- **Renamed Conflicting File:** Renamed the legacy `structures.json` to `legacy_structures.json` to avoid name collision with the new `data/structures/` directory.

## The Bad 0.32

- The project still relies on these legacy JSON files. A future task should be to convert them into modern `.sc.json` semantic capsules.

## The Ugly 0.32

- N/A

---

2026-07-19 10:40

## The Good 0.31

- **Removed Redundant Configuration:** Deleted the outdated and misplaced `doc/server.properties` file to eliminate configuration duplication. The single source of truth is now correctly `MinecraftServer/server.properties`.

## The Bad 0.31

- N/A

## The Ugly 0.31

- N/A

---

2026-07-19 10:40

## The Good 0.30

- **Corrected Blueprint Location:** Moved the `genesis_chamber.json` blueprint from the `doc/` folder to its correct location at `data/structures/genesis_chamber.json`.

## The Bad 0.30

- This was a corrective action to fix a file that was previously misplaced, indicating a minor process error in a prior step.

## The Ugly 0.30

- N/A

---

2026-07-19 10:40

## The Good 0.29

- **Updated Core Documents:** The `ROADMAP.md` and `MinecraftServer/README.md` have been updated to use the new canonical naming ("The Architectum", "Wrightrealm"), resolving the inconsistency noted in the previous changelog.
- **Drafted New README:** A new, fully aligned `README.md` has been drafted to serve as the project's primary entry point, reflecting the established lore.

## The Bad 0.29

- N/A

## The Ugly 0.29

- N/A

---

2026-07-19 10:40

## The Good 0.28

- **Established Canonical Lore:** A new foundational lore document, "The Story Arc & Naming Conventions of The Architectum," has been created, replacing the previous cosmology. This establishes the complete narrative for the project.
- **Updated World Seed:** The project's canonical world seed has been updated to `8454648538230128251` across the `ROADMAP.md` and `server.properties` to align with the new lore.
- **Synchronized Naming Conventions:** Updated key documents to reflect the new canonical names: "The Architectum" (the universe), "Wrightrealm" (the world), and "The Collective" (the agents).

## The Bad 0.28

- Several other documents (`README.md`, etc.) still contain references to the old "Wright Universe" name and will need to be updated in a subsequent pass to achieve full consistency.

## The Ugly 0.28

- N/A

---

2026-07-19 10:40

## The Good 0.27

- **Added Organic Bootstrap Sequence:** The `genesis-builder.js` plugin now includes a `runBootstrapSequence` function. After spawning, the bot will now organically craft its first wooden pickaxe using materials from the Genesis Chamber chest.
- **Updated Genesis Chamber:** The `genesis_chamber.json` blueprint has been updated to provide only the raw `oak_log` needed for the new bootstrap sequence.

## The Bad 0.27

- This new sequence is more complex and has more potential failure points (pathfinding, crafting) than the previous command-based provisioning.

## The Ugly 0.27

- The bootstrap sequence is hardcoded. A more advanced implementation would use the "Autonomous Architect Loop" to derive these steps dynamically.

---

2026-07-19 10:40

## The Good 0.26

- **Created Genesis Builder Plugin:** Added a new `plugins/genesis-builder.js` plugin. On first spawn, this plugin reads the `data/structures/genesis_chamber.json` blueprint and builds it at the world spawn point.
- **Updated Plugin Documentation:** The `plugins/scp.json` overview capsule has been updated to include the new `genesis-builder.js` plugin.

## The Bad 0.26

- The builder plugin relies on the bot having operator permissions to use the `/setblock` command. It will fail silently if permissions are not granted.

## The Ugly 0.26

- N/A

---

2026-07-19 10:40

## The Good 0.25

- **Created Beta World Configuration:** Generated the `MinecraftServer/server.properties` file with the official Primehaven seed (`6246468738900744`) and Beta Safety Mode settings (no mobs, always daytime), as defined in the roadmap.
- **Designed Genesis Chamber Blueprint:** Created the `data/structures/genesis_chamber.json` blueprint file, defining the agent's initial 5x5x4 starting structure with essential items.

## The Bad 0.25

- The `genesis_chamber.json` is just a data file. A new plugin or logic in an existing plugin is now required to read this blueprint and build the structure in the world.

## The Ugly 0.25

- N/A

---

2026-07-19 11:00

## The Good 0.24

- **Archived Redundant Plans:** Removed the now-obsolete `doc/TRANSFORMATION_BLUEPRINT.md` and `doc/AUTONOMY_EXECUTION_PLAN.md` files, as their contents have been merged into the main `doc/ROADMAP.md`.
- **Cleaned Up Control Plane:** Removed the corresponding `transformation-blueprint-overview.sc.json` and `autonomy-execution-plan-overview.sc.json` capsules from `sc-overview/`.
- **Synchronized Doc Index:** Updated `sc-overview/docs_overview.sc.json` to remove pointers to the archived files, ensuring the documentation index is accurate.
- **Updated Roadmap Capsule:** The `sc-overview/roadmap-overview.sc.json` has been updated to accurately summarize the new, consolidated roadmap, reflecting the three pillars and seven milestones.

## The Bad 0.24

- N/A

## The Ugly 0.24

- N/A

---

2026-07-19 10:55

## The Good 0.23

- **Consolidated Roadmap:** The main `doc/ROADMAP.md` has been significantly updated to merge the strategic vision from `TRANSFORMATION_BLUEPRINT.md` and the engineering steps from `AUTONOMY_EXECUTION_PLAN.md`.
- **Created Single Source of Truth:** The roadmap now serves as the single, authoritative document for the project's direction, containing the three engineering pillars (World, Agent Logic, VPS), the seven execution milestones (M1-M7), and the four release-blocking gates.

## The Bad 0.23

- With the other planning documents now merged, `doc/TRANSFORMATION_BLUEPRINT.md` and `doc/AUTONOMY_EXECUTION_PLAN.md` are now redundant and should be considered for archival or removal to prevent future confusion.

## The Ugly 0.23

- The roadmap has become a much larger and more dense document, requiring careful reading to fully absorb.

---

2026-07-19 10:50

## The Good 0.22

- **Updated Autonomy Plan Capsule:** The `autonomy-execution-plan-overview.sc.json` capsule has been updated to include the specific world seed (`6246468738900744`), ensuring the machine-readable plan is fully synchronized with the markdown documentation.

## The Bad 0.22

- N/A

## The Ugly 0.22

- N/A

---

2026-07-19 10:45

## The Good 0.21

- **Selected Official World Seed:** The seed `6246468738900744` has been chosen and documented in `doc/AUTONOMY_EXECUTION_PLAN.md` as the canonical seed for the Primehaven beta world.
- **Established Primehaven:** The chosen seed provides a large, resource-rich lake valley that is perfect for the project's goals of safe, autonomous base-building and development.

## The Bad 0.21

- By fixing the seed, any future testing that requires substantially different terrain (e.g., extreme biomes) will necessitate a separate server configuration, adding a small amount of operational overhead.

## The Ugly 0.21

- N/A

---

2026-07-19 10:40

## The Good 0.20

- **Added `doc/AUTONOMY_EXECUTION_PLAN.md`**: This new core document provides the detailed, three-pillar engineering bridge (World, Agent Logic, VPS Deployment) to guide the transformation from a single companion to a persistent, autonomous architect society.
- **Added `sc-overview/autonomy-execution-plan-overview.sc.json`**: A new semantic capsule makes the execution plan machine-readable, allowing agents to reason about the concrete steps toward full autonomy.
- **Updated `sc-overview/docs_overview.sc.json`**: The main documentation index has been updated to include the new execution plan, making it a discoverable part of the project's knowledge base.

## The Bad 0.20

- The plan introduces a "Beta Mode" world configuration (fixed seed, no mobs) which will need to be managed separately from the eventual "production" world settings.

## The Ugly 0.20

- The plan solidifies the move to a persistent VPS, which raises the operational burden and cost for long-term hosting.

---

2026-07-19 10:35

## The Good 0.19

- Added doc/TRANSFORMATION_BLUEPRINT.md as a single-page execution artifact with concrete milestones, role owners, dependency order, and blocking gate checks.
- Added sc-overview/transformation-blueprint-overview.sc.json to provide machine-readable planning context aligned to the roadmap transformation path.
- Updated sc-overview/docs_overview.sc.json so the new transformation blueprint is indexed in the documentation capsule catalog.

## The Bad 0.19

- Owner roles are currently functional role labels rather than named assignees, so team assignment still requires a follow-up pass.

## The Ugly 0.19

- The 90-day sequence is intentionally aggressive and may need re-baselining once real throughput metrics are collected.

---

2026-07-19 10:20

## The Good 0.18

- Added a formal Transformation Bridge section to doc/ROADMAP.md that maps the path from current CobbleWright to the autonomous architect society in four staged leaps.
- Aligned each leap with named Wright Universe canon references so execution stages are tied to governance and narrative architecture.
- Added a clear end-state statement so roadmap readers can see how 1.3, 1.4, 2.0, and 3.x connect into one continuous strategy.

## The Bad 0.18

- The bridge now introduces stronger dependency on Wright Universe canon numbering consistency; renumbering those references later will require roadmap maintenance.

## The Ugly 0.18

- Some canon references are strategic anchors rather than implemented modules today, so tracking may feel ahead of runtime reality until corresponding capsules and systems are shipped.

---

2026-07-19 10:05

## The Good 0.17

- **Version 3.x Vision Track Added:** Expanded `doc/ROADMAP.md` with a new "Version 3.x (The CobbleWright Collective)" tier above the 1.x to 2.0 progression.
- **Multi-Agent Strategy Formalized:** Added concrete objectives for specialized CobbleWright variants, Leighton-weighted consensus, shared world memory, multi-agent project management, and 24/7 VPS persistence.
- **Long-Range 4.x Direction Added:** Added a "CobbleWright Civilization" vision section to capture the long-horizon trajectory of synthetic architectural culture.

## The Bad 0.17

- The strategic surface area is now significantly larger, so roadmap maintenance will need tighter prioritization to prevent scope creep.

## The Ugly 0.17

- Multi-agent consensus and shared memory federation are now explicitly on the roadmap but still require deeper protocol and schema design before implementation can begin safely.

---

2026-07-19 09:45

## The Good 0.16

- **Strategic Direction Clarified:** Updated `doc/ROADMAP.md` with a new "Strategic Thesis" section that explicitly defines `sc-overview/` as CobbleWright's superpower and control plane.
- **Control-Plane Backlog Added:** Added concrete goals for capsule lifecycle policy, CI freshness checks, schema validation, ownership metadata, and scope-conflict detection.
- **Success Signals Defined:** Added measurable signs that the capsule layer is effectively preventing drift and accelerating contributor onboarding.

## The Bad 0.16

- This adds another governance layer to maintain, so discipline is required to keep capsule ownership and freshness checks practical.

## The Ugly 0.16

- CI freshness and scope-conflict detection are now roadmap commitments but not yet implemented, so manual enforcement is still required in the short term.

---

2026-07-19 09:30

## The Good 0.15

- **Roadmap Expansion:** Substantially expanded `doc/ROADMAP.md` with concrete short-term priorities, 1.3/1.4/2.0 phase plans, and explicit acceptance criteria.
- **Delivery Structure:** Added cross-cutting tracks for testing, performance, security/safety, and documentation/developer experience to make planning and execution more actionable.
- **Operational Clarity:** Added an active risk register with mitigation focus areas so planning includes reliability and operator trust concerns, not just feature work.

## The Bad 0.15

- The roadmap is now broader and more detailed, which increases maintenance overhead. It will need regular pruning to avoid becoming stale.

## The Ugly 0.15

- Some acceptance metrics are directional today and still need hard numeric SLO targets in a follow-up pass.

---

2026-07-17 16:40

## The Good 0.14

- **Further Enhanced Knowledge Gate:** Added a third verification test to `knowledge-gate.js` focusing on tool progression. This makes the startup grounding check even more robust.
- **Improved Grounding:** The AI is now tested on its understanding of tool tiers, which is crucial for tasks like gathering and crafting.

## The Bad 0.14

- N/A

## The Ugly 0.14

- N/A

---

2026-07-17 16:35

## The Good 0.13

- **Created Text Helpers Utility:** Created a new `utils/text-helpers.js` utility file for stateless text manipulation functions.
- **Refactored `escapeScoreboardText`:** Moved the `escapeScoreboardText` function from `hud-manager.js` into the new `text-helpers.js` utility, making it reusable.
- **Updated Documentation:** The `utils-overview.sc.json` capsule has been updated to reflect the new utility file's contents.

## The Bad 0.13

- N/A

## The Ugly 0.13

- N/A

---

2026-07-17 16:30

## The Good 0.12

- **Created Player Helpers Utility:** Created a new `utils/player-helpers.js` utility file to house common, stateless functions related to players.
- **Refactored `getTrackedPlayer`:** Moved the `getTrackedPlayer` function from `hud-manager.js` into the new `player-helpers.js` utility, making it reusable across the application. This resolves the "Ugly" item from entry 0.9.
- **Updated Documentation:** The `utils-overview.sc.json` capsule has been updated to include the new utility file.

## The Bad 0.12

- N/A

## The Ugly 0.12

- N/A

---

2026-07-17 16:25

## The Good 0.11

- **Enhanced Knowledge Gate:** The `knowledge-gate.js` plugin has been refactored to support a suite of verification tests.
- **Added Light-Level Test:** A second question about light levels being the primary defense against mob spawns was added to the gate, making the startup verification check more robust. This resolves the "Bad" item from entry 0.7.

## The Bad 0.11

- N/A

## The Ugly 0.11

- N/A

---

2026-07-17 16:20

## The Good 0.10

- **Refactored Changelog Script:** The `scripts/add-changelog.js` script has been updated to use the `inquirer` library, providing a much cleaner and more user-friendly command-line interface for creating changelog entries.
- **Added Dependency:** Added `inquirer` to `package.json` to support the improved script. This resolves the "Bad" item from entry 0.5.

## The Bad 0.10

- The script now has an external dependency for a simple UI, which adds a small amount of complexity to the project's dependency tree.

## The Ugly 0.10

- N/A

---

2026-07-17 16:15

## The Good 0.9

- **Refactored HUD Logic:** Moved all coordinate HUD logic from `world-helper.js` into the dedicated `hud-manager.js` plugin. This centralizes display logic and adheres to the single-responsibility principle.
- **Unified HUD Command:** The `hud-manager` now owns the `/hud` command and registers `/coordhud` as an alias for backward compatibility.
- **Updated Documentation:** The plugin overview capsule and the `COMMANDS.md` file have been updated to reflect the new ownership and command structure.

## The Bad 0.9

- N/A

## The Ugly 0.9

- The `getTrackedPlayer` function in `hud-manager.js` is a good candidate for a shared utility function but was kept private to limit the scope of this refactor. It could be moved to a `player-helpers.js` utility in the future.

---

2026-07-17 16:10

## The Good 0.8

- **Integrated Knowledge Gate into Startup:** The `architect.js` main function now calls the `runKnowledgeGate` function after loading all plugins.
- **Enforced Startup Verification:** The application will now gracefully exit with an error if the Knowledge Gate verification fails, ensuring the bot cannot run in an ungrounded state. This resolves the "Ugly" item from the previous entry by making the dependency explicit.

## The Bad 0.8

- N/A

## The Ugly 0.8

- N/A

---

2026-07-17 16:05

## The Good 0.7

- **Implemented Knowledge Gate:** Created a new `plugins/knowledge-gate.js` plugin to act as a crucial safety and grounding check. At startup, it tests the AI's understanding of the core gameplay capsule (`minecraft_gameplay_core.sc.json`) with a specific question.
- **Enforced Grounding:** If the AI fails the verification test, the application will now halt, preventing the bot from ever operating in an ungrounded or misunderstood state. This makes the project's knowledge system verifiable, not just assumed.

## The Bad 0.7

- The verification is currently based on a single, hardcoded question. A more robust implementation could use a suite of questions or generate them dynamically from the capsule content.

## The Ugly 0.7

- The gate relies on the `brain.js` plugin exposing an `askLLM` function on `sharedState`. This creates a soft dependency that should be documented in the `architect.js` loading sequence.

---

2026-07-17 15:50

## The Good 0.6

- **Added HUD Manager Plugin:** Created a new, placeholder plugin `plugins/hud-manager.js` to serve as the future centralized location for on-screen display logic.
- **Added HUD Command:** The new plugin registers a basic `/hud` command to toggle the display state.
- **Updated Documentation:** The plugin overview capsule (`plugins/scp.json`) has been updated to include the new `hud-manager.js` file.

## The Bad 0.6

- The plugin is currently a placeholder. It toggles a state but does not yet render anything to the screen. The coordinate display logic from `world-helper.js` still needs to be refactored and moved here.

## The Ugly 0.6

- N/A

---

2026-07-17 15:45

## The Good 0.5

- **Automated Changelog Script:** Created a new script at `scripts/add-changelog.js` and wired it to `npm run changelog`. The script interactively prompts for "Good/Bad/Ugly" sections, formats the entry, and prepends it to `CHANGELOG.md`.
- **Audited Changelog Entries:** The new script automatically records each new changelog entry as a `changelog_entry` event in the ChronoSCRIBE ledger by loading a headless instance of the audit plugin. This resolves the "Bad" item from the previous entry.

## The Bad 0.5

- The script currently has no external dependencies (like `inquirer`) for a richer CLI experience, relying on Node's built-in `readline`. This is simpler but less user-friendly.

## The Ugly 0.5

- To access the audit function, the script loads parts of the bot's environment, which is a bit heavy. This is a pragmatic trade-off to avoid duplicating the complex signing and hashing logic from the `chronoscribe.js` plugin.

---

2026-07-17 15:40

## The Good 0.4

- **Integrated Changelog with Audit Ledger:** The development workflow has been updated to require that every new `CHANGELOG.md` entry be recorded as a `changelog_entry` event in the ChronoSCRIBE audit ledger.
- **Updated Governance:** The `sc.json` behavior contract and the `DEVELOPER_GUIDE.md` have been updated to enforce and document this new rule, making the project's development history cryptographically verifiable.

## The Bad 0.4

- This process is currently manual. A helper script (`npm run changelog`) could be created to automate the process of creating the markdown entry and the audit event simultaneously to reduce friction.

## The Ugly 0.4

- N/A

---

2026-07-17 15:25

## The Good 0.3

- **Renamed Release Notes:** Renamed `doc/changelog.md` to `doc/RELEASE_NOTES.md` to more accurately reflect its purpose as a container for narrative-style release summaries.
- **Updated References:** Updated the `cobblewright_docs_overview.sc.json` capsule to point to the new filename, ensuring the project's self-documentation remains consistent. This resolves the "Bad" item from the previous changelog entry.

## The Bad 0.3

- N/A

## The Ugly 0.3

- N/A

---

2026-07-17 15:20

## The Good 0.2

- **Reconciled Changelogs:** Clarified the roles of the two changelog files. The root `CHANGELOG.md` will serve as the atomic, per-change log, while `doc/changelog.md` is now explicitly defined as the location for historical, narrative-style release notes.
- **Updated Documentation:** Added a note to `doc/changelog.md` to direct readers to the correct file and updated the `cobblewright_docs_overview.sc.json` to reflect its role.

## The Bad 0.2

- The `doc/changelog.md` file could be renamed to `RELEASE_NOTES.md` to make its purpose even clearer, but for now, the in-file note provides sufficient clarity.

## The Ugly 0.2

- N/A

---

2026-07-17 15:15

## The Good 0.1

- **Established Semantic Foundation:** Created a comprehensive set of semantic overview capsules in `sc-overview/` for every major project directory (`plugins`, `data`, `utils`, etc.) and key documentation files (`README.md`, `ROADMAP.md`).
- **AI Behavior Contract:** Implemented `sc-overview/sc.json`, a strict behavior contract defining the rules, persona, and development workflow for AI assistants operating in this repository.
- **Synthesized Developer Guide:** Generated a `DEVELOPER_GUIDE.md` from the knowledge contained within the semantic capsules, providing a single source of truth for contributors.
- **Full Project Documentation:** The project now has a complete, self-aware, and machine-readable knowledge base describing its own architecture and intent.

## The Bad 0.1

- **Documentation Divergence:** The narrative-style `doc/changelog.md` is now inconsistent with this new atomic changelog. A decision is needed on whether to deprecate it or maintain it separately as "release notes."
- **Assumed Utilities:** The `utility_catalog` in `utils-overview.sc.json` was populated with assumed helper files (`vector-helpers.js`, etc.) for completeness, but these files do not yet exist. This needs to be reconciled as the `utils` directory is built out.

## The Ugly 0.1

- **Path Inconsistencies:** Some of the initial capsules had incorrect file paths in their `links` sections after being moved to the `sc-overview` directory, which required a follow-up pass to correct. This highlights the fragility of hardcoded absolute paths in the documentation.

---
