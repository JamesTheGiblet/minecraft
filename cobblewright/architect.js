/**
 * @file CobbleWright - An AI-powered Minecraft architectural assistant.
 * This is the main entry point for the bot. It's designed as a "thin" loader.
 * Its only jobs are to load configuration, create the bot instance, load
 * knowledge bases, and initialize all plugins from the /plugins directory.
 */

const fs = require('fs');
const fsPromises = require('fs/promises');
const net = require('net');
const path = require('path');
const tts = require('say');

// Helper function to introduce a delay in async functions.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let CONFIG;
const KNOWLEDGE_BASES = {};
let bot;

async function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const data = await fsPromises.readFile(configPath, 'utf8');
    CONFIG = JSON.parse(data);
  } catch (e) {
    console.error('CRITICAL: Error reading config.json. Please ensure it exists and is valid.', e);
    process.exit(1);
  }
}

/**
 * @description Dynamically loads all .json files from the /data directory.
 */
async function loadKnowledgeBases() {
  // Load modern Semantic Capsules from data/S.C/
  await processDirectory(path.join(__dirname, 'data', 'S.C'), KNOWLEDGE_BASES);

  // Load agent-specific capsules
  const agentName = CONFIG.AGENT_NAME || 'prime';
  await processDirectory(path.join(__dirname, 'packages', 'agents', agentName), KNOWLEDGE_BASES);
}

function shouldIngestKnowledgeFile(fullPath, approvedJsonFiles) {
  const normalizedPath = String(fullPath).replace(/\\/g, '/');
  const fileName = path.basename(fullPath);

  // Semantic capsules are first-class and always allowed.
  if (normalizedPath.endsWith('.sc.json')) return true;
}

async function processDirectory(directory, knowledgeBases) {
  try {
    const dirents = await fsPromises.readdir(directory, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(directory, dirent.name);
      if (dirent.isDirectory()) {
        // No longer recursing to keep loading paths explicit and shallow.
      } else if (dirent.isFile() && shouldIngestKnowledgeFile(fullPath)) {
        await loadAndCacheFile(fullPath);
      }
    }
  } catch (error) {
    console.error('Error loading knowledge bases:', error);
  }
}

async function loadAndCacheFile(filePath) {
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const finalKey = (ext === '.sc.json' ? `${baseName.toUpperCase()}.SC` : `${baseName.toUpperCase()}`);
    KNOWLEDGE_BASES[finalKey] = JSON.parse(data);
    console.log(`[Knowledge] Loaded data from ${path.basename(filePath)} into ${finalKey}.`);
  } catch (fileError) {
    console.error(`[Knowledge] Failed to load ${path.basename(filePath)}:`, fileError);
  }
}

/**
 * @description Waits for the Minecraft server to be online before connecting.
 * @param {string} host - The server host.
 * @param {number} port - The server port.
 */
async function waitForServer(host, port) {
  console.log(`Pinging Minecraft server at ${host}:${port} to check readiness...`);
  let serverReady = false;
  while (!serverReady) {
    try {
      await new Promise((resolve, reject) => {
        // Keep startup dependency-light: wait until the Minecraft TCP port is accepting connections.
        const socket = net.createConnection({ host, port });

        socket.setTimeout(5000);

        socket.once('connect', () => {
          socket.destroy();
          resolve();
        });

        socket.once('timeout', () => {
          socket.destroy();
          reject(new Error('connection timed out'));
        });

        socket.once('error', (err) => {
          socket.destroy();
          reject(err);
        });
      });
      serverReady = true;
      console.log('✅ Server is online! Proceeding with bot connection.');
    } catch (error) {
      console.log(`...server is not ready yet. Retrying in 5 seconds. (Reason: ${error.message})`);
      await delay(5000); // Wait 5 seconds before retrying.
    }
  }
}
// --- PLUGIN LOADER ---

