const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { Vec3 } = require('vec3');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ───
const CONFIG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// ─── PERSONA CAPSULE ───
function loadPersonaCapsule() {
  try {
    const personaPath = path.join(__dirname, 'persona.sc.json');
    if (!fs.existsSync(personaPath)) {
      console.log('🎭 Persona capsule not found. Using default dialogue voice.');
      return null;
    }

    const capsule = JSON.parse(fs.readFileSync(personaPath, 'utf8'));
    if (!capsule || capsule.capsule_type !== 'persona_voice') {
      console.log('🎭 Persona capsule exists but is invalid. Using default dialogue voice.');
      return null;
    }

    console.log(`🎭 Persona voice loaded: ${capsule.subject?.name || 'Unknown Persona'}`);
    return capsule;
  } catch (error) {
    console.log('🎭 Failed to load persona capsule:', error.message);
    return null;
  }
}

const PERSONA = (CONFIG.persona?.enabled !== false) ? loadPersonaCapsule() : null;

function choosePersonaRegister(category) {
  if (!PERSONA || !Array.isArray(PERSONA.registers)) return null;

  const byName = PERSONA.registers.reduce((map, entry) => {
    map[entry.name] = entry;
    return map;
  }, {});

  if (category === 'advice' || category === 'diamond') return byName['Rock Prophet'] || null;
  if (category === 'idle') return byName['Comic Deflation'] || byName['Rock Prophet'] || null;
  if (category === 'goodbye' || category === 'death' || category === 'weather') return byName['Earnest Undertone'] || null;
  return byName['Rock Prophet'] || null;
}

function applyPersonaVoice(message, category = 'general') {
  if (!PERSONA || typeof message !== 'string' || message.trim().length === 0) {
    return message;
  }

  const register = choosePersonaRegister(category);
  if (!register) return message;

  const lexicon = Array.isArray(register.lexicon) ? register.lexicon : [];
  const traitEnergy = String(PERSONA?.core_traits?.energy || '').toLowerCase();
  const energetic = traitEnergy.includes('maximal') || category === 'advice' || category === 'diamond';

  let voiced = message.trim();

  if (energetic && Math.random() < 0.6) {
    voiced = voiced.toUpperCase();
  }

  if (lexicon.length > 0 && Math.random() < 0.75) {
    const word = lexicon[Math.floor(Math.random() * lexicon.length)];
    voiced = `${word.toUpperCase()}: ${voiced}`;
  }

  if (register.name === 'Comic Deflation' && Math.random() < 0.7) {
    const deflate = ['...okay wait.', 'No but seriously.', 'That came out weird, but you get me.'];
    voiced = `${voiced} ${deflate[Math.floor(Math.random() * deflate.length)]}`;
  }

  if (register.name === 'Earnest Undertone' && Math.random() < 0.8) {
    const earnest = ['For real though.', 'I mean that.', 'You got this.'];
    voiced = `${voiced} ${earnest[Math.floor(Math.random() * earnest.length)]}`;
  }

  return voiced;
}

// ─── BOT ───
const bot = mineflayer.createBot({
  host: CONFIG.bot.host,
  port: CONFIG.bot.port,
  username: CONFIG.bot.username,
  version: CONFIG.bot.version
});

bot.loadPlugin(pathfinder);

// ─── STATE ───
let npcLocation = null;
let isNight = false;
let lastIdleTime = 0;
let activePlayers = new Map();
let botReady = false;

// ─── SKIN LOADER ───
async function loadSkin() {
  try {
    // Mineflayer does not directly support loading custom skin files easily.
    // The intended method is to apply the skin to the Minecraft account used by the bot.
    // We provide the design document for this purpose.
    console.log('🏛️ Official skin design is available in /skin/SKIN_DESIGN.md.');
    console.log('📖 To use the custom skin, create a PNG from the design and apply it to the bot\'s Minecraft account.');
    console.log('✨ The bot will use the default skin for now.');
  } catch (e) {
    console.log('🏛️ Skin loading skipped:', e.message);
  }
}

// ─── NPC SPAWN ───
function spawnNPC() {
  const pos = CONFIG.spawn.position;
  npcLocation = new Vec3(pos.x, pos.y, pos.z);

  // Teleport bot to spawn position
  bot.entity.position.set(pos.x, pos.y, pos.z);
  bot.entity.yaw = 0;
  bot.entity.pitch = 0;

  // Set up pathfinder movements
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  // Say welcome
  setTimeout(() => {
    sayGreeting();
  }, 3000);

  botReady = true;
  console.log(`🏛️ CobbleWright has arrived at ${pos.x}, ${pos.y}, ${pos.z}`);
}

