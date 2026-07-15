/**
 * @file This plugin gives the bot basic survival instincts.
 * It allows the bot to flee to a home position when health is low or enemies are near.
 */

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalNear, GoalFollow } = require('mineflayer-pathfinder').goals;

module.exports = (bot, sharedState) => {
  // Ensure pathfinder is loaded
  bot.loadPlugin(pathfinder);

  let lastCommandUser = null;
  let homePosition = null;
  let isHunkeredDown = false; // New state to indicate the bot is safely at home.
  let lastNoHomeWarningAt = 0;

  const HEALTH_FLEE_THRESHOLD = 8; // Flee if health is below this
  const HOME_AREA_RADIUS = 16; // Don't gather resources within this radius of home.
  const HUNGER_EAT_THRESHOLD = 14; // Eat if hunger is below this
  const MOB_FLEE_DISTANCE = 5; // Flee if a hostile mob is this close
  const FOLLOW_DISTANCE = 2; // Keep close to the active player while idle.
  const FLEE_RETRY_COOLDOWN_MS = 15000;
  const NIGHTFALL_START = 12000;
  const NIGHTFALL_TRIGGER = 13000;
  const NO_HOME_WARNING_COOLDOWN_MS = 30000;
  let lastFleeAttemptAt = 0;
  let nightfallHandledForCycle = false;
  let autoNightPatrolMode = false;
  let nightPatrolTarget = null;
  let nightExplorationSpots = 0;
  const nightMobsSeen = new Set();

  const getTimeOfDay = () => {
    const timeOfDay = bot.time?.timeOfDay ?? bot.time?.dayTime ?? bot.time?.time;
    if (typeof timeOfDay !== 'number') return null;
    return ((timeOfDay % 24000) + 24000) % 24000;
  };

  const isNightApproaching = () => {
    const timeOfDay = getTimeOfDay();
    return timeOfDay !== null && timeOfDay >= NIGHTFALL_START && timeOfDay < NIGHTFALL_TRIGGER;
  };

  const isDaylight = () => {
    const timeOfDay = getTimeOfDay();
    return timeOfDay !== null && timeOfDay < NIGHTFALL_START;
  };

  const getFollowTarget = () => {
    if (lastCommandUser && bot.players[lastCommandUser]?.entity) {
      return bot.players[lastCommandUser];
    }

    const onlinePlayers = Object.values(bot.players).filter(p => p.username !== bot.username && p.entity);
    if (onlinePlayers.length > 0) {
      return onlinePlayers[0];
    }

    return null;
  };

  const isHostile = (entity) => {
    // A more comprehensive list of common overworld hostile mobs
    const hostileMabNames = [
      'zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch',
      'drowned', 'husk', 'stray', 'phantom', 'zombie_villager', 'slime',
      'magma_cube'
    ];
    if (!entity) return false;
    return entity.type === 'hostile' || hostileMabNames.includes(entity.name);
  };

  const warnNoHome = () => {
    const now = Date.now();
    if (now - lastNoHomeWarningAt < NO_HOME_WARNING_COOLDOWN_MS) return false;
    lastNoHomeWarningAt = now;
    sharedState.say("I'm in danger but I don't have a home to run to! Set one with /sethome.");
    return true;
  };

  const getRandomNightPatrolTarget = () => {
    const base = bot.entity.position.floored();
    const distance = 8 + Math.floor(Math.random() * 9);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.round(base.x + Math.cos(angle) * distance);
    const z = Math.round(base.z + Math.sin(angle) * distance);
    return base.offset(x - base.x, 0, z - base.z);
  };

  const reportMorningExploration = () => {
    const mobSummary = nightMobsSeen.size > 0 ? Array.from(nightMobsSeen).join(', ') : 'no hostiles';
    sharedState.say(`Morning report: I patrolled ${nightExplorationSpots} spots overnight and saw ${mobSummary}.`);
  };

  const stopNightPatrolMode = () => {
    if (!autoNightPatrolMode) return;
    bot.pathfinder.stop();
    autoNightPatrolMode = false;
    nightPatrolTarget = null;
    reportMorningExploration();
    nightExplorationSpots = 0;
    nightMobsSeen.clear();
  };

  const startNightPatrolMode = () => {
    if (autoNightPatrolMode || sharedState.isBusy || sharedState.isFleeing || isHunkeredDown) return false;
    autoNightPatrolMode = true;
    nightExplorationSpots = 0;
    nightMobsSeen.clear();
    sharedState.say('Night is here. I am going patrol mode and exploring the area until morning.');
    return true;
  };

  const patrolNight = () => {
    if (!autoNightPatrolMode || sharedState.isBusy || sharedState.isFleeing) return;

    const nearestHostile = bot.nearestEntity(entity => isHostile(entity) && entity.position.distanceTo(bot.entity.position) < 32);
    if (nearestHostile) {
      nightMobsSeen.add(nearestHostile.name);
    }

    const needsNewTarget = !nightPatrolTarget || bot.entity.position.distanceTo(nightPatrolTarget) < 2;
    if (!needsNewTarget) return;

    nightPatrolTarget = getRandomNightPatrolTarget();
    nightExplorationSpots += 1;
    sharedState.applySafeMovements();
    const goal = new GoalNear(nightPatrolTarget.x, nightPatrolTarget.y, nightPatrolTarget.z, 1);
    bot.pathfinder.setGoal(goal, true);
  };

  /**
   * @description Checks hunger and eats food if necessary.
   */
  async function manageHunger() {
    if (bot.food > HUNGER_EAT_THRESHOLD) return;

    const food = bot.inventory.items().find(item => item.foodPoints > 0);
    if (!food) return; // No food to eat

    try {
      sharedState.say("I'm feeling a bit peckish... time for a snack.");
      await bot.equip(food, 'hand');
      await bot.consume();
      // After eating, re-equip the previous item if necessary, or just empty hand.
      await bot.unequip('hand');
    } catch (e) {
      console.warn('[Survival] Failed to eat:', e.message);
    }
  }

  /**
   * The core flee logic. Cancels current tasks and runs home.
   */
  async function fleeToSafety() {
    if (sharedState.isFleeing || isHunkeredDown) return; // Already fleeing or safe at home.
    if (Date.now() - lastFleeAttemptAt < FLEE_RETRY_COOLDOWN_MS) return;
    if (!homePosition) {
      warnNoHome();
      return;
    }

    lastFleeAttemptAt = Date.now();
    sharedState.isFleeing = true;
    bot.pathfinder.stop();
    bot.stopDigging();
    bot.clearControlStates();

    sharedState.say('I need to get to safety!');

    // Equip a sword or shield for defense while running
    const defensiveItem = bot.inventory.items().find(item => item.name.includes('sword') || item.name.includes('shield'));
    if (defensiveItem) {
      await bot.equip(defensiveItem, 'hand');
    }

    // Use the safe, non-destructive movement profile for fleeing.
    sharedState.applySafeMovements();

    const goal = new GoalNear(homePosition.x, homePosition.y, homePosition.z, 1);
    let reachedHome = false;
    try {
      await bot.pathfinder.goto(goal);
      sharedState.say("Phew, I made it home. I'll wait here until it's safe.");
      isHunkeredDown = true; // We've arrived, now we're hunkered down.
      reachedHome = true;
    } catch (err) {
      console.error("Fleeing failed:", err);
      sharedState.say("I tried to run home but I got stuck!");
    } finally {
      if (reachedHome) {
        // Instead of a blind timeout, wait until the coast is clear.
        const safetyCheckInterval = setInterval(() => {
          const isAtHome = homePosition && bot.entity.position.distanceTo(homePosition) < 2;
          const hostileNearby = bot.nearestEntity(entity => isHostile(entity) && entity.position.distanceTo(bot.entity.position) < MOB_FLEE_DISTANCE + 2);

          if (isAtHome && !hostileNearby) {
            clearInterval(safetyCheckInterval);
            sharedState.isFleeing = false;
            isHunkeredDown = false; // It's clear, we can leave our safe state.
            bot.unequip('hand'); // Unequip defensive item
            console.log('[Survival] Fleeing state reset. Area is clear.');
            sharedState.say("Okay, I think it's safe now.");
          }
        }, 2000);

        // Failsafe: if still fleeing after 30 seconds, reset anyway to prevent getting stuck.
        setTimeout(() => {
          if (!sharedState.isFleeing) return;
          clearInterval(safetyCheckInterval);
          isHunkeredDown = false;
          sharedState.isFleeing = false;
          console.warn('[Survival] Fleeing state reset via failsafe timeout.');
        }, 30000);
      } else {
        // If we failed to reach home, back off briefly before trying again.
        setTimeout(() => {
          sharedState.isFleeing = false;
          isHunkeredDown = false;
          console.warn('[Survival] Flee attempt failed; cooling down before retrying.');
        }, FLEE_RETRY_COOLDOWN_MS);
      }
    }
  }

  async function retreatForNight() {
    if (sharedState.isFleeing || isHunkeredDown || sharedState.isBusy) return;
    if (startNightPatrolMode()) {
      nightfallHandledForCycle = true;
    }
  }

  setInterval(() => {
    if (isDaylight()) {
      nightfallHandledForCycle = false;
      stopNightPatrolMode();
      if (isHunkeredDown && !sharedState.isFleeing && !sharedState.isBusy) {
        isHunkeredDown = false;
        sharedState.say('Morning is here. I am ready to follow again.');
      }
    }

    if (sharedState.isFleeing || isHunkeredDown || sharedState.isBusy) return;

    if (autoNightPatrolMode) {
      patrolNight();
      return;
    }

    if (isNightApproaching() && !nightfallHandledForCycle) {
      retreatForNight();
      return;
    }

    const nearestHostile = bot.nearestEntity(entity => isHostile(entity) && entity.position.distanceTo(bot.entity.position) < MOB_FLEE_DISTANCE);

    if (nearestHostile) {
      console.log(`[Survival] Hostile mob ${nearestHostile.name} is too close, fleeing to safety.`);
      fleeToSafety();
      return; // Don't do other checks if we're fleeing
    }

    if (bot.health < HEALTH_FLEE_THRESHOLD) {
      console.log(`[Survival] Health is low (${bot.health}), fleeing to safety.`);
      fleeToSafety();
      return;
    }
    manageHunger();

    // Default idle behavior: stay close to the active player.
    const player = getFollowTarget();
    sharedState.applySafeMovements(); // Use our safe, non-destructive movements
    if (player && player.entity) {
      const currentGoal = bot.pathfinder.goal;
      const shouldRefreshGoal = !currentGoal ||
        !(currentGoal instanceof GoalFollow) ||
        bot.entity.position.distanceTo(player.entity.position) > FOLLOW_DISTANCE + 0.5;

      if (shouldRefreshGoal) {
        const goal = new GoalFollow(player.entity, FOLLOW_DISTANCE);
        bot.pathfinder.setGoal(goal, true); // 'true' to keep following as player moves
      }
    }
  }, 2000); // Check every 2 seconds

  // Treat normal player chat as activity so the bot knows who to stick with.
  bot.on('chat', (username) => {
    if (username === bot.username) return;
    lastCommandUser = username;
  });

  // Register the /sethome command
  if (sharedState.registerCommand) {
    // --- Survival Commands ---
    sharedState.registerCommand('sethome', (username, args) => {
      const player = bot.players[username];
      if (!player || !player.entity) {
        sharedState.say("I can't see you to set a home position.");
        return;
      }
      homePosition = player.entity.position.floored();
      sharedState.say(`Home sweet home! My safe spot is now set to ${homePosition}.`);
    });

    // --- Expose home position to other plugins ---
    sharedState.getHomePosition = () => homePosition;
    sharedState.getHomeRadius = () => HOME_AREA_RADIUS;


    // --- Override shared state functions to track the user ---
    const originalRegisterCommand = sharedState.registerCommand;
    sharedState.registerCommand = (name, handler, aliases) => {
      const newHandler = (username, args) => {
        lastCommandUser = username; // Track the user
        handler(username, args);
      };
      originalRegisterCommand(name, newHandler, aliases);
    };
  }
};