/**
 * @description Loads all plugins from the /plugins directory.
 * This function is the heart of the extensible architecture. It dynamically
 * reads the contents of the `/plugins` directory and `require`s each file.
 * This means adding a new feature is as simple as dropping a new file into
 * the directory, with no changes needed to the core bot code.
 */
async function loadPlugins(sharedState) {
  const agentName = sharedState.CONFIG.AGENT_NAME || 'prime';
  const corePluginsDir = path.join(__dirname, 'packages', 'core', 'plugins');
  const agentPluginsDir = path.join(__dirname, 'packages', 'agents', agentName);
  const corePlugin = 'commands.js';

  // --- Phase 1: Load the core command plugin first ---
  // This is critical to ensure `registerCommand` and the master chat listener are available
  // before any other plugins try to use them. This prevents race conditions.
  try {
    const coreCommandsPath = path.join(corePluginsDir, corePlugin);
    if (fs.existsSync(coreCommandsPath)) {
      const plugin = require(coreCommandsPath);
      plugin(bot, sharedState);
      console.log(`[PluginLoader] Loaded core plugin: ${corePlugin}`);
    } else {
      throw new Error(`${corePlugin} not found in core package.`);
    }
  } catch (e) {
    console.error(`[PluginLoader] CRITICAL: Failed to load core plugin ${corePlugin}. Commands will not work.`, e);
  }
  
  // --- Phase 2: Load all shared plugins from the core package ---
  try {
    const files = await fsPromises.readdir(corePluginsDir);
    files.forEach(file => {
      if (file.endsWith('.js') && file !== corePlugin) {
        try {
          const plugin = require(path.join(corePluginsDir, file));
          plugin(bot, sharedState);
          console.log(`[PluginLoader] Loaded plugin: ${file}`);
        } catch (e) {
          console.error(`[PluginLoader] Failed to load plugin ${file}:`, e);
        }
      }
    });
  } catch (err) {
    console.error('Failed to read plugins directory.', err);
  }
  
    // --- Phase 3: Load agent-specific plugins ---
  if (fs.existsSync(agentPluginsDir)) {
    try {
      const files = await fsPromises.readdir(agentPluginsDir, { withFileTypes: true });
      files.forEach(dirent => {
        if (dirent.isFile() && dirent.name.endsWith('.js')) {
          try {
            const plugin = require(path.join(agentPluginsDir, dirent.name));
            plugin(bot, sharedState);
            console.log(`[PluginLoader] Loaded agent-specific plugin for '${agentName}': ${dirent.name}`);
          } catch (e) {
            console.error(`[PluginLoader] Failed to load agent plugin ${dirent.name}:`, e);
          }
        }
      });
    } catch (err) {
      console.log(`No agent-specific plugins found for '${agentName}'. This is normal.`);
    }
  }
}

