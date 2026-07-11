/**
 * @file This plugin handles the vision capabilities of the bot.
 */

const fs = require('fs');
const chokidar = require('chokidar');

module.exports = (bot, sharedState) => {
  let latestScreenshotPath = null;

  const startScreenshotWatcher = () => {
    const screenshotPath = sharedState.CONFIG.SCREENSHOTS_PATH;
    if (!screenshotPath || !fs.existsSync(screenshotPath)) {
      console.warn(`[Vision] Screenshot path not found or not configured: ${screenshotPath}`);
      console.warn('[Vision] Vision capabilities will be disabled.');
      return;
    }

    console.log(`[Vision] Watching for screenshots in: ${screenshotPath}`);
    const watcher = chokidar.watch(screenshotPath, { ignored: /^\./, persistent: true });
    watcher.on('add', (path) => {
      console.log(`[Vision] New screenshot detected: ${path}`);
      latestScreenshotPath = path;
    });
  };

  const critiqueBuild = async () => {
    if (!latestScreenshotPath) {
      sharedState.say("I haven't seen a new screenshot yet. Take one with F2 and then ask me to `critique` it!");
      return;
    }

    sharedState.say("Let me take a look... one moment.");

    const prompt = `You are an encouraging and constructive art critic.
Analyze this Minecraft screenshot and provide one specific, positive suggestion for aesthetic improvement.
Focus on aspects like color, texture, shape, or composition. Keep your feedback to 1-2 sentences.`;

    try {
      const imageBase64 = fs.readFileSync(latestScreenshotPath, { encoding: 'base64' });
      const critique = await sharedState.callOllama(prompt, imageBase64);
      sharedState.say(`🎨 ${critique.trim()}`);
      latestScreenshotPath = null; // Consume the screenshot
    } catch (e) {
      console.error('Failed to get vision critique from Ollama.', e);
      sharedState.say("I'm having trouble seeing right now... please check the console.");
    }
  };

  bot.on('login', () => {
    startScreenshotWatcher();

    // Register the critique command
    if (sharedState.registerCommand) {
      sharedState.registerCommand('critique', (username) => {
        sharedState.say("So you want my opinion? Bold! Let's see what you've built.");
        critiqueBuild();
      });
    }
  });
};