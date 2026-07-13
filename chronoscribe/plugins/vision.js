/**
 * @file This plugin handles the vision capabilities of the bot.
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

module.exports = (bot, sharedState) => {
  const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

  let latestScreenshotPath = null;
  let screenshotRootPath = null;

  const normalizeForComparison = (inputPath) => process.platform === 'win32' ? inputPath.toLowerCase() : inputPath;

  const isInsideRoot = (candidatePath) => {
    if (!screenshotRootPath) return false;

    const root = normalizeForComparison(path.resolve(screenshotRootPath));
    const candidate = normalizeForComparison(path.resolve(candidatePath));
    return candidate === root || candidate.startsWith(`${root}${path.sep}`);
  };

  const validateScreenshotPath = (candidatePath) => {
    try {
      const resolvedPath = path.resolve(candidatePath);
      if (!isInsideRoot(resolvedPath)) return null;

      const lstat = fs.lstatSync(resolvedPath);
      if (!lstat.isFile() || lstat.isSymbolicLink()) return null;

      const ext = path.extname(resolvedPath).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) return null;

      const realPath = fs.realpathSync(resolvedPath);
      if (!isInsideRoot(realPath)) return null;

      const stat = fs.statSync(realPath);
      if (!stat.isFile()) return null;
      if (stat.size <= 0 || stat.size > MAX_SCREENSHOT_BYTES) return null;

      return realPath;
    } catch (_err) {
      return null;
    }
  };

  const startScreenshotWatcher = () => {
    const screenshotPath = sharedState.CONFIG.SCREENSHOTS_PATH;
    if (!screenshotPath || !fs.existsSync(screenshotPath)) {
      console.warn(`[Vision] Screenshot path not found or not configured: ${screenshotPath}`);
      console.warn('[Vision] Vision capabilities will be disabled.');
      return;
    }

    screenshotRootPath = path.resolve(screenshotPath);
    if (!fs.statSync(screenshotRootPath).isDirectory()) {
      console.warn(`[Vision] Screenshot path is not a directory: ${screenshotRootPath}`);
      console.warn('[Vision] Vision capabilities will be disabled.');
      return;
    }

    console.log(`[Vision] Watching for screenshots in: ${screenshotRootPath}`);
    const watcher = chokidar.watch(screenshotRootPath, { ignored: /^\./, persistent: true });
    watcher.on('add', (filePath) => {
      const validatedPath = validateScreenshotPath(filePath);
      if (!validatedPath) {
        console.warn(`[Vision] Ignoring unsafe or unsupported screenshot path: ${filePath}`);
        return;
      }

      console.log(`[Vision] New screenshot detected: ${validatedPath}`);
      latestScreenshotPath = validatedPath;
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
      const validatedPath = validateScreenshotPath(latestScreenshotPath);
      if (!validatedPath) {
        latestScreenshotPath = null;
        sharedState.say("I could not validate the latest screenshot safely. Please take a new screenshot and try again.");
        return;
      }

      const imageBase64 = fs.readFileSync(validatedPath, { encoding: 'base64' });
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