# CobbleWright Project Roadmap

This document outlines the development history, current status, and future plans for CobbleWright.

---

## Strategic Thesis: sc-overview Is The Superpower

CobbleWright's core leverage is no longer just runtime behavior. The real multiplier is `sc-overview/`: a machine-readable control plane that keeps architecture, intent, safety policy, testing policy, and documentation aligned.

### Why This Matters

- It makes project knowledge executable, not just descriptive.
- It reduces drift between code, docs, and agent behavior contracts.
- It allows faster onboarding for humans and AI contributors.
- It turns major decisions into versioned artifacts that can be audited and evolved.

### Control-Plane Goals (sc-overview)

- [ ] Define a required capsule lifecycle (create, review, validate, deprecate).
- [ ] Add CI checks for capsule freshness against touched files.
- [ ] Add schema validation for all overview capsules.
- [ ] Add ownership metadata for each capsule domain.
- [ ] Add conflict detection when two capsules claim the same authority scope.

### Success Signals

- [ ] Every major subsystem has an up-to-date overview capsule.
- [ ] Pull requests that change behavior also update related capsules.
- [ ] New contributors can find subsystem intent from capsules before code dive.
- [ ] Fewer architecture regressions from undocumented assumptions.

### Transformation Bridge: CobbleWright -> Autonomous Architect Society

This is the staged bridge from today's CobbleWright runtime to the full multi-agent society defined by the Wright Universe canon.

#### Leap 1: Stabilize the Architect Brain (1.2 -> 1.3)

**Goal:** Make CobbleWright predictable, safe, and trustworthy.

**Execution focus:**

- CI test gates and command contract tests.
- Memory quality controls and retrieval observability.
- Blueprint Safety V2 and failure-safe guardrails.
- Crash recovery playbook, SLOs, and operator diagnostics.

**Why this leap matters:**

- Prevents silent degradation.
- Prevents unsafe behavior under uncertainty.
- Turns CobbleWright from smart companion into reliable infrastructure.

**Wright Universe alignment:**

- #15 Safety and Hazard Protocols.
- #16 Memory Architecture.
- #17 ChronoSCRIBE Specification.
- #20 Governance Model.

#### Leap 2: Turn CobbleWright Into a True Builder (1.4)

**Goal:** Make CobbleWright capable of planning and executing multi-phase builds.

**Execution focus:**

- Project-aware build sequencing.
- Adaptive build assistance.
- Material substitution policy.
- Smarter structure completion.
- Expanded in-world critique loop signals.

**Why this leap matters:**

- Introduces architectural reasoning and build-phase planning.
- Improves hazard-aware execution and logistics.
- Establishes CobbleWright Prime behavior baseline.

**Wright Universe alignment:**

- #3 Prime Specification.
- #9 Building Standards.
- #10 Interaction Protocols.
- #14 Infrastructure Masterplan.

#### Leap 3: Split CobbleWright Into a Team (2.0)

**Goal:** Introduce role specialization, memory partitioning, and multi-agent coordination.

**Execution focus:**

- Multi-agent role mode.
- Shared world memory policies.
- Scenario packs and evaluation harness.
- Upgrade-safe schema and capsule contracts.

**Why this leap matters:**

- Creates specialized variants with distinct capabilities.
- Enables negotiated collaboration in one world.
- Forms the first operating version of the CobbleWright Collective.

**Wright Universe alignment:**

- #4 Variant Capsule Sets.
- #5 Consensus Protocol.
- #6 Region Map and Geography.
- #7 Cultural Ledger.
- #19 Variant Evolution Roadmap.

#### Leap 4: Make the World Persistent (3.x)

**Goal:** Agents act continuously, negotiate, build, maintain, and evolve in a 24/7 world.

**Execution focus:**

- Multi-agent variants fully active.
- Leighton-weighted consensus engine online.
- Shared world memory layer stable.
- Multi-agent project manager in production.
- VPS-hosted persistent world operations.
- Context-aware player interaction while preserving non-emotional framing.

**Why this leap matters:**

- Enables asynchronous society-level coordination.
- Lets agents divide labor and refine each other's work.
- Produces a living architectural ecosystem that evolves between player sessions.

**Wright Universe alignment:**

- #8 Expansion Framework.
- #12 Realm Bridges.
- #18 Settlement Charter.
- #20 Governance Model.

#### End State

Following these four leaps transforms CobbleWright from a single intelligent architect companion into a persistent, capsule-governed, multi-agent architectural society with shared memory, explainable consensus, and continuous world evolution.

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

The 1.2-complete foundation is stable. The next roadmap should focus on reliability, team workflows, and deeper in-world execution quality.

### Immediate Priorities (Next 30 Days)

