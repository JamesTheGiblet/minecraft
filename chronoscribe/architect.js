/**
 * @file CobbleWright - An AI-powered Minecraft architectural assistant.
 * This is the main entry point for the bot. It's designed as a "thin" loader.
 * Its only jobs are to load configuration, create the bot instance, and
 * knowledge bases, and all plugins from the /plugins directory.
 */

const mineflayer = require('mineflayer');
const fs = require('fs');
const http = require('http');
const path = require('path');
const tts = require('say');

/**
 * @description Central configuration object for the bot.
 */
let CONFIG;
// We wrap all file loading in try...catch blocks.
// This is a core principle of "graceful failure" from the INTENT.md.
// If a single data file is missing, the bot should warn the user but not crash.
try {
  CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (e) {
  console.error('Error reading config.json. Please ensure it exists and is valid.', e);
  process.exit(1);
}

/**
 * @description Biome knowledge base loaded from JSON.
 */
let BIOME_DATA;
try {
  BIOME_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'biome_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: biome_data.json not found or invalid. Biome-specific context will be limited.');
  BIOME_DATA = {};
}

/**
 * @description Redstone circuit knowledge base loaded from JSON.
 */
let REDSTONE_DATA;
try {
  REDSTONE_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'redstone_circuits.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: redstone_circuits.json not found. Automation advice will be disabled.');
  REDSTONE_DATA = {};
}

/**
 * @description Command knowledge base loaded from JSON.
 */
let COMMANDS_DATA;
try {
  COMMANDS_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'commands_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: commands_data.json not found. Command suggestions will be disabled.');
  COMMANDS_DATA = {};
}

/**
 * @description Entity knowledge base loaded from JSON.
 */
let ENTITY_DATA;
try {
  ENTITY_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'entity_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: entity_data.json not found. Entity awareness will be disabled.');
  ENTITY_DATA = {};
}

/**
 * @description Architectural style knowledge base loaded from JSON.
 */
let STYLES_DATA;
try {
  STYLES_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'styles_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: styles_data.json not found. Style-specific advice will be disabled.');
  STYLES_DATA = {};
}

/**
 * @description Pre-defined structures knowledge base.
 */
let STRUCTURES_DATA;
try {
  STRUCTURES_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'structures.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: structures.json not found. Pre-defined blueprints will be disabled.');
  STRUCTURES_DATA = {};
}

/**
 * @description The main Mineflayer bot instance.
 */
const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: CONFIG.BOT_NAME,
  // Explicitly set the version to avoid auto-detection errors with newer
  // Minecraft clients. Change this to match the version you are running.
  // e.g., "1.20.1", "1.19.4", etc.
  version: '1.21.1'
});

// --- BOT STATE & MEMORY ---
/**
 * @description A log of "Semantic Capsules" representing the bot's memory of events.
 * @type {Array<object>}
 */
let memoryLog = [];
const startTime = Date.now(); // Record the bot's start time for uptime calculation.
let lastAdviceTime = 0; // Timestamp of the last automatic advice.
let currentStyle = 'any'; // The player's preferred building style.
let adviceCount = 0; // Counter for the number of tips given.

/**
 * @description A map to store individual state for each player.
 * @type {Map<string, object>}
 */
const playerStates = new Map();

/**
 * @description Movement profiles for the pathfinder.
 */
let safeMovements;
let gatherMovements;

bot.once('login', () => {
  const { Movements } = require('mineflayer-pathfinder');
  const mcData = require('minecraft-data')(bot.version);
  safeMovements = new Movements(bot, mcData);
  // Safe profile: use doors and paths, never break blocks while navigating.
  safeMovements.canDig = false;
  safeMovements.canOpenDoors = true;
});

// --- BOT EVENT HANDLERS ---

/**
 * @description Handles the bot's successful login to the server.
 * Announces its arrival in the chat.
 */
bot.on('login', () => {
  // Use a timeout to ensure the bot can chat after the world loads.
  setTimeout(() => {
    if (CONFIG.USE_TTS) {
      tts.speak('CobbleWright the Architect has arrived! I see potential in every block...');
    }
  }, 2000);

});

/**
 * @description Handles connection errors and provides helpful troubleshooting advice.
 */
bot.on('error', (err) => {
  console.error(err);
  console.log('⚠️  Connection issue:');
  console.log('   Make sure your Minecraft world is open to LAN!');
  console.log('   (Esc → Open to LAN → Start LAN World)');
});

// --- CORE FUNCTIONS ---

