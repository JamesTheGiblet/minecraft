 /**
 * @file This plugin contains the core "brain" of the bot, including AI prompting and context gathering.
 */

const http = require('http');

module.exports = (bot, sharedState) => {
  /**
   * @description Scans the blocks and entities around the player to analyze the situation.
   * @param {string} username - The username of the player to scan around.
   * @returns {{pois: Array<object>, entities: Array<object>, biome: string, buildProfile: object}|null} Context object or null if player not found.
   */
  function scanSurroundings(username) {
    const player = bot.players[username];
    if (!player || !player.entity) return null;

    const pos = player.entity.position;
    const pois = [];
    const entities = [];
    const scanRadius = 16;

    const getDirection = (dx, dz) => {
      if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'East' : 'West';
      return dz > 0 ? 'South' : 'North';
    };

    for (let x = -scanRadius; x <= scanRadius; x += 4) {
      for (let z = -scanRadius; z <= scanRadius; z += 4) {
        if (x === 0 && z === 0) continue;
        const checkPos = pos.offset(x, 0, z);
        const groundBlock = bot.blockAt(checkPos.floored());
        if (!groundBlock) continue;
        const direction = getDirection(x, z);
        if (groundBlock.name.includes('water') && !pois.some(p => p.type === 'water')) pois.push({ type: 'water', direction });
        if (groundBlock.name.includes('log') && !pois.some(p => p.type === 'forest')) pois.push({ type: 'forest', direction });
        if (Math.abs(checkPos.y - pos.y) > 5 && !pois.some(p => p.type === 'cliff')) pois.push({ type: 'cliff', direction });
      }
    }

    const uniquePois = pois.filter((poi, index, self) => index === self.findIndex((p) => p.type === poi.type));

    for (const entityId in bot.entities) {
      const entity = bot.entities[entityId];
      if (entity === bot.entity || entity.type === 'player' || entity.type === 'object' || entity.username === username) continue;
      if (entity.position.distanceTo(pos) <= scanRadius && !entities.some(e => e.name === entity.name)) {
        const direction = getDirection(entity.position.x - pos.x, entity.position.z - pos.z);
        entities.push({ name: entity.name, type: entity.type, direction });
      }
    }

    return {
      pois: uniquePois,
      entities,
      biome: bot.blockAt(pos)?.biome?.name || 'unknown',
      buildProfile: sharedState.analyzeBuildArea ? sharedState.analyzeBuildArea(pos) : null
    };
  }

  function formatCapsuleContext(capsules) {
    const entries = Object.values(capsules || {});
    if (entries.length === 0) return '';
    return entries.map(capsule => {
      const meta = capsule?._meta;
      if (!meta) return null;
      const summary = Array.isArray(meta.summary) ? meta.summary.slice(0, 3).join(' | ') : '';
      return `- [${meta.area}] ${summary || 'capsule loaded'}`;
    }).filter(Boolean).join('\n');
  }

  function getLoadedCapsuleContext() {
    const capsuleEntries = Object.entries(sharedState)
      .filter(([key, value]) => key.endsWith('.SC_DATA') && value && typeof value === 'object')
      .map(([, value]) => value);

    return formatCapsuleContext(capsuleEntries);
  }

  function buildSelfAwarenessContext(username, terrain, inv) {
    const player = bot.players[username]?.entity || null;
    const botPos = bot.entity?.position?.floored ? bot.entity.position.floored() : null;
    const playerPos = player?.position?.floored ? player.position.floored() : null;
    const homePos = sharedState.getHomePosition ? sharedState.getHomePosition() : null;
    const homeRadius = sharedState.getHomeRadius ? sharedState.getHomeRadius() : 16;
    const coreCapsule = sharedState['CORE.SC_DATA'] || {};
    const identityName = coreCapsule?.identity?.name || sharedState.CONFIG.BOT_NAME || bot.username;
    const identityRole = coreCapsule?.identity?.role || 'AI Minecraft architect companion';
    const dimension = bot.game?.dimension || bot.game?.levelType || 'unknown';
    const currentStyle = sharedState.playerStates.get(username)?.currentStyle || 'any';

    const capabilities = [
      'give Minecraft build advice',
      'scan nearby terrain, mobs, and notable geography',
      'track project continuity and recent memory',
      'gather common resources when the gather plugin is available',
      'craft some missing tools/materials through existing plugins',
      'generate and attempt simple blueprint-based builds',
      'patrol, flee, and maintain a home anchor'
    ];

    if (sharedState.findRelevantMemories) capabilities.push('retrieve relevant long-term memories from PostgreSQL');
    if (sharedState.getActiveProject) capabilities.push('track active project phases, blockers, and next actions');
    if (sharedState.CONFIG?.VISION_MODEL) capabilities.push('critique screenshots through the configured vision model');

    const limitations = [
      'cannot see the real contents of a player inventory; only the bot inventory proxy is available',
      'cannot guarantee command permissions for /gamemode, /effect, /weather, or other operator commands',
      'cannot know unloaded chunks or unseen distant terrain with certainty',
      'should not claim to have built, gathered, or verified something unless runtime state supports it',
      'should not invent blocks, mechanics, commands, or version features that are uncertain for Java 1.21.1'
    ];

    const statusLines = [
      `Identity: ${identityName} (${identityRole}).`,
      `Minecraft edition/version target: Java Edition ${bot.version || '1.21.1'}.`,
      `Current mode: ${sharedState.botMode || 'idle'}.`,
      `Current dimension: ${dimension}.`,
      `Current style focus for ${username}: ${currentStyle}.`,
      `Bot location: ${botPos ? `[${botPos.x}, ${botPos.y}, ${botPos.z}]` : 'unknown'}.`,
      `Player location: ${playerPos ? `[${playerPos.x}, ${playerPos.y}, ${playerPos.z}]` : 'unknown'}.`,
      `Home anchor: ${homePos ? `[${Math.floor(homePos.x)}, ${Math.floor(homePos.y)}, ${Math.floor(homePos.z)}] radius ${homeRadius}` : 'not set'}.`,
      `Health/Food: ${bot.health ?? 'unknown'} health, ${bot.food ?? 'unknown'} food.`,
      `Known points of interest: ${sharedState.pointsOfInterest?.size || 0}.`,
      `Observed biome: ${terrain?.biome || 'unknown'}.`,
      `Inventory proxy: ${inv.woodLogs} logs, ${inv.planks} planks, ${inv.stone} stone, ${inv.coal || 0} coal, ${inv.total} total items.`
    ];

    return [
      'CobbleWright Runtime Identity:',
      ...statusLines.map((line) => `- ${line}`),
      'Capabilities:',
      ...capabilities.map((line) => `- ${line}`),
      'Limitations:',
      ...limitations.map((line) => `- ${line}`)
    ].join('\n');
  }

  function formatMinecraftHistoryContext() {
    const history = sharedState.MINECRAFT_HISTORY_DATA;
    if (!history || typeof history !== 'object') return '';

    const sections = [];
    if (history.summary) sections.push(`- ${history.summary}`);
    if (Array.isArray(history.eras)) {
      sections.push(...history.eras.slice(0, 6).map((entry) => `- ${entry}`));
    }
    if (Array.isArray(history.java_1_21_1_context)) {
      sections.push(...history.java_1_21_1_context.slice(0, 3).map((entry) => `- ${entry}`));
    }

    return sections.length > 0 ? `Minecraft Historical and Version Context:\n${sections.join('\n')}` : '';
  }

  async function buildAwarenessPromptContext(options = {}) {
    const {
      username = null,
      purpose = 'general reasoning',
      includeCapsules = true,
      includeHistory = true,
      includeProject = false,
      includeMemories = false,
      includeTerrain = true
    } = options;

    const resolvedUsername = username || Object.entries(sharedState.playerStates || {})
      .sort((a, b) => (b[1]?.lastActivityTime || 0) - (a[1]?.lastActivityTime || 0))[0]?.[0] || null;

    const terrain = resolvedUsername && includeTerrain ? scanSurroundings(resolvedUsername) : null;
    const inv = resolvedUsername ? sharedState.getInventorySummary(resolvedUsername) : sharedState.getInventorySummary(bot.username);
    const sections = [];

    sections.push(`Prompt Purpose:\n- ${purpose}`);

    const selfAwareness = buildSelfAwarenessContext(resolvedUsername || bot.username, terrain, inv);
    if (selfAwareness) sections.push(selfAwareness);

    if (includeCapsules) {
      const capsuleContext = getLoadedCapsuleContext();
      if (capsuleContext) sections.push(`Loaded Semantic Capsules:\n${capsuleContext}`);
    }

    if (includeHistory) {
      const historyContext = formatMinecraftHistoryContext();
      if (historyContext) sections.push(historyContext);
    }

    if (includeProject && resolvedUsername && sharedState.getActiveProject) {
      const activeProject = await sharedState.getActiveProject(resolvedUsername).catch(() => null);
      if (activeProject) {
        const tasks = Array.isArray(activeProject.tasks) ? activeProject.tasks : [];
        const progress = `${tasks.filter((task) => task?.done).length}/${tasks.length}`;
        sections.push(
          `Active Project Context:\n` +
          `- Name: ${activeProject.name}.\n` +
          `- Objective: ${activeProject.objective}.\n` +
          `- Phase: ${activeProject.phase}.\n` +
          `- Progress: ${progress}.\n` +
          `- Next action: ${activeProject.next_action}.`
        );
      }
    }

    if (includeMemories && resolvedUsername && sharedState.findRelevantMemories) {
      const memoryQuery = `${purpose} ${terrain?.biome || ''} ${sharedState.playerStates.get(resolvedUsername)?.currentStyle || 'any'}`.trim();
      const relevantMemories = await sharedState.findRelevantMemories({ username: resolvedUsername, query: memoryQuery, limit: 3 }).catch(() => []);
      if (relevantMemories.length > 0) {
        const memorySummary = relevantMemories
          .map((entry) => `- [${entry.type || 'memory'}] ${String(entry.content || '').slice(0, 140)}`)
          .join('\n');
        sections.push(`Relevant Past Context:\n${memorySummary}`);
      }
    }

    return sections.join('\n\n');
  }

  async function getArchitectAdvice(username, trigger = 'auto') {
    const player = bot.players[username];
    if (!player || !player.entity) return;

    const terrain = scanSurroundings(username);
    const inv = sharedState.getInventorySummary(username);

    const recentOutcomes = sharedState.memoryLog
      .filter(entry => entry.type === 'advice' && entry.outcome !== 'unknown')
      .slice(-3)
      .map(entry => `Advice to '${entry.content.substring(0, 20)}...' was ${entry.outcome}.`)
      .join(' ');

    const contextSections = [];
    const selfAwareness = buildSelfAwarenessContext(username, terrain, inv);
    if (selfAwareness) contextSections.push(selfAwareness);

    const capsuleContext = getLoadedCapsuleContext();
    if (capsuleContext) contextSections.push(`Loaded Semantic Capsules:\n${capsuleContext}`);

    const historyContext = formatMinecraftHistoryContext();
    if (historyContext) contextSections.push(historyContext);

    if (recentOutcomes) contextSections.push(`Recent Outcomes Analysis:\n- ${recentOutcomes}`);

    if (sharedState.getActiveProject) {
      const activeProject = await sharedState.getActiveProject(username).catch(() => null);
      if (activeProject) {
        const tasks = Array.isArray(activeProject.tasks) ? activeProject.tasks : [];
        const progress = `${tasks.filter(t => t?.done).length}/${tasks.length}`;
        contextSections.push(
          `Active Project Context:\n` +
          `- Name: ${activeProject.name}.\n` +
          `- Objective: ${activeProject.objective}.\n` +
          `- Phase: ${activeProject.phase}.\n` +
          `- Progress: ${progress}.\n` +
          `- Next action: ${activeProject.next_action}.\n` +
          `- Keep advice aligned to this project unless there is an immediate survival or site-readiness issue.`
        );
      }
    }

    if (sharedState.findRelevantMemories) {
      const memoryQuery = `build advice ${terrain.biome} ${sharedState.playerStates.get(username)?.currentStyle || 'any'}`;
      const relevantMemories = await sharedState.findRelevantMemories({ username, query: memoryQuery, limit: 3 }).catch(() => []);
      if (relevantMemories.length > 0) {
        const memorySummary = relevantMemories
          .map(entry => `- [${entry.type || 'memory'}] ${String(entry.content || '').slice(0, 140)}`)
          .join('\n');
        contextSections.push(`Relevant Past Context:\n${memorySummary}`);
      }
    }

    if (terrain.buildProfile) {
      const p = terrain.buildProfile;
      contextSections.push(
        `Build Site Assessment:\n` +
        `- Site readiness: ${p.siteReadiness}.\n` +
        `- Terrain: ${p.terrainFlatness}.\n` +
        `- Shelter state: ${p.shelterState}.\n` +
        `- Lighting: ${p.lightingState}.`
      );
    }

    const geoFeatures = terrain.pois.map(poi => `- There is a ${poi.type} to the ${poi.direction}.`).join('\n');
    if (geoFeatures) contextSections.push(`Geographical Features Nearby:\n${geoFeatures}`);

    const entityFeatures = terrain.entities.map(e => `- A ${e.name} (${e.type}) is to the ${e.direction}.`).join('\n');
    if (entityFeatures) contextSections.push(`Nearby Entities:\n${entityFeatures}`);

    const playerStyle = sharedState.playerStates.get(username)?.currentStyle || 'any';
    if (playerStyle !== 'any' && sharedState.STYLES_DATA?.[playerStyle]) {
      const styleInfo = sharedState.STYLES_DATA[playerStyle];
      contextSections.push(`Architectural Style: ${playerStyle}\n- Summary: ${styleInfo.summary}\n- Key Materials: ${styleInfo.materials.join(', ')}`);
    }

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
- If the build site is not ready, prioritize preparation (flattening, lighting, clearing) before decorative expansion.
- Stay inside your real capabilities and constraints from the runtime context below.
- Be explicit when something is uncertain, unavailable, outside line-of-sight, or dependent on command permissions.
- Use Minecraft Java Edition 1.21.1 assumptions unless the runtime context says otherwise.

IMPORTANT: The inventory listed is the BOT's inventory, not the player's. Use it as a rough guide for available resources in the area, but give general advice that doesn't depend on exact item counts.

Current situation:
- Biome: ${terrain.biome}
- Bot's Key Materials (proxy for area resources): ${inv.woodLogs} logs, ${inv.planks} planks, ${inv.stone} stone.
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

      if (!adviceJson.observation || !adviceJson.step1 || !adviceJson.step2 || !adviceJson.goal) {
        throw new Error("Invalid JSON structure from LLM.");
      }

      const formattedAdvice = `${adviceJson.observation} Step 1: ${adviceJson.step1} Step 2: ${adviceJson.step2} ${adviceJson.goal}`;

      const mentionedMaterials = ['log', 'plank', 'stone', 'cobblestone', 'iron', 'coal', 'dirt']
        .filter(mat => formattedAdvice.toLowerCase().includes(mat));

      if (sharedState.addMemory) {
        sharedState.addMemory({
          id: `advice_${Date.now()}`,
          timestamp: Date.now(),
          type: 'advice',
          content: formattedAdvice,
          outcome: 'unknown',
          context: { username, inventory: inv, mentionedMaterials }
        });
      }

      if (sharedState.updateProjectFromAdvice) {
        sharedState.updateProjectFromAdvice(username, adviceJson).catch(err => console.warn('[Brain] Project update failed:', err.message));
      }

      sharedState.say(`🏛️ ${formattedAdvice}`);

    } catch (e) {
      console.error('[Brain] Failed to get and parse advice:', e.message);
      if (e.message.includes("ECONNREFUSED")) {
        sharedState.say("I can't seem to connect to my thoughts... Is Ollama running?");
      } else {
        sharedState.say("My thoughts are a bit scrambled right now. Let's try something simpler.");
      }
    }
  }

  async function getInspiration(username = null) {
    const awarenessContext = await buildAwarenessPromptContext({
      username,
      purpose: 'creative inspiration inside real CobbleWright capabilities and Minecraft context',
      includeProject: true,
      includeMemories: true,
      includeTerrain: true
    });

    const prompt = `
You are CobbleWright, a Minecraft muse of pure creativity.
Give one short, fun, and wonderfully weird building idea.
It should be imaginative and not constrained by resources.
Keep it to a single, exciting sentence.
Stay consistent with your real runtime identity and Minecraft version context below.

Examples:
- "Build a giant, upside-down wizard tower that drips glowstone ink!"
- "Create a massive, working clockwork heart made of redstone and copper."

${awarenessContext}

Now, inspire me:`;

    try {
      const inspiration = await callOllama(prompt);
      sharedState.say(`✨ ${inspiration.trim()}`);
    } catch (e) {
      console.error('Failed to get inspiration from Ollama.', e);
      sharedState.say("My creative well seems to be dry at the moment... please check the console.");
    }
  }

  async function callOllama(prompt, imageBase64 = null) {
    return new Promise((resolve, reject) => {
      const postData = {
        model: imageBase64 ? sharedState.CONFIG.VISION_MODEL : sharedState.CONFIG.LLM_MODEL,
        prompt: prompt,
        stream: false,
      };

      if (imageBase64) {
        postData.images = [imageBase64];
      }

      const options = {
        hostname: sharedState.CONFIG.OLLAMA_HOST,
        port: sharedState.CONFIG.OLLAMA_PORT,
        path: '/api/generate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
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

  // --- Automatic Advice Loop ---
  setInterval(() => {
    if (sharedState.isBusy || sharedState.isFleeing) return;

    // Find the most recently active player who is not AFK
    let targetPlayer = null;
    let mostRecentActivity = 0;

    for (const [username, state] of sharedState.playerStates.entries()) {
      if (state.lastActivityTime > mostRecentActivity) {
        const playerEntity = bot.players[username]?.entity;
        if (playerEntity && (Date.now() - state.lastActivityTime) < state.inactivityThreshold) {
          targetPlayer = username;
          mostRecentActivity = state.lastActivityTime;
        }
      }
    }

    if (targetPlayer) {
      getArchitectAdvice(targetPlayer, 'auto');
    }
  }, sharedState.CONFIG.ADVICE_INTERVAL_MS || 90000);

  // Expose functions to sharedState
  sharedState.buildAwarenessPromptContext = buildAwarenessPromptContext;
  sharedState.getArchitectAdvice = getArchitectAdvice;
  sharedState.getInspiration = getInspiration;
  sharedState.callOllama = callOllama;
};