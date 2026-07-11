/**
 * @file This plugin contains the "Leighton Weight" self-correction loop.
 */

module.exports = (bot, sharedState) => {
  const critiqueLoop = () => {
    sharedState.playerStates.forEach((state, username) => {
      const playerInactive = (Date.now() - state.lastActivityTime) > state.inactivityThreshold;
      if (playerInactive) {
        return;
      }
    });

    const unreviewedAdvice = sharedState.memoryLog.filter(entry => entry.type === 'advice' && entry.outcome === 'unknown');
    if (unreviewedAdvice.length === 0) return;

    console.log(`[Leighton Weight] Running critique loop on ${unreviewedAdvice.length} unreviewed capsule(s)...`);

    unreviewedAdvice.forEach(capsule => {
      const timeSinceAdvice = Date.now() - capsule.timestamp;

      if (timeSinceAdvice > 60000) {
        const username = capsule.context.username;
        const previousInv = capsule.context.inventory;
        const currentInv = sharedState.getInventorySummary(username);

        let materialUsed = false;
        if (capsule.context.mentionedMaterials && capsule.context.mentionedMaterials.length > 0) {
          for (const material of capsule.context.mentionedMaterials) {
            if (material.includes('log') && currentInv.woodLogs < previousInv.woodLogs) materialUsed = true;
            if (material.includes('plank') && currentInv.planks < previousInv.planks) materialUsed = true;
            if (material.includes('stone') && currentInv.stone < previousInv.stone) materialUsed = true;
            if (material.includes('iron') && currentInv.iron_ore < previousInv.iron_ore) materialUsed = true;
          }
        } else {
          materialUsed = currentInv.woodLogs < previousInv.woodLogs || currentInv.stone < previousInv.stone;
        }

        capsule.outcome = materialUsed ? 'likely_successful' : 'likely_ignored';
        console.log(`[Critique] Outcome for capsule ${capsule.id} set to: ${capsule.outcome}`);
      }
    });
  };

  bot.on('login', () => {
    setInterval(critiqueLoop, sharedState.CONFIG.ADVICE_INTERVAL_MS * 2);
  });
};