async function main() {
  console.log('CobbleWright is starting...');
  await loadConfig();
  await loadKnowledgeBases();

  const mineflayer = require('mineflayer'); // Move require here to avoid circular dependency issues
  const configuredFollowDistance = Number.parseInt(CONFIG?.FOLLOW_DISTANCE, 10);
  const followDistance = Number.isInteger(configuredFollowDistance) && configuredFollowDistance >= 1
    ? configuredFollowDistance
    : 2;

  const host = CONFIG?.bot?.host || 'localhost';
  const port = CONFIG?.bot?.port || 25565;
  await waitForServer(host, port);

  bot = mineflayer.createBot({
    host,
    port,
    username: CONFIG.BOT_NAME,
    version: '1.21.1'
  });

  function say(message) {
    console.log(`[CHAT] ${message}`);
    bot.chat(message);

    if (CONFIG.USE_TTS) {
      const cleanMessage = message.replace(/🏛️|📐|✨|🪓|📦|🏗️|🔥|💀/g, '');
      tts.speak(cleanMessage);
    }
  }

  const sharedState = {
    CONFIG,
    ...KNOWLEDGE_BASES,
    bot,
    memoryLog: [],
    startTime: Date.now(),
    playerStates: new Map(),
    say,
    safeMovements: null,
    nonDestructiveMovements: null,
    getArchitectAdvice: async () => {}, // Will be overridden by brain.js
    getInspiration: async () => {}, // Will be overridden by brain.js
    callOllama: async () => {}, // Will be overridden by brain.js
    botMode: 'idle', // Current bot mode: 'idle', 'assisting', 'gathering', 'patrolling'
    pointsOfInterest: new Map(), // Stores named locations discovered by the bot.
    isBusy: false, // Global flag for long-running tasks like gather/blueprint
    isCancelled: false, // Flag to signal task cancellation
    followTarget: null,
    governor: 'unclaimed', // 'unclaimed', 'narrative_loop'
    followNoDigActive: false,
    analyzeBuildArea: () => null, // Will be overridden by build-logic.js
    getActiveProject: async () => null, // Will be overridden by project-manager.js
    updateProjectFromAdvice: async () => {}, // Will be overridden by project-manager.js
    findRelevantMemories: async () => [], // Will be overridden by long-term-memory.js
    getHomePosition: () => null, // Will be overridden by survival.js
    getHomeRadius: () => 16, // Will be overridden by survival.js,
    getInventorySummary: () => ({}), // Will be overridden by inventory-manager.js
    applySafeMovements: () => {
      if (sharedState.safeMovements) {
        bot.pathfinder.setMovements(sharedState.safeMovements);
      }
    },
    applyNonDestructiveMovements: () => {
      if (sharedState.nonDestructiveMovements) {
        bot.pathfinder.setMovements(sharedState.nonDestructiveMovements);
      } else if (sharedState.safeMovements) {
        bot.pathfinder.setMovements(sharedState.safeMovements);
      }
    },
    runBusyTask: async (task) => {
      sharedState.isBusy = true;
      try {
        return await task();
      } finally {
        sharedState.isBusy = false;
      }
    },
    updatePlayerActivity: (username) => {
      if (sharedState.playerStates.has(username)) {
        sharedState.playerStates.get(username).lastActivityTime = Date.now();
      }
    },
    startFollowingPlayer: (username, options = {}) => {
      const player = bot.players?.[username];
      if (!player?.entity || !bot.pathfinder) return false;

      sharedState.isCancelled = true;
      sharedState.isBusy = false;
      bot.stopDigging();
      bot.clearControlStates();

      if (typeof sharedState.applyNonDestructiveMovements === 'function') {
        sharedState.applyNonDestructiveMovements();
      } else {
        sharedState.applySafeMovements();
      }

      const { GoalFollow } = require('mineflayer-pathfinder').goals;

      // Follow mode must never break player builds while navigating indoors.
      sharedState.followNoDigActive = true;
      if (sharedState.safeMovements) sharedState.safeMovements.canDig = false;
      if (sharedState.nonDestructiveMovements) sharedState.nonDestructiveMovements.canDig = false;

      bot.pathfinder.setGoal(new GoalFollow(player.entity, followDistance), true);

      sharedState.followTarget = username;
      sharedState.botMode = 'assisting';

      const message = typeof options.message === 'string' ? options.message.trim() : '';
      if (message) {
        sharedState.say(message);
      }

      setTimeout(() => {
        sharedState.isCancelled = false;
      }, 1000);

      return true;
    },
    stopFollowingPlayer: () => {
      sharedState.followTarget = null;
      sharedState.followNoDigActive = false;

      const canDigConfigured = sharedState?.CONFIG?.PATHFIND_CAN_DIG;
      const canDig = typeof canDigConfigured === 'boolean' ? canDigConfigured : true;
      if (sharedState.safeMovements) sharedState.safeMovements.canDig = canDig;
      if (sharedState.nonDestructiveMovements) sharedState.nonDestructiveMovements.canDig = false;

      if (bot.pathfinder && typeof bot.pathfinder.stop === 'function') {
        bot.pathfinder.stop();
      }
    }
  };

  // Pass the fully constructed sharedState to the plugin loader.
  await loadPlugins(sharedState);

  // --- SEQUENTIAL BOOT SEQUENCE ---
  // After plugins are loaded, hand off to the bootstrapper.
  // This ensures a stable, ordered startup.
  runBootSequence(sharedState).catch(err => {
    console.error('[Bootstrapper] A critical boot stage failed:', err.message);
    process.exit(1);
  });

  bot.once('login', () => {
    const { Movements } = require('mineflayer-pathfinder');
    const mcData = require('minecraft-data')(bot.version);
    const canDigConfigured = sharedState?.CONFIG?.PATHFIND_CAN_DIG;
    const canDig = typeof canDigConfigured === 'boolean' ? canDigConfigured : true;

    // Initialize safeMovements with default canDig settings.
    sharedState.safeMovements = new Movements(bot, mcData);
    sharedState.safeMovements.canDig = canDig;
    sharedState.safeMovements.canOpenDoors = true;

    // Initialize nonDestructiveMovements with canDig explicitly false.
    sharedState.nonDestructiveMovements = new Movements(bot, mcData);
    sharedState.nonDestructiveMovements.canDig = false;
    sharedState.nonDestructiveMovements.canOpenDoors = true;

    console.log(`[Movement] Pathfinder canDig=${sharedState.safeMovements.canDig}, followCanDig=${sharedState.nonDestructiveMovements.canDig}, followDistance=${followDistance}.`);

    setTimeout(() => {
      if (CONFIG.USE_TTS) {
        tts.speak('CobbleWright the Architect has arrived! I see potential in every block...');
      }
    }, 2000);
  });

  bot.on('error', (err) => {
    console.error(err);
    console.log('⚠️  Connection issue:');
    console.log('   Make sure your Minecraft world is open to LAN!');
    console.log('   (Esc → Open to LAN → Start LAN World)');
  });

  console.log('\n🏛️  CobbleWright is analyzing the terrain...');
  console.log('📐 Say "build" in chat for instant advice!');
  console.log('📦 Say "materials" to check your inventory');
  console.log('🔄 Make sure your world is open to LAN (Esc → Open to LAN)\n');
}