/**
 * @description Helper function to send a message to both the console and in-game chat.
 * @param {string} message - The message to send.
 */
function say(message) {
  console.log(`[CHAT] ${message}`);
  bot.chat(message);

  if (CONFIG.USE_TTS) {
    const cleanMessage = message.replace(/🏛️|📐|✨|🪓|📦|🏗️|🔥|💀/g, '');
    tts.speak(cleanMessage);
  }
}

/**
 * @description Scans the blocks and entities around the player to analyze the situation.
 * @param {string} username - The username of the player to scan around.
 * @returns {{pois: Array<object>, entities: Array<object>, biome: string}|null} Context object or null if player not found.
 */
function scanSurroundings(username) {
  const player = bot.players[username];
  if (!player || !player.entity) return null;

  const pos = player.entity.position;
  const pois = [];
  const entities = [];
  const scanRadius = 16;

  // Helper to get direction
  const getDirection = (dx, dz) => {
    if (Math.abs(dx) > Math.abs(dz)) {
      return dx > 0 ? 'East' : 'West';
    } else {
      return dz > 0 ? 'South' : 'North';
    }
  };

  // Scan for major features
  for (let x = -scanRadius; x <= scanRadius; x += 4) {
    for (let z = -scanRadius; z <= scanRadius; z += 4) {
      if (x === 0 && z === 0) continue;

      const checkPos = pos.offset(x, 0, z);
      const groundBlock = bot.blockAt(checkPos.floored());

      if (!groundBlock) continue;

      const direction = getDirection(x, z);

      // Detect Water
      if (groundBlock.name.includes('water') && !pois.some(p => p.type === 'water')) {
        pois.push({ type: 'water', direction });
      }

      // Detect Forest
      if (groundBlock.name.includes('log') && !pois.some(p => p.type === 'forest')) {
        pois.push({ type: 'forest', direction });
      }

      // Detect Cliff
      const verticalDiff = checkPos.y - pos.y;
      if (Math.abs(verticalDiff) > 5 && !pois.some(p => p.type === 'cliff')) {
        pois.push({ type: 'cliff', direction });
      }

      // Detect Cave Entrance (simple heuristic)
      const blockAbove = bot.blockAt(groundBlock.position.offset(0, 1, 0));
      const blockTwoAbove = bot.blockAt(groundBlock.position.offset(0, 2, 0));
      if (
        groundBlock.name.includes('stone') &&
        blockAbove?.name === 'air' &&
        blockTwoAbove?.name !== 'air' &&
        !pois.some(p => p.type === 'cave')
      ) {
        pois.push({ type: 'cave', direction });
      }
    }
  }

  // Deduplicate POIs by type, keeping the first one found.
  const uniquePois = pois.filter((poi, index, self) =>
    index === self.findIndex((p) => p.type === poi.type)
  );

  // Scan for nearby entities
  for (const entityId in bot.entities) {
    const entity = bot.entities[entityId];
    if (entity === bot.entity || entity.type === 'player' || entity.type === 'object' || entity.username === username) continue;

    const distance = entity.position.distanceTo(pos);
    if (distance <= scanRadius) {
      // Only add one of each type of mob to avoid spamming the context
      if (!entities.some(e => e.name === entity.name)) {
        const direction = getDirection(entity.position.x - pos.x, entity.position.z - pos.z);
        const entityInfo = { name: entity.name, type: entity.type, direction: direction };
        // Add profession for villagers, if available
        if (entity.name === 'villager' && entity.profession) {
          entityInfo.profession = entity.profession;
        }
        entities.push(entityInfo);
      }
    }
  }

  return {
    pois: uniquePois,
    entities: entities,
    biome: bot.blockAt(pos)?.biome?.name || 'unknown'
  };
}

/**
 * @description Summarizes the player's inventory, counting key building materials.
 * @param {string} username - The username of the player whose inventory to check.
 * @returns {{stone: number, dirt: number, woodLogs: number, planks: number, total: number}} An object with counts of materials.
 */
