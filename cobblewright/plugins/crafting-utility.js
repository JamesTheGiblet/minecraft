/**
 * @file This plugin provides centralized utility functions for crafting and placing blocks.
 */

const { GoalBlock, GoalNear } = require('mineflayer-pathfinder').goals;
const { Vec3 } = require('vec3');

module.exports = (bot, sharedState) => {
  const getMcData = () => require('minecraft-data')(bot.version);

  const findNearbyBlock = (nameOrId) => {
    const mcData = getMcData();
    const blockId = typeof nameOrId === 'string' ? mcData.blocksByName[nameOrId]?.id : nameOrId;
    if (!blockId) return null;

    return bot.findBlock({
      matching: blockId,
      maxDistance: 24
    });
  };

  async function placeBlockFromInventory(itemName, message) {
    const item = bot.inventory.items().find(i => i.name === itemName);
    if (!item) return null;

    const referenceBlock = bot.findBlock({
      matching: (block) => block && block.boundingBox === 'block' && !block.name.includes(itemName),
      maxDistance: 6
    });

    if (!referenceBlock) return null;

    try {
      if (message) sharedState.say(message);
      await bot.pathfinder.goto(new GoalNear(referenceBlock.position.x, referenceBlock.position.y, referenceBlock.position.z, 1));
      await bot.equip(item, 'hand');
      await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
      await bot.waitForTicks(2);
      return bot.blockAt(referenceBlock.position.offset(0, 1, 0));
    } catch (error) {
      console.warn(`[CraftingUtil] Failed to place ${itemName}:`, error.message);
      return null;
    }
  }

  async function craftItem(itemName, count = 1) {
    const mcData = getMcData();
    const itemInfo = mcData.itemsByName[itemName];
    if (!itemInfo) return false;

    // Try crafting from inventory first
    const inventoryRecipes = bot.recipesFor(itemInfo.id, null, 1, null) || [];
    if (inventoryRecipes.length > 0) {
      await bot.craft(inventoryRecipes[0], count, null);
      return true;
    }

    // If that fails, try with a crafting table
    let craftingTable = findNearbyBlock('crafting_table');
    if (!craftingTable) {
      craftingTable = await placeBlockFromInventory('crafting_table', 'I need a crafting table. Placing one now.');
    }
    if (!craftingTable) {
      sharedState.say(`I need a crafting table to make a ${itemName}, but I can't find or place one.`);
      return false;
    }

    try {
      await bot.pathfinder.goto(new GoalBlock(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z));
      const tableRecipes = bot.recipesFor(itemInfo.id, null, 1, craftingTable) || [];
      if (tableRecipes.length === 0) {
        sharedState.say(`I have a crafting table, but I still can't figure out how to make a ${itemName}.`);
        return false;
      }

      await bot.craft(tableRecipes[0], count, craftingTable);
      return true;
    } catch (err) {
      console.error(`[CraftingUtil] Failed to craft ${itemName} at table:`, err);
      return false;
    }
  }

  // Expose utilities to other plugins
  sharedState.craftItem = craftItem;
  sharedState.placeBlockFromInventory = placeBlockFromInventory;
};