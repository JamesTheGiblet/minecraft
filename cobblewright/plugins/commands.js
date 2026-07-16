/**
 * @file This plugin provides the master command handling system.
 * Other plugins can register their commands here.
 */

const http = require('http');

// Helper function to introduce a delay in async functions.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = (bot, sharedState) => {
  const commands = {};
  const pendingInteractions = new Map();
  const pendingInteractionTtlMs = 2 * 60 * 1000;

  const normalizeReply = (value) => String(value || '').trim().toLowerCase();

  const clearPendingInteraction = (username) => {
    pendingInteractions.delete(username);
  };

  const getPendingInteraction = (username) => {
    const pending = pendingInteractions.get(username);
    if (!pending) return null;

    if (pending.expiresAt && Date.now() > pending.expiresAt) {
      pendingInteractions.delete(username);
      return null;
    }

    return pending;
  };

  const setPendingInteraction = (username, interaction) => {
    if (!username || !interaction) return null;

    const record = {
      ...interaction,
      createdAt: Date.now(),
      expiresAt: Date.now() + (interaction.ttlMs || pendingInteractionTtlMs)
    };

    pendingInteractions.set(username, record);
    return record;
  };

  const consumePendingInteraction = async (username, message) => {
    const pending = getPendingInteraction(username);
    if (!pending) return false;

    if (normalizeReply(message) === 'cancel') {
      clearPendingInteraction(username);
      sharedState.say('Okay, I cancelled that follow-up.');
      return true;
    }

    if (typeof pending.handle !== 'function') {
      clearPendingInteraction(username);
      return false;
    }

    const result = await pending.handle({
      username,
      message,
      normalizedMessage: normalizeReply(message),
      pending,
      clear: () => clearPendingInteraction(username),
      say: sharedState.say
    });

    if (result === false) {
      return false;
    }

    if (!result || result.clear !== false) {
      clearPendingInteraction(username);
    }

    if (result?.say) {
      sharedState.say(result.say);
    }

    return true;
  };

  const executeCommand = (commandName, username, args = []) => {
    const handler = commands[commandName];
    if (!handler) return false;
    handler(username, args.length > 0 ? args : [commandName]);
    return true;
  };

  // Function for other plugins to register their commands
  const registerCommand = (name, handler, aliases = []) => {
    commands[name] = handler;
    aliases.forEach(alias => {
      commands[alias] = handler;
    });
  };

  // Register base commands
  registerCommand('help', (username) => {
    sharedState.say("I'm here to help with builds, farm work, and structure support! Say 'build' for ideas, 'materials' for an inventory check, 'farm' for crop tending, or 'assist' to help fill a frame.");
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
    sharedState.getInspiration(username);
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

  registerCommand('botstatus', (username) => {
    const mode = sharedState.botMode || 'unknown';
    sharedState.say(`My current status is: ${mode}. ${sharedState.isBusy ? 'I am currently busy with a task.' : ''}`);
  }, ['bstatus']);

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

  registerCommand('goto', (username, args) => {
    const poiName = args.slice(1).join(' ');

    if (!poiName) {
      if (sharedState.pointsOfInterest.size === 0) {
        sharedState.say("I haven't discovered any points of interest yet. I'll keep an eye out on my next patrol!");
        return;
      }
      const knownPlaces = Array.from(sharedState.pointsOfInterest.keys()).join('; ');
      sharedState.say(`I know of these locations: ${knownPlaces}. Which one do you want to go to? (e.g., /goto Village near [x, z])`);
      return;
    }

    const destination = sharedState.pointsOfInterest.get(poiName);
    if (destination) {
      sharedState.say(`Alright, leading the way to ${poiName}! Follow me.`);
      sharedState.applySafeMovements();
      const { GoalNear } = require('mineflayer-pathfinder').goals;
      bot.pathfinder.setGoal(new GoalNear(destination.x, destination.y, destination.z, 1));
    } else {
      sharedState.say(`I don't recognize the location "${poiName}". Try '/goto' to see the list of places I know.`);
    }
  }, ['lead']);

  // The main build command
  const buildHandler = (username) => {
    sharedState.say(`Ah, ${username} said the magic word! One moment...`);
    setTimeout(() => sharedState.getArchitectAdvice(username, 'chat'), 500);
  };
  registerCommand('build', buildHandler, ['house', 'base']);

  const parseNaturalIntent = (message) => {
    const text = String(message || '').trim();
    const lower = text.toLowerCase();

    if (!text) return null;

    const mentionRegex = new RegExp(`\\b${bot.username.toLowerCase()}\\b`, 'i');
    const addressedToBot = mentionRegex.test(lower) || lower.includes('cobblewright') || lower.includes('chrono');

    const advicePattern = /(what should we build|what should i build|build next|any build ideas|need advice|give me advice|plan for|project idea)/;
    const inspirationPattern = /(inspire me|need inspiration|creative idea|give me an idea)/;
    const materialsPattern = /(what materials|how many materials|inventory check|check inventory|material count)/;
    const statusPattern = /(bot status|system status|diagnostic|diagnostics|are you online|health check)/;
    const critiquePattern = /(critique|rate my build|what do you think of my build|feedback on my build)/;
    const weatherPattern = /(what's the weather|what is the weather|weather status|is it raining|clear the weather|weather clear)/;
    const gatherPattern = /(gather|collect|get)\s+(\d+)?\s*([a-z0-9_ ]{2,40})/i;
    const farmPattern = /(farm|harvest crops|tend the farm|plant crops|work the farm|crop farm)/;
    const assistPattern = /(assist build|help build|fill walls|complete frame|finish frame|help with the build|build with me|support the frame|pillar support)/;

    if (advicePattern.test(lower) && (addressedToBot || lower.includes('?'))) {
      return { command: 'build', args: ['build'] };
    }

    if (inspirationPattern.test(lower) && addressedToBot) {
      return { command: 'inspire', args: ['inspire'] };
    }

    if (materialsPattern.test(lower) && addressedToBot) {
      return { command: 'materials', args: ['materials'] };
    }

    if (statusPattern.test(lower) && addressedToBot) {
      return { command: 'status', args: ['status'] };
    }

    if (critiquePattern.test(lower) && addressedToBot) {
      return { command: 'critique', args: ['critique'] };
    }

    if (weatherPattern.test(lower) && addressedToBot) {
      if (lower.includes('clear')) return { command: 'weather', args: ['weather', 'clear'] };
      return { command: 'weather', args: ['weather'] };
    }

    if (addressedToBot && gatherPattern.test(lower)) {
      const match = lower.match(gatherPattern);
      if (match) {
        const amount = match[2] ? match[2].trim() : '';
        const itemName = match[3].trim().replace(/\s+/g, '_');
        const args = amount ? ['gather', itemName, amount] : ['gather', itemName];
        return { command: 'gather', args };
      }
    }

    if (addressedToBot && farmPattern.test(lower)) {
      if (/(set|mark|define).*(farm|field)|farm.*(set|mark|define)/.test(lower)) {
        return { command: 'farm', args: ['farm', 'set'] };
      }

      if (/(stop|pause|disable).*(farm)|farm.*(stop|pause|disable)/.test(lower)) {
        return { command: 'farm', args: ['farm', 'stop'] };
      }

      if (/(status|ready|doing).*(farm)|farm.*(status|ready|doing)/.test(lower)) {
        return { command: 'farm', args: ['farm', 'status'] };
      }

      return { command: 'farm', args: ['farm', 'tend'] };
    }

    if (addressedToBot && assistPattern.test(lower)) {
      if (/(pillars?|posts?|columns?)/.test(lower)) {
        return { command: 'assist', args: ['assist', 'pillars'] };
      }

      if (/(status|ready|overview|how is it going)/.test(lower)) {
        return { command: 'assist', args: ['assist', 'status'] };
      }

      if (/(all|everything|full)/.test(lower)) {
        return { command: 'assist', args: ['assist', 'all'] };
      }

      return { command: 'assist', args: ['assist', 'walls'] };
    }

    if (addressedToBot && lower.includes('project')) {
      if (/(project status|status of (the )?project|how.*project.*going)/.test(lower)) {
        return { command: 'project', args: ['project', 'status'] };
      }
      if (/(project next|next step.*project|what.*next.*project)/.test(lower)) {
        return { command: 'project', args: ['project', 'next'] };
      }
      if (/(project done|mark .* done|completed .* project task)/.test(lower)) {
        const cleaned = text.replace(/^.*?(project done|mark|completed)\s*/i, '').trim();
        const args = cleaned ? ['project', 'done', ...cleaned.split(/\s+/)] : ['project', 'done'];
        return { command: 'project', args };
      }
      if (/(start|begin|create).*(project)|project.*(start|begin|create)/.test(lower)) {
        const objective = text
          .replace(/^.*?(start|begin|create)\s+(a\s+)?project\s*(called|named)?\s*/i, '')
          .replace(/^.*?project\s*(called|named)?\s*/i, '')
          .trim();
        const args = objective ? ['project', 'start', ...objective.split(/\s+/)] : ['project', 'start'];
        return { command: 'project', args };
      }
    }

    return null;
  };

  // Expose the register function to the shared state so other plugins can use it
  sharedState.registerCommand = registerCommand;
  sharedState.setPendingConversation = setPendingInteraction;
  sharedState.getPendingConversation = getPendingInteraction;
  sharedState.clearPendingConversation = clearPendingInteraction;
  sharedState.consumePendingConversation = consumePendingInteraction;

  // Master chat listener
  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    sharedState.updatePlayerActivity(username);

    const args = message.trim().split(/ +/);
    const commandName = args[0].toLowerCase();

    // Check if the first word of the message is a registered command.
    if (commands.hasOwnProperty(commandName)) {
      clearPendingInteraction(username);
      // Execute the command's handler function, passing the player's name and the original (non-lowercased) arguments.
      executeCommand(commandName, username, args);
      return;
    }

    const pending = getPendingInteraction(username);
    if (pending) {
      const handled = await consumePendingInteraction(username, message);
      if (handled) return;
    }

    // Fall back to natural-language intent routing when no exact command is found.
    const intent = parseNaturalIntent(message);
    if (intent && intent.command) {
      clearPendingInteraction(username);
      executeCommand(intent.command, username, intent.args);
    }
  });
};