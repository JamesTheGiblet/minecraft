/**
 * @file This utility provides helper functions for text manipulation.
 */

/**
 * Escapes text to be safely used in a Minecraft scoreboard command.
 * @param {string} text The text to escape.
 * @returns {string} The escaped text.
 */
function escapeScoreboardText(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

module.exports = { escapeScoreboardText };