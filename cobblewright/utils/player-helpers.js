/**
 * @file This utility provides helper functions for working with players.
 */

/**
 * Finds the most recently active player to track.
 * It prioritizes players with a recent `lastActivityTime` in `sharedState`.
 * @param {import('mineflayer').Bot} bot The mineflayer bot instance.
 * @param {object} sharedState The shared state object containing playerStates.
 * @returns {import('mineflayer').Player | null} The player to track or null.
 */
function getTrackedPlayer(bot, sharedState) {
  let selected = null;
  let latest = -1;

  for (const [username, state] of sharedState.playerStates.entries()) {
    const player = bot.players?.[username];
    if (!player?.entity) continue;
    const at = Number(state?.lastActivityTime) || 0;
    if (at > latest) {
      latest = at;
      selected = player;
    }
  }

  if (selected) return selected;
  return Object.values(bot.players || {}).find((player) => player?.entity && player.username !== bot.username) || null;
}

module.exports = { getTrackedPlayer };