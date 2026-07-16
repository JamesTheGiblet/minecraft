/**
 * @file This plugin provides world-related helper commands and features,
 * such as giving new players a starter map and reporting locations.
 */

module.exports = (bot, sharedState) => {
  const givenMaps = new Set(); // Keep track of players who have received a map

  /**
   * Gives a player a map when they join for the first time.
   * @param {import('mineflayer').Player} player - The player who joined.
   */
  function giveStarterMap(player) {
    if (!player || !player.username || givenMaps.has(player.username)) {
      return;
    }

    // The bot needs operator permissions to use /give.
    // The setup guide already recommends this for other features.
    console.log(`[WorldHelper] Giving starter map to new player: ${player.username}`);
    bot.chat(`/give ${player.username} map 1`);
    givenMaps.add(player.username);

    // Let the player know about the new location commands.
    setTimeout(() => {
      sharedState.say(`Welcome, ${player.username}! I've given you a map to get started. You can also ask me "whereami" or "whereareyou" to get coordinates.`);
    }, 2000);
  }

  /**
   * Reports the bot's current location in chat.
   */
  function reportBotLocation() {
    const pos = bot.entity.position.floored();
    sharedState.say(`I am at X: ${pos.x}, Y: ${pos.y}, Z: ${pos.z}.`);
  }

  /**
   * Reports a player's current location in chat.
   * @param {string} username - The username of the player asking.
   */
  function reportPlayerLocation(username) {
    const player = bot.players[username];
    if (!player || !player.entity) {
      sharedState.say("I can't see you right now, so I can't tell you where you are.");
      return;
    }
    const pos = player.entity.position.floored();
    sharedState.say(`You are at X: ${pos.x}, Y: ${pos.y}, Z: ${pos.z}.`);
  }

  // Listen for players joining the game
  bot.on('playerJoined', giveStarterMap);

  // Register the new commands
  if (sharedState.registerCommand) {
    sharedState.registerCommand('whereami', (username, args) => {
      reportPlayerLocation(username);
    }, 'whereami', 'Tells you your current coordinates.');

    sharedState.registerCommand('whereareyou', (username, args) => {
      reportBotLocation();
    }, 'whereareyou', 'Tells you my current coordinates.');
  }

  // On startup, also listen for players who are already online
  bot.once('login', () => {
    setTimeout(() => {
      for (const username in bot.players) {
        if (username !== bot.username) {
          const player = bot.players[username];
          giveStarterMap(player);
        }
      }
    }, 5000); // Wait a few seconds for the player list to populate
  });
};
