/**
 * @file This plugin gives the bot basic survival instincts.
 * It allows the bot to flee to a home position when health is low or enemies are near.
 */

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalNear } = require('mineflayer-pathfinder').goals;

module.exports = (bot, sharedState) => {
  // Ensure pathfinder is loaded
  bot.loadPlugin(pathfinder);

  let homePosition = null;

  const DANGER_THRESHOLD = 8; // Flee if health is below this
  const MOB_FLEE_DISTANCE = 5; // Flee if a hostile mob is this close

  const isHostile = (entity) => {
    const hostileMabNames = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'drowned', 'husk', 'stray'];
    return entity.type === 'hostile' || hostileMabNames.includes(entity.name);
  };

  /**
   * The core flee logic. Cancels current tasks and runs home.
   */
  async function fleeToSafety() {
    if (sharedState.isFleeing) return; // Already fleeing
    if (!homePosition) {
      sharedState.say("I'm in danger but I don't have a home to run to! Set one with /sethome.");
      return;
    }

    sharedState.isFleeing = true;
    bot.pathfinder.stop();
    bot.stopDigging();
    bot.clearControlStates();

    sharedState.say('I need to get to safety!');

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    const goal = new GoalNear(homePosition.x, homePosition.y, homePosition.z, 1);
    try {
      await bot.pathfinder.goto(goal);
      sharedState.say("Phew, I made it home. I'll wait here until it's safe.");
    } catch (err) {
      console.error("Fleeing failed:", err);
      sharedState.say("I tried to run home but I got stuck!");
    } finally {
      // After a delay, assume it's safe and allow new tasks.
      setTimeout(() => {
        sharedState.isFleeing = false;
        console.log('[Survival] Fleeing state reset. Ready for new tasks.');
      }, 10000); // Wait 10 seconds before being available again
    }
  }

  // Monitor health
  bot.on('health', () => {
    if (bot.health < DANGER_THRESHOLD) {
      console.log(`[Survival] Health is low (${bot.health}), fleeing to safety.`);
      fleeToSafety();
    }
  });

  // Periodically check for nearby mobs
  setInterval(() => {
    if (sharedState.isFleeing) return;

    const nearestHostile = bot.nearestEntity(entity => isHostile(entity) && entity.position.distanceTo(bot.entity.position) < MOB_FLEE_DISTANCE);

    if (nearestHostile) {
      console.log(`[Survival] Hostile mob ${nearestHostile.name} is too close, fleeing to safety.`);
      fleeToSafety();
    }
  }, 2000); // Check every 2 seconds

  // Register the /sethome command
  if (sharedState.registerCommand) {
    sharedState.registerCommand('sethome', (username, args) => {
      const player = bot.players[username];
      if (!player || !player.entity) {
        sharedState.say("I can't see you to set a home position.");
        return;
      }
      homePosition = player.entity.position.floored();
      sharedState.say(`Home sweet home! My safe spot is now set to ${homePosition}.`);
    });
  }
};