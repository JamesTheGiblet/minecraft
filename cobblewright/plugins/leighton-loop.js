/**
 * @file This plugin contains the "Leighton Weight" self-correction loop.
 * Its purpose is to analyze the outcome of advice to make future suggestions better.
 */

module.exports = (bot, sharedState) => {
  // A more robust mapping from advice keywords to inventory summary keys.
  const materialToInvKey = {
    'log': 'woodLogs',
    'plank': 'planks',
    'stone': 'stone',
    'cobblestone': 'stone',
    'iron': 'iron_ore',
    'coal': 'coal',
    'furnace': 'has_furnace',
    'crafting_table': 'has_crafting_table'
  };

  const critiqueLoop = () => {
    const unreviewedAdvice = sharedState.memoryLog.filter(entry => entry.type === 'advice' && entry.outcome === 'unknown');
    if (unreviewedAdvice.length === 0) return;

    console.log(`[Leighton Weight] Running critique loop on ${unreviewedAdvice.length} unreviewed capsule(s)...`);

    unreviewedAdvice.forEach(capsule => {
      const username = capsule.context.username;
      const playerState = sharedState.playerStates.get(username);

      // 1. Check for player inactivity first. If the player is AFK, we can't make a judgment.
      if (playerState && (Date.now() - playerState.lastActivityTime) > playerState.inactivityThreshold) {
        console.log(`[Critique] Skipping critique for AFK player: ${username}`);
        return; // Skip this capsule for now.
      }

      const timeSinceAdvice = Date.now() - capsule.timestamp;
      const CRITIQUE_DELAY_MS = 60000; // Wait 60 seconds before judging.

      if (timeSinceAdvice > CRITIQUE_DELAY_MS) {
        const previousInv = capsule.context.inventory;
        const currentInv = sharedState.getInventorySummary(username);

        let adviceFollowed = false;

        // 2. Implement more nuanced, targeted material analysis.
        if (capsule.context.mentionedMaterials && capsule.context.mentionedMaterials.length > 0) {
          for (const material of capsule.context.mentionedMaterials) {
            const invKey = materialToInvKey[material];
            if (invKey) {
              // Check for both consumption (e.g., used logs) and creation (e.g., made a furnace).
              const previousValue = previousInv[invKey];
              const currentValue = currentInv[invKey];

              // If a boolean flag (like has_furnace) turned from false to true, the advice was followed.
              if (typeof previousValue === 'boolean' && previousValue === false && currentValue === true) {
                adviceFollowed = true;
                break; // Found a clear success, no need to check further.
              }
              // If a resource count decreased, the advice was likely followed.
              if (typeof previousValue === 'number' && currentValue < previousValue) {
                adviceFollowed = true;
                break;
              }
            }
          }
        } else {
          // 3. Keep the fallback for generic advice, but make it a simple resource check.
          adviceFollowed = currentInv.woodLogs < previousInv.woodLogs || currentInv.stone < previousInv.stone;
        }

        capsule.outcome = adviceFollowed ? 'likely_successful' : 'likely_ignored';
        console.log(`[Critique] Outcome for capsule ${capsule.id} set to: ${capsule.outcome}`);
        // Persist the updated outcome to the long-term memory.
        if (sharedState.updateMemory) sharedState.updateMemory(capsule);
      }
    });
  };

  bot.on('login', () => {
    // Run the critique loop slightly more often than advice is given to ensure timely review.
    setInterval(critiqueLoop, sharedState.CONFIG.ADVICE_INTERVAL_MS * 2);
  });
};