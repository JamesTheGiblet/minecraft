/**
 * @file CobbleWright - An AI-powered Minecraft architectural assistant.
 * This is the main entry point for the bot. It's designed as a "thin" loader.
 * Its only jobs are to load configuration, create the bot instance, load
 * knowledge bases, and initialize all plugins from the /plugins directory.
 */

const fs = require('fs/promises');
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
    const data = await fs.readFile(configPath, 'utf8');
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
  const dataDir = path.join(__dirname, 'data');
  await processDirectory(dataDir);
}

async function processDirectory(directory) {
  try {
    const dirents = await fs.readdir(directory, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(directory, dirent.name);
      if (dirent.isDirectory()) {
        await processDirectory(fullPath); // Recurse into subdirectories
      } else if (dirent.isFile() && (dirent.name.endsWith('.json') || dirent.name.endsWith('.sc.json'))) {
        await loadAndCacheFile(fullPath);
      }
    }
  } catch (error) {
    console.error('Error loading knowledge bases:', error);
  }
}

async function loadAndCacheFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const finalKey = (ext === '.sc.json' ? `${baseName.toUpperCase()}.SC` : `${baseName.toUpperCase()}_DATA`);
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
function loadPlugins(sharedState) {
  const pluginsDir = path.join(__dirname, 'plugins'); // Corrected path
  const corePlugin = 'commands.js';

  // --- Phase 1: Load the core command plugin first ---
  // This is critical to ensure `registerCommand` and the master chat listener are available
  // before any other plugins try to use them. This prevents race conditions.
  try {
    const pluginPath = path.join(pluginsDir, corePlugin);
    const plugin = require(pluginPath);
    plugin(bot, sharedState);
    console.log(`[PluginLoader] Loaded core plugin: ${corePlugin}`);
  } catch (e) {
    console.error(`[PluginLoader] CRITICAL: Failed to load core plugin ${corePlugin}. Commands will not work.`, e);
  }

  // --- Phase 2: Load all other standard plugins ---
  fs.readdir(pluginsDir) // Corrected path
    .then(files => {
      files.forEach(file => {
        if (file.endsWith('.js') && file !== corePlugin) {
          try {
            const plugin = require(path.join(pluginsDir, file));
            plugin(bot, sharedState);
            console.log(`[PluginLoader] Loaded plugin: ${file}`);
          } catch (e) {
            console.error(`[PluginLoader] Failed to load plugin ${file}:`, e);
          }
        }
      });
    })
    .catch(err => {
      console.error('Failed to read plugins directory.', err);
    });
}

async function main() {
  console.log('CobbleWright is starting...');
  await loadConfig();
  await loadKnowledgeBases();

  const mineflayer = require('mineflayer'); // Move require here to avoid circular dependency issues

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
    getArchitectAdvice: async () => {}, // Will be overridden by brain.js
    getInspiration: async () => {}, // Will be overridden by brain.js
    callOllama: async () => {}, // Will be overridden by brain.js
    botMode: 'idle', // Current bot mode: 'idle', 'assisting', 'gathering', 'patrolling'
    pointsOfInterest: new Map(), // Stores named locations discovered by the bot.
    isBusy: false, // Global flag for long-running tasks like gather/blueprint
    isCancelled: false, // Flag to signal task cancellation
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
    }
  };

  // Pass the fully constructed sharedState to the plugin loader.
  loadPlugins(sharedState);

  bot.once('login', () => {
    const { Movements } = require('mineflayer-pathfinder');
    const mcData = require('minecraft-data')(bot.version);
    sharedState.safeMovements = new Movements(bot, mcData);
    sharedState.safeMovements.canDig = false;
    sharedState.safeMovements.canOpenDoors = true;

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

// --- Main Execution ---
main();
