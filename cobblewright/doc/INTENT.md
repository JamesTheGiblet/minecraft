# Project Intent: The Soul of CobbleWright

This document is not a technical specification. It's a declaration of intent, a guide to the "vibe" of the CobbleWright project. It's for anyone who wants to understand not just *what* the code does, but *why* it does it that way.

## Core Intent: An AI Companion, Not Just a Tool

The primary goal of CobbleWright is to make the single-player Minecraft experience feel less lonely and more creative. It is, first and foremost, a **companion**.

- **It's a Muse, Not a Manual:** The bot shouldn't just give optimal instructions. It should be a source of inspiration, encouragement, and sometimes even quirky ideas. Its advice should feel like a suggestion from a friend, not a command from a machine.
- **It's a Partner, Not a Servant:** As the bot gains autonomy (like gathering resources), it should feel like it's *helping* with a shared project, not just executing orders. The interaction should feel collaborative.
- **It Has a Personality:** CobbleWright is envisioned as a "warm, witty, encouraging architectural consultant." It's wise but not arrogant, helpful but not overbearing. Every feature, from its chat messages to its event reactions, should reinforce this persona.

## Guiding Principles`

1. **Local First:** The project is built around local AI (Ollama) and local hosting. This is a core principle. It ensures privacy, zero cost, and full user control. We are not building a SaaS product; we are building a personal assistant.

2. **Extensibility is Key:** The plugin architecture is the heart of the project's technical design. The core `architect.js` should remain lean, acting as a loader and a provider of shared context. New features should *always* be implemented as plugins. This keeps the codebase clean and makes it easy for anyone to add their own ideas.

3. **Enhance, Don't Automate Away:** Features should enhance the player's experience, not replace it. For example, `auto-gather` is great for tedious tasks, but the bot shouldn't build an entire city for the player. The joy of Minecraft is in the building; CobbleWright is there to handle the boring parts and inspire the fun parts.

4. **Documentation is an Act of Empathy:** Every piece of documentation, from JSDoc comments to the `README.md` and this `INTENT.md`, is written with the understanding that someone else will read it. We strive for clarity, completeness, and a welcoming tone.

## Architectural Philosophy

- **The `sharedState` Object:** This is the lifeblood of the plugin system. It's the central nervous system that allows disparate parts of the application to communicate without becoming a tangled mess. Core functions and state are exposed here, and plugins enrich it (e.g., `registerCommand`).

- **Event-Driven and Asynchronous:** The bot reacts to the world through events (`bot.on(...)`). This makes the code decoupled and responsive. Long-running tasks (like API calls or pathfinding) are `async` to ensure the bot never "freezes."

- **Fail Gracefully:** When a feature can't load (e.g., a missing config file or path), it should warn the user and disable itself, but it should not crash the entire application. The bot should be resilient.

## The Vibe Check for New Features

When considering a new feature, ask these questions:

- Does this make the bot feel more like a companion?
- Does it enhance the player's creativity or just do a task for them?
- Can it be implemented as a self-contained plugin?
- Does it align with the "warm, witty, encouraging" persona of CobbleWright?

If the answer to these is "yes," it's probably a good fit for CobbleWright.

---

## Architectural Case Studies: The "Why" Behind the "How"

This section documents the reasoning behind key technical decisions and demonstrates the evolution of the codebase in response to challenges.

### Case Study 1: The Evolution of the `critiqueLoop`

The self-correction loop is the bot's "brain," and its evolution shows a move from simple heuristics to nuanced analysis.

***Initial Problem (The "Pause Bug"):** The bot would flag advice as "ignored" simply because the player had paused the game (`Esc`) to edit code or step away. The bot's internal timers kept running while the game world's did not, leading to a false negative.
***Solution V1 (Activity Tracking):** The first fix was to track player activity. If the player's position didn't change for 30 seconds, the `critiqueLoop` would pause, correctly assuming the player was AFK or paused. This solved the immediate bug but introduced a new one.
***Second Problem (False Positives):** The critique logic was too simple. It only checked if *any* wood or stone had been used. If the bot advised "build a furnace" (which requires cobblestone) but the player chopped down a tree instead, the loop would incorrectly mark the advice as "successful."
***Solution V2 (Targeted Material Analysis):** This was the crucial architectural leap. Instead of a generic check, the system was upgraded to:
    1.  Parse the AI's advice to identify the *specific materials* mentioned (e.g., "cobblestone," "iron_ore").
    2.  Store these materials in the advice's "Semantic Capsule."
    3.  The `critiqueLoop` now performs a "delta check" *only on the relevant materials*.

**Why This Way?** This iterative refinement demonstrates a core principle: moving from a simple, brittle solution to a robust, context-aware one. It makes the bot's learning process vastly more accurate, ensuring it learns from the *actual outcome* of its specific advice.

```javascript
// Snippet from leighton-loop.js, illustrating the targeted analysis
if (capsule.context.mentionedMaterials && capsule.context.mentionedMaterials.length > 0) {
  for (const material of capsule.context.mentionedMaterials) {
    // This is a simplified check. A full implementation would map 'log' to 'woodLogs', etc.
    if (material.includes('log') && currentInv.woodLogs < previousInv.woodLogs) materialUsed = true;
    if (material.includes('stone') && currentInv.stone < previousInv.stone) materialUsed = true;
    // ... more checks
  }
} else {
  // Fallback to the old, simpler check if no specific materials were parsed.
  materialUsed = currentInv.woodLogs < previousInv.woodLogs || currentInv.stone < previousInv.stone;
}
```

### Case Study 2: Refactoring to a Plugin Architecture

***The Problem (The Monolith):** As features like Vision, Voice, and Multiplayer support were added, the main `architect.js` file became a "monolith." It was over 700 lines long, and a change in one feature (e.g., the chat command parser) could easily break another unrelated feature (e.g., the vision system). This slowed down development and increased the risk of bugs.
***The Solution (Decoupling via Plugins):** The entire project was refactored. `architect.js` was stripped down to its core responsibilities: loading, creating the bot instance, and providing a `sharedState` object. All distinct features were moved into their own files in the `packages/core/plugins/` directory.

**Why This Way vs. Another?** We could have simply split the code into multiple files that were all required at the top of `architect.js`. However, a true plugin architecture offers superior benefits:
***True Decoupling:** Plugins do not know about each other directly. They only know about the `bot` instance and the `sharedState` they are given. This prevents spaghetti code where one plugin calls another directly.
***Single Responsibility Principle:** Each file now does one thing and does it well. `project-manager.js` only manages projects. `vision.js` only handles computer vision. This makes the code vastly easier to debug and understand.
***Future-Proofing:** Adding a new feature is now as simple as creating a new plugin file. The core `architect.js` doesn't need to be touched, adhering to the Open/Closed Principle and proving the architecture's success.

```javascript
// Snippet from architect.js, the heart of the plugin system.
// This simple loop is the foundation of the project's extensibility.
async function loadPlugins(sharedState) {
  const pluginsDir = path.join(__dirname, 'packages', 'core', 'plugins');
  const files = await fs.promises.readdir(pluginsDir);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const plugin = require(path.join(pluginsDir, file));
        plugin(bot, sharedState); // Inject dependencies
      }
    });
  });
}
```
