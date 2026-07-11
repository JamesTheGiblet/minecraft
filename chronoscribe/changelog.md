# ChronoScribe Changelog

## Version 1.0.0 - Feature-Complete Beta Release

---

### 🎯 Major New Features

#### Web Dashboard (GUI Overlay)

- Added real-time web-based dashboard accessible at `http://localhost:3000`
- Live chat log display with auto-scroll functionality
- Connection status indicator
- No alt-tabbing required - opens in browser on second monitor or as overlay
- Built with Express.js and Socket.io for real-time communication

#### Blueprint Generation System

- `/blueprint <structure>` command generates and builds small structures
- AI-powered blueprint generation using specialized prompts
- JSON-based blueprint format with block-by-block coordinates
- **Material check system** - verifies bot inventory before building
- **Vec3 dependency** added for precise block placement
- 5-tick delay between block placements to prevent server overload

#### One-Click Installer

- **Standalone executable** (`chronoscribe.exe`) - no Node.js required
- Bundled dependencies and assets (plugins, dashboard, JSON files)
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
| `dashboard.js` | Serves web GUI and real-time updates |
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

### 📦 Dependencies Added

| Dependency | Version | Purpose |
| --- | --- | --- |
| `say` | ^0.16.0 | Text-to-speech integration |
| `chokidar` | ^3.6.0 | Screenshot folder watching |
| `express` | ^4.19.2 | Web dashboard server |
| `socket.io` | ^4.7.5 | Real-time dashboard updates |
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
   - `"DASHBOARD_PORT": 3000`
3. Create `/dashboard` folder with HTML/CSS/JS files
4. Create `/plugins` folder with all plugin files
5. Pull `llava` model: `ollama pull llava`
6. (Optional) Build executable: `npm run build`

---

### 🎯 Summary

ChronoScribe has evolved from a single-purpose advice bot into a **full-featured AI Minecraft companion** with:

- ✅ **Multiplayer support** with per-player state
- ✅ **Self-learning** via Leighton Weight critique loop
- ✅ **Vision capabilities** for aesthetic feedback
- ✅ **Voice integration** for immersive experience
- ✅ **Blueprint generation** and building
- ✅ **Web dashboard** for live monitoring
- ✅ **One-click installer** for non-developers
- ✅ **Plugin architecture** for extensibility

**Current Status:** Feature-complete Beta ready for distribution and community use.
