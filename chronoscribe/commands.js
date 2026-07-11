/**
 * @file This plugin provides the master command handling system.
 * Other plugins can register their commands here.
 */

const http = require('http');

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
  });

  registerCommand('roast', (username) => {
    sharedState.say("🔥 Roasting is for furnaces, not builds! Let me help you upgrade it instead.");
  });

  registerCommand('inspire', (username) => {
    sharedState.say("Gazing into the creative ether for you...");
    sharedState.getInspiration();
  });

  registerCommand('status', async (username) => {
    sharedState.say("Running diagnostics...");
    const uptimeMs = Date.now() - sharedState.startTime;
    const uptimeSec = Math.floor(uptimeMs / 1000);
    const uptimeMin = Math.floor(uptimeSec / 60);
    const uptimeHours = Math.floor(uptimeMin / 60);

    const unreviewedCount = sharedState.memoryLog.filter(e => e.type === 'advice' && e.outcome === 'unknown' && e.context.username === username).length;

    let ollamaStatus = '🔴 Offline';
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://${sharedState.CONFIG.OLLAMA_HOST}:${sharedState.CONFIG.OLLAMA_PORT}`, res => {
          if (res.statusCode === 200) resolve(); else reject();
        });
        req.on('error', reject);
        req.end();
      });
      ollamaStatus = '🟢 Online';
    } catch (e) {}

    setTimeout(() => sharedState.say(`- Uptime: ${uptimeHours}h ${uptimeMin % 60}m ${uptimeSec % 60}s`), 500);
    setTimeout(() => sharedState.say(`- Ollama Status: ${ollamaStatus}`), 1000);
    setTimeout(() => sharedState.say(`- Memory Capsules: ${sharedState.memoryLog.length} total, ${unreviewedCount} unreviewed.`), 1500);
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

    const args = message.toLowerCase().split(' ');
    const command = args[0];

    if (commands[command]) {
      commandscommand;
    }
  });
};