# 🏛️ CobbleWright — Character & Skin

This directory defines the character of CobbleWright, including the official skin design and a lightweight bot script to bring that character to life in-game.

The primary purpose of this folder is to house the **visual identity and persona** of CobbleWright.

---

## ✨ What's Inside

| Component | Description |
| --- | --- |
| **Official Skin Design** | The `skin/SKIN_DESIGN.md` file contains the detailed, pixel-perfect description for creating CobbleWright's skin. This is the canonical source for the character's appearance. |
| **"Lite" Bot Script** | The `npc-bot.js` file is a simple, standalone script that runs a non-AI version of the character in your world. It uses the official skin and has basic interactive behaviors. |
| **Persona Capsule** | The `persona.sc.json` file defines CobbleWright's performance voice style (registers, cadence, and lexicon) used to stylize outgoing dialogue. |
| **Configuration** | The `config.json` file allows you to customize the bot's dialogue and behavior. |

This "lite" bot is perfect for users who want the presence of the CobbleWright character without setting up the full AI system.

---

## Persona Voice Capsule

CobbleWright now supports persona-driven dialogue styling using `persona.sc.json`.

- The bot reads the capsule on startup when `persona.enabled` is `true` in `config.json`.
- Dialogue categories are mapped to persona registers (for example, advice lines use a high-energy register).
- If the capsule file is missing or invalid, the bot safely falls back to plain dialogue.

### Enable / Disable Persona Styling

In `config.json`:

```json
"persona": {
  "enabled": true
}
```

Set `enabled` to `false` to disable persona styling and use raw dialogue lines.

### Editing the Capsule

- Update `core_traits` to tune general voice behavior.
- Add or refine `registers` to control category-specific style.
- Keep `usage_notes` aligned with parody/character writing intent.

Tip: Start by adjusting lexicon terms in each register before changing cadence globally.

---

## 🚀 Quick Start

### 1. Apply the Skin

To see CobbleWright's intended appearance, you must create a skin `.png` file from the `skin/SKIN_DESIGN.md` document and apply it to the Minecraft account that the bot will use (as defined in `config.json`).

### 2. Run the Bot

```bash
npm install
npm start
```

---

## 🧪 Experimental: AI Skin Generation

As an alternative to creating the skin manually, you can use an experimental AI-powered script to generate it directly from the design document.

This requires Python and the `ai-minecraft-skin` library.

```bash
pip install ai-minecraft-skin
python generate_skin.py
```