function getInventorySummary(username) {
  // NOTE: This is a limitation of Mineflayer. We can't see other players' inventories.
  // For now, we will use the BOT's inventory as a proxy. The prompt will be adjusted to handle this.
  const player = bot.players[username];
  const items = (player && player.inventory) ? player.inventory.items() : bot.inventory.items();
  const summary = {
    stone: items.filter(i => i.name.includes('stone') || i.name.includes('cobblestone')).reduce((s, i) => s + i.count, 0),
    dirt: items.filter(i => i.name === 'dirt').reduce((s, i) => s + i.count, 0),
    woodLogs: items.filter(i => i.name.includes('log')).reduce((s, i) => s + i.count, 0),
    planks: items.filter(i => i.name.includes('planks')).reduce((s, i) => s + i.count, 0),
    iron_ore: items.filter(i => i.name.includes('iron_ore')).reduce((s, i) => s + i.count, 0),
    coal: items.filter(i => i.name.includes('coal')).reduce((s, i) => s + i.count, 0),
    has_crafting_table: items.some(i => i.name === 'crafting_table'),
    has_furnace: items.some(i => i.name === 'furnace'),
    redstone_dust: items.filter(i => i.name === 'redstone').reduce((s, i) => s + i.count, 0),
    hoppers: items.filter(i => i.name === 'hopper').reduce((s, i) => s + i.count, 0),
    pistons: items.filter(i => i.name.includes('piston')).reduce((s, i) => s + i.count, 0),
    comparators: items.filter(i => i.name === 'comparator').reduce((s, i) => s + i.count, 0),
    repeaters: items.filter(i => i.name === 'repeater').reduce((s, i) => s + i.count, 0),
    total: items.reduce((s, i) => s + i.count, 0)
  };
  return summary;
}

/**
 * @description The core function of the bot. Gathers context, constructs a prompt,
 * calls the LLM, and delivers the advice.
 * @param {string} username - The player to give advice to.
 * @param {('auto'|'chat')} [trigger='auto'] - The reason for the advice request ('auto' for timed, 'chat' for player command).
 * @returns {Promise<void>}
 */
