/**
 * @file This plugin tracks player activity to prevent the critique loop
 * from running on AFK or paused players.
 */

module.exports = (bot, sharedState) => {
  bot.on('swingArm', (entity) => {
    sharedState.updatePlayerActivity(entity.username);
  });

  bot.on('windowOpen', () => {
    sharedState.playerStates.forEach((state, username) => {
      const playerEntity = bot.players[username]?.entity;
      if (playerEntity && playerEntity.position.distanceTo(bot.entity.position) < 8) {
        sharedState.updatePlayerActivity(username);
      }
    });
  });
};