/**
 * @file This plugin handles automated farming tasks.
 */

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalBlock } = require('mineflayer-pathfinder').goals;
const { Vec3 } = require('vec3');

module.exports = (bot, sharedState) => {
  bot.loadPlugin(pathfinder);

  const getMcData = () => require('minecraft-data')(bot.version);
  const farmRadius = Number.isInteger(sharedState.CONFIG.FARM_RADIUS)
    ? Math.max(4, sharedState.CONFIG.FARM_RADIUS)
    : 8;

  const FARM_SCAN_INTERVAL_MS = 60000;
  const FARM_COOLDOWN_MS = 10 * 60 * 1000;

  const cropDefinitions = {
    wheat: { item: 'wheat', seed: 'wheat_seeds', matureMeta: 7 },
    carrots: { item: 'carrot', seed: 'carrot', matureMeta: 7 },
    potatoes: { item: 'potato', seed: 'potato', matureMeta: 7 },
    beetroots: { item: 'beetroot', seed: 'beetroot_seeds', matureMeta: 3 }
  };

  const tillableBlocks = new Set(['dirt', 'grass_block']);
  const farmProduce = new Set(['wheat', 'carrot', 'potato', 'beetroot', 'wheat_seeds', 'beetroot_seeds']);
  const supportedHoeNames = new Set(['wooden_hoe', 'stone_hoe', 'iron_hoe', 'golden_hoe', 'diamond_hoe', 'netherite_hoe']);

  let farmEnabled = false;
  let farmCenter = null;
  let lastFarmCycleAt = 0;

  const getPlayerFarmCenter = (username) => {
    if (farmCenter) return farmCenter;

    const homePosition = sharedState.getHomePosition ? sharedState.getHomePosition() : null;
    if (homePosition) return homePosition.floored ? homePosition.floored() : homePosition;

    const player = username ? bot.players[username] : null;
    if (player?.entity?.position) {
      return player.entity.position.floored();
    }

    const activePlayer = Object.values(bot.players).find((entry) => entry.username !== bot.username && entry.entity);
    return activePlayer?.entity?.position?.floored?.() || null;
  };

  const findNearbyCraftingTable = (mcData) => bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 24
  });

  const ensureHoe = async () => {
    const existingHoe = bot.inventory.items().find((item) => supportedHoeNames.has(item.name));
    if (existingHoe) return existingHoe;
    
    const crafted = await sharedState.craftItem('wooden_hoe', 1);
    if (!crafted) return null;

    return bot.inventory.items().find((item) => supportedHoeNames.has(item.name)) || null;
  };

  const getCropDefinition = (blockName) => cropDefinitions[blockName] || null;

  const isMatureCrop = (block) => {
    const definition = getCropDefinition(block?.name);
    if (!definition) return false;
    const growth = Number.isInteger(block.metadata) ? block.metadata : 0;
    return growth >= definition.matureMeta;
  };

  const scanFarmArea = (center) => {
    const crops = [];
    const tillable = [];
    const plantable = [];

    for (let dx = -farmRadius; dx <= farmRadius; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -farmRadius; dz <= farmRadius; dz++) {
          const block = bot.blockAt(center.offset(dx, dy, dz));
          if (!block) continue;

          if (getCropDefinition(block.name)) {
            if (isMatureCrop(block)) {
              crops.push(block);
            }
            continue;
          }

          if (tillableBlocks.has(block.name)) {
            const above = bot.blockAt(block.position.offset(0, 1, 0));
            if (above && above.name === 'air') {
              tillable.push(block);
            }
            continue;
          }

          if (block.name === 'farmland') {
            const above = bot.blockAt(block.position.offset(0, 1, 0));
            if (above && above.name === 'air') {
              plantable.push(block);
            }
          }
        }
      }
    }

    crops.sort((a, b) => a.position.distanceTo(center) - b.position.distanceTo(center));
    tillable.sort((a, b) => a.position.distanceTo(center) - b.position.distanceTo(center));
    plantable.sort((a, b) => a.position.distanceTo(center) - b.position.distanceTo(center));

    return { crops, tillable, plantable };
  };

  const harvestCrop = async (block) => {
    try {
      await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z));
      await bot.dig(block);
      return true;
    } catch (error) {
      console.warn(`[Farm] Failed to harvest ${block.name}: ${error.message}`);
      return false;
    }
  };

  const plantCrop = async (farmlandBlock, cropName) => {
    const definition = getCropDefinition(cropName);
    if (!definition) return false;

    const seedItem = bot.inventory.items().find((item) => item.name === definition.seed || item.name === definition.item);
    if (!seedItem) return false;

    try {
      await bot.pathfinder.goto(new GoalBlock(farmlandBlock.position.x, farmlandBlock.position.y, farmlandBlock.position.z));
      await bot.equip(seedItem, 'hand');
      await bot.placeBlock(farmlandBlock, new Vec3(0, 1, 0));
      return true;
    } catch (error) {
      console.warn(`[Farm] Failed to plant ${cropName}: ${error.message}`);
      return false;
    }
  };

  const tillBlock = async (block) => {
    const hoe = await ensureHoe();
    if (!hoe) return false;

    try {
      await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z));
      await bot.equip(hoe, 'hand');
      await bot.activateBlock(block);
      return true;
    } catch (error) {
      console.warn(`[Farm] Failed to till ${block.name}: ${error.message}`);
      return false;
    }
  };

  const depositFarmProduce = async () => {
    const mcData = getMcData();
    const chestBlock = bot.findBlock({
      matching: mcData.blocksByName.chest.id,
      maxDistance: 32
    });

    if (!chestBlock) return false;

    const keepCounts = {
      wheat_seeds: 16,
      beetroot_seeds: 16,
      carrot: 16,
      potato: 16,
      wheat: 16,
      beetroot: 16
    };

    try {
      await bot.pathfinder.goto(new GoalBlock(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z));
      const chest = await bot.openChest(chestBlock);

      for (const item of bot.inventory.items()) {
        if (!farmProduce.has(item.name)) continue;
        const keepCount = keepCounts[item.name] || 0;
        const depositCount = Math.max(0, item.count - keepCount);
        if (depositCount > 0) {
          await chest.deposit(item.type, null, depositCount);
        }
      }

      await chest.close();
      return true;
    } catch (error) {
      console.warn('[Farm] Failed to deposit farm produce:', error.message);
      if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
      return false;
    }
  };

  const tendFarm = async (username, source = 'manual') => {
    if (sharedState.isBusy || sharedState.isFleeing) return false;

    const center = getPlayerFarmCenter(username);
    if (!center) {
      sharedState.say('I need a farm center first. Use `farm set` near your crops or home.');
      return false;
    }

    const summary = scanFarmArea(center);
    const actionCount = summary.crops.length + summary.tillable.length + summary.plantable.length;

    if (actionCount === 0) {
      if (source === 'manual') {
        sharedState.say('I did not find any crops or farmable ground nearby.');
      }
      return true;
    }

    sharedState.say(`I found ${summary.crops.length} mature crops, ${summary.tillable.length} spots to till, and ${summary.plantable.length} farm tiles to replant.`);

    return sharedState.runBusyTask(async () => {
      for (const crop of summary.crops) {
        if (sharedState.isCancelled) break;
        const definition = getCropDefinition(crop.name);
        if (!definition) continue;

        const harvested = await harvestCrop(crop);
        if (!harvested) continue;

        const farmlandBelow = bot.blockAt(crop.position.offset(0, -1, 0));
        if (farmlandBelow && farmlandBelow.name === 'farmland') {
          await plantCrop(farmlandBelow, crop.name);
        }
      }

      for (const block of summary.tillable) {
        if (sharedState.isCancelled) break;
        await tillBlock(block);
      }

      for (const block of summary.plantable) {
        if (sharedState.isCancelled) break;
        const cropName = bot.inventory.items().some((item) => item.name === 'wheat_seeds') ? 'wheat'
          : bot.inventory.items().some((item) => item.name === 'carrot') ? 'carrots'
          : bot.inventory.items().some((item) => item.name === 'potato') ? 'potatoes'
          : bot.inventory.items().some((item) => item.name === 'beetroot_seeds') ? 'beetroots'
          : null;

        if (!cropName) break;
        await plantCrop(block, cropName);
      }

      await depositFarmProduce();
      lastFarmCycleAt = Date.now();
      return true;
    });
  };

  const startAutoFarm = (username) => {
    const center = getPlayerFarmCenter(username);
    if (center) {
      farmCenter = center;
    }

    farmEnabled = true;
    sharedState.say('Farm automation enabled. I will tend crops when I have a safe moment.');
  };

  const stopAutoFarm = () => {
    farmEnabled = false;
    sharedState.say('Farm automation paused.');
  };

  const farmStatus = () => {
    const center = farmCenter || (sharedState.getHomePosition ? sharedState.getHomePosition() : null);
    const centerText = center ? `${center.x}, ${center.y}, ${center.z}` : 'unset';
    return `Farm automation is ${farmEnabled ? 'enabled' : 'disabled'}. Farm center: ${centerText}. Last cycle: ${lastFarmCycleAt ? new Date(lastFarmCycleAt).toLocaleTimeString() : 'never'}.`;
  };

  const maybeRunAutoFarm = () => {
    if (!farmEnabled || sharedState.isBusy || sharedState.isFleeing) return;
    if (Date.now() - lastFarmCycleAt < FARM_COOLDOWN_MS) return;

    const center = getPlayerFarmCenter();
    if (!center) return;

    tendFarm(null, 'auto').catch((error) => {
      console.error('[Farm] Auto farm cycle failed:', error);
    });
  };

  setInterval(maybeRunAutoFarm, FARM_SCAN_INTERVAL_MS);

  if (sharedState.registerCommand) {
    sharedState.registerCommand('farm', async (username, args) => {
      const sub = (args[1] || '').toLowerCase();

      if (!sub || sub === 'status') {
        sharedState.say(farmStatus());
        return;
      }

      if (sub === 'start' || sub === 'on') {
        startAutoFarm(username);
        return;
      }

      if (sub === 'stop' || sub === 'off') {
        stopAutoFarm();
        return;
      }

      if (sub === 'set') {
        const player = bot.players[username];
        if (player?.entity?.position) {
          farmCenter = player.entity.position.floored();
          farmEnabled = true;
          sharedState.say(`Farm center set at ${farmCenter.x}, ${farmCenter.y}, ${farmCenter.z}. Automation is now enabled.`);
          return;
        }

        const homePosition = sharedState.getHomePosition ? sharedState.getHomePosition() : null;
        if (homePosition) {
          farmCenter = homePosition.floored ? homePosition.floored() : homePosition;
          farmEnabled = true;
          sharedState.say(`Farm center set to home at ${farmCenter.x}, ${farmCenter.y}, ${farmCenter.z}. Automation is now enabled.`);
          return;
        }

        sharedState.say('I could not determine a farm center. Stand near your farm and use `farm set` again.');
        return;
      }

      if (sub === 'tend' || sub === 'harvest' || sub === 'work') {
        await tendFarm(username, 'manual');
        return;
      }

      sharedState.say('Farm commands: farm status, farm start, farm stop, farm set, farm tend.');
    }, ['harvest']);
  }

  sharedState.tendFarm = tendFarm;
  sharedState.getFarmStatus = farmStatus;
  sharedState.setFarmCenter = (position) => {
    farmCenter = position ? position.floored ? position.floored() : position : null;
    return farmCenter;
  };
};