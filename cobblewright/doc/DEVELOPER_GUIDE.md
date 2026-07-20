# CobbleWright Developer Guide

This guide is the entry point for contributing to CobbleWright. It covers the project's architecture, philosophy, and development workflow.

Our core belief is that **documentation is an act of empathy**. This guide, along with the semantic capsules in `sc-overview/`, provides the necessary context for meaningful contribution.

## 1. The Core Philosophy: A Companion First

Before you write a single line of code, it's essential to understand the "vibe" of CobbleWright.

- **It's a Muse, Not a Manual:** The bot should be a source of inspiration and encouragement. Its personality is "warm, witty, and wise."
- **Enhance, Don't Automate Away:** We handle tedious tasks to free up the player's creativity, not to play the game for them.
- **Local First:** The project is built around local AI (Ollama) and local hosting to ensure privacy, cost-effectiveness, and user control.

When considering a new feature, always perform this "vibe check":

1. Does this make the bot feel more like a companion?
2. Can it be implemented as a self-contained plugin?
3. Does it align with the "warm, witty, encouraging" persona?

For a deeper dive, read **INTENT.md** and **ROADMAP.md**.

## 2. Getting Started

First, ensure your development environment is set up correctly. The **SETUP.md** guide has detailed instructions for installing Node.js, Ollama, and the required AI models.

Once you're set up, you can start the project with the `start.bat` script, which handles the entire stack (PostgreSQL, Minecraft Server, and the bot).

## 3. Project Architecture Overview

CobbleWright follows a clean, modular architecture designed for extensibility. You can see a full map in `sc-overview/file-tree-overview.sc.json`.

```bash
cobblewright/
├── architect.js           # Main application entry point. Thin and simple.
├── config.json            # Core configuration for the bot.
├── data/                  # All persistent data.
│   ├── S.C/               # Runtime-loaded Semantic Capsules (AI's core knowledge).
│   └── chronoscribe/      # Append-only, signed audit logs.
├── doc/                   # Human-readable documentation (like this file).
├── plugins/               # The heart of the bot's functionality.
├── sc-overview/           # Agent-generated documentation capsules.
├── utils/                 # Shared, stateless helper functions.
└── MinecraftServer/       # Pre-configured local server for testing.
```

### The `architect.js` Entry Point

This is the application's starting point. Its responsibilities are intentionally limited:

1. Load `config.json`.
2. Initialize the `mineflayer` bot instance.
3. Create the `sharedState` object.
4. Load all runtime knowledge from `data/S.C/*.sc.json`.
5. Load all plugins from the `plugins/` directory.
6. Connect to the Minecraft server.

**Core Principle:** Keep `architect.js` lean. All new features and complex logic belong in plugins.

### The `sharedState` Object

This is the central nervous system of CobbleWright. It's a JavaScript object passed to every plugin, allowing them to communicate and share functionality without creating a tangled mess of direct dependencies. Plugins enrich `sharedState` with their own capabilities (e.g., `sharedState.registerCommand(...)`).

## 4. The Plugin System: Building New Features

The plugin system is the most important concept for a CobbleWright developer.

### Creating a New Plugin

1. Create a new JavaScript file in the `plugins/` directory (e.g., `my-new-feature.js`).
2. The file must export a single function that accepts the `bot` and `sharedState` objects.

```javascript
// plugins/my-new-feature.js

module.exports = (bot, sharedState) => {
  // Your plugin's logic goes here.

  const myCoolFunction = () => {
    console.log('My new feature is running!');
  };

  // You can listen to bot events.
  bot.on('chat', (username, message) => {
    if (message === 'do my feature') {
      myCoolFunction();
    }
  });

  // And you can expose functionality to other plugins via sharedState.
  sharedState.myCoolFunction = myCoolFunction;
};
```

That's it! The `architect.js` loader will automatically find and initialize your plugin at startup.

### Registering a New Chat Command

The `commands.js` plugin exposes a command registration system via `sharedState`. This is the standard way to add new user-facing commands.

```javascript
// plugins/my-command-plugin.js

module.exports = (bot, sharedState) => {
  const handleMyCommand = (username, args) => {
    sharedState.say(`Hello, ${username}! You triggered my new command.`);
  };

  // Register the command and its aliases.
  sharedState.registerCommand('mycommand', handleMyCommand, ['mycmd', 'mc']);
};
```

### Natural Language Intent Routing

For more conversational interactions, you can add logic to the `parseNaturalIntent` function in `plugins/commands.js`. This allows the bot to understand free-form sentences and route them to the correct command handler.

## 5. Data and Knowledge Management

CobbleWright makes a critical distinction between **knowledge** and **data**.

- **Knowledge (`data/S.C/`)**: This folder contains the AI's core, static understanding of the world. It holds `.sc.json` (Semantic Capsule) files that define its persona, architectural principles, and gameplay mechanics. These are loaded into `sharedState` at startup to ground the AI's reasoning.
- **Runtime Data (`data/chronoscribe/`)**: This folder contains dynamic, runtime-generated artifacts. The primary example is the ChronoSCRIBE audit ledger, which is an append-only log of the bot's actions. **Code should never treat this data as static knowledge.**

### Creating a New Utility

If you have a piece of reusable, stateless logic (e.g., a math function), it belongs in the `utils/` directory.

1. Create a file like `utils/my-helpers.js`.
2. Export your functions: `module.exports = { myFunction };`.
3. Require it in any plugin where it's needed: `const { myFunction } = require('../utils/my-helpers.js');`.
4. Update `sc-overview/utils-overview.sc.json` to document your new utility file.

### Creating a New Semantic Capsule

Semantic Capsules (`.sc.json`) are used for two distinct purposes: providing runtime knowledge to the AI and documenting the project's structure.

1. **For Runtime Knowledge:** If you are adding core knowledge that the AI needs to use during operation (e.g., a new set of gameplay principles, a new persona), create the `.sc.json` file in the `data/S.C/` directory. The `architect.js` runtime will automatically load it into `sharedState`.
2. **For Documentation:** If you are creating an overview of a folder or a key file for developer reference, create the `.sc.json` file in the `sc-overview/` directory. These files are *not* loaded by the runtime and serve as a knowledge base for contributors and AI assistants.

A good capsule should have a clear `intent` and `content` section that describes its purpose and scope. Use the existing files in `sc-overview/` as a template.

## 6. The Audit Ledger (ChronoSCRIBE)

If you have a piece of reusable, stateless logic (e.g., a math function), it belongs in the `utils/` directory.

1. Create a file like `utils/my-helpers.js`.
2. Export your functions: `module.exports = { myFunction };`.
3. Require it in any plugin where it's needed: `const { myFunction } = require('../utils/my-helpers.js');`.
4. Update `sc-overview/utils-overview.sc.json` to document your new utility file.

To maintain trust and traceability, significant events must be recorded in the audit ledger. The `chronoscribe.js` plugin provides the interface for this.

```javascript
// Inside any plugin...

const audit = (eventType, payload, rationale) => {
  if (typeof sharedState.recordAuditEvent !== 'function') return;
  sharedState.recordAuditEvent({
    contributorId: 'my-plugin-name', // A unique ID for the contributing plugin
    eventType,
    payload,
    rationale
  });
};

audit('item_crafted', { item: 'diamond_pickaxe' }, 'Player requested a tool upgrade.');
```

This creates a signed, hash-chained, and tamper-evident record of the event in the `data/chronoscribe/` directory.

---

Happy building! We're excited to see what you create.
