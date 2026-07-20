# Changelog

All notable changes to this project will be documented in this file.

2026-07-19 10:40

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

## 2026-07-17 15:20

### The Good 0.2

- **Reconciled Changelogs:** Clarified the roles of the two changelog files. The root `CHANGELOG.md` will serve as the atomic, per-change log, while `doc/changelog.md` is now explicitly defined as the location for historical, narrative-style release notes.
- **Updated Documentation:** Added a note to `doc/changelog.md` to direct readers to the correct file and updated the `cobblewright_docs_overview.sc.json` to reflect its role.

### The Bad 0.2

- The `doc/changelog.md` file could be renamed to `RELEASE_NOTES.md` to make its purpose even clearer, but for now, the in-file note provides sufficient clarity.

### The Ugly 0.2

- N/A

---

## 2026-07-17 15:25

### The Good 0.3

- **Renamed Release Notes:** Renamed `doc/changelog.md` to `doc/RELEASE_NOTES.md` to more accurately reflect its purpose as a container for narrative-style release summaries.
- **Updated References:** Updated the `cobblewright_docs_overview.sc.json` capsule to point to the new filename, ensuring the project's self-documentation remains consistent. This resolves the "Bad" item from the previous changelog entry.

### The Bad 0.3

- N/A

### The Ugly 0.3

- N/A

---
2026-07-17 15:40

### The Good 0.4

- **Integrated Changelog with Audit Ledger:** The development workflow has been updated to require that every new `CHANGELOG.md` entry be recorded as a `changelog_entry` event in the ChronoSCRIBE audit ledger.
- **Updated Governance:** The `sc.json` behavior contract and the `DEVELOPER_GUIDE.md` have been updated to enforce and document this new rule, making the project's development history cryptographically verifiable.

### The Bad 0.4

- This process is currently manual. A helper script (`npm run changelog`) could be created to automate the process of creating the markdown entry and the audit event simultaneously to reduce friction.

### The Ugly 0.4

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

2026-07-17 16:05

## The Good 0.7

- **Implemented Knowledge Gate:** Created a new `plugins/knowledge-gate.js` plugin to act as a crucial safety and grounding check. At startup, it tests the AI's understanding of the core gameplay capsule (`minecraft_gameplay_core.sc.json`) with a specific question.
- **Enforced Grounding:** If the AI fails the verification test, the application will now halt, preventing the bot from ever operating in an ungrounded or misunderstood state. This makes the project's knowledge system verifiable, not just assumed.

## The Bad 0.7

- The verification is currently based on a single, hardcoded question. A more robust implementation could use a suite of questions or generate them dynamically from the capsule content.

## The Ugly 0.7

- The gate relies on the `brain.js` plugin exposing an `askLLM` function on `sharedState`. This creates a soft dependency that should be documented in the `architect.js` loading sequence.

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
2026-07-17 16:20

## The Good 0.10

- **Refactored Changelog Script:** The `scripts/add-changelog.js` script has been updated to use the `inquirer` library, providing a much cleaner and more user-friendly command-line interface for creating changelog entries.
- **Added Dependency:** Added `inquirer` to `package.json` to support the improved script. This resolves the "Bad" item from entry 0.5.

## The Bad 0.10

- The script now has an external dependency for a simple UI, which adds a small amount of complexity to the project's dependency tree.

## The Ugly 0.10

- N/A

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
