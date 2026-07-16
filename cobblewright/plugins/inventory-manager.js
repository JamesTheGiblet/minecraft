/**
 * @file This plugin provides a centralized utility for summarizing inventory contents.
 */

module.exports = (bot, sharedState) => {
  function getInventorySummary(username) {
    // NOTE: This is a limitation of Mineflayer. We can't see other players' inventories.
    // For now, we will use the BOT's inventory as a proxy. The prompt will be adjusted to handle this.
    const player = bot.players[username];
    const items = (player && player.inventory) ? player.inventory.items() : bot.inventory.items();
    const summary = {
      stone: items.filter(i => i.name.includes('stone') || i.name.includes('cobblestone')).reduce((s, i) => s + i.count, 0),
      dirt: items.filter(i => i.name === 'dirt').reduce((s, i) => s + i.count, 0),
      woodLogs: items.filter(i => i.name.includes('log')).reduce((s, i) => s + i.count, 0),
      planks: items.filter(i => i.name.includes('planks')).reduce((s, i) => s + i.count, 0),
      iron_ore: items.filter(i => i.name.includes('iron_ore')).reduce((s, i) => s + i.count, 0),
      coal: items.filter(i => i.name.includes('coal')).reduce((s, i) => s + i.count, 0),
      has_crafting_table: items.some(i => i.name === 'crafting_table'),
      has_furnace: items.some(i => i.name === 'furnace'),
      total: items.reduce((s, i) => s + i.count, 0)
    };
    return summary;
  }

  // Expose the function to other plugins via sharedState
  sharedState.getInventorySummary = getInventorySummary;
};