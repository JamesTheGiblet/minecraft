# CobbleWright Commands

This file lists the commands CobbleWright understands in Minecraft chat, plus the built-in Minecraft commands it may recommend while helping you build.

## How to Use Them

Type the command in chat without a leading slash. Most commands are case-insensitive because CobbleWright normalizes chat to lowercase before matching.

## CobbleWright Chat Commands

| Command | Aliases | What It Does | Example |
|---|---|---|---|
| `build` | `house`, `base` | Triggers a new build suggestion based on your current context. | `build` |
| `materials` | `m` | Shows an inventory summary of logs, planks, stone, and total tracked blocks. | `materials` |
| `help` | None | Shows a short explanation of what CobbleWright can do. | `help` |
| `roast` | None | Gives a playful, constructive critique instead of harsh feedback. | `roast` |
| `inspire` | None | Generates a random creative building prompt. | `inspire` |
| `status` | None | Runs diagnostics for uptime, Ollama connection, and memory capsule counts. | `status` |
| `style <name>` | None | Sets the architectural style CobbleWright should use for future advice. | `style rustic` |
| `blueprint <structure>` | None | Generates a JSON blueprint and tries to build it near you. | `blueprint hut` |
| `gather <item> [amount]` | None | Sends CobbleWright to find and collect nearby resources. | `gather oak_log 5` |
| `weather` | None | Reports the current weather. | `weather` |
| `weather clear` | None | Asks CobbleWright to clear the weather. | `weather clear` |
| `critique` | None | Reviews the latest screenshot for aesthetic feedback. | `critique` |
| `sethome` | None | Saves your current position as CobbleWright’s safety home. | `sethome` |

## Notes On Specific Commands

- `blueprint` needs a structure name, such as `hut` or `tower`.
- `gather` needs a block or item name, such as `oak_log` or `cobblestone`.
- `style` accepts `any` or one of the styles stored in `styles_data.json`.
- `critique` works best after taking a screenshot with `F2`.
- `sethome` is used by the survival logic so CobbleWright can flee to a safe location.

## Examples

Here are some simple messages you can type in chat:

| Command | Example Chat Message | Result |
|---|---|---|
| `build` | `build` | Asks CobbleWright for a new build idea. |
| `materials` | `materials` | Shows your tracked inventory summary. |
| `help` | `help` | Lists what CobbleWright can do. |
| `roast` | `roast` | Gets a playful build critique. |
| `inspire` | `inspire` | Gets a random creative prompt. |
| `status` | `status` | Runs a quick diagnostic check. |
| `style` | `style rustic` | Switches future advice to a rustic style. |
| `blueprint` | `blueprint hut` | Generates and builds a hut blueprint. |
| `gather` | `gather oak_log 5` | Tells CobbleWright to collect 5 oak logs. |
| `weather` | `weather` | Reports the current weather. |
| `weather clear` | `weather clear` | Asks CobbleWright to clear the weather. |
| `critique` | `critique` | Reviews the latest screenshot. |
| `sethome` | `sethome` | Saves your current location as the safety home. |

## Minecraft Commands CobbleWright May Recommend

These are not CobbleWright chat commands. They are normal Minecraft commands that CobbleWright may suggest when helping you work faster.

| Command | What It Does | Example |
|---|---|---|
| `/gamemode` | Changes your game mode, often useful for big builds. | `/gamemode creative` |
| `/time set` | Changes the world time, often to skip night. | `/time set day` |
| `/weather` | Changes the weather in the world. | `/weather clear` |
| `/fill` | Fills a region with a chosen block. | `/fill <from_xyz> <to_xyz> <block>` |

## Quick Reference

If you only want the main commands, start with `build`, `materials`, `help`, `inspire`, `blueprint`, `gather`, `weather`, `critique`, `status`, `style`, and `sethome`.
