/**
 * @file This plugin helps complete player-built frames and walls.
 */

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalNear } = require('mineflayer-pathfinder').goals;
const { Vec3 } = require('vec3');

module.exports = (bot, sharedState) => {
  bot.loadPlugin(pathfinder);

  const farmRadius = 8;
  const BUILD_SCAN_HEIGHT = 10;
  const BUILD_COOLDOWN_MS = 5 * 60 * 1000;
  const STRUCTURE_HINTS = ['log', 'plank', 'cobble', 'stone', 'brick', 'glass', 'sandstone', 'quartz', 'terracotta', 'concrete', 'fence'];
  const LOG_TO_PLANK = {
    oak_log: 'oak_planks',
    spruce_log: 'spruce_planks',
    birch_log: 'birch_planks',
    jungle_log: 'jungle_planks',
    acacia_log: 'acacia_planks',
    cherry_log: 'cherry_planks',
    dark_oak_log: 'dark_oak_planks',
    mangrove_log: 'mangrove_planks',
    crimson_stem: 'crimson_planks',
    warped_stem: 'warped_planks'
  };
  const PREFERRED_WALL_MATERIALS = [
    'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'cherry_planks',
    'dark_oak_planks', 'mangrove_planks', 'cobblestone', 'stone', 'glass'
  ];

  let lastCollaborativeBuildAt = 0;

  const getMcData = () => require('minecraft-data')(bot.version);

  const getCenter = (username) => {
    const player = username ? bot.players[username] : null;
    if (player?.entity?.position) {
      return player.entity.position.floored();
    }

    const homePosition = sharedState.getHomePosition ? sharedState.getHomePosition() : null;
    if (homePosition) {
      return homePosition.floored ? homePosition.floored() : homePosition;
    }

    const activePlayer = Object.values(bot.players).find((entry) => entry.username !== bot.username && entry.entity);
    return activePlayer?.entity?.position?.floored?.() || null;
  };

  const getInventoryCount = (itemName) => bot.inventory.items()
    .filter((item) => item.name === itemName)
    .reduce((sum, item) => sum + item.count, 0);

  const findNearbyCraftingTable = (mcData) => bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 24
  });

  const placeCraftingTableFromInventory = async () => {
    const craftingTableItem = bot.inventory.items().find((item) => item.name === 'crafting_table');
    if (!craftingTableItem) return null;

    const referenceBlock = bot.findBlock({
      matching: (block) => block && block.boundingBox === 'block' && block.name !== 'crafting_table',
      maxDistance: 6
    });

    if (!referenceBlock) return null;

    try {
      sharedState.say('I need a crafting table to prepare building materials, so I will place one.');
      await bot.pathfinder.goto(new GoalNear(referenceBlock.position.x, referenceBlock.position.y, referenceBlock.position.z, 1));
      await bot.equip(craftingTableItem, 'hand');
      await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
      await bot.waitForTicks(2);
      return bot.blockAt(referenceBlock.position.offset(0, 1, 0));
    } catch (error) {
      console.warn('[CollaborativeBuild] Failed to place crafting table:', error.message);
      return null;
    }
  };

  const craftItemByName = async (itemName, craftCount = 1) => {
    const mcData = getMcData();
    const itemInfo = mcData.itemsByName[itemName];
    if (!itemInfo) return false;

    const inventoryRecipes = bot.recipesFor(itemInfo.id, null, 1, null) || [];
    if (inventoryRecipes.length > 0) {
      for (let i = 0; i < craftCount; i++) {
        await bot.craft(inventoryRecipes[0], 1, null);
      }
      return true;
    }

    let craftingTableBlock = findNearbyCraftingTable(mcData);
    if (!craftingTableBlock) {
      craftingTableBlock = await placeCraftingTableFromInventory();
    }
    if (!craftingTableBlock) return false;

    await bot.pathfinder.goto(new GoalNear(craftingTableBlock.position.x, craftingTableBlock.position.y, craftingTableBlock.position.z, 1));
    const tableRecipes = bot.recipesFor(itemInfo.id, null, 1, craftingTableBlock) || [];
    if (tableRecipes.length === 0) return false;

    for (let i = 0; i < craftCount; i++) {
      await bot.craft(tableRecipes[0], 1, craftingTableBlock);
    }

    return true;
  };

  const chooseWallMaterial = (frame) => {
    const pillarNames = frame.columns.map((column) => column.block.name);
    for (const name of pillarNames) {
      if (LOG_TO_PLANK[name]) {
        return LOG_TO_PLANK[name];
      }
      if (name.includes('cobble')) return 'cobblestone';
      if (name.includes('glass')) return 'glass';
      if (name.includes('stone')) return 'stone';
      if (name.includes('plank')) return name;
    }

    for (const candidate of PREFERRED_WALL_MATERIALS) {
      if (getInventoryCount(candidate) > 0) return candidate;
    }

    return 'oak_planks';
  };

  const ensureBuildMaterials = async (materialName, requiredCount) => {
    const currentCount = getInventoryCount(materialName);
    if (currentCount >= requiredCount) return true;

    if (!sharedState.collectBlueprintResources) return false;

    const missingCount = requiredCount - currentCount;
    const pseudoBlueprint = {
      name: `collaborative_${materialName}`,
      blocks: Array.from({ length: missingCount }, (_, index) => ({ x: index, y: 0, z: 0, type: materialName }))
    };

    const result = await sharedState.collectBlueprintResources(pseudoBlueprint, null);
    return result.satisfied && getInventoryCount(materialName) >= requiredCount;
  };

  const isBuildCandidate = (block) => {
    if (!block || block.name === 'air') return false;
    return STRUCTURE_HINTS.some((hint) => block.name.includes(hint));
  };

  const scanColumns = (center) => {
    const columns = [];

    for (let dx = -farmRadius; dx <= farmRadius; dx++) {
      for (let dz = -farmRadius; dz <= farmRadius; dz++) {
        let bestRun = null;
        let runStart = null;
        let runName = null;

        for (let dy = -2; dy <= BUILD_SCAN_HEIGHT; dy++) {
          const block = bot.blockAt(center.offset(dx, dy, dz));
          const name = block?.name || 'air';

          if (block && isBuildCandidate(block)) {
            if (runName === name) {
              bestRun = {
                name,
                startY: runStart,
                endY: dy,
                height: dy - runStart + 1,
                x: center.x + dx,
                z: center.z + dz,
                block
              };
            } else {
              runName = name;
              runStart = dy;
              bestRun = {
                name,
                startY: dy,
                endY: dy,
                height: 1,
                x: center.x + dx,
                z: center.z + dz,
                block
              };
            }
          } else {
            runName = null;
            runStart = null;
          }
        }

        if (bestRun && bestRun.height >= 2) {
          columns.push(bestRun);
        }
      }
    }

    return columns;
  };

  const findFrame = (center) => {
    const columns = scanColumns(center);
    if (columns.length < 2) return null;

    const xValues = columns.map((column) => column.x);
    const zValues = columns.map((column) => column.z);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);
    const minY = Math.min(...columns.map((column) => column.startY));
    const maxY = Math.max(...columns.map((column) => column.endY));

    const hasCorner = (x, z) => columns.some((column) => column.x === x && column.z === z);
    const cornersPresent = hasCorner(minX, minZ) && hasCorner(minX, maxZ) && hasCorner(maxX, minZ) && hasCorner(maxX, maxZ);

    if (!cornersPresent) {
      return {
        type: 'pillars',
        columns,
        minX,
        maxX,
        minZ,
        maxZ,
        minY,
        maxY
      };
    }

    return {
      type: 'frame',
      columns,
      minX,
      maxX,
      minZ,
      maxZ,
      minY,
      maxY
    };
  };

  const findReferenceBlock = (targetPos) => {
    const offsets = [
      new Vec3(0, -1, 0),
      new Vec3(-1, 0, 0),
      new Vec3(1, 0, 0),
      new Vec3(0, 0, -1),
      new Vec3(0, 0, 1)
    ];

    for (const offset of offsets) {
      const neighbor = bot.blockAt(targetPos.offset(offset.x, offset.y, offset.z));
      if (neighbor && neighbor.boundingBox === 'block' && neighbor.name !== 'air') {
        return neighbor;
      }
    }

    return null;
  };

  const placeAt = async (targetPos, materialName) => {
    const block = bot.blockAt(targetPos);
    if (block && block.name !== 'air') return true;

    const item = bot.inventory.items().find((entry) => entry.name === materialName);
    if (!item) return false;

    const referenceBlock = findReferenceBlock(targetPos);
    if (!referenceBlock) return false;

    try {
      await bot.pathfinder.goto(new GoalNear(targetPos.x, targetPos.y, targetPos.z, 2));
      await bot.equip(item, 'hand');
      await bot.placeBlock(referenceBlock, targetPos.minus(referenceBlock.position));
      await bot.waitForTicks(2);
      return true;
    } catch (error) {
      console.warn(`[CollaborativeBuild] Failed to place ${materialName} at ${targetPos}: ${error.message}`);
      return false;
    }
  };

  const fillWalls = async (frame, materialName) => {
    const wallTargets = [];

    for (let y = frame.minY; y <= frame.maxY; y++) {
      for (let x = frame.minX + 1; x <= frame.maxX - 1; x++) {
        wallTargets.push(new Vec3(x, y, frame.minZ));
        wallTargets.push(new Vec3(x, y, frame.maxZ));
      }
      for (let z = frame.minZ + 1; z <= frame.maxZ - 1; z++) {
        wallTargets.push(new Vec3(frame.minX, y, z));
        wallTargets.push(new Vec3(frame.maxX, y, z));
      }
    }

    let placed = 0;
    for (const targetPos of wallTargets) {
      if (sharedState.isCancelled) break;
      const success = await placeAt(targetPos, materialName);
      if (success) placed += 1;
    }

    return placed;
  };

  const extendPillars = async (frame) => {
    const tallest = Math.max(...frame.columns.map((column) => column.endY));
    let placed = 0;

    for (const column of frame.columns) {
      if (sharedState.isCancelled) break;

      const columnMaterial = chooseWallMaterial({ columns: [column] });
      const haveColumnMaterial = getInventoryCount(columnMaterial) > 0;
      const materialName = haveColumnMaterial ? columnMaterial : chooseWallMaterial(frame);
      if (!await ensureBuildMaterials(materialName, Math.max(1, tallest - column.endY))) {
        continue;
      }

      for (let y = column.endY + 1; y <= tallest; y++) {
        const success = await placeAt(new Vec3(column.x, y, column.z), materialName);
        if (success) placed += 1;
      }
    }

    return placed;
  };

  const buildStatus = (frame) => {
    if (!frame) return 'I do not see a clear frame or pillar set to assist with yet.';

    const site = sharedState.analyzeBuildArea ? sharedState.analyzeBuildArea(frame.columns[0].block.position) : null;
    const siteText = site ? ` Site readiness: ${site.siteReadiness}.` : '';
    return `I found a ${frame.type} with ${frame.columns.length} support columns.${siteText}`;
  };

  const assistBuild = async (username, mode = 'all') => {
    if (sharedState.isBusy || sharedState.isFleeing) return false;
    if (Date.now() - lastCollaborativeBuildAt < BUILD_COOLDOWN_MS) {
      sharedState.say('I recently helped with a build. Give me a moment before I try again.');
      return false;
    }

    const center = getCenter(username);
    if (!center) {
      sharedState.say('I need to see you or know your home position to help with building.');
      return false;
    }

    const frame = findFrame(center);
    if (!frame) {
      sharedState.say('I could not find a clear frame or pillar structure nearby to assist with.');
      return false;
    }

    if (mode === 'status') {
      sharedState.say(buildStatus(frame));
      return true;
    }

    const wallMaterial = chooseWallMaterial(frame);
    const targetCount = frame.type === 'frame'
      ? ((frame.maxX - frame.minX - 1) * (frame.maxY - frame.minY + 1) * 2) + ((frame.maxZ - frame.minZ - 1) * (frame.maxY - frame.minY + 1) * 2)
      : Math.max(1, frame.columns.length * Math.max(1, frame.maxY - frame.minY));

    if (mode === 'walls' || mode === 'all') {
      const prepared = await ensureBuildMaterials(wallMaterial, Math.max(1, targetCount));
      if (!prepared) {
        sharedState.say(`I could not gather enough ${wallMaterial} to fill the walls.`);
        return false;
      }
    }

    return sharedState.runBusyTask(async () => {
      sharedState.say(buildStatus(frame));

      let placements = 0;
      if (mode === 'walls' || mode === 'all') {
        if (frame.type === 'frame') {
          placements += await fillWalls(frame, wallMaterial);
        } else {
          placements += await extendPillars(frame);
        }
      }

      if ((mode === 'pillars' || mode === 'all') && frame.type === 'pillars') {
        placements += await extendPillars(frame);
      }

      lastCollaborativeBuildAt = Date.now();
      sharedState.say(`I placed ${placements} blocks to help finish the build.`);
      return true;
    });
  };

  if (sharedState.registerCommand) {
    sharedState.registerCommand('assist', async (username, args) => {
      const sub = (args[1] || '').toLowerCase();

      if (!sub || sub === 'status' || sub === 'help') {
        const center = getCenter(username);
        const frame = center ? findFrame(center) : null;
        sharedState.say(frame ? buildStatus(frame) : 'Use `assist build`, `assist walls`, or `assist pillars` near a frame or pillar set.');
        return;
      }

      if (sub === 'walls' || sub === 'frame' || sub === 'build') {
        await assistBuild(username, 'walls');
        return;
      }

      if (sub === 'pillars' || sub === 'pillar') {
        await assistBuild(username, 'pillars');
        return;
      }

      if (sub === 'all') {
        await assistBuild(username, 'all');
        return;
      }

      sharedState.say('Assist commands: assist status, assist walls, assist pillars, assist all.');
    }, ['collaborate', 'frame']);
  }

  sharedState.assistCollaborativeBuild = assistBuild;
  sharedState.getCollaborativeBuildStatus = (username) => {
    const center = getCenter(username);
    return center ? buildStatus(findFrame(center)) : 'I need a player position or home position to inspect a build site.';
  };
};