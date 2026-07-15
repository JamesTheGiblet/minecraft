/**
 * @file This plugin adds a /weather command.
 */

module.exports = (bot, sharedState) => {
  if (sharedState.registerCommand) {
    sharedState.registerCommand('weather', (username, args) => {
      const action = args[1];

      if (action === 'clear') {
        sharedState.say("Clearing the skies for you!");
        bot.chat('/weather clear');
      } else {
        sharedState.say(`The weather currently looks like: ${bot.weather.rain ? 'rainy' : 'clear'}. You can ask me to "weather clear".`);
      }
    });
  }
};