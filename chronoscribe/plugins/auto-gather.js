/**
 * @file This plugin gives the bot the ability to gather resources.
 */

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalBlock } = require('mineflayer-pathfinder').goals;
const { Vec3 } = require('vec3');

module.exports = (bot, sharedState) => {
  // Load the pathfinder plugin
  bot.loadPlugin(pathfinder);

  const getMcData = () => require('minecraft-data')(bot.version);
  const protectBuildingsForGathering = sharedState.CONFIG.PROTECT_BUILDINGS_FOR_GATHERING !== false;
  const buildingDetectorRadius = Number.isInteger(sharedState.CONFIG.BUILDING_DETECTOR_RADIUS)
    ? Math.max(1, sharedState.CONFIG.BUILDING_DETECTOR_RADIUS)
    : 2;

  const structureMarkerNames = new Set([
    'crafting_table', 'chest', 'trapped_chest', 'furnace', 'blast_furnace', 'smoker',
    'anvil', 'chipped_anvil', 'damaged_anvil', 'lantern', 'torch', 'wall_torch',
    'glass', 'glass_pane', 'oak_door', 'spruce_door', 'birch_door', 'jungle_door',
    'acacia_door', 'cherry_door', 'dark_oak_door', 'mangrove_door', 'crimson_door',
    'warped_door', 'iron_door', 'oak_trapdoor', 'spruce_trapdoor', 'birch_trapdoor',
    'jungle_trapdoor', 'acacia_trapdoor', 'cherry_trapdoor', 'dark_oak_trapdoor',
    'mangrove_trapdoor', 'crimson_trapdoor', 'warped_trapdoor', 'ladder',
    'oak_stairs', 'spruce_stairs', 'birch_stairs', 'jungle_stairs', 'acacia_stairs',
    'cherry_stairs', 'dark_oak_stairs', 'mangrove_stairs', 'crimson_stairs',
    'warped_stairs', 'stone_brick_stairs', 'cobblestone_stairs', 'brick_stairs',
    'oak_slab', 'spruce_slab', 'birch_slab', 'jungle_slab', 'acacia_slab',
    'cherry_slab', 'dark_oak_slab', 'mangrove_slab', 'crimson_slab', 'warped_slab',
    'stone_brick_slab', 'cobblestone_slab', 'brick_slab', 'oak_fence', 'spruce_fence',
    'birch_fence', 'jungle_fence', 'acacia_fence', 'cherry_fence', 'dark_oak_fence',
    'mangrove_fence', 'crimson_fence', 'warped_fence', 'bed', 'bookshelf', 'carpet'
  ]);

  const AUTO_SUPPORT_CHECK_MS = 30000;
  const AUTO_SUPPORT_COOLDOWN_MS = 10 * 60 * 1000;
  const LOW_RESOURCE_THRESHOLD = 20;
  const LOW_RESOURCE_TARGET = 100;

  let pendingSupportRequest = null;
  let lastAutoSupportPromptAt = 0;

  const getMostRecentActivePlayer = () => {
    let mostRecent = null;
    let mostRecentTime = -1;

    for (const [username, state] of sharedState.playerStates.entries()) {
      const player = bot.players[username];
      if (!player || !player.entity) continue;

      if (state.lastActivityTime > mostRecentTime) {
        mostRecent = username;
        mostRecentTime = state.lastActivityTime;
      }
    }

    if (mostRecent) return mostRecent;

    const onlinePlayer = Object.values(bot.players).find(player => player.username !== bot.username && player.entity);
    return onlinePlayer ? onlinePlayer.username : null;
  };

  const getSupportNeed = (summary) => {
    if (summary.stone < LOW_RESOURCE_THRESHOLD) {
      return { resourceLabel: 'stone', gatherName: 'cobblestone', amount: LOW_RESOURCE_TARGET };
    }
    if (summary.woodLogs < LOW_RESOURCE_THRESHOLD) {
      return { resourceLabel: 'wood', gatherName: 'oak_log', amount: LOW_RESOURCE_TARGET };
    }
    if (summary.dirt < LOW_RESOURCE_THRESHOLD) {
      return { resourceLabel: 'dirt', gatherName: 'dirt', amount: LOW_RESOURCE_TARGET };
    }
    return null;
  };

  const getHarvestToolIds = (block) => {
    const harvestTools = block?.harvestTools;
    if (!harvestTools || typeof harvestTools !== 'object') return [];

    return Object.keys(harvestTools)
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id));
  };

  const isLikelyPlayerBuiltStructure = (block) => {
    if (!protectBuildingsForGathering || !block) return false;

    if (structureMarkerNames.has(block.name)) {
      return true;
    }

    let markerCount = 0;
    for (let dx = -buildingDetectorRadius; dx <= buildingDetectorRadius; dx++) {
      for (let dy = -buildingDetectorRadius; dy <= buildingDetectorRadius; dy++) {
        for (let dz = -buildingDetectorRadius; dz <= buildingDetectorRadius; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          const nearbyBlock = bot.blockAt(block.position.offset(dx, dy, dz));
          if (!nearbyBlock) continue;
          if (structureMarkerNames.has(nearbyBlock.name)) {
            markerCount += 1;
            if (markerCount >= 2) return true;
          }
        }
      }
    }

    return markerCount >= 1;
  };

  const findNearbyCraftingTable = (mcData) => bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 24
  });

  const placeCraftingTableFromInventory = async () => {
    const craftingTableItem = bot.inventory.items().find(item => item.name === 'crafting_table');
    if (!craftingTableItem) return null;

    const referenceBlock = bot.findBlock({
      matching: (block) => block && block.boundingBox === 'block' && block.name !== 'crafting_table',
      maxDistance: 6
    });

    if (!referenceBlock) return null;

    try {
      sharedState.say('No crafting table nearby. I will place one from my inventory.');
      await bot.pathfinder.goto(new GoalBlock(
        referenceBlock.position.x,
        referenceBlock.position.y,
        referenceBlock.position.z
      ));
      await bot.equip(craftingTableItem, 'hand');
      await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
      await bot.waitForTicks(2);
      return bot.blockAt(referenceBlock.position.offset(0, 1, 0));
    } catch (err) {
      console.warn(`[Auto-Gather] Failed to place crafting table: ${err.message}`);
      return null;
    }
  };

  const craftItemById = async (itemId, mcData) => {
    const itemInfo = mcData.items[itemId];
    if (!itemInfo) return false;

    const inventoryRecipes = bot.recipesFor(itemId, null, 1, null) || [];
    if (inventoryRecipes.length > 0) {
      await bot.craft(inventoryRecipes[0], 1, null);
      return true;
    }

    let craftingTableBlock = findNearbyCraftingTable(mcData);
    if (!craftingTableBlock) {
      craftingTableBlock = await placeCraftingTableFromInventory();
    }
    if (!craftingTableBlock) return false;

    await bot.pathfinder.goto(new GoalBlock(
      craftingTableBlock.position.x,
      craftingTableBlock.position.y,
      craftingTableBlock.position.z
    ));

    const tableRecipes = bot.recipesFor(itemId, null, 1, craftingTableBlock) || [];
    if (tableRecipes.length === 0) return false;

    await bot.craft(tableRecipes[0], 1, craftingTableBlock);
    return true;
  };

  const ensureToolForBlock = async (block, blockName, mcData, attemptedToolIds) => {
    const toolIds = getHarvestToolIds(block);
    if (toolIds.length === 0) return false;

    for (const toolId of toolIds) {
      if (attemptedToolIds.has(toolId)) continue;
      attemptedToolIds.add(toolId);

      const toolInfo = mcData.items[toolId];
      if (!toolInfo) continue;

      sharedState.say(`I need a ${toolInfo.name} for ${blockName}. Let me try to craft one.`);

      try {
        const crafted = await craftItemById(toolId, mcData);
        if (!crafted) continue;

        const craftedTool = bot.inventory.items().find(item => item.type === toolId);
        if (!craftedTool) continue;

        await bot.equip(craftedTool, 'hand');
        sharedState.say(`Crafted and equipped ${toolInfo.name}. Back to gathering.`);
        return true;
      } catch (err) {
        console.warn(`[Auto-Gather] Failed crafting tool ${toolInfo.name}: ${err.message}`);
      }
    }

    return false;
  };

  /**
   * @description Deposits inventory items matching a filter into the nearest chest.
   * @param {(item: object) => boolean} itemFilter - Items to deposit.
   * @param {string} noChestMessage - Message to show if no chest is nearby.
   * @param {string} failureMessage - Message to show if the chest interaction fails.
   * @returns {Promise<boolean>} True on success, false on failure.
   */
  async function depositItemsToChest(itemFilter, noChestMessage, failureMessage) {
    const mcData = getMcData();
    const chestBlock = bot.findBlock({
      matching: mcData.blocksByName.chest.id,
      maxDistance: 32
    });

    if (!chestBlock) {
      sharedState.say(noChestMessage);
      return false;
    }

    try {
      await bot.pathfinder.goto(new GoalBlock(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z));
      const chest = await bot.openChest(chestBlock);

      const itemsToDeposit = bot.inventory.items().filter(itemFilter);
      for (const item of itemsToDeposit) {
        await chest.deposit(item.type, null, item.count);
      }

      await chest.close();
      return true;
    } catch (e) {
      console.error('[Auto-Gather] Failed to deposit items:', e);
      sharedState.say(failureMessage);
      if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
      return false;
    }
  }

  /**
   * @description Gathers a specified number of a certain block type.
   * @param {string} blockName - The name of the block to gather.
   * @param {number} count - The number of blocks to gather.
   */
  async function gatherBlocks(blockName, count) {
    const mcData = getMcData();
    const gatherMovements = new Movements(bot, mcData);
    // Enhance the bot's movement capabilities.
    gatherMovements.canOpenDoors = true;
    gatherMovements.allowParkour = true; // Allow jumping over gaps.
    gatherMovements.allowSprinting = true; // Move faster when needed.
    gatherMovements.canDig = true; // This is the key: only allow digging for this specific task.
    // The bot will now naturally use ladders and other climbable blocks.
    bot.pathfinder.setMovements(gatherMovements);

    const blockType = mcData.blocksByName[blockName];
    if (!blockType) {
      sharedState.say(`I don't know what a "${blockName}" is.`);
      return;
    }

    try {
      sharedState.say(`Okay, I'll start looking for ${count} ${blockName}(s).`);
      const attemptedToolIds = new Set();

      for (let i = 0; i < count; i++) {
        // Check for cancellation signal
        if (sharedState.isCancelled) break;

        // Before gathering a new block, check if inventory is full.
        if (bot.inventory.emptySlotCount === 0) {
          sharedState.say("My inventory is full. I need to find a chest to deposit items.");
          const success = await depositItemsToChest(
            () => true,
            "I couldn't find a chest nearby to store items.",
            "I had trouble opening or depositing into the chest."
          );
          if (!success) {
            sharedState.say("I couldn't empty my inventory, so I have to stop gathering.");
            return;
          }
          sharedState.say("Okay, inventory emptied. Back to work!");
        }

        // Find multiple candidate blocks instead of just the closest one.
        const blocks = bot.findBlocks({
          matching: (block) => {
            if (block.type !== blockType.id) return false;
            // Build Protection: Check if the block is inside the home radius.
            const homePos = sharedState.getHomePosition();
            if (homePos) {
              const homeRadius = sharedState.getHomeRadius();
              if (block.position.distanceTo(homePos) < homeRadius) {
                return false; // Don't gather blocks that are part of the base.
              }
            }
            if (isLikelyPlayerBuiltStructure(block)) {
              return false; // Avoid harvesting blocks that look like part of a building.
            }
            return true;
          },
          maxDistance: 128,
          count: 10 // Look for up to 10 candidates
        });

        if (blocks.length === 0) {
          sharedState.say(`I can't find any more ${blockName} nearby.`);
          return;
        }

        let blockDug = false;
        for (const block of blocks) {
          // Check for cancellation signal
          if (sharedState.isCancelled) break;

          try {
            // Before digging, find and equip the best tool for the job.
            const bestTool = bot.pathfinder.bestHarvestTool(block);
            if (bestTool) {
              await bot.equip(bestTool, 'hand');
            } else {
              if (mcData.blocks[block.type].harvestTools) {
                const craftedTool = await ensureToolForBlock(block, blockName, mcData, attemptedToolIds);
                if (!craftedTool) {
                  sharedState.say(`I can't break ${blockName} because I don't have the right tool or materials to craft one.`);
                  return; // Stop the gathering process entirely if the right tool is missing.
                }
              }
            }

            // Attempt to pathfind to the block. This might fail.
            await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z));

            // If pathfinding succeeded, dig the block.
            await bot.dig(block);
            sharedState.say(`Collected ${i + 1} of ${count} ${blockName}.`);
            blockDug = true;
            break; // Exit the inner loop and move to the next item in the count.
          } catch (e) {
            console.warn(`[Auto-Gather] Could not path to block at ${block.position}. Trying next one. Reason: ${e.message}`);
            // This block is unreachable, so we'll just try the next one in the list.
          }
        }

        // If we iterated through all candidate blocks and couldn't dig any.
        if (!blockDug) {
          sharedState.say(`I found some ${blockName}, but I couldn't get to any of them.`);
          return;
        }
      }
      sharedState.say(`Finished gathering all ${count} ${blockName}(s)!`);
    } finally {
      // Restore non-destructive movement profile for normal follow/roam behavior.
      sharedState.applySafeMovements();
    }
  }

  const runSupportCollection = async (username, request, deliveryMode) => {
    if (!request) return;

    pendingSupportRequest = null;
    sharedState.say(`Okay, I saw you were low on ${request.resourceLabel}. I will collect ${request.amount} and ${deliveryMode === 'chest' ? 'store it in a chest' : 'keep it in my inventory'} for you.`);
    await sharedState.runBusyTask(() => gatherBlocks(request.gatherName, request.amount));

    if (deliveryMode === 'chest') {
      const deposited = await depositItemsToChest(
        (item) => item.name === request.gatherName,
        "I couldn't find a chest nearby to store the items.",
        "I had trouble storing the items in a chest."
      );
      if (deposited) {
        sharedState.say(`I collected ${request.amount} ${request.resourceLabel} and stored it in a chest.`);
      }
    } else {
      sharedState.say(`I collected ${request.amount} ${request.resourceLabel} and kept it in my inventory for now.`);
    }
  };

  const promptForSupport = (username, request) => {
    pendingSupportRequest = { ...request, username, requestedAt: Date.now() };
    lastAutoSupportPromptAt = Date.now();
    sharedState.say(`I noticed you are low on ${request.resourceLabel}. I can collect ${request.amount} for you. Where should I leave it: chest or inventory?`);
  };

  const checkForSupportNeed = () => {
    if (sharedState.isBusy || sharedState.isFleeing || pendingSupportRequest || !sharedState.safeMovements) return;
    if (bot.time) {
      const timeOfDay = bot.time.timeOfDay ?? bot.time.dayTime ?? bot.time.time;
      if (typeof timeOfDay === 'number') {
        const normalizedTime = ((timeOfDay % 24000) + 24000) % 24000;
        if (normalizedTime >= 12000) return;
      }
    }
    if (Date.now() - lastAutoSupportPromptAt < AUTO_SUPPORT_COOLDOWN_MS) return;

    const username = getMostRecentActivePlayer();
    if (!username) return;

    const summary = sharedState.getInventorySummary(username);
    const need = getSupportNeed(summary);
    if (!need) return;

    promptForSupport(username, need);
  };

  setInterval(checkForSupportNeed, AUTO_SUPPORT_CHECK_MS);

  bot.on('chat', (username, message) => {
    if (!pendingSupportRequest || username !== pendingSupportRequest.username) return;

    const normalized = message.toLowerCase().trim();
    if (normalized !== 'chest' && normalized !== 'inventory') return;

    const request = pendingSupportRequest;
    const deliveryMode = normalized;
    runSupportCollection(username, request, deliveryMode).catch(err => {
      console.error('[Auto-Gather] Support collection failed:', err);
      sharedState.say('I could not finish the support collection.');
    });
  });

  // Register the /gather command
  if (sharedState.registerCommand) {
    sharedState.registerCommand('gather', async (username, args) => {
      const itemName = args[1];
      const amount = args[2] ? parseInt(args[2], 10) : 1;

      if (!itemName) {
        sharedState.say("What should I gather? Try `/gather oak_log 5`.");
        return;
      }
      sharedState.runBusyTask(() => gatherBlocks(itemName, amount));
    });
  }
};