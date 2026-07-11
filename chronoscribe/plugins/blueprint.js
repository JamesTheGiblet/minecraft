/**
 * @file This plugin handles generating and building blueprints.
 */

const { Vec3 } = require('vec3');

module.exports = (bot, sharedState) => {
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
The user wants a blueprint for a "${structureName}".
Generate a JSON object representing a simple 3x3 or 4x4 version of this structure.
The JSON must have a "name" (string) and a "blocks" (array) property.
Each object in the "blocks" array must have:
- "x", "y", "z" relative integer coordinates (origin 0,0,0 is the front-left-bottom corner).
- "type" (string, e.g., "oak_planks", "cobblestone").

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

    if (missing.length > 0) {
      sharedState.say(`I can't build that yet. I'm missing: ${missing.join(', ')}.`);
      return false;
    }
    return true;
  }

  /**
   * @description Builds a structure in the world based on a blueprint object.
   * @param {object} blueprint - The blueprint object from generateBlueprint.
   * @param {string} username - The player who requested the build.
   */
  async function executeBlueprint(blueprint, username) {
    const player = bot.players[username];
    if (!player || !player.entity) {
      sharedState.say("I can't see you, so I can't build for you!");
      return;
    }

    // Perform a pre-build check for materials.
    if (!checkMaterials(blueprint)) {
      return;
    }

    const origin = player.entity.position.offset(2, 0, 2).floored();
    sharedState.say(`Alright, starting to build the ${blueprint.name} near you!`);

    for (const block of blueprint.blocks) {
      const blockType = bot.registry.blocksByName[block.type];
      if (!blockType) {
        console.warn(`[Blueprint] Unknown block type in blueprint: ${block.type}`);
        continue;
      }

      const targetPos = origin.plus(new Vec3(block.x, block.y, block.z));

      try {
        // Equip the required block
        await bot.equip(blockType.id, 'hand');
        // Place the block
        await bot.placeBlock(bot.blockAt(targetPos.offset(0, -1, 0)), new Vec3(0, 1, 0));
        await bot.waitForTicks(5); // Small delay to prevent server overload
      } catch (e) {
        console.error(`[Blueprint] Failed to place block ${block.type} at ${targetPos}:`, e.message);
        sharedState.say(`I'm having trouble placing the ${block.type}. Make sure I have the materials!`);
        return; // Stop building on error
      }
    }
    sharedState.say(`Finished building the ${blueprint.name}! What do you think?`);
  }

  // Register the /blueprint command
  if (sharedState.registerCommand) {
    sharedState.registerCommand('blueprint', async (username, args) => {
      const structureName = args[1];
      if (!structureName) {
        sharedState.say("What should I build a blueprint for? Try `/blueprint hut` or `/blueprint tower`.");
        return;
      }

      sharedState.say(`Designing a blueprint for a ${structureName}... this requires some thought.`);
      const blueprint = await generateBlueprint(structureName);
      if (blueprint) {
        await executeBlueprint(blueprint, username);
      }
    });
  }
};