async function runBootSequence(sharedState) {
  const bootDir = path.join(__dirname, 'packages', 'core', 'boot');
  const bootStageDelay = sharedState.CONFIG.BOOT_STAGE_DELAY_MS || 2000;

  try {
    const files = await fsPromises.readdir(bootDir);
    const bootStages = files.filter(f => f.endsWith('.js')).sort();

    for (const stageFile of bootStages) {
      console.log(`[Bootstrapper] Running boot stage: ${stageFile}...`);
      const stage = require(path.join(bootDir, stageFile));
      await stage(bot, sharedState);
      console.log(`[Bootstrapper] ...${stageFile} completed successfully.`);
      await delay(bootStageDelay);
    }

    console.log('[Bootstrapper] All boot stages completed. CobbleWright is fully operational.');

  } catch (err) {
    console.error(`[Bootstrapper] Failed to execute boot sequence:`, err);
    throw err; // Re-throw to be caught by the main error handler.
  }
}

// --- Main Execution ---
main().catch(err => {
  console.error("An unhandled error occurred in main:", err);
  process.exit(1);
});

process.on('beforeExit', (code) => {
  // This event fires on a clean shutdown. If the genesis builder succeeded,
  // its config will be marked for saving.
  if (global.genesisConfig && global.genesisConfig.saveOnExit) {
    fs.writeFileSync(global.genesisConfig.path, JSON.stringify(global.genesisConfig.data, null, 2));
    console.log('[Architect] Saved successful Genesis configuration.');
  }
});
