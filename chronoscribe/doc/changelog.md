# CobbleWright Changelog

## Version 1.1.1 - "Safety and Reliability Hardening"

---

### 🔒 Security and Privacy Improvements

- **Vision input hardening (`vision.js`):** Screenshot critique now validates file path, file type, and file size before reading image data.
- **Blueprint safety validation (`blueprint.js`):** Added strict blueprint validation for name format, coordinate integrity, duplicate blocks, max dimensions, max block count, and max clear volume.
- **Long-term memory retention policy (`long-term-memory.js`):** Added configurable pruning by max age and max entries with startup and post-write cleanup.
- **Config additions:**
  - `MEMORY_RETENTION_ENABLED`
  - `MEMORY_MAX_ENTRIES`
  - `MEMORY_MAX_AGE_DAYS`

### 🛠️ Gathering Quality-of-Life Improvements

- **Automatic tool crafting (`auto-gather.js`):** When gathering requires a specific tool and one is missing, the bot attempts to craft an appropriate tool from available recipes/materials.
- **Crafting table fallback (`auto-gather.js`):** If no crafting table is nearby, the bot can place one from inventory and continue crafting.

### 📦 Dependency Stability

- Pinned `mineflayer` from `next` to a fixed version to improve reproducibility and reduce supply-chain drift.

---

## Version 1.1.0 - "The Autonomous Assistant"

---

### 🎯 Major New Features (v1.1.0)

#### Autonomous Resource Gathering

- **New Plugin (`auto-gather.js`):** CobbleWright can now physically interact with the world to gather resources.
- **`/gather <item> [amount]` Command:** Players can now command the bot to find and collect a specified number of basic resources like `oak_log` or `cobblestone`.
- **Pathfinding Integration:** Utilizes `mineflayer-pathfinder` to intelligently navigate the world to reach target blocks.

#### Enhanced World Interactivity

- **New Plugin (`player-events.js`):** The bot now feels more alive by reacting to in-game events.
  - **Welcomes new players** who join the server.
  - **Offers condolences** when a player dies.
  - **Celebrates** with a player when they find a rare item like a diamond.

#### Utility Commands

- **New Plugin (`weather.js`):** Adds a convenient `/weather` command.
  - Players can check the current weather.
  - Players can ask the bot to run `/weather clear` to stop rain.

---

### 📦 Dependencies Added (v1.1.0)

| Dependency | Version | Purpose |
| --- | --- | --- |
| `mineflayer-pathfinder` | ^2.4.5 | Enables autonomous navigation for the `/gather` command. |
| `prismarine-block` | ^1.16.4 | A dependency of pathfinder for block data. |

---

## Version 1.0.0 - Feature-Complete Beta Release

---

### 🎯 Major New Features (v1.0.0)

#### Blueprint Generation System

- `/blueprint <structure>` command generates and builds small structures
- AI-powered blueprint generation using specialized prompts
- JSON-based blueprint format with block-by-block coordinates
- **Material check system** - verifies bot inventory before building
- **Vec3 dependency** added for precise block placement
- 5-tick delay between block placements to prevent server overload

#### One-Click Installer

- **Standalone executable** (`chronoscribe.exe`) - no Node.js required
- Bundled dependencies and assets (plugins and JSON files)
- Cross-platform packaging via `pkg`
- Non-developers can run with zero setup (just Ollama + Minecraft)
- Added `npm run build` script for easy executable generation

---

### 🎨 Enhancements & Improvements

#### Player Activity Detection

**Initial Implementation:**

- Tracks player movement via position monitoring
- 30-second inactivity threshold
- Prevents false "likely_ignored" critiques when game is paused or AFK

**Advanced Upgrade:**

- **Expanded activity triggers:** Arm swings, inventory openings, block placing, chat messages
- **Centralized activity logic** via `updatePlayerActivity()` function
- **Multiplayer-aware activity tracking** - monitors each player independently

#### Leighton Weight Self-Correction Loop

- **Material-aware critique:** Parses advice to identify mentioned materials
- **Targeted inventory delta analysis** - only checks materials relevant to the advice
- **Handles both consumption and creation** (e.g., planks decreasing AND iron_ingots increasing)
- **Fallback system** - generic wood/stone check when no specific materials parsed
- Prevents false positives (advice to build furnace not marked "successful" from mining trees)

#### Plugin Architecture

- **Complete refactor** from monolithic script to modular plugin system
- **Dynamic plugin loading** - discovers and loads all `.js` files from `/plugins` directory
- **Shared state context** - plugins access `CONFIG`, `memoryLog`, `playerStates`, core functions
- **Extensible command system** - plugins can register new commands via `sharedState.registerCommand`
- **Clean separation of concerns:**

