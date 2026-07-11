# ChronoScribe - Your AI Minecraft Architect

ChronoScribe is an AI-powered companion bot for Minecraft that acts as a personal architectural consultant. It observes your in-game situation, analyzes your resources and environment, and provides creative, actionable building advice directly in the game chat.

Powered by a local Large Language Model (LLM) via Ollama, ChronoScribe is designed to be a lighthearted and encouraging muse, helping players overcome creative blocks and build structures they can be proud of.

## Features

- **Real-Time Architectural Advice:** ChronoScribe analyzes your inventory and surroundings to give relevant building tips.
- **Multi-Step Project Guidance:** ChronoScribe analyzes your inventory and crafting capabilities to suggest logical, multi-step projects (e.g., "First craft a furnace, then smelt your ore").
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
- **Lightweight and Local:** Runs on your machine using Node.js and a local Ollama instance, ensuring your data stays private and there are no server costs.
- **Encouraging Personality:** Designed to be a fun, witty, and supportive companion, not a backseat gamer.

## Current State

The project is currently in an advanced Alpha state. It features a foundational implementation of an adaptive learning system, making it more than just a simple advisor.

- **Bot Connection:** Stably connects to a single-player Minecraft world opened to LAN.
- **AI Integration:** Successfully uses Ollama's REST API for fast and efficient LLM inference.
- **Core Features:** All documented chat commands and automatic advice triggers are implemented.
- **Learning Mechanism:** A "Leighton Weight" critique loop analyzes advice outcomes to improve future suggestions.
- **Documentation:** The codebase is well-documented with JSDoc comments.

See the **Roadmap** section for planned features and future development goals.
