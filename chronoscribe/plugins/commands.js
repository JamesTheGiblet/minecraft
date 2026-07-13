/**
 * @file This plugin provides the master command handling system.
 * Other plugins can register their commands here.
 */

const http = require('http');

// Helper function to introduce a delay in async functions.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = (bot, sharedState) => {
  const commands = {};

  // Function for other plugins to register their commands
  const registerCommand = (name, handler, aliases = []) => {
    commands[name] = handler;
    aliases.forEach(alias => {
      commands[alias] = handler;
    });
  };

  // Register base commands
  registerCommand('help', (username) => {
    sharedState.say("I'm here to help with builds! Say 'build' for ideas or 'materials' for an inventory check.");
  });

  registerCommand('materials', (username) => {
    const inv = sharedState.getInventorySummary(username);
    const materialMsg = `Inventory: ${inv.woodLogs} logs, ${inv.planks} planks, ${inv.stone} stone. Total: ${inv.total} blocks.`;
    sharedState.say(materialMsg);
  }, ['m']);

  registerCommand('roast', (username) => {
    sharedState.say("🔥 Roasting is for furnaces, not builds! Let me help you upgrade it instead.");
  });

  registerCommand('inspire', (username) => {
    sharedState.say("Gazing into the creative ether for you...");
    sharedState.getInspiration();
  });

  registerCommand('status', async (username) => {
    sharedState.say("Running diagnostics, one moment...");
    await delay(500);
  
    // Uptime Calculation
    const uptimeSec = Math.floor((Date.now() - sharedState.startTime) / 1000);
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;
    sharedState.say(`- Uptime: ${hours}h ${minutes}m ${seconds}s`);
    await delay(500);
  
    // Ollama Status Check
    const checkOllama = new Promise((resolve) => {
      const req = http.get(`http://${sharedState.CONFIG.OLLAMA_HOST}:${sharedState.CONFIG.OLLAMA_PORT}`, res => {
        resolve(res.statusCode === 200 ? '🟢 Online' : `🟡 Status ${res.statusCode}`);
      }).on('error', (err) => {
        console.warn('[Status] Ollama check failed:', err.message);
        resolve('🔴 Offline');
      });
      req.setTimeout(2000, () => { // Add a timeout to prevent long hangs
        req.destroy();
        resolve('🔴 Offline (Timeout)');
        });
    });
    const ollamaStatus = await checkOllama;
    sharedState.say(`- Ollama Status: ${ollamaStatus}`);
    await delay(500);
  
    // Memory Capsule Status
    const unreviewedCount = sharedState.memoryLog.filter(e => e.type === 'advice' && e.outcome === 'unknown' && e.context.username === username).length;
    sharedState.say(`- Memory Capsules: ${sharedState.memoryLog.length} total, ${unreviewedCount} unreviewed for you.`);
  });

  registerCommand('style', (username, args) => {
    const requestedStyle = args[1];
    const playerState = sharedState.playerStates.get(username);
    if (!requestedStyle) {
      sharedState.say(`My current focus for you is on '${playerState.currentStyle}' builds. To change it, say 'style <name>'. Available styles: ${Object.keys(sharedState.STYLES_DATA).join(', ')}.`);
    } else if (sharedState.STYLES_DATA[requestedStyle] || requestedStyle === 'any') {
      playerState.currentStyle = requestedStyle;
      sharedState.say(`Architectural style for ${username} set to: ${playerState.currentStyle}. My advice will now reflect this vision!`);
    } else {
      sharedState.say(`I don't have '${requestedStyle}' in my architectural library. Available styles: ${Object.keys(sharedState.STYLES_DATA).join(', ')}.`);
    }
  });

  registerCommand('come', (username, args) => {
    sharedState.say("On my way!");

    // 1. Signal cancellation to any running tasks.
    sharedState.isCancelled = true;
    sharedState.isBusy = false;

    // 2. Immediately stop physical actions.
    bot.stopDigging();
    bot.clearControlStates();

    // 3. Set the new goal to follow the player.
    const player = bot.players[username];
    if (player && player.entity) {
      sharedState.applySafeMovements();
      const { GoalFollow } = require('mineflayer-pathfinder').goals;
      const goal = new GoalFollow(player.entity, 1);
      bot.pathfinder.setGoal(goal, true);
    }

    // 4. Reset the cancellation flag after a short delay so new tasks can be started.
    setTimeout(() => { sharedState.isCancelled = false; }, 1000);
  }, ['here', 'return']);

  // The main build command
  const buildHandler = (username) => {
    sharedState.say(`Ah, ${username} said the magic word! One moment...`);
    setTimeout(() => sharedState.getArchitectAdvice(username, 'chat'), 500);
  };
  registerCommand('build', buildHandler, ['house', 'base']);

  // Expose the register function to the shared state so other plugins can use it
  sharedState.registerCommand = registerCommand;

  // Master chat listener
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    sharedState.updatePlayerActivity(username);

    const args = message.trim().split(/ +/);
    const commandName = args[0].toLowerCase();

    // Check if the first word of the message is a registered command.
    if (commands.hasOwnProperty(commandName)) {
      // Execute the command's handler function, passing the player's name and the original (non-lowercased) arguments.
      commands[commandName](username, args);
    }
  });
};