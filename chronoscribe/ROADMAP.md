# BlockSmith Project Roadmap

This document outlines the current state and future development plans for BlockSmith.

## Current State: Alpha

The project is considered to be in a functional Alpha stage. The core features are implemented and working reliably in a local environment.

- **Functionality:** Bot connects, analyzes game state, and provides AI-generated advice via in-game chat.
- **Stability:** Stable for single-player use via "Open to LAN".
- **Code Quality:** The codebase is documented and follows good practices.

## Next Steps: Beta Phase

The goal of the Beta phase is to enhance the bot's intelligence, add more features, and improve usability.

- **[✓] Enhanced Memory:** Implement a more sophisticated memory system.
- **[✓] Semantic Capsules:** A structured memory log has been implemented.
- **[✓] Leighton Weight Loop:** A foundational self-critique loop analyzes advice outcomes.

- **[✓] Expanded AI Capabilities:**
- **[✓] Automation Advisor:** A foundational system for suggesting simple Redstone circuits has been implemented.
- **[✓] Command Suggestion System:** Can suggest relevant commands to the player.
- **[✓] Style-Specific Advice:** Allow players to request builds in a specific style (e.g., "build a modern house," "build a rustic cabin").
- **[✓] Comprehensive Mob Knowledge:** Integrated a detailed knowledge base of mob behaviors, threats, and utilities.
- **[✓] Blueprint Generation:** An advanced feature where the bot can generate and build a simple, block-by-block blueprint for a small structure.

- **[✓] More Interactive Commands:**
- **[✓] `status` command:** A command to check the bot's connection to Ollama and its own internal state.
- **[✓] `inspire me` command:** A command that provides a random, fun building prompt that isn't tied to the player's current inventory (e.g., "Build a giant statue of a chicken!").

- **[✓] Configuration File:**
- **[✓]** Move the `CONFIG` object into a separate `config.json` file to allow users to easily change settings without editing the main script.

## Future Vision: Version 1.0 and Beyond

- **[✓] Multiplayer Support:** The bot now works on dedicated multiplayer servers and provides per-player advice.
- **[✓] Voice Integration:** Added an optional text-to-speech feature using the `say` library.
- **[✓] Vision Capabilities (Llava):** Integrated a vision model (`llava`) to allow the bot to "see" screenshots and provide aesthetic feedback on builds.
- **[✓] Plugin Architecture:** Refactored the code into a modular plugin system for better extensibility.