- [ ] **Formal CI Test Gates:** Run `npm test` and `npm test -- --detectOpenHandles` on every pull request and fail merges when either gate fails.
- [ ] **Command Contract Tests:** Add command-level edge-case tests for invalid arguments, unknown command aliases, and ambiguous intent disambiguation.
- [ ] **Memory Quality Pass:** Add guardrails for duplicate/low-value memory entries and add observability around memory retrieval misses.
- [ ] **Blueprint Safety V2:** Add stricter checks for risky placements near lava, unstable overhangs, and player-protected zones.
- [ ] **Crash Recovery Playbook:** Define and document restart behavior for DB outages, Ollama timeouts, and plugin initialization failures.
- [ ] **Release Hygiene:** Standardize release checklists and add explicit go/no-go criteria per release candidate.

### Version 1.3 (Reliability and Operator Trust)

**Theme:** "Runs clean, fails soft, and recovers predictably."

#### 1.3 Objectives

- [ ] **Reliability SLOs:** Establish uptime and recovery targets for bot runtime, DB connectivity, and model calls.
- [ ] **Plugin Health Signals:** Add plugin-level startup/heartbeat status reporting.
- [ ] **Resilient Job Loops:** Ensure all long-running intervals/timeouts are lifecycle-safe and do not leak handles.
- [ ] **Safe Degradation:** When one subsystem fails (vision, DB, model), preserve core chat/command behavior where possible.
- [ ] **Operator Diagnostics:** Expand `/status` output with actionable root-cause hints.

#### 1.3 Acceptance Criteria

- [ ] 0 failing tests on main.
- [ ] Open-handle diagnostics pass in CI.
- [ ] Recovery paths validated for model timeout, DB unavailable, and missing optional plugin data.
- [ ] Updated runbook entries for top failure modes.

### Version 1.4 (Collaborative Build Intelligence)

**Theme:** "Plan with the player, then execute with precision."

#### 1.4 Objectives

- [ ] **Project-Aware Build Sequencing:** Convert active project tasks into concrete action queues.
- [ ] **Adaptive Build Assistance:** Adjust support behavior based on player pace and local hazards.
- [ ] **Material Substitution Policies:** Use configurable fallback materials when preferred blocks are unavailable.
- [ ] **Smarter Structure Completion:** Improve wall/frame detection and partial structure finishing logic.
- [ ] **In-World Critique Loop Expansion:** Feed more telemetry (pathing friction, interruptions, tool churn) into Leighton scoring.

#### 1.4 Acceptance Criteria

- [ ] Demonstrated end-to-end completion of at least three multi-phase project types.
- [ ] Lower interruption rate during collaborative builds versus 1.2 baseline.
- [ ] Documented material substitution outcomes and user-visible rationale.

### Version 2.0 (Sentient Crew Architect)

**Theme:** "From one companion to a coordinated creative system."

#### 2.0 Objectives

- [ ] **Multi-Agent Role Mode:** Optional separation of planner, gatherer, and builder behaviors.
- [ ] **Shared World Memory Policies:** Better multi-player memory partitioning with optional shared team context.
- [ ] **Scenario Packs:** Curated build missions with constraints, style targets, and completion scoring.
- [ ] **Evaluation Harness:** Repeatable offline eval set for advice quality, safety outcomes, and execution correctness.
- [ ] **Upgrade-Friendly Data Contracts:** Clear migration tooling for schema and capsule version changes.

#### 2.0 Acceptance Criteria

- [ ] Evaluation harness published and runnable.
- [ ] Migration path validated from latest 1.x release.
- [ ] Documentation and S.C capsules fully aligned with the 2.0 behavior model.

### Version 3.x Vision Track (The CobbleWright Collective)

**Theme:** "From one architect to a coordinated creative society."

CobbleWright evolves from a single autonomous architect into a network of specialized agents, each with its own semantic capsule set, memory profile, decision heuristics, and Leighton-weighted trust surface. These agents collaborate inside the same world, negotiate plans, divide labor, and build together.

Minecraft becomes the shared universe where synthetic architects coexist, create, and grow.

#### 3.x Objectives

##### 1. Multi-Agent Roles (CobbleWright Variants)

Introduce specialized CobbleWright variants, each with its own `.sc.json` capsule set and plugin configuration:

- [ ] **CobbleWright Prime:** Master architect and project planner.
- [ ] **CobbleWright Terra:** Terrain shaping and biome-aware building.
- [ ] **CobbleWright Forge:** Resource pipelines, smelting, and automation.
- [ ] **CobbleWright Vision:** Critique, screenshot analysis, and structural improvement.
- [ ] **CobbleWright Chronos:** Audit, provenance, and long-range planning.

Each variant should maintain:

- [ ] Unique knowledge capsules.
- [ ] Unique plugin profile.
- [ ] Unique memory streams.
- [ ] Unique Leighton Weight scoring.
- [ ] Unique creative bias profile.

##### 2. Leighton-Weighted Consensus Engine

Create a shared decision protocol where:

