/**
 * @file Manages weather-related commands and state.
 * Provides a /weather command to check or change the in-game weather,
 * aligning with the command listed in the project's README.md.
 */

module.exports = (bot, sharedState) => {
  /**
   * Handles the /weather command logic.
   * @param {string} username - The player who issued the command.
   * @param {string[]} args - Command arguments. Expects 'check' or 'clear'.
   */
  const handleWeatherCommand = (username, args) => {
    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
      sharedState.say(`How can I help with the weather? You can say "weather check" or "weather clear".`);
      return;
    }

    switch (subCommand) {
      case 'check':
        if (bot.weather.rain > 0) {
          sharedState.say(bot.weather.thunder > 0
            ? `It's currently thundering. A great day to stay inside and build!`
            : `It's raining. Perfect weather for some indoor decorating.`
          );
        } else {
          sharedState.say(`The skies are clear! A beautiful day for building.`);
        }
        break;

      case 'clear':
        sharedState.say(`Attempting to clear the skies...`);
        // This requires the bot to have OP/command permissions on the server.
        bot.chat('/weather clear');
        if (sharedState.recordTaskOutcome) {
          // We record 'success' because the command was successfully sent.
          // The actual outcome depends on server permissions, which is outside the plugin's control.
          sharedState.recordTaskOutcome('clear_weather', true, { triggeredBy: username });
        }
        break;

      default:
        sharedState.say(`I don't recognize that weather command. Try "weather check" or "weather clear".`);
        break;
    }
  };

  if (sharedState.registerCommand) {
    sharedState.registerCommand('weather', handleWeatherCommand);
  } else {
    console.error('[WeatherManager] CRITICAL: `sharedState.registerCommand` is not available. The /weather command will not work.');
  }
};