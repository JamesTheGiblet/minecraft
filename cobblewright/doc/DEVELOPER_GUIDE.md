# CobbleWright Developer Guide

This document provides technical guidance for contributors extending CobbleWright.

## Architecture Overview

- Entry point: `architect.js`
- Plugin directory: `plugins/`
- Core JSON knowledge files: `biome_data.json`, `commands_data.json`, `entity_data.json`, `redstone_circuits.json`, `styles_data.json`
- User-facing docs: `README.md`, `USER_GUIDE.md`, and `doc/`

The runtime is intentionally plugin-driven. New capabilities should be added through a plugin when possible, not by growing `architect.js`.

## S.C Capsule Architecture

- Capsule directory: `data/S.C`
- Loader utility: `utils/sc-capsules.js`
- Architect runtime loads all `*.sc.json` capsules at startup and exposes scoped access through shared state.
- NPC runtime prefers persona/voice capsules from `data/S.C` and keeps legacy fallback support.

When adding a new capsule domain, keep schema structure stable and update any prompt-context wiring that consumes scoped capsule summaries.

## Command Extension Pattern

Use `sharedState.registerCommand(name, handler, aliases)` from your plugin to register chat commands.

Example pattern:

```js
if (sharedState.registerCommand) {
    sharedState.registerCommand('mycommand', async (username, args) => {
        // plugin behavior
    }, ['alias1', 'alias2']);
}
```

## Safety Expectations

All new features should preserve current guardrails:

- Blueprint generation must pass validation before build actions.
- Vision input must only read supported screenshot files from the configured directory.
- Long-term memory writes should honor retention controls.
- Gather behavior should avoid likely player-built structures.

## Gather and Survival Notes

- Gather flow supports missing-tool auto-crafting and crafting-table fallback.
- Gather includes structure-aware filtering so resource collection does not target likely player builds.
- Survival flee behavior requires a home set by `sethome`.
- Night patrol defers repeated torch-material retries when coal cannot be found and continues roaming.
- Night ghost mode is command-driven (`/gamemode`, `/effect`) and falls back to flee behavior when command permissions are unavailable.
- Patrol terrain resolution includes compatibility fallbacks instead of assuming `getHighestBlockYAt` exists.

## Configuration Flags (Important)

`config.json` should include the current operational safety settings:

- `MEMORY_RETENTION_ENABLED`
- `MEMORY_MAX_ENTRIES`
- `MEMORY_MAX_AGE_DAYS`
- `EMBEDDING_DIMENSIONS`
- `PROTECT_BUILDINGS_FOR_GATHERING`
- `BUILDING_DETECTOR_RADIUS`
- `GHOST_MODE_AT_NIGHT`
- `VISION_MODEL`
- `SCREENSHOTS_PATH`

## Documentation Update Rule

When behavior changes, update these files in the same change set:

- `README.md` for feature/safety summary
- `USER_GUIDE.md` for player-facing behavior
- `doc/COMMANDS.md` for command semantics
- `doc/changelog.md` for release notes
