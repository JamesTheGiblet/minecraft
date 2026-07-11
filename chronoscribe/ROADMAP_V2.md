# BlockSmith Roadmap V2.0: The Sentient Architect

With the successful completion of the Version 1.0 feature set, the project has a stable, modular, and extensible foundation. The vision for V2.0 is to build upon this foundation to grant BlockSmith true autonomy and deeper intelligence, making it a proactive and collaborative partner in the world.

## Core AI & Memory Enhancements

The goal is to evolve the bot's "brain" from reactive to proactive, with a deep understanding of history and long-term goals.

-   **[ ] Persistent Long-Term Memory:**
    -   Integrate a local vector database (e.g., ChromaDB) to store conversation history and project summaries permanently.
    -   This will allow ChronoScribe to remember past projects, player preferences, and conversations across multiple play sessions, developing a unique personality for each world.

-   **[ ] Goal-Oriented Project Management:**
    -   Upgrade the AI to propose and manage large-scale, multi-session projects (e.g., "Let's build a castle," "Let's create an automated sorting system").
    -   The bot will track progress over time, suggesting the next logical step whenever the player asks for guidance on the main project.

-   **[ ] Natural Language Conversation:**
    -   Move beyond simple one-word commands. Players should be able to chat more naturally (e.g., "ChronoScribe, what do you think we should do with all this cobblestone?").
    -   The bot will use its long-term memory to have more contextual and meaningful conversations.

## Advanced In-Game Autonomy

This phase focuses on giving BlockSmith the ability to physically interact with the world to help the player.

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

This V2.0 roadmap represents a significant leap in complexity and capability, moving BlockSmith towards the ultimate goal of being an indispensable AI partner for any Minecraft player.

---

### 🔮 Vision

> *"ChronoScribe evolves from a companion who *talks* to a companion who *acts*, remembering your world, understanding your goals, and building alongside you as a true partner in creativity."*

---

### 📋 Migration Notes (V1 → V2)

**For existing users upgrading from V1:**

1.  **Backup** your `memoryLog` (will be migrated to vector DB)
2.  **Install new dependencies**:
    ```bash
    npm install chromadb prismarine-viewer mineflayer-pathfinder mineflayer-collectblock
    ```
3.  **Update config.json** with new settings:
    -   Vector DB path
    -   Farming plot coordinates
    -   Collaboration preferences
4.  **Initialize vector database** - first-run migration script
5.  **Training** - allow AI to learn your building style