- [ ] Each agent proposes a plan.
- [ ] Each plan is scored by Leighton Weight.
- [ ] Consensus selects an optimal composite plan.
- [ ] ChronoSCRIBE logs negotiation and outcome.

This enables explainable multi-agent creativity.

##### 3. Shared World Memory Policies

Implement a unified memory model with:

- [ ] Per-agent memory.
- [ ] Shared team memory.
- [ ] Project-specific memory.
- [ ] World-state memory.
- [ ] Capsule-derived knowledge memory.

Memory becomes a distributed system rather than a single log.

##### 4. Multi-Agent Project Manager

Extend project management so:

- [ ] Tasks can be assigned to specific agents.
- [ ] Agents can negotiate ownership.
- [ ] Agents can request and receive help.
- [ ] Agents can hand off tasks safely.
- [ ] Agents can propose new projects.
- [ ] Agents can refine each other's work.

This turns projects into collaborative build missions.

##### 5. Autonomous Build Society

Coordinate agents across:

- [ ] Gathering.
- [ ] Crafting.
- [ ] Terraforming.
- [ ] Blueprinting.
- [ ] Building.
- [ ] Critiquing.
- [ ] Refining.
- [ ] Maintaining.
- [ ] Patrolling.

The world becomes a living architectural ecosystem.

##### 6. Player Interaction Model

When players join:

- [ ] Agents greet with contextual updates.
- [ ] Report time since last player session.
- [ ] Summarize world changes.
- [ ] Offer guided tours.
- [ ] Share newly generated ideas.
- [ ] Propose collaborative builds.
- [ ] Explain offline decisions clearly.

This is persistent state awareness, not emotional simulation.

##### 7. VPS-Hosted Persistent World

Operate CobbleWright as a 24/7 world:

- [ ] Agents continue work while players are offline.
- [ ] Builds evolve continuously.
- [ ] Ideas accumulate into long-term plans.
- [ ] Memory and audit trails persist.
- [ ] Friends can join and collaborate anytime.

Minecraft is the canvas, CobbleWright is the collective, and the VPS is the home.

#### 3.x Acceptance Criteria

- [ ] Multiple CobbleWright agents run simultaneously.
- [ ] Distinct capsule sets per agent are active.
- [ ] Distinct memory streams per agent are stable.
- [ ] Leighton-weighted consensus engine is operational.
- [ ] Multi-agent project manager is live.
- [ ] Shared world memory layer is stable.
- [ ] Agents complete at least five multi-phase collaborative builds.
- [ ] ChronoSCRIBE logs multi-agent negotiation and decisions.
- [ ] VPS deployment remains stable for 30+ days.
- [ ] Player interaction model validated with 3+ users.

### Long-Range Vision: Version 4.x (The CobbleWright Civilization)

**Theme:** "Synthetic architects forming a culture."

- [ ] Agents develop distinct architectural styles.
- [ ] Agents refine shared design philosophies.
- [ ] Agents maintain settlements and infrastructure.
- [ ] Agents create evolving aesthetic traditions.
- [ ] Agents adapt and improve long-range heuristics.
- [ ] Agents propose and execute long-horizon world plans.
- [ ] Agents maintain a shared cultural ledger.

Minecraft becomes the world, CobbleWright becomes the civilization, and the founder becomes the steward of a living synthetic society.

### Cross-Cutting Tracks

#### Testing and Quality

- [ ] Raise coverage depth around long-running loops, command parsing edges, and failure branches.
- [ ] Add smoke tests for startup path with optional subsystems disabled.
- [ ] Add regression fixtures for previously fixed production issues.

#### Performance

- [ ] Track median and p95 advice latency.
- [ ] Track memory retrieval latency and index health.
- [ ] Track command turnaround under multiplayer load.

#### Security and Safety

- [ ] Expand command safety allowlist/denylist governance.
- [ ] Improve validation for file paths, payload sizes, and external process calls.
- [ ] Add stricter world-protection boundaries for destructive actions.

#### Documentation and Developer Experience

- [ ] Keep README, ROADMAP, and TEST_SUITE docs synchronized per release.
- [ ] Add a contributor quickstart specifically for plugin authors.
- [ ] Define a release train cadence with explicit owners and gate checks.

### Risk Register (Active)

- **R1 - Model Call Volatility:** Local model latency/quality variance can destabilize UX. Mitigation: response-time budgets and fallback prompts.
- **R2 - Runtime Drift Across Plugins:** Growing plugin count can cause behavior overlap. Mitigation: clearer ownership boundaries and command contracts.
- **R3 - Memory Noise:** Excess low-value memory can pollute retrieval quality. Mitigation: retention tuning and memory scoring.
- **R4 - Operator Burden:** Recovery is still expert-heavy in edge failures. Mitigation: runbooks, structured diagnostics, and clearer status reporting.

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
