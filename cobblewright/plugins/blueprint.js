/**
 * @file This plugin handles generating and building blueprints.
 */

const { Vec3 } = require('vec3');
const { GoalBlock } = require('mineflayer-pathfinder').goals;

module.exports = (bot, sharedState) => {
  const MAX_BLUEPRINT_BLOCKS = 400;
  const MAX_BLUEPRINT_DIMENSION = 10;
  const MAX_CLEAR_VOLUME = 1000;
  const MAX_COORD_ABS = 32;
  const STRUCTURE_NAME_PATTERN = /^[a-z0-9 _-]{1,32}$/i;
  const BLOCK_TYPE_PATTERN = /^[a-z0-9_]+$/;

  const sanitizeStructureName = (rawName) => {
    if (typeof rawName !== 'string') return null;
    const trimmed = rawName.trim();
    if (!STRUCTURE_NAME_PATTERN.test(trimmed)) return null;
    return trimmed.toLowerCase();
  };

  const validateBlueprint = (blueprint) => {
    if (!blueprint || typeof blueprint !== 'object') {
      return { valid: false, error: 'Blueprint payload is not a valid object.' };
    }

    if (typeof blueprint.name !== 'string' || blueprint.name.trim().length === 0 || blueprint.name.length > 64) {
      return { valid: false, error: 'Blueprint name is missing or too long.' };
    }

    if (!Array.isArray(blueprint.blocks) || blueprint.blocks.length === 0) {
      return { valid: false, error: 'Blueprint must include at least one block.' };
    }

    if (blueprint.blocks.length > MAX_BLUEPRINT_BLOCKS) {
      return { valid: false, error: `Blueprint exceeds the block limit (${MAX_BLUEPRINT_BLOCKS}).` };
    }

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    const coordinateSet = new Set();

    for (const block of blueprint.blocks) {
      if (!block || typeof block !== 'object') {
        return { valid: false, error: 'Blueprint contains an invalid block record.' };
      }

      const { x, y, z, type } = block;
      if (![x, y, z].every(Number.isInteger)) {
        return { valid: false, error: 'Blueprint coordinates must be integers.' };
      }

      if (Math.abs(x) > MAX_COORD_ABS || Math.abs(y) > MAX_COORD_ABS || Math.abs(z) > MAX_COORD_ABS) {
        return { valid: false, error: 'Blueprint coordinates exceed the allowed range.' };
      }

      if (typeof type !== 'string' || !BLOCK_TYPE_PATTERN.test(type)) {
        return { valid: false, error: `Blueprint contains an invalid block type: ${type}` };
      }

      const key = `${x},${y},${z}`;
      if (coordinateSet.has(key)) {
        return { valid: false, error: 'Blueprint contains duplicate block coordinates.' };
      }
      coordinateSet.add(key);

      minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
    }

    const width = (maxX - minX) + 1;
    const height = (maxY - minY) + 1;
    const depth = (maxZ - minZ) + 1;
    const volume = width * height * depth;

    if (width > MAX_BLUEPRINT_DIMENSION || height > MAX_BLUEPRINT_DIMENSION || depth > MAX_BLUEPRINT_DIMENSION) {
      return { valid: false, error: `Blueprint dimensions exceed ${MAX_BLUEPRINT_DIMENSION}x${MAX_BLUEPRINT_DIMENSION}x${MAX_BLUEPRINT_DIMENSION}.` };
    }

    if (volume > MAX_CLEAR_VOLUME) {
      return { valid: false, error: `Blueprint clear volume exceeds ${MAX_CLEAR_VOLUME}.` };
    }

    return { valid: true };
  };

  /**
   * @description Generates a JSON blueprint for a simple structure using the LLM.
   * @param {string} structureName - The name of the structure to generate (e.g., "hut", "tower").
   * @returns {Promise<object|null>} A blueprint object or null on failure.
   */
  async function generateBlueprint(structureName) {
    // This prompt is a key architectural decision. Instead of asking the AI for a natural
    // language description, we force it to respond in a structured JSON format.
    // This makes the AI's output predictable and machine-readable, which is far more
    // reliable than trying to parse unstructured text. It turns the LLM into a predictable
    // function call that returns a data object.
    const prompt = `
You are a Minecraft blueprint generator.
The user wants a blueprint for a "${structureName}". Keep it interesting but manageable.
Generate a JSON object for a structure up to 10x10x10 in size. It can be multi-level.
The JSON must have a "name" (string) and a "blocks" (array) property.
Each object in the "blocks" array must have:
- "x", "y", "z" relative integer coordinates (origin 0,0,0 is the front-left-bottom corner).
- "type" (string, e.g., "oak_planks", "cobblestone").

Prefer gather-friendly and common materials when possible, especially logs, planks, cobblestone, stone, dirt, sand, glass, and simple decorative blocks that can be collected or crafted from those materials.

Example for a 3x3 hut:
{
  "name": "Simple Hut",
  "blocks": [
    {"x": 0, "y": 0, "z": 0, "type": "oak_log"},
    {"x": 2, "y": 0, "z": 0, "type": "oak_log"},
    {"x": 0, "y": 0, "z": 2, "type": "oak_log"},
    {"x": 2, "y": 0, "z": 2, "type": "oak_log"},
    {"x": 1, "y": 0, "z": 0, "type": "oak_planks"},
    {"x": 0, "y": 1, "z": 0, "type": "oak_log"},
    {"x": 2, "y": 1, "z": 0, "type": "oak_log"},
    {"x": 0, "y": 1, "z": 2, "type": "oak_log"},
    {"x": 2, "y": 1, "z": 2, "type": "oak_log"}
  ]
}

Now, generate the JSON for a "${structureName}". Respond with ONLY the JSON object.`;

    try {
      const response = await sharedState.callOllama(prompt);
      // Clean the response to ensure it's valid JSON
      const jsonString = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('[Blueprint] Failed to generate or parse blueprint:', e);
      sharedState.say("I had a bit of a mental block trying to design that. Please try again.");
      return null;
    }
  }

  /**
   * @description Checks if the bot has the required materials for a blueprint.
   * @param {object} blueprint - The blueprint object.
   * @returns {boolean} True if all materials are available, false otherwise.
   * This is a crucial user experience (UX) improvement. Instead of starting to build
   * and failing midway, we perform a pre-flight check. This provides immediate,
   * clear feedback to the user about what's missing.
   * @returns {boolean} True if all materials are available, false otherwise.
   */
  function checkMaterials(blueprint) {
    const required = {};
    blueprint.blocks.forEach(block => {
      required[block.type] = (required[block.type] || 0) + 1;
    });

    const inventory = bot.inventory.items();
    const missing = [];

    for (const type in required) {
      const countInInv = inventory.filter(item => item.name === type).reduce((sum, item) => sum + item.count, 0);
      if (countInInv < required[type]) {
        missing.push(`${required[type]}x ${type}`);
      }
    }

    return {
      ready: missing.length === 0,
      missing
    };
  }

  /**
   * @description Clears a defined area of any blocks to make space for building.
   * @param {object} blueprint - The blueprint object to determine the area size.
   * @param {Vec3} origin - The starting corner of the build area.
   * @returns {Promise<boolean>} True if clearing was successful, false otherwise.
   */
  async function clearAreaForBlueprint(blueprint, origin) {
    // Determine the bounding box of the blueprint
    let min = { x: Infinity, y: Infinity, z: Infinity };
    let max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const block of blueprint.blocks) {
      min.x = Math.min(min.x, block.x); min.y = Math.min(min.y, block.y); min.z = Math.min(min.z, block.z);
      max.x = Math.max(max.x, block.x); max.y = Math.max(max.y, block.y); max.z = Math.max(max.z, block.z);
    }

    // If the bot is an OP, use the much faster /fill command.
    if (bot.player.op) {
      sharedState.say("Preparing the construction site with operator speed!");
      const from = origin.plus(new Vec3(min.x, min.y, min.z));
      const to = origin.plus(new Vec3(max.x, max.y, max.z));
      const command = `/fill ${from.x} ${from.y} ${from.z} ${to.x} ${to.y} ${to.z} air`;
      try {
        await bot.chat(command);
        return true;
      } catch (e) {
        console.error(`[Blueprint] /fill command failed:`, e.message);
        sharedState.say("I tried to use my operator powers to clear the area, but it failed. I'll try the old-fashioned way.");
        // Fall through to manual digging if /fill fails.
      }
    }

    // Fallback to manual digging if not an OP or if /fill failed.
    sharedState.say("Preparing the construction site...");
    for (let y = min.y; y <= max.y; y++) {
      for (let x = min.x; x <= max.x; x++) {
        for (let z = min.z; z <= max.z; z++) {
          if (sharedState.isCancelled) return false;
          const targetPos = origin.plus(new Vec3(x, y, z));
          const block = bot.blockAt(targetPos);
          if (block && block.name !== 'air') {
            try {
              await bot.dig(block, true);
            } catch (e) {
              console.error(`[Blueprint] Failed to clear block at ${targetPos}:`, e.message);
              sharedState.say("I'm having trouble clearing the area. Something is in the way.");
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  /**
   * @description Builds a structure in the world based on a blueprint object.
   * @param {object} blueprint - The blueprint object from generateBlueprint.
   * @param {string} username - The player who requested the build.
   */
  async function executeBlueprint(blueprint, username, originOverride = null) {
    if (sharedState.isFleeing) {
      sharedState.say("I can't build right now, I'm trying to stay safe!");
      return;
    }

    const validation = validateBlueprint(blueprint);
    if (!validation.valid) {
      sharedState.say(`I can't safely build that blueprint: ${validation.error}`);
      return;
    }

    const player = username ? bot.players[username] : null;
    if (!originOverride && (!player || !player.entity)) {
      sharedState.say("I can't see you, so I can't build for you!");
      return;
    }

    try {
      // Perform a pre-build check for materials.
      const materialStatus = checkMaterials(blueprint);
      if (!materialStatus.ready) {
        sharedState.say(`I can't build that yet. I'm missing: ${materialStatus.missing.join(', ')}.`);
        return;
      }

      const origin = originOverride ?? player.entity.position.offset(2, 0, 2).floored();

      // Clear the area before building
      const clearedSuccessfully = await clearAreaForBlueprint(blueprint, origin);
      if (!clearedSuccessfully) {
        return; // Stop if clearing failed
      }

      sharedState.say(`Site cleared! Now, starting to build the ${blueprint.name} near you!`);

      // Define a safe spot for the bot to stand if it gets in the way.
      // This is outside the typical 4x4 build area.
      const safeSpot = origin.offset(-2, 0, -2);

      for (const block of blueprint.blocks) {
        // Check for cancellation signal
        if (sharedState.isCancelled) break;

        const blockType = bot.registry.blocksByName[block.type];
        if (!blockType) {
          console.warn(`[Blueprint] Unknown block type in blueprint: ${block.type}`);
          continue;
        }

        const targetPos = origin.plus(new Vec3(block.x, block.y, block.z));

        try {
          // Check if the bot is in the way. The bot is ~2 blocks tall.
          const botPos = bot.entity.position.floored();
          if (targetPos.equals(botPos) || targetPos.equals(botPos.offset(0, 1, 0))) {
            sharedState.say("Oops, pardon me. Getting out of the way.");
            await bot.pathfinder.goto(new GoalBlock(safeSpot.x, safeSpot.y, safeSpot.z));
          }

          // Equip the required block
          await bot.equip(blockType.id, 'hand');

          // The reference block must be solid and adjacent to the target position.
          // We find a solid block nearby to place against.
          const referenceBlock = bot.blockAt(targetPos.offset(0, -1, 0)) || bot.blockAt(targetPos.offset(1, 0, 0)) || bot.blockAt(targetPos.offset(-1, 0, 0)) || bot.blockAt(targetPos.offset(0, 0, 1)) || bot.blockAt(targetPos.offset(0, 0, -1));
          if (!referenceBlock) {
            console.warn(`[Blueprint] No solid block found next to ${targetPos} to place against.`);
            continue;
          }
          await bot.placeBlock(referenceBlock, targetPos.minus(referenceBlock.position));
          await bot.waitForTicks(5); // Small delay to prevent server overload
        } catch (e) {
          console.error(`[Blueprint] Failed to place block ${block.type} at ${targetPos}. Error:`, e.message);
          sharedState.say(`I'm having trouble placing the ${block.type}. Make sure I have the materials!`);
          return; // Stop building on error
        }
      }
      if (!sharedState.isCancelled) {
        sharedState.say(`Finished building the ${blueprint.name}! What do you think?`);
      }
    } finally {
      sharedState.isCancelled = false; // Always reset flag on exit
    }
  }

  sharedState.buildStructure = async (structureName, username, options = {}) => {
    const normalizedName = sanitizeStructureName(structureName);
    if (!normalizedName) {
      sharedState.say('That structure name is not valid. Use letters, numbers, spaces, underscores, or hyphens.');
      return false;
    }

    let blueprint;
    if (sharedState.STRUCTURES_DATA[normalizedName]) {
      blueprint = sharedState.STRUCTURES_DATA[normalizedName];
    } else {
      blueprint = await generateBlueprint(normalizedName);
    }

    if (!blueprint) {
      return false;
    }

    const validation = validateBlueprint(blueprint);
    if (!validation.valid) {
      console.warn(`[Blueprint] Rejected unsafe blueprint for "${normalizedName}": ${validation.error}`);
      sharedState.say(`I can't safely build that blueprint: ${validation.error}`);
      return false;
    }

    if (sharedState.collectBlueprintResources) {
      const resourceLoop = await sharedState.collectBlueprintResources(blueprint, username);
      if (!resourceLoop.satisfied) {
        const unresolvedSummary = resourceLoop.unresolved
          .map((entry) => `${entry.missingCount}x ${entry.itemName}`)
          .join(', ');
        sharedState.say(`I can start the build after I gather or craft a bit more: ${unresolvedSummary}.`);
        return false;
      }
    }

    const materialCheck = checkMaterials(blueprint);
    if (!materialCheck.ready) {
      sharedState.say(`I still don't have everything I need: ${materialCheck.missing.join(', ')}.`);
      return false;
    }

    return sharedState.runBusyTask(() => executeBlueprint(blueprint, username, options.origin ?? null));
  };

  // Register the /blueprint command
  if (sharedState.registerCommand) {
    sharedState.registerCommand('blueprint', async (username, args) => {
      const structureName = sanitizeStructureName(args[1]);
      if (!structureName) {
        sharedState.say("Please provide a valid structure name. Try `/blueprint hut` or `/blueprint tower`.");
        return;
      }

      if (sharedState.STRUCTURES_DATA[structureName]) {
        sharedState.say(`I know how to build a ${structureName}! Using my pre-defined blueprint.`);
      } else {
        sharedState.say(`I don't have a pre-made blueprint for a ${structureName}. Designing one now... this requires some thought.`);
      }

      await sharedState.buildStructure(structureName, username);
    });

    sharedState.registerCommand('structures', (username, args) => {
      const knownStructures = Object.keys(sharedState.STRUCTURES_DATA);
      sharedState.say(`I have pre-made blueprints for: ${knownStructures.join(', ')}. You can build one with '/blueprint <name>'.`);
    });
  }
};
