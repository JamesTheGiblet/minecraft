/**
 * @file This plugin makes the bot react to player events.
 */

module.exports = (bot, sharedState) => {
  // Welcome players when they join
  bot.on('playerJoined', (player) => {
    if (player.username !== bot.username) {
      setTimeout(() => {
        sharedState.say(`Welcome to the server, ${player.username}! Let me know if you need any building advice.`);
      }, 3000);
    }
  });

  // Offer condolences on death
  bot.on('death', () => {
    // This event is simple and doesn't say who died, so we make a general statement.
    // A more complex implementation could track player health to know who died.
    sharedState.say("Oh no, a fallen builder! Don't worry, every great structure is built on the foundations of a few mistakes.");
  });

  // Congratulate on finding rare items
  bot.on('entityCollect', (collector, collected) => {
    if (collector.type === 'player' && collected.name === 'diamond') {
      sharedState.say(`A diamond! Excellent find, ${collector.username}! That opens up a whole new tier of tools and possibilities.`);
    }
  });
};