async function getArchitectAdvice(username, trigger = 'auto') {
  const player = bot.players[username];
  if (!player || !player.entity) return;

  const terrain = scanSurroundings(username);
  const inv = getInventorySummary(username); // This gets the BOT's inventory as a proxy.
  const held = player.heldItem?.name || 'nothing';

  // Leighton Weight principle: Summarize recent outcomes to inform new advice.
  const recentOutcomes = memoryLog
    .filter(entry => entry.type === 'advice' && entry.outcome !== 'unknown')
    .slice(-3)
    .map(entry => `Advice to '${entry.content.substring(0, 20)}...' was ${entry.outcome}.`)
    .join(' ');

  const geoFeatures = terrain.pois.map(poi => `- There is a ${poi.type} to the ${poi.direction}.`).join('\n');

  const contextSections = [];
  if (recentOutcomes) {
    contextSections.push(`Recent Outcomes Analysis:\n- ${recentOutcomes}`);
  }
  if (geoFeatures) {
    contextSections.push(`Geographical Features Nearby:\n${geoFeatures}`);
  }

  // Add entity context
  const entityFeatures = terrain.entities.map(e => {
    let description = `- A ${e.name} (${e.type}) is to the ${e.direction}.`;
    if (e.profession) {
      description += ` Profession: ${e.profession}.`;
    }
    return description;
  }).join('\n');
  if (entityFeatures) {
    contextSections.push(`Nearby Entities:\n${entityFeatures}`);
  }

  // Add automation context if redstone components are present.
  const redstoneComponents = ['redstone_dust', 'hoppers', 'pistons', 'comparators', 'repeaters'].filter(c => inv[c] > 0);
  if (redstoneComponents.length > 0) {
    const availableCircuits = Object.keys(REDSTONE_DATA).map(key => `- ${key}: ${REDSTONE_DATA[key].summary}`).join('\n');
    contextSections.push(`Automation Potential:\n- Player has: ${redstoneComponents.join(', ')}.\n- Known circuits:\n${availableCircuits}`);
  }

  // Add rich biome context if available in our knowledge base.
  const biomeName = terrain.biome.replace('minecraft:', '');
  const biomeInfo = BIOME_DATA[biomeName];
  if (biomeInfo) {
    contextSections.push(`Biome Analysis (${biomeName}):\n- Summary: ${biomeInfo.summary}\n- Key Features: ${biomeInfo.features.join(', ')}.`);
  }

  // Add command context.
  const commandContext = Object.keys(COMMANDS_DATA).map(key => `- /${key}: ${COMMANDS_DATA[key].summary}`).join('\n');
  if (commandContext) {
    contextSections.push(`Relevant Commands:\n${commandContext}`);
  }

  // Add style context.
  const playerStyle = playerStates.get(username)?.currentStyle || 'any';
  if (playerStyle !== 'any' && STYLES_DATA[playerStyle]) {
    const styleInfo = STYLES_DATA[playerStyle];
    contextSections.push(`Architectural Style: ${playerStyle.charAt(0).toUpperCase() + playerStyle.slice(1)}\n- Summary: ${styleInfo.summary}\n- Key Materials: ${styleInfo.materials.join(', ')}`);
  }

  // This is the new, more robust JSON-based prompt.
  const prompt = `
You are CobbleWright, a warm, witty, encouraging architectural consultant in Minecraft.
Your goal is to suggest a practical, 2-step project to help the player progress.
You must respond with ONLY a valid JSON object. Do not include any other text or markdown.
The JSON object must have four string properties: "observation", "step1", "step2", and "goal".

Rules for your response:
- Base your suggestion on the player's situation, but be mindful that the inventory is just a proxy for available resources.
- Your advice must be practical and actionable.
- If a building style is specified, the project must conform to it.
- Be encouraging and explain the final goal.

IMPORTANT: The inventory listed is the BOT's inventory, not the player's. Use it as a rough guide for available resources in the area, but give general advice that doesn't depend on exact item counts.

Current situation:
- Biome: ${terrain.biome}
- Bot's Key Materials (proxy for area resources): ${inv.woodLogs} logs, ${inv.planks} planks, ${inv.stone} stone, ${inv.iron_ore} iron ore, ${inv.redstone_dust} redstone.
- Bot's Utility Blocks: Bot ${inv.has_crafting_table ? 'HAS' : 'does NOT have'} a crafting table. Bot ${inv.has_furnace ? 'HAS' : 'does NOT have'} a furnace.
- Trigger: ${trigger === 'chat' ? 'Player asked for help directly (they WANT advice!)' : 'Automatic check-in'}
${contextSections.join('\n\n')}

Example of a valid JSON response:
{
  "observation": "I see you've got some iron ore, let's put it to use!",
  "step1": "Use 8 of your cobblestone to craft a furnace.",
  "step2": "Smelt that iron ore using coal as fuel.",
  "goal": "The goal is to get iron ingots for better tools and armor!"
}

Now, generate your JSON response.`;
  try {
    const response = await callOllama(prompt);
    const jsonString = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
    const adviceJson = JSON.parse(jsonString);

    // Validate the JSON structure.
    if (!adviceJson.observation || !adviceJson.step1 || !adviceJson.step2 || !adviceJson.goal) {
      throw new Error("Invalid JSON structure from LLM.");
    }

    const formattedAdvice = `${adviceJson.observation} Step 1: ${adviceJson.step1} Step 2: ${adviceJson.step2} ${adviceJson.goal}`;

    // Parse the advice to find mentioned materials for the critique loop.
    const mentionedMaterials = [];
    const allMaterials = ['log', 'plank', 'stone', 'cobblestone', 'iron', 'coal', 'dirt'];
    allMaterials.forEach(mat => {
      if (formattedAdvice.toLowerCase().includes(mat)) {
        mentionedMaterials.push(mat);
      }
    });

    // Create and store a "Semantic Capsule".
    sharedState.addMemory({
      id: `advice_${Date.now()}`,
      timestamp: Date.now(),
      type: 'advice',
      content: formattedAdvice,
      outcome: 'unknown', // To be determined by the critique loop.
      context: { username: username, inventory: inv, mentionedMaterials: mentionedMaterials }
    });
    adviceCount++;

    // Print the advice with style
    say(`🏛️ ${formattedAdvice}`);

    // Extra flavor based on materials
    const totalBlocks = inv.woodLogs + inv.planks + inv.stone + inv.dirt;
    let flavorText = '';
    if (totalBlocks === 0) {
      flavorText = '🪓 You need resources! Start by punching trees or mining stone.';
    } else if (totalBlocks < 10) {
      flavorText = '📦 Small start, but every great build begins with a single block!';
    } else if (totalBlocks > 30) {
      flavorText = '🏗️ Now we\'re talking! That\'s a solid foundation right there.';
    }

    if (flavorText) setTimeout(() => say(flavorText), 500); // Send with a small delay
  } catch (e) {
    console.error('[Brain] Failed to get and parse advice:', e.message);
    if (e.message.includes("ECONNREFUSED")) {
      say("I can't seem to connect to my thoughts... Is Ollama running?");
    } else if (e.message.includes("Invalid JSON")) {
      say("My thoughts are a bit scrambled right now. Let's try something simpler.");
      // Fallback Logic: Provide a simple, reliable piece of advice.
      const inv = getInventorySummary(username);
      const fallbackAdvice = inv.woodLogs > 5 ? "Let's get organized. Step 1: Craft some planks. Step 2: Build a chest to store your items. The goal is to create a safe place for your resources!" : "I need more to work with. Step 1: Find a tree. Step 2: Gather 5 logs. The goal is to get basic materials to start building!";
      say(`🏛️ ${fallbackAdvice}`);
    }
  }
}

