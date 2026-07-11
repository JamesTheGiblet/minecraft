# BlockSmith - Your AI Minecraft Architect

BlockSmith is an AI-powered companion bot for Minecraft that acts as a personal architectural consultant. It observes your in-game situation, analyzes your resources and environment, and provides creative, actionable building advice directly in the game chat.
It can even physically gather resources and build simple structures on command.
It features a modular plugin architecture, making it highly extensible.
It supports multiple players on a server, offering personalized advice to each one.

Powered by a local Large Language Model (LLM) via Ollama, BlockSmith is designed to be a lighthearted and encouraging muse, helping players overcome creative blocks and build structures they can be proud of.

## The Vision

BlockSmith is more than just a mod; it's a statement. It's proof that a "vibe coder" with a clear vision can build powerful, user-centric products that solve real problems. It's a companion designed to make Minecraft more creative and less lonely.

- To understand the philosophy and "why" behind the project, read the **[INTENT.md](INTENT.md)**.
- To understand the strategic vision and business plan, read the **[PLAYBOOK.md](PLAYBOOK.md)**.

## Features

- **Real-Time Architectural Advice:** BlockSmith analyzes your inventory and surroundings to give relevant building tips.
- **Multi-Step Project Guidance:** BlockSmith analyzes your inventory and crafting capabilities to suggest logical, multi-step projects (e.g., "First craft a furnace, then smelt your ore").
- **In-Game Communication:** All advice and communication happens directly through Minecraft's chat.
- **Adaptive Learning:** Using a "Leighton Weight" self-correction loop, ChronoScribe reflects on the outcomes of its advice and adapts its future suggestions to be more helpful over time.
- **Advanced Player Activity Detection:** The bot is smart enough to detect when you're paused or AFK, and its critique loop intelligently analyzes changes in specific materials to accurately judge if its advice was followed.
- **Comprehensive Mob Knowledge:** Utilizes a detailed knowledge base of mob behaviors, threats, and utilities to provide advanced tactical and strategic advice.
- **Command Integration:** Suggests useful in-game commands (like `/fill` or `/time set day`) to help facilitate large projects.
- **Automation Advisor:** Recognizes when you have Redstone components and suggests simple, foundational automation projects like auto-smelters.
- **Geographic Awareness:** Identifies and incorporates nearby geographical features like cliffs, caves, and bodies of water into its building suggestions.
- **Deep Biome Knowledge:** Utilizes a knowledge base of biome-specific characteristics to provide highly tailored and thematic architectural ideas.
- **Context-Aware Memory:** The bot uses "Semantic Capsules" to maintain a structured memory of events, allowing it to provide more relevant advice based on past interactions.
- **Interactive Commands:** Players can ask for help, check their materials, and get inspiration using simple chat commands (`build`, `materials`, `help`).
- **Blueprint Builder:** Can generate a JSON blueprint for a simple structure and build it in the world on command.
- **Plugin System:** Core features are broken into plugins, allowing for easy addition of new commands and capabilities.
- **Multiplayer Ready:** Tracks and advises multiple players independently on the same server.
- **Autonomous Actions:** Can be commanded to gather basic resources like wood and stone.
- **Encouraging Personality:** Designed to be a fun, witty, and supportive companion, not a backseat gamer.

## Current State: Version 1.1 - Feature-Complete Beta

The project is in a feature-complete Beta stage. It is stable, well-documented, and includes a rich set of advanced features.

- **Stability:** Stable for both single-player and multiplayer use on dedicated servers.
- **Modularity:** A robust plugin architecture makes the codebase clean and highly extensible.
- **User Experience:** Features like a web dashboard, voice integration, and a one-click installer make the bot accessible and easy to use for everyone.
- **Advanced Capabilities:** Includes vision (screenshot analysis), blueprint building, and autonomous resource gathering.

See the `ROADMAP_V2.md` file for the future vision of the project.

## User Commands

| Command | Description |
|---|---|
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
| `style <name>` | Set architectural style |
