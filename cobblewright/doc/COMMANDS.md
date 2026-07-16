# CobbleWright Commands

This file lists the commands CobbleWright understands in Minecraft chat, plus the built-in Minecraft commands it may recommend while helping you build.

## How to Use Them

Type the command in chat without a leading slash. Most commands are case-insensitive because CobbleWright normalizes chat to lowercase before matching.

## CobbleWright Chat Commands

- `build` (aliases: `house`, `base`): Triggers a new build suggestion based on your current context. Example: `build`
- `materials` (alias: `m`): Shows an inventory summary of logs, planks, stone, and total tracked blocks. Example: `materials`
- `help`: Shows a short explanation of what CobbleWright can do. Example: `help`
- `roast`: Gives a playful, constructive critique instead of harsh feedback. Example: `roast`
- `inspire`: Generates a random creative building prompt. Example: `inspire`
- `status`: Runs diagnostics for uptime, Ollama connection, and memory capsule counts. Example: `status`
- `style <name>`: Sets the architectural style CobbleWright should use for future advice. Example: `style rustic`
- `blueprint <structure>`: Generates a JSON blueprint and tries to build it near you. Example: `blueprint hut`
- `gather <item> [amount]`: Sends CobbleWright to find and collect nearby resources. Example: `gather oak_log 5`
- `weather`: Reports the current weather. Example: `weather`
- `weather clear`: Asks CobbleWright to clear the weather. Example: `weather clear`
- `critique`: Reviews the latest screenshot for aesthetic feedback. Example: `critique`
- `sethome`: Saves your current position as CobbleWright's safety home. Example: `sethome`

## Notes On Specific Commands

- `blueprint` needs a structure name, such as `hut` or `tower`.
- `gather` needs a block or item name, such as `oak_log` or `cobblestone`.
- `gather` avoids likely player-built structures, and this can be tuned in `config.json` using `PROTECT_BUILDINGS_FOR_GATHERING` and `BUILDING_DETECTOR_RADIUS`.
- `style` accepts `any` or one of the styles stored in `styles_data.json`.
- `critique` works best after taking a screenshot with `F2`.
- `sethome` is used by the survival logic so CobbleWright can flee to a safe location.
- `sethome` also defines the center point for night patrol roaming and emergency fallback when ghost mode commands are unavailable.
- Night ghost mode uses built-in server commands under the hood, so the bot account must have permission to run `/gamemode` and `/effect` if you want patrol invulnerability.

## Examples

Here are some simple messages you can type in chat:

- `build`: `build` -> Asks CobbleWright for a new build idea.
- `materials`: `materials` -> Shows your tracked inventory summary.
- `help`: `help` -> Lists what CobbleWright can do.
- `roast`: `roast` -> Gets a playful build critique.
- `inspire`: `inspire` -> Gets a random creative prompt.
- `status`: `status` -> Runs a quick diagnostic check.
- `style`: `style rustic` -> Switches future advice to a rustic style.
- `blueprint`: `blueprint hut` -> Generates and builds a hut blueprint.
- `gather`: `gather oak_log 5` -> Tells CobbleWright to collect 5 oak logs.
- `weather`: `weather` -> Reports the current weather.
- `weather clear`: `weather clear` -> Asks CobbleWright to clear the weather.
- `critique`: `critique` -> Reviews the latest screenshot.
- `sethome`: `sethome` -> Saves your current location as the safety home.

## Minecraft Commands CobbleWright May Recommend

These are not CobbleWright chat commands. They are normal Minecraft commands that CobbleWright may suggest when helping you work faster.

- `/gamemode`: Changes your game mode, often useful for big builds. Example: `/gamemode creative`
- `/time set`: Changes the world time, often to skip night. Example: `/time set day`
- `/weather`: Changes the weather in the world. Example: `/weather clear`
- `/fill`: Fills a region with a chosen block. Example: `/fill <from_xyz> <to_xyz> <block>`

## Quick Reference

If you only want the main commands, start with `build`, `materials`, `help`, `inspire`, `blueprint`, `gather`, `weather`, `critique`, `status`, `style`, and `sethome`.