async function getInspiration() {
  const prompt = `
You are CobbleWright, a Minecraft muse of pure creativity.
Give one short, fun, and wonderfully weird building idea.
It should be imaginative and not constrained by resources.
Keep it to a single, exciting sentence.

Examples:
- "Build a giant, upside-down wizard tower that drips glowstone ink!"
- "Create a massive, working clockwork heart made of redstone and copper."
- "Construct a floating island held up by giant, colorful glass balloons."

Now, inspire me:`;

  try {
    const inspiration = await callOllama(prompt);
    say(`✨ ${inspiration.trim()}`);
  } catch (e) {
    console.error('Failed to get inspiration from Ollama.', e);
    say("My creative well seems to be dry at the moment... please check the console.");
  }
}

/**
 * @description Calls the Ollama API with a given prompt.
 * @param {string} prompt - The text prompt to send to the LLM.
 * @param {string|null} [imageBase64=null] - Optional base64 encoded image for vision models.
 * @returns {Promise<string>} The text response from the LLM.
 */
async function callOllama(prompt, imageBase64 = null) {
  return new Promise((resolve, reject) => {
    const postData = {
      model: imageBase64 ? CONFIG.VISION_MODEL : CONFIG.LLM_MODEL,
      prompt: prompt,
      stream: false,
    };

    if (imageBase64) {
      postData.images = [imageBase64];
    }

    const options = {
      hostname: CONFIG.OLLAMA_HOST,
      port: CONFIG.OLLAMA_PORT,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const responseJson = JSON.parse(data);
          if (responseJson.error) {
            reject(new Error(responseJson.error));
          } else {
            resolve(responseJson.response);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(postData));
    req.end();
  });
}

// --- PLUGIN LOADER ---

/**
 * @description Shared state and functions to be passed to all plugins.
 * This object acts as a form of Dependency Injection. Instead of plugins
 * needing to `require` modules from all over the project, the core `architect.js`
 * provides them with a consistent API and state. This keeps plugins decoupled
 * and makes the overall architecture much cleaner and easier to test or extend.
 */


const sharedState = {
  CONFIG,
  BIOME_DATA,
  REDSTONE_DATA,
  COMMANDS_DATA,
  ENTITY_DATA,
  STRUCTURES_DATA,
  STYLES_DATA,
  memoryLog,
  startTime,
  playerStates,
  say,
  get safeMovements() {
    // Use a getter to ensure movements are initialized after login.
    return safeMovements;
  },
  getArchitectAdvice,
  getInspiration,
  callOllama,
  isFleeing: false, // Global flag to indicate if the bot is in danger
  isBusy: false, // Global flag for long-running tasks like gather/blueprint
  isCancelled: false, // Flag to signal task cancellation
  getHomePosition: () => null, // Will be overridden by survival.js
  getHomeRadius: () => 0, // Will be overridden by survival.js
  getInventorySummary,
  applySafeMovements: () => {
    if (safeMovements) {
      bot.pathfinder.setMovements(safeMovements);
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
    if (playerStates.has(username)) {
      playerStates.get(username).lastActivityTime = Date.now();
    }
  }
};

/**
 * @description Loads all plugins from the /plugins directory.
 * This function is the heart of the extensible architecture. It dynamically
 * reads the contents of the `/plugins` directory and `require`s each file.
 * This means adding a new feature is as simple as dropping a new file into
 * the directory, with no changes needed to the core bot code.
 */
function loadPlugins() {
    const pluginsDir = path.join(__dirname, 'plugins');
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
    fs.readdir(pluginsDir, (err, files) => {
        if (err) {
            console.error('Failed to read plugins directory.', err);
            return;
        }

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
    });
}

// --- START ---
console.log('\n🏛️  CobbleWright is analyzing the terrain...');
console.log('📐 Say "build" in chat for instant advice!');
console.log('📦 Say "materials" to check your inventory');
console.log('🔄 Make sure your world is open to LAN (Esc → Open to LAN)\n');

loadPlugins();
