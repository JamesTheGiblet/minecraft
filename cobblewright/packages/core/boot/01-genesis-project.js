const path = require('path');
const fs = require('fs');

/**
 * Boot Stage 01: Genesis Project.
 * Ensures the bot's initial starting environment is constructed and provisioned.
 * This stage will wait until the critical Genesis Project is complete.
 */
module.exports = async (bot, sharedState) => {
  const genesisStatePath = path.join(__dirname, '..', '..', '..', 'data', 'runtime', 'genesis_state.json');

  // 1. Check if Genesis is already complete for this world.
  try {
    if (fs.existsSync(genesisStatePath)) {
      const state = JSON.parse(fs.readFileSync(genesisStatePath, 'utf8'));
      if (state.completed) {
        console.log('[Boot] Genesis Project already completed. Skipping.');
        return;
      }
    }
  } catch (e) {
    console.warn('[Boot] Could not read genesis state file. Assuming first run.', e);
  }

  // 2. Wait for Project Manager to be ready.
  while (typeof sharedState.startProject !== 'function' || typeof sharedState.getActiveProject !== 'function') {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 3. Start the critical Genesis Project.
  console.log('[Boot] Delegating Genesis sequence to Project Manager...');
  sharedState.say("I am online. Initiating Project Genesis...");

  sharedState.startProject(bot.username, {
    name: 'Project Genesis',
    objective: 'Construct the Genesis Chamber, provision it, and craft initial tools.',
    priority: 'critical',
    tasks: [
      { type: 'build_blueprint', blueprint: 'genesis_chamber' },
      { type: 'provision_blueprint', blueprint: 'genesis_chamber' },
      { type: 'withdraw', item: 'oak_log', count: 3, from: 'chest' },
      { type: 'craft', item: 'oak_planks', count: 4 },
      { type: 'craft', item: 'stick', count: 4 },
      { type: 'craft', item: 'wooden_pickaxe', count: 1 }
    ]
  });

  // 4. Wait for the project to complete before allowing the boot sequence to continue.
  console.log('[Boot] Waiting for critical "Project Genesis" to complete...');
  while (await sharedState.getActiveProject(bot.username)) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds.
  }

  // 5. Mark Genesis as completed so it doesn't run again.
  fs.writeFileSync(genesisStatePath, JSON.stringify({ completed: true }, null, 2));
  console.log('[Boot] "Project Genesis" is complete.');
};