| Plugin | Responsibility |
| --- | --- |
| `activity-tracker.js` | Monitors player actions (arm swings, inventory) |
| `commands.js` | Master command handler with plugin registration |
| `leighton-loop.js` | Self-critique and learning logic |
| `player-tracker.js` | Manages player join/leave and state |
| `vision.js` | Screenshot watching and critique command |
| `blueprint.js` | AI-powered structure generation and building |

#### Multiplayer Support

- **Per-player state management** via `playerStates` Map
- **Player tracking** - automatically adds/removes players on join/leave
- **Personalized advice** - commands target specific players
- **Inventory limitations** - uses bot inventory as proxy (Mineflayer limitation)
- **Individual activity detection** - tracks each player's activity independently

#### Vision Capabilities (Llava Integration)

- **Screenshot watcher** using `chokidar` library
- **Multimodal AI integration** - `llava` model processes both text and images
- **`/critique` command** - analyzes latest screenshot for aesthetic feedback
- **Encouraging constructive criticism** - focuses on positive, specific suggestions
- **Auto-disabled** if screenshot path not configured

#### Voice Integration (Text-to-Speech)

- **`say` library integration** for cross-platform TTS
- **Configuration flag** - `USE_TTS` in `config.json`
- **Emoji stripping** - removes emojis for cleaner speech output
- **Non-intrusive** - voice can be enabled/disabled per user preference

#### Style-Specific Advice

- **`/style <name>` command** - players can set architectural focus
- **Available styles** - rustic, modern, medieval, any (dynamic via `styles_data.json`)
- **Style-aware prompts** - AI incorporates style preferences into advice
- **Per-player style tracking** - each player has independent style preference

---

### 📊 Data & Knowledge Base Updates

- **Biome knowledge** - `biome_data.json` with biome-specific characteristics
- **Redstone circuits** - `redstone_circuits.json` for automation advice
- **Command suggestions** - `commands_data.json` for useful in-game commands
- **Entity awareness** - `entity_data.json` with mob behaviors, threats, and utilities
- **Style library** - `styles_data.json` with material palettes and design principles

---

### 🐛 Bug Fixes & Stability

- **Fixed feedback loop** - removed duplicate chat handler causing infinite advice spam
- **Path handling** - migrated to `path.join(__dirname, ...)` for robust file loading
- **Error handling** - graceful fallbacks when configuration files are missing
- **Multiplayer chat** - bot no longer responds to its own messages
- **Vec3 dependency** - added to `package.json` to prevent crash on blueprint use

---

### 🛠️ Developer Experience

- **Modular architecture** - new features can be added via plugins without modifying core
- **Documentation** - comprehensive README, SETUP, USER_GUIDE, and ROADMAP
- **JSDoc comments** - well-documented functions throughout codebase
- **Build automation** - `npm run build` packages executable for distribution
- **Configuration centralized** - all settings in `config.json`

---

### 📦 Dependencies Added (v1.0.0)

| Dependency | Version | Purpose |
| --- | --- | --- |
| `say` | ^0.16.0 | Text-to-speech integration |
| `chokidar` | ^3.6.0 | Screenshot folder watching |
| `vec3` | ^0.1.8 | 3D vector math for blueprint placement |
| `pkg` | ^5.8.1 | Executable packaging (dev dependency) |

---

### 🎮 User Commands

| Command | Description |
| --- | --- |
| `build` (or `house`, `base`) | Get building advice based on current context |
| `materials` | Check inventory summary |
| `help` | Display available commands |
| `roast` | Gentle, constructive criticism |
| `inspire` | Random creative building prompt |
| `critique` | Aesthetic feedback on latest screenshot |
| `style <name>` | Set architectural style |
| `status` | Diagnostic check (uptime, Ollama status, memory) |
| `blueprint <structure>` | Generate and build a small structure |

---

### 🚀 Migration Notes

**For existing users:**

1. Run `npm install` to install new dependencies
2. Update `config.json` with:
   - `"USE_TTS": false`
   - `"VISION_MODEL": "llava:latest"`
   - `"SCREENSHOTS_PATH": "C:/Users/YourUser/AppData/Roaming/.minecraft/screenshots"`
3. Create `/plugins` folder with all plugin files
4. Pull `llava` model: `ollama pull llava`
5. (Optional) Build executable: `npm run build`

---

### 🎯 Summary

CobbleWright has evolved from a single-purpose advice bot into a **full-featured AI Minecraft companion** with:

- ✅ **Multiplayer support** with per-player state
- ✅ **Self-learning** via Leighton Weight critique loop
- ✅ **Vision capabilities** for aesthetic feedback
- ✅ **Voice integration** for immersive experience
- ✅ **Blueprint generation** and building
- ✅ **One-click installer** for non-developers
- ✅ **Plugin architecture** for extensibility

**Current Status:** Feature-complete Beta ready for distribution and community use.

