/**
 * @file This plugin gives the bot basic survival instincts and night patrol logic.
 * It allows the bot to flee to a home position when health is low or enemies are near.
 * It also handles the "ghost mode" patrol at night.
 */

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalNear, GoalFollow } = require('mineflayer-pathfinder').goals;

/**
 * Survival Plugin
 *
 * Implements behaviors for self-preservation and situational awareness,
 * including fleeing from threats and patrolling at night.
 *
 * @param {import('mineflayer').Bot} bot - The mineflayer bot instance.
 * @param {object} sharedState - The shared state object for inter-plugin communication.
 */
module.exports = (bot, sharedState) => {
  bot.loadPlugin(pathfinder);
  const ghostModeEnabled = sharedState?.CONFIG?.GHOST_MODE_AT_NIGHT !== false;
  const ghostModeName = sharedState?.CONFIG?.BOT_NAME || bot.username;
  const geoDropMode = String(sharedState?.CONFIG?.GEO_DROP_MODE || 'nearest_player').toLowerCase();
  const configuredHomeRadius = Number.parseInt(sharedState?.CONFIG?.HOME_RADIUS, 10);
  const homeRadius = Number.isInteger(configuredHomeRadius) && configuredHomeRadius > 0
    ? configuredHomeRadius
    : 16;
  const configuredGeoDropRadius = Number.parseInt(sharedState?.CONFIG?.GEO_DROP_RADIUS, 10);
  const geoDropRadius = Number.isInteger(configuredGeoDropRadius) && configuredGeoDropRadius > 0
    ? configuredGeoDropRadius
    : 3;

  let isHunkeredDown = false;
  let isFleeing = false;
  let ghostModeActive = false;
  let hasAppliedGeoDrop = false;
  let lastFleeAttemptAt = 0;
  const nightMobsSeen = new Set();
  const nightBiomesSeen = new Set();
  const nightStructuresFound = new Set();
  const placedTorchLocations = [];
  const TORCH_SPACING_RADIUS = 12; // Don't place torches within 12 blocks of each other.
  const MAX_TORCH_MEMORY = 50; // Remember the last 50 torches.
  const TORCH_RESOURCE_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
  let nightExplorationSpots = 0;
  let deferTorchCraftUntil = 0;

  const HEALTH_FLEE_THRESHOLD = 8;
  const MOB_FLEE_DISTANCE = 5;
  const FLEE_RETRY_COOLDOWN_MS = 15000;
  const NIGHT_START = 13000;
  const DAY_START = 23500;
  const PATROL_RADIUS = 40;

  const resolvePatrolGroundY = (x, z, fallbackY) => {
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const safeFallback = Number.isFinite(fallbackY) ? Math.floor(fallbackY) : Math.floor(bot.entity.position.y);

    if (bot.world && typeof bot.world.getHighestBlockYAt === 'function') {
      const y = bot.world.getHighestBlockYAt(blockX, blockZ);
      if (Number.isFinite(y)) return Math.floor(y);
    }

    const scanTop = Math.max(safeFallback + 24, 96);
    const scanBottom = -64;
    const probePos = bot.entity.position.floored();
    probePos.x = blockX;
    probePos.z = blockZ;

    for (let y = scanTop; y >= scanBottom; y--) {
      probePos.y = y;
      const block = bot.blockAt(probePos);
      if (!block || block.boundingBox !== 'block') continue;

      const above = bot.blockAt(probePos.offset(0, 1, 0));
      if (!above || above.boundingBox === 'empty') {
        return y + 1;
      }
    }

    return safeFallback;
  };

  const isHostile = (entity) => {
    const hostileMobNames = [
      'zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch',
      'drowned', 'husk', 'stray', 'phantom', 'zombie_villager', 'slime',
      'magma_cube'
    ];
    if (!entity) return false;
    return entity.type === 'hostile' || hostileMobNames.includes(entity.name);
  };

  const getNearestPlayerEntity = () => {
    const playerEntities = Object.values(bot.players || {})
      .map((player) => player?.entity)
      .filter((entity) => entity && entity.username !== bot.username && entity.position);

    if (playerEntities.length === 0) return null;

    return playerEntities.reduce((closest, current) => {
      if (!closest) return current;
      return current.position.distanceTo(bot.entity.position) < closest.position.distanceTo(bot.entity.position)
        ? current
        : closest;
    }, null);
  };

  const applyGeoDropAnchor = async () => {
    if (hasAppliedGeoDrop || geoDropMode !== 'nearest_player' || !bot.entity?.position) return;

    const nearestPlayer = getNearestPlayerEntity();
    if (!nearestPlayer) return;

    const anchor = nearestPlayer.position.floored();
    sharedState.homePosition = anchor.clone ? anchor.clone() : anchor;
    sharedState.homeRadius = homeRadius;
    hasAppliedGeoDrop = true;

    console.log(`[Survival] Geo-drop anchor set near ${nearestPlayer.username || nearestPlayer.name} at ${anchor.x}, ${anchor.y}, ${anchor.z}.`);

    sharedState.applySafeMovements();
    bot.pathfinder.setGoal(new GoalNear(anchor.x, anchor.y, anchor.z, geoDropRadius));
  };

  const setGhostMode = (enabled) => {
    if (!ghostModeEnabled || ghostModeActive === enabled) return;

    ghostModeActive = enabled;
    if (enabled) {
      bot.chat(`/gamemode creative ${ghostModeName}`);
      bot.chat(`/effect give ${ghostModeName} invisibility 999999 0 true`);
      bot.chat(`/effect give ${ghostModeName} resistance 999999 255 true`);
      console.log('[Survival] Night ghost mode enabled.');
      return;
    }

    bot.chat(`/effect clear ${ghostModeName} invisibility`);
    bot.chat(`/effect clear ${ghostModeName} resistance`);
    bot.chat(`/gamemode survival ${ghostModeName}`);
    console.log('[Survival] Night ghost mode disabled.');
  };

  /**
   * The main flee behavior.
   * @param {import('prismarine-entity').Entity} threat - The entity to flee from.
   */
  async function flee(threat) {
    if (isFleeing || isHunkeredDown) return;
    if (Date.now() - lastFleeAttemptAt < FLEE_RETRY_COOLDOWN_MS) return;
    if (!sharedState.homePosition) {
      sharedState.say("I'm in danger but I don't have a home to run to! Set one with /sethome.");
      return;
    }

    lastFleeAttemptAt = Date.now();
    isFleeing = true;
    bot.pathfinder.stop();

    console.log(`[Survival] Fleeing from ${threat.name}!`);
    sharedState.say('I need to get to safety!');

    sharedState.applySafeMovements();
    const goal = new GoalNear(sharedState.homePosition.x, sharedState.homePosition.y, sharedState.homePosition.z, 1);

    let reachedHome = false;
    try {
      await bot.pathfinder.goto(goal);
      sharedState.say("Phew, I made it home. I'll wait here until it's safe.");
      isHunkeredDown = true;
      reachedHome = true;
    } catch (err) {
      console.error("Fleeing failed:", err);
      sharedState.say("I tried to run home but I got stuck!");
    } finally {
      if (reachedHome) {
        // Instead of a blind timeout, wait until the coast is clear.
        const safetyCheckInterval = setInterval(() => {
          const hostileNearby = bot.nearestEntity(entity => isHostile(entity) && entity.position.distanceTo(bot.entity.position) < MOB_FLEE_DISTANCE + 2);

          if (!hostileNearby) {
            clearInterval(safetyCheckInterval);
            isFleeing = false;
            isHunkeredDown = false;
            console.log('[Survival] Fleeing state reset. Area is clear.');
            sharedState.say("Okay, I think it's safe now.");
          }
        }, 2000);
      } else {
        // If we failed to reach home, back off briefly before trying again.
        setTimeout(() => {
          isFleeing = false;
          isHunkeredDown = false;
          console.warn('[Survival] Flee attempt failed; cooling down before retrying.');
        }, FLEE_RETRY_COOLDOWN_MS);
      }
    }
  }


  function startPatrol() {
    if (sharedState.isBusy) return;
    sharedState.botMode = 'patrolling';
    setGhostMode(true);
    nightExplorationSpots = 0;
    nightMobsSeen.clear();
    nightBiomesSeen.clear();
    nightStructuresFound.clear();
    sharedState.say("The sun sets. Time to begin my nightly patrol.");
  }

  function stopPatrol() {
    bot.pathfinder.stop();
    sharedState.botMode = 'idle';
    setGhostMode(false);
    
    let report = `Morning report: I patrolled ${nightExplorationSpots} spots.`;
    if (nightBiomesSeen.size > 0) {
      report += ` I passed through the following biomes: ${Array.from(nightBiomesSeen).join(', ')}.`;
    }
    if (nightStructuresFound.size > 0) {
      const structureReport = Array.from(nightStructuresFound).map(name => {
        const pos = sharedState.pointsOfInterest.get(name);
        return `${name} at [x: ${pos.x}, z: ${pos.z}]`;
      }).join('; ');
      report += ` I noted these points of interest: ${structureReport}.`;
    }
    if (nightMobsSeen.size > 0) {
      report += ` I also spotted ${Array.from(nightMobsSeen).join(', ')}.`;
    }
    sharedState.say(report);
  }

  async function patrol() {
    if (sharedState.botMode !== 'patrolling' || sharedState.isBusy) return;

    const nearestHostile = bot.nearestEntity(entity => isHostile(entity) && entity.position.distanceTo(bot.entity.position) < 32);
    if (nearestHostile) {
      nightMobsSeen.add(nearestHostile.name);
    }

    // Log the current biome
    const currentBlock = bot.blockAt(bot.entity.position);
    if (currentBlock && currentBlock.biome) {
      const biomeName = currentBlock.biome.name.replace('minecraft:', '');
      nightBiomesSeen.add(biomeName);
    }

    // Simple structure detection
    const nearbyVillager = bot.nearestEntity(e => e.name === 'villager' && e.position.distanceTo(bot.entity.position) < 32);
    if (nearbyVillager && sharedState.pointsOfInterest) {
      const villagePos = nearbyVillager.position.floored();
      const poiName = `Village near [${villagePos.x}, ${villagePos.z}]`;

      // Check if a similar POI already exists to avoid duplicates
      let exists = false;
      for (const [name, pos] of sharedState.pointsOfInterest.entries()) {
        if (name.startsWith('Village') && pos.distanceTo(villagePos) < 100) { // 100 blocks radius for same village
          exists = true;
          break;
        }
      }

      if (!exists) {
        sharedState.pointsOfInterest.set(poiName, villagePos);
        nightStructuresFound.add(poiName); // Keep this for the morning report
      }
    }

    const isIdle = !bot.pathfinder.isMoving();
    if (!isIdle) return;

    await placeTorchIfNeeded();


    const homePos = sharedState.homePosition || bot.entity.position;
    const x = homePos.x + (Math.random() - 0.5) * PATROL_RADIUS * 2;
    const z = homePos.z + (Math.random() - 0.5) * PATROL_RADIUS * 2;
    const groundY = resolvePatrolGroundY(x, z, homePos.y);

    nightExplorationSpots++;
    console.log(`[Patrol] Exploring new point near ${Math.floor(x)}, ${Math.floor(z)}`);
    sharedState.applySafeMovements();
    bot.pathfinder.setGoal(new GoalNear(x, groundY, z, 1));
  }

  async function placeTorchIfNeeded() {
    const torch = bot.inventory.findInventoryItem('torch');
    if (!torch) {
      if (Date.now() < deferTorchCraftUntil) {
        return;
      }

      // No torches, let's try to make some.
      await sharedState.runBusyTask(craftMoreTorches);
      return;
    }

    const pos = bot.entity.position;
    const blockAtFeet = bot.blockAt(pos);
    const blockUnderFeet = bot.blockAt(pos.offset(0, -1, 0));

    // Check if it's dark enough to need a torch.
    if (!blockAtFeet || blockAtFeet.light >= 8) return;

    // Check if we already placed a torch nearby.
    const isTorchNearby = placedTorchLocations.some(
      torchPos => torchPos.distanceTo(pos) < TORCH_SPACING_RADIUS
    );
    if (isTorchNearby) {
      console.log('[Patrol] A torch is already nearby, skipping placement.');
      return;
    }

    // Check if we can place a torch on the block we're standing on.
    if (blockUnderFeet && blockUnderFeet.boundingBox === 'block') {
      try {
        await bot.equip(torch, 'hand');
        await bot.placeBlock(blockUnderFeet, { x: 0, y: 1, z: 0 }); // Place on top of the block.
        console.log('[Patrol] Placed a torch to light up the area.');
        placedTorchLocations.push(pos.clone());
        // Keep the memory from growing too large.
        if (placedTorchLocations.length > MAX_TORCH_MEMORY) {
          placedTorchLocations.shift();
        }
      } catch (err) {
        // This can fail if the spot is invalid; we can ignore it.
        console.warn(`[Patrol] Failed to place torch: ${err.message}`);
      } finally {
        await bot.unequip('hand');
      }
    }
  }

  async function craftMoreTorches() {
    console.log('[Patrol] Out of torches. Checking materials to craft more.');

    // The new gather.js plugin handles tool crafting and resource gathering.
    // We just need to ensure we have the base materials for torches: coal and wood.
    if (typeof sharedState.gatherItem !== 'function') {
      sharedState.say("I'm out of torches, but my gathering module isn't active.");
      return;
    }

    // 1. Ensure we have coal.
    const coal = bot.inventory.findInventoryItem('coal') || bot.inventory.findInventoryItem('charcoal');
    if (!coal) {
      sharedState.say("I'm out of torches and coal. I'll try to find some.");
      const gotCoal = await sharedState.gatherItem('coal_ore', 8);
      if (!gotCoal) {
        sharedState.say("I couldn't find any coal, so I can't make torches right now.");
        sharedState.say("I'll keep roaming for now and try again later.");
        deferTorchCraftUntil = Date.now() + TORCH_RESOURCE_RETRY_COOLDOWN_MS;
        return;
      }

      deferTorchCraftUntil = 0;
    }

    // 2. Now that we have materials, try to craft torches.
    try {
      const crafted = await sharedState.craftItem('torch', 4); // Craft a batch of 16 torches.
      if (crafted) {
        deferTorchCraftUntil = 0;
        sharedState.say("I have what I need. Crafting more torches now.");
        sharedState.say("Alright, torches are ready. Resuming my patrol and lighting the way.");
      } else {
        // This implies we're missing sticks/wood.
        sharedState.say("I'm missing wood for sticks. Let me gather some logs.");
        const gotLogs = await sharedState.gatherItem('oak_log', 2);
        if (gotLogs) {
          await craftMoreTorches(); // Retry crafting now that we have logs.
        } else {
          deferTorchCraftUntil = Date.now() + TORCH_RESOURCE_RETRY_COOLDOWN_MS;
        }
      }
    } catch (err) {
      console.error('[Patrol] Failed during torch crafting:', err);
      sharedState.say("Something went wrong while I was trying to craft torches.");
      deferTorchCraftUntil = Date.now() + TORCH_RESOURCE_RETRY_COOLDOWN_MS;
    }
  }

  // Listen for when the bot gets hurt.
  bot.on('health', () => {
    if (bot.health < HEALTH_FLEE_THRESHOLD) {
      const threat = bot.nearestEntity(e => isHostile(e));
      if (threat) {
        if (sharedState.botMode === 'patrolling' && ghostModeActive) {
          console.warn('[Survival] Took damage during ghost mode; falling back to flee behavior.');
        }
        console.log(`[Survival] Health is low (${bot.health}), fleeing from ${threat.name}.`);
        flee(threat);
      }
    }
  });

  bot.once('spawn', () => {
    sharedState.homeRadius = homeRadius;

    const attemptAnchor = async (remainingAttempts = 5) => {
      try {
        await applyGeoDropAnchor();
        if (hasAppliedGeoDrop || remainingAttempts <= 1) return;
      } catch (error) {
        console.warn('[Survival] Failed to apply geo-drop anchor:', error.message);
        if (remainingAttempts <= 1) return;
      }

      setTimeout(() => {
        attemptAnchor(remainingAttempts - 1);
      }, 2000);
    };

    attemptAnchor();
  });

  // Main time and behavior loop
  setInterval(async () => {
    try {
      const timeOfDay = bot.time.timeOfDay;
      const isCurrentlyNight = timeOfDay >= NIGHT_START && timeOfDay < DAY_START;

      // Handle transitions between day and night
      if (isCurrentlyNight && sharedState.botMode !== 'patrolling') {
        startPatrol();
      } else if (!isCurrentlyNight && sharedState.botMode === 'patrolling') {
        stopPatrol();
      }

      // If we are busy or fleeing, don't do other checks.
      if (sharedState.isBusy || isFleeing || isHunkeredDown) return;

      // If it's night, our only job is to patrol.
      if (sharedState.botMode === 'patrolling') {
        await patrol();
        return;
      }

      // During the day, check for immediate threats.
      const nearbyHostile = bot.nearestEntity(entity => isHostile(entity) && entity.position.distanceTo(bot.entity.position) < MOB_FLEE_DISTANCE);
      if (nearbyHostile) {
        console.log(`[Survival] Hostile mob ${nearbyHostile.name} is too close, fleeing.`);
        flee(nearbyHostile);
      }
    } catch (error) {
      console.error('[Survival] Patrol loop error:', error);
    }
  }, 2000); // Check every 2 seconds.

  // Expose home position getters for other plugins
  sharedState.getHomePosition = () => sharedState.homePosition;
  sharedState.getHomeRadius = () => sharedState.homeRadius || homeRadius;
};