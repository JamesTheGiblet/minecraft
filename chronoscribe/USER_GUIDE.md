# CobbleWright User Guide

Welcome to playing Minecraft with your new AI companion, ChronoScribe! The ChronoScribe program is designed to be intuitive and helpful. Here’s how to interact with your new assistant.

## How It Works

ChronoScribe will automatically provide project advice every 90 seconds. It analyzes your inventory, crafting capabilities, and environment to suggest a logical, 2-step project to help you progress.

The advice is designed to guide you through small, achievable goals, like setting up your first shelter or processing your first iron.

## Chat Commands

You can also talk to ChronoScribe directly using these commands in the Minecraft chat:

- `build` (or `house`, `base`)
- Immediately triggers ChronoScribe to give you a new building suggestion. This is perfect for when you're feeling stuck and need instant inspiration.

- `materials`
- Asks ChronoScribe to perform an inventory check and report the total count of your primary building materials (logs, planks, stone, and dirt).

- `help`
- Displays a short message explaining what the bot can do and lists the available commands.

- `roast`
- Feeling brave? Ask ChronoScribe to "roast" your build. (Spoiler: It's too nice to be mean and will offer a helpful upgrade idea instead).

- `inspire`
- Asks ChronoScribe for a completely random, creative, and fun building idea, not based on your current resources. Perfect for when you want to build something wild!

- `blueprint <structure>`
- Asks ChronoScribe to design and build a small structure for you. For example, `blueprint hut` will cause the bot to generate a plan for a hut and then build it nearby. Make sure the bot has the necessary materials in its inventory!

- `gather <item> [amount]`
- Asks ChronoScribe to find and collect a specific resource for you. For example, `gather oak_log 10` will make the bot go find and chop down 10 oak logs.
- If a required tool is missing, ChronoScribe now tries to craft one automatically. If no crafting table is nearby and one is in inventory, it can place one and continue.

- `weather` or `weather clear`
- Reports the current weather. Use `weather clear` to ask the bot to clear up the rain.

- `critique`
- Asks ChronoScribe for aesthetic feedback on your build. First, take a screenshot in-game (press `F2`). Then, type `critique` in the chat. The bot will analyze your screenshot and offer a constructive suggestion.

- `status`
- Runs a quick diagnostic check. ChronoScribe will report its uptime, connection status to the AI model, and memory usage. Useful for troubleshooting.

- `style <name>`
- Sets ChronoScribe's architectural focus. For example, `style rustic` will make its building suggestions follow a rustic theme. Use `style any` to return to general advice.

## Support Behavior

If ChronoScribe notices that you are low on stone, wood, or dirt, it may offer to gather more for you. When it asks where to leave the items, answer with `chest` or `inventory`.

At night, ChronoScribe automatically switches into patrol mode, explores lightly, and reports back in the morning.

## Command Suggestions

ChronoScribe understands many of Minecraft's built-in commands. If a project is large or complex, it may suggest using a command like `/fill` to clear an area or `/time set day` to skip the night. This is designed to help you work more efficiently on your creative projects.

## Safety and Privacy Notes

- Blueprint requests are validated before build actions run (size, coordinates, and volume limits).
- Screenshot critique only accepts supported image files from the configured screenshot folder.
- Long-term memory retention is configurable in `config.json`:
  - `MEMORY_RETENTION_ENABLED`
  - `MEMORY_MAX_ENTRIES`
  - `MEMORY_MAX_AGE_DAYS`

## Special Interactions

ChronoScribe is always watching and will chime in with encouraging messages during key moments:

- **Collecting Materials:** When you pick up logs or stone, it will cheer you on.
- **Player Death:** If you die, it will offer a comforting and motivational message to help you get back on your feet.

