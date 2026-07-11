/**
 * @file This plugin gives the bot the ability to gather resources.
 */

const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalBlock } = require('mineflayer-pathfinder').goals;

module.exports = (bot, sharedState) => {
  // Load the pathfinder plugin
  bot.loadPlugin(pathfinder);

  /**
   * @description Gathers a specified number of a certain block type.
   * @param {string} blockName - The name of the block to gather.
   * @param {number} count - The number of blocks to gather.
   */
  async function gatherBlocks(blockName, count) {
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);

    const blockType = mcData.blocksByName[blockName];
    if (!blockType) {
      sharedState.say(`I don't know what a "${blockName}" is.`);
      return;
    }

    sharedState.say(`Okay, I'll start looking for ${count} ${blockName}(s).`);

    for (let i = 0; i < count; i++) {
      const block = bot.findBlock({
        matching: blockType.id,
        maxDistance: 128
      });

      if (!block) {
        sharedState.say(`I can't find any more ${blockName} nearby.`);
        return;
      }

      try {
        await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z));
        await bot.dig(block);
        sharedState.say(`Collected ${i + 1} of ${count} ${blockName}.`);
      } catch (e) {
        console.error(`[Auto-Gather] Error while gathering:`, e);
        sharedState.say(`I got stuck trying to get that ${blockName}. I'll stop for now.`);
        return;
      }
    }
    sharedState.say(`Finished gathering all ${count} ${blockName}(s)!`);
  }

  // Register the /gather command
  if (sharedState.registerCommand) {
    sharedState.registerCommand('gather', async (username, args) => {
      const itemName = args[1];
      const amount = args[2] ? parseInt(args[2], 10) : 1;

      if (!itemName) {
        sharedState.say("What should I gather? Try `/gather oak_log 5`.");
        return;
      }
      gatherBlocks(itemName, amount);
    });
  }
};