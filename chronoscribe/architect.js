/**
 * @file BlockSmith - An AI-powered Minecraft architectural assistant.
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
  BIOME_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'biome_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: biome_data.json not found or invalid. Biome-specific context will be limited.');
  BIOME_DATA = {};
}

/**
 * @description Redstone circuit knowledge base loaded from JSON.
 */
let REDSTONE_DATA;
try {
  REDSTONE_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'redstone_circuits.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: redstone_circuits.json not found. Automation advice will be disabled.');
  REDSTONE_DATA = {};
}

/**
 * @description Command knowledge base loaded from JSON.
 */
let COMMANDS_DATA;
try {
  COMMANDS_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'commands_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: commands_data.json not found. Command suggestions will be disabled.');
  COMMANDS_DATA = {};
}

/**
 * @description Entity knowledge base loaded from JSON.
 */
let ENTITY_DATA;
try {
  ENTITY_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'entity_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: entity_data.json not found. Entity awareness will be disabled.');
  ENTITY_DATA = {};
}

/**
 * @description Architectural style knowledge base loaded from JSON.
 */
let STYLES_DATA;
try {
  STYLES_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'styles_data.json'), 'utf8'));
} catch (e) {
  console.warn('Warning: styles_data.json not found. Style-specific advice will be disabled.');
  STYLES_DATA = {};
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

// --- BOT EVENT HANDLERS ---

/**
 * @description Handles the bot's successful login to the server.
 * Announces its arrival in the chat.
 */
bot.on('login', () => {
  // Use a timeout to ensure the bot can chat after the world loads.
  setTimeout(() => {
    tts.speak('ChronoScribe the Architect has arrived!');
    tts.speak('I see potential in every block...');
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

  const prompt = `
You are ChronoScribe, a warm, witty, encouraging architectural consultant in Minecraft.
Your goal is to suggest a small project to help the player progress. This can be a building project, an automation project, or a tactical action.
Your advice must be practical and consider the specific threats (threat_level) and opportunities (utility) presented by nearby entities.
Your advice must be based on their inventory and be aware of crafting/automation prerequisites.
If a building style is specified, your architectural advice MUST conform to that style.
IMPORTANT: The inventory listed is the BOT's inventory, not the player's. Use it as a rough guide for available resources in the area, but give general advice that doesn't depend on exact item counts.

Current situation:
- Biome: ${terrain.biome}
- Bot's Key Materials (proxy for area resources): ${inv.woodLogs} logs, ${inv.planks} planks, ${inv.stone} stone, ${inv.iron_ore} iron ore, ${inv.redstone_dust} redstone.
- Bot's Utility Blocks: Bot ${inv.has_crafting_table ? 'HAS' : 'does NOT have'} a crafting table. Bot ${inv.has_furnace ? 'HAS' : 'does NOT have'} a furnace.
- Holding: ${held}
- Trigger: ${trigger === 'chat' ? 'Player asked for help directly (they WANT advice!)' : 'Automatic check-in'}
${contextSections.join('\n\n')}
 
Give a 2-step project suggestion. Be encouraging and explain the final goal.

Rules:
- Your response must be a short paragraph.
- Start with an observation about their inventory.
- Clearly label "Step 1:" and "Step 2:".
- State the ultimate goal of the project.

Examples of good advice:
- "I see you've got some iron ore, let's put it to use! Step 1: Use 8 of your cobblestone to craft a furnace. Step 2: Smelt that iron ore using coal as fuel. The goal is to get iron ingots for better tools and armor!"
- "You have hoppers and chests! Let's build your first automated machine. Step 1: Place a chest with a hopper on top of a furnace. Step 2: Place another hopper on the side of the furnace for fuel. The goal is to create an auto-smelter that processes items for you!"
- "That cliffside is perfect for a base! Step 1: Plan a 5x5 room. Step 2: Clear the area quickly using the '/fill' command. The goal is to create a large space without manual digging!"
- "Watch out, there's a Creeper nearby! Step 1: Quickly build a 3-block high wall between you and it. Step 2: Craft a sword to defend yourself. The goal is to survive the encounter and protect your build!"
- "I see a Villager to the East! Step 1: Go and see what it's trading. Step 2: If it has a good trade, build a simple 3x3 hut around it to keep it safe. The goal is to secure a valuable trading partner!"
- "You want a rustic build? Perfect. Step 1: Use your oak logs to create a 5x5 frame for a cabin. Step 2: Fill in the walls with cobblestone. The goal is a cozy, rustic shelter."
- "An Enderman is nearby. Avoid looking directly at it! Step 1: Prepare your weapons. Step 2: Lure it to a 2-block high space where it can't reach you. The goal is to safely acquire Ender Pearls."

Now give your advice:`;
  try {
    const response = await callOllama(prompt);
    const advice = response.trim();

    // Parse the advice to find mentioned materials for a more accurate critique later.
    const mentionedMaterials = [];
    const allMaterials = ['log', 'plank', 'stone', 'cobblestone', 'iron', 'coal', 'dirt'];
    allMaterials.forEach(mat => {
      if (advice.toLowerCase().includes(mat)) {
        mentionedMaterials.push(mat);
      }
    });

    // Create and store a "Semantic Capsule" for this advice.
    memoryLog.push({
      id: `advice_${Date.now()}`,
      timestamp: Date.now(),
      type: 'advice',
      content: advice,
      outcome: 'unknown', // To be determined by the critique loop.
      context: { username: username, inventory: inv, mentionedMaterials: mentionedMaterials }
    });
    adviceCount++;

    // Print the advice with style
    say(`🏛️ ${advice}`);

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
    console.log('🤷  Ollama error. Make sure it\'s running:');
    console.log('   In another terminal: ollama serve');
    console.log(`   Then pull the model: ollama pull ${CONFIG.LLM_MODEL}`);
    console.error('Error details:', e.message);
  }
}

/**
 * @description Gets a purely creative, unconstrained building idea from the LLM.
 * @returns {Promise<void>}
 */
async function getInspiration() {
  const prompt = `
You are ChronoScribe, a Minecraft muse of pure creativity.
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
  STYLES_DATA,
  memoryLog,
  startTime,
  playerStates,
  say,
  getArchitectAdvice,
  getInspiration,
  callOllama,
  isFleeing: false, // Global flag to indicate if the bot is in danger
  getInventorySummary,
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
        const plugin = require(path.join(pluginsDir, corePlugin));
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
            if (file.endsWith('.js') && file !== corePlugin) { // Ensure we don't load the core plugin twice
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
console.log('\n🏛️  BlockSmith is analyzing the terrain...');
console.log('📐 Say "build" in chat for instant advice!');
console.log('📦 Say "materials" to check your inventory');
console.log('🔄 Make sure your world is open to LAN (Esc → Open to LAN)\n');

loadPlugins();