/**
 * @file This plugin manages player state as they join and leave the server.
 */

module.exports = (bot, sharedState) => {
  bot.on('playerJoined', (player) => {
    if (player.username === bot.username) return;
    console.log(`[State] Player ${player.username} joined. Initializing state.`);
    sharedState.playerStates.set(player.username, {
      lastPosition: null,
      lastActivityTime: Date.now(),
      currentStyle: 'any',
      inactivityThreshold: 30000
    });
  });

  bot.on('playerLeft', (player) => {
    if (sharedState.playerStates.has(player.username)) {
      console.log(`[State] Player ${player.username} left. Removing state.`);
      sharedState.playerStates.delete(player.username);
    }
  });
};