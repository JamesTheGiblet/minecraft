/**
 * @file This plugin provides world-related helper commands and features,
 * such as giving new players a starter map and reporting locations.
 */

module.exports = (bot, sharedState) => {
  const givenStarterKits = new Set(); // Keep track of players who have received a starter kit
  const starterKitCommandDelayMs = 350;
  const configuredStarterKit = Array.isArray(sharedState?.CONFIG?.STARTER_KIT)
    ? sharedState.CONFIG.STARTER_KIT
    : [{ item: 'map', count: 1 }];

  const starterKitEntries = configuredStarterKit
    .map((entry) => {
      if (!entry) return null;

      if (typeof entry === 'string') {
        const item = entry.trim();
        if (!item) return null;
        return { item, count: 1 };
      }

      if (typeof entry !== 'object') return null;

      const item = String(entry.item || '').trim();
      if (!item) return null;

      const parsedCount = Number.parseInt(entry.count, 10);
      const count = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : 1;
      return { item, count };
    })
    .filter(Boolean);

  /**
   * Gives a player a map when they join for the first time.
   * @param {import('mineflayer').Player} player - The player who joined.
   */
  function giveStarterMap(player) {
    if (!player || !player.username || player.username === bot.username || givenStarterKits.has(player.username)) {
      return;
    }

    // The bot needs operator permissions to use /give.
    // The setup guide already recommends this for other features.
    console.log(`[WorldHelper] Giving starter kit to new player: ${player.username}`);

    if (starterKitEntries.length > 0) {
      for (const [index, entry] of starterKitEntries.entries()) {
        setTimeout(() => {
          bot.chat(`/give ${player.username} ${entry.item} ${entry.count}`);
        }, index * starterKitCommandDelayMs);
      }
    }

    givenStarterKits.add(player.username);

    // Let the player know about the new location commands.
    setTimeout(() => {
      if (starterKitEntries.length > 0) {
        const summary = starterKitEntries.map((entry) => `${entry.count}x ${entry.item}`).join(', ');
        sharedState.say(`Welcome, ${player.username}! I've given you your starter kit (${summary}). You can also ask me "whereami" or "whereareyou" to get coordinates.`);
      } else {
        sharedState.say(`Welcome, ${player.username}! Your starter kit is currently empty. You can also ask me "whereami" or "whereareyou" to get coordinates.`);
      }
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
    });

    sharedState.registerCommand('whereareyou', (username, args) => {
      reportBotLocation();
    });
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