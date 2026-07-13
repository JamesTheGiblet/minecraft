# CobbleWright Project Roadmap

This document outlines the development history, current status, and future plans for CobbleWright.

---

## ✅ Completed Milestones (Version 1.x)

The initial versions of CobbleWright focused on establishing a stable foundation, core AI capabilities, and a modular architecture. The following major features were completed and are now part of the stable build.

-   **[✓] Multiplayer Support:** The bot works on dedicated multiplayer servers and provides per-player advice.
-   **[✓] Plugin Architecture:** The codebase was refactored into a modular plugin system for clean code and easy extensibility.
-   **[✓] Enhanced Memory System:**
    -   Implemented "Semantic Capsules" for a structured memory log.
    -   Created the "Leighton Weight Loop" for self-critique.
-   **[✓] Expanded AI Capabilities:**
    -   **Automation Advisor:** Suggests simple Redstone circuits.
    -   **Command Suggestion:** Suggests relevant in-game commands.
    -   **Style-Specific Advice:** Provides build ideas based on player-selected styles (e.g., rustic, modern).
    -   **Mob Knowledge:** Utilizes a knowledge base of mob behaviors, threats, and utilities.
    -   **Blueprint Generation:** Can generate and build simple structures from a plan.
-   **[✓] Interactive Commands:** Added commands like `status`, `inspire`, and `style` for deeper interaction.
-   **[✓] Vision Capabilities (Llava):** Integrated a vision model to allow the bot to "see" screenshots and provide aesthetic feedback.
-   **[✓] Voice Integration:** Added an optional text-to-speech feature.
-   **[✓] Configuration File:** Moved settings to `config.json` for easy user customization.

---

## 🚀 Current Roadmap: Version 2.0 - The Sentient Architect

With a stable foundation, the vision for V2.0 is to grant CobbleWright true autonomy and deeper intelligence, making it a proactive and collaborative partner in the world.

> *"CobbleWright evolves from a companion who *talks* to a companion who *acts*, remembering your world, understanding your goals, and building alongside you as a true partner in creativity."*

### Core AI & Memory Enhancements

The goal is to evolve the bot's "brain" from reactive to proactive, with a deep understanding of history and long-term goals.

-   **[ ] Persistent Long-Term Memory:**
    -   Integrate a local vector database (e.g., ChromaDB) to store conversation history and project summaries permanently.
    -   This will allow CobbleWright to remember past projects, player preferences, and conversations across multiple play sessions.

-   **[ ] Goal-Oriented Project Management:**
    -   Upgrade the AI to propose and manage large-scale, multi-session projects (e.g., "Let's build a castle," "Let's create an automated sorting system").
    -   The bot will track progress over time, suggesting the next logical step whenever the player asks for guidance on the main project.

-   **[ ] Natural Language Conversation:**
    -   Move beyond simple one-word commands. Players should be able to chat more naturally (e.g., "CobbleWright, what do you think we should do with all this cobblestone?").
    -   The bot will use its long-term memory to have more contextual and meaningful conversations.

### Advanced In-Game Autonomy

This phase focuses on giving CobbleWright the ability to physically interact with the world to help the player.

-   **[~] Autonomous Resource Gathering:** (In Progress)
    -   Integrate `mineflayer-pathfinder` and `mineflayer-collectblock`. (Pathfinder integrated).
    -   When a blueprint is requested, if the bot is missing materials, it will be able to automatically find, pathfind to, and gather basic resources like wood, dirt, and stone.
    -   *Update: A foundational `/gather` command has been implemented in `auto-gather.js`.*

-   **[ ] Collaborative Building:**
    -   The bot will be able to assist in building tasks.
    -   Example: A player builds the corner pillars of a house, and the bot can be instructed to "fill in the walls between these pillars."

-   **[ ] Automated Farming:**
    -   Create a new plugin that allows the bot to manage a small farm plot.
    -   It will be able to till soil, plant seeds, and harvest crops when they are mature, placing the results in a designated chest.

### Migration Notes (V1 → V2)

**For existing users upgrading from V1:**

1.  **Backup** your `memoryLog` (will be migrated to vector DB)
2.  **Install new dependencies**:
    ```bash
    npm install chromadb prismarine-viewer mineflayer-pathfinder mineflayer-collectblock
    ```
3.  **Update config.json** with new settings for the vector DB path and other new features.