// ─── DIALOGUE SYSTEM ───
function sayMessage(message, player = null, category = 'general') {
  const prefix = '🏛️ CobbleWright:';
  const styled = applyPersonaVoice(message, category);
  if (player) {
    player.chat(`/msg ${player.username} ${prefix} ${styled}`);
  } else {
    bot.chat(`${prefix} ${styled}`);
  }
  console.log(`[CHAT] ${prefix} ${styled}`);
}

function getRandomMessage(category) {
  const messages = CONFIG.dialogue[category];
  if (!messages || messages.length === 0) return null;
  return messages[Math.floor(Math.random() * messages.length)];
}

function sayGreeting(player = null) {
  const message = getRandomMessage('greeting');
  if (message) sayMessage(message, player, 'greeting');
}

function sayIdle(player = null) {
  const message = getRandomMessage('idle');
  if (message) sayMessage(message, player, 'idle');
}

function sayAdvice(player = null) {
  const message = getRandomMessage('advice');
  if (message) sayMessage(message, player, 'advice');
}

function sayGoodbye(player = null) {
  const message = getRandomMessage('goodbye');
  if (message) sayMessage(message, player, 'goodbye');
}

function sayDiamond(player = null) {
  const message = getRandomMessage('diamond');
  if (message) sayMessage(message, player, 'diamond');
}

function sayDeath(player = null) {
  const message = getRandomMessage('death');
  if (message) sayMessage(message, player, 'death');
}

function sayWeather(type) {
  const messages = CONFIG.dialogue.weather;
  const message = messages[type];
  if (message) sayMessage(message, null, 'weather');
}

// ─── BEHAVIOR ───

// 1. Wander
async function wander() {
  if (!botReady || !npcLocation) return;

  const radius = CONFIG.behavior.wanderRadius || 10;
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radius;

  const targetX = Math.floor(npcLocation.x + Math.cos(angle) * distance);
  const targetZ = Math.floor(npcLocation.z + Math.sin(angle) * distance);

  // Find a solid block at the target location
  const targetY = findGroundLevel(targetX, targetZ);

  if (targetY !== null) {
    const target = new Vec3(targetX, targetY, targetZ);
    try {
      await bot.pathfinder.goto(target);
    } catch (e) {
      // Pathfinding failed, just wait
    }
  }
}

// 2. Find ground level
function findGroundLevel(x, z) {
  // Use the more efficient and modern bot.world.getHighestBlockYAt method
  // This is more robust for different world heights.
  const highestY = bot.world.getHighestBlockYAt(x, z);
  // We want the position on top of the highest solid block.
  return highestY !== null ? highestY + 1 : null;
}
// 3. Look at nearby players
function lookAtNearbyPlayers() {
  if (!CONFIG.behavior.lookAtPlayers) return;

  for (const [username, player] of Object.entries(bot.players)) {
    if (username === bot.username) continue;
    if (!player.entity) continue;

    const distance = player.entity.position.distanceTo(bot.entity.position);
    if (distance < 10) {
      bot.lookAt(player.entity.position.offset(0, 1.5, 0));
      break;
    }
  }
}

// 4. Follow nearest player
async function followNearest() {
  if (!CONFIG.behavior.followDistance) return;

  let nearestPlayer = null;
  let nearestDistance = Infinity;

  for (const [username, player] of Object.entries(bot.players)) {
    if (username === bot.username) continue;
    if (!player.entity) continue;

    const distance = player.entity.position.distanceTo(bot.entity.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPlayer = player;
    }
  }

  if (nearestPlayer && nearestDistance > CONFIG.behavior.followDistance) {
    try {
      await bot.pathfinder.goto(nearestPlayer.entity.position);
    } catch (e) {
      // Can't reach, ignore
    }
  }
}

// ─── EVENTS ───

// Connection events
bot.on('login', () => {
  console.log(`🏛️ ${bot.username} has arrived in the world.`);
  loadSkin();
  spawnNPC();
});

bot.on('spawn', () => {
  console.log('🏛️ CobbleWright is now present.');
});

