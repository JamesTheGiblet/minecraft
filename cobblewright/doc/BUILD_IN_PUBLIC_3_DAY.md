# CobbleWright Build in Public: 3-Day Post Series

Use these posts as-is, or tweak voice and length for each platform.

## Day 1: Safety and Reliability Hardening

Building in public, Day 1: I turned my Minecraft AI companion into a safer system.

Today I shipped:

- Vision input hardening (path, extension, and size checks)
- Blueprint safety validation (bounds, duplicates, and clear-volume limits)
- Long-term memory retention controls (max age and max entries)
- Dependency pinning for more reproducible installs

Why this mattered:
Cool features mean nothing if unsafe input can break trust, so I paused feature work for a security and reliability pass.

What surprised me:
Most risk was not one big bug. It was lots of small assumptions.

Tomorrow:
I am shipping quality-of-life automation so the bot can recover when tools are missing.

Feedback ask:
If you have done security passes in game bots, what would you check next?

Suggested tags:

Tags: `#buildinpublic #indiehackers #minecraft #ai #nodejs`

---

## Day 2: Gather Automation That Recovers

Building in public, Day 2: I made resource gathering feel much more human.

Today I shipped:

- Automatic tool crafting during gather tasks
- Crafting-table fallback: if none is nearby, place one from inventory and continue
- Structure-aware gather filtering to avoid likely player builds
- Gather flow updates so tasks do not dead-end on missing prerequisites

Before:
Gather jobs could stall when the required tool was missing.

After:
The bot now tries to resolve missing dependencies and keep moving.

Hard part:
Balancing autonomy without making behavior chaotic.

Tomorrow:
I am tightening docs and changelog coverage so users and contributors can track behavior changes clearly.

Feedback ask:
What gather edge case should I test next?

Suggested tags:

Tags: `#buildinpublic #gamedev #minecraftai #automation #opensource`

---

## Day 3: Docs, Branding, and Release Polish

Building in public, Day 3: docs cleanup and release polish.

Today I shipped:

- Changelog and guides updated to match runtime behavior
- Branding normalization across documentation
- Lowercase executable/package identifiers preserved where required (`cobblewright.exe`, package name)
- Markdown lint cleanup in key docs

What I learned:
Shipping features is quick. Keeping docs truthful is the real discipline.

Current status:
The project now feels like a real beta: safer, more autonomous, and easier to onboard.

Next step:
I want lightweight telemetry for task outcomes so each release includes reliability numbers, not just feature notes.

Feedback ask:
What should I prioritize next: smarter planning or better multiplayer coordination?

Suggested tags:

Tags: `#buildinpublic #devlog #docs #minecraft #aiagent`

---

## Optional Platform Variants

### X (short form)

- Keep each day under 1,000 characters.
- Lead with one hook sentence and 3 bullet wins.
- End with one question to drive replies.

### LinkedIn (long form)

- Add one short paragraph on motivation.
- Add one measurable outcome per day.
- Keep the CTA focused on one question.

### Weekly recap

- Combine all 3 days into one post with sections: Wins, Problems, Lessons, Next week.
