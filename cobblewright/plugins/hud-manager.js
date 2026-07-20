/**
 * @file This plugin provides a centralized manager for on-screen HUD elements.
 * including the coordinate display.
 */

const { getTrackedPlayer } = require('../utils/player-helpers.js');
const { escapeScoreboardText } = require('../utils/text-helpers.js');

module.exports = (bot, sharedState) => {
  const coordsObjective = 'cw_coords';
  const hudEnabledByDefault = sharedState?.CONFIG?.HUD_ENABLED_BY_DEFAULT || false;
  const configuredHudInterval = Number.parseInt(sharedState?.CONFIG?.COORD_HUD_INTERVAL_MS, 10);
  const coordHudIntervalMs = Number.isInteger(configuredHudInterval) && configuredHudInterval >= 5000
    ? configuredHudInterval
    : 10000;

  const hudState = {
    isEnabled: hudEnabledByDefault,
    isInitialized: false,
    lastSidebarEntries: []
  };

  const ensureCoordHud = () => {
    if (hudState.isInitialized) return;
    bot.chat(`/scoreboard objectives add ${coordsObjective} dummy`);
    bot.chat(`/scoreboard objectives setdisplay sidebar ${coordsObjective}`);
    hudState.isInitialized = true;
  };

  const clearCoordHudLines = () => {
    for (const line of hudState.lastSidebarEntries) {
      bot.chat(`/scoreboard players reset "${escapeScoreboardText(line)}" ${coordsObjective}`);
    }
    hudState.lastSidebarEntries = [];
  };

  const updateCoordHud = () => {
    if (!hudState.isEnabled) {
      return;
    }

    const trackedPlayer = getTrackedPlayer(bot, sharedState);
    if (!trackedPlayer?.entity?.position || !bot.entity?.position) return;

    ensureCoordHud();

    const p = trackedPlayer.entity.position.floored();
    const b = bot.entity.position.floored();
    const home = sharedState.getHomePosition ? sharedState.getHomePosition() : null;

    clearCoordHudLines();

    const lines = [
      `Player: ${trackedPlayer.username}`,
      `P XYZ: ${p.x}, ${p.y}, ${p.z}`,
      `Bot XYZ: ${b.x}, ${b.y}, ${b.z}`,
      home ? `Home XZ: ${Math.floor(home.x)}, ${Math.floor(home.z)}` : 'Home: not set'
    ];

    lines.forEach((line, index) => {
      const score = lines.length - index;
      bot.chat(`/scoreboard players set "${escapeScoreboardText(line)}" ${coordsObjective} ${score}`);
    });

    hudState.lastSidebarEntries = lines;
  };

  const handleHudCommand = (username, args) => {
    const mode = String(args?.[1] || '').toLowerCase();

    if (mode === 'off') {
      hudState.isEnabled = false;
      clearCoordHudLines();
      bot.chat('/scoreboard objectives setdisplay sidebar');
      sharedState.say('HUD disabled.');
      return;
    }

    hudState.isEnabled = true;
    updateCoordHud();
    sharedState.say('HUD enabled. Displaying coordinates in the sidebar.');
  };

  // Register the command with the command manager plugin.
  if (sharedState.registerCommand) {
    sharedState.registerCommand('hud', handleHudCommand, ['coordhud']);
  }

  // Start the HUD update loop.
  setInterval(() => {
    try {
      updateCoordHud();
    } catch (error) {
      console.warn('[HudManager] Coordinate HUD update failed:', error.message);
    }
  }, coordHudIntervalMs);
};