bot.on('error', (err) => {
  console.log('❌ Error:', err.message);
});

bot.on('end', () => {
  console.log('🏛️ CobbleWright has left the world.');
});

// Player events
bot.on('playerJoined', (player) => {
  if (player.username === bot.username) return;
  console.log(`👤 ${player.username} joined.`);

  setTimeout(() => {
    sayGreeting(player);
  }, 2000);

  activePlayers.set(player.username, {
    lastInteraction: Date.now(),
    hasSaidGoodbye: false
  });
});

bot.on('playerLeft', (player) => {
  if (player.username === bot.username) return;
  console.log(`👤 ${player.username} left.`);
  activePlayers.delete(player.username);
});

// Chat commands
bot.on('chat', (username, message) => {
  if (username === bot.username) return;

  const lower = message.toLowerCase();

  // Track player activity
  if (activePlayers.has(username)) {
    activePlayers.get(username).lastInteraction = Date.now();
  }

  // Commands
  if (lower.includes('build') || lower.includes('help')) {
    sayAdvice(bot.players[username]);
  } else if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('later')) {
    sayGoodbye(bot.players[username]);
  } else if (lower.includes('diamond') || lower.includes('found')) {
    // Check if player actually found something
    sayDiamond(bot.players[username]);
  } else if (lower.includes('cobblewright') || lower.includes('cw') || lower.includes('hey')) {
    sayGreeting(bot.players[username]);
  }
});

// Item pickup detection (approximate)
bot.on('playerCollect', (collector, item) => {
  if (collector.username === bot.username) return;
  if (!item || !item.name) return;

  const player = bot.players[collector.username];
  if (!player) return;

  if (item.name.includes('diamond')) {
    setTimeout(() => {
      sayDiamond(player);
    }, 1000);
  }
});

// Player death detection
bot.on('entityDeath', (entity) => {
  if (entity.type !== 'player') return;
  const player = bot.players[entity.username];
  if (!player) return;

  setTimeout(() => {
    sayDeath(player);
  }, 2000);
});

// Weather detection
bot.on('rain', () => {
  sayWeather('rain');
});

bot.on('rainStop', () => {
  sayWeather('clear');
});

// Time detection (night patrol)
bot.on('time', () => {
  const time = bot.time.timeOfDay;
  const isNightNow = time > 13000 && time < 23000;

  if (isNightNow && !isNight) {
    isNight = true;
    if (CONFIG.behavior.patrolAtNight) {
      sayMessage('🌙 The sun has set. Time to keep watch.', null, 'idle');
    }
  } else if (!isNightNow && isNight) {
    isNight = false;
    if (CONFIG.behavior.patrolAtNight) {
      sayMessage('🌅 Morning has arrived. The day is ours.', null, 'greeting');
    }
  }
});

// ─── IDLE LOOP ───
setInterval(() => {
  if (!botReady) return;

  const now = Date.now();

  // Say idle message periodically
  if (now - lastIdleTime > CONFIG.behavior.idleInterval) {
    const nearbyPlayers = Object.values(bot.players).filter(p =>
      p.entity && p.entity.position.distanceTo(bot.entity.position) < 10
    );

    if (nearbyPlayers.length > 0) {
      sayIdle(nearbyPlayers[0]);
      lastIdleTime = now;
    }
  }

  // Follow or wander
  const followers = Object.values(bot.players).filter(p =>
    p.entity && p.entity.position.distanceTo(bot.entity.position) < 15
  );

  if (followers.length > 0 && CONFIG.behavior.followDistance) {
    // Follow the nearest player
    const nearest = followers.reduce((a, b) =>
      a.entity.position.distanceTo(bot.entity.position) <
      b.entity.position.distanceTo(bot.entity.position) ? a : b
    );

    if (nearest.entity.position.distanceTo(bot.entity.position) > CONFIG.behavior.followDistance) {
      followNearest();
    } else {
      lookAtNearbyPlayers();
    }
  } else {
    // Wander randomly
    wander();
  }

}, 5000); // Every 5 seconds

// ─── STARTUP ───
console.log('🏛️ CobbleWright NPC Bot');
console.log('📦 Version 1.0.0');
console.log('🔗 Connecting to Minecraft server...');
console.log('');

process.on('SIGINT', () => {
  console.log('\n🏛️ CobbleWright is shutting down...');
  process.exit();
});