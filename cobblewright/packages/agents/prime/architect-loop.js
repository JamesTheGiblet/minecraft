/**
 * @file This plugin implements the core "Narrative Loop" for autonomous, purpose-driven behavior.
 * It periodically checks the village's desires and responds to its most urgent "calling."
 */

module.exports = (bot, sharedState) => {
  const NARRATIVE_LOOP_INTERVAL_MS = 45000; // Check every 45 seconds.

  // The Narrative Loop claims governorship over the bot's autonomous actions.
  sharedState.governor = 'narrative_loop';

  const decideNextAction = async () => {
    // 1. OBSERVE: Don't act if the bot is already busy or in danger.
    // Also, ensure this loop is still the governor.
    if (sharedState.isBusy || sharedState.isFleeing) return;

    // Check for an active project. If it's the critical Genesis project, do nothing else.
    const activeProject = sharedState.getActiveProject ? await sharedState.getActiveProject(bot.username) : null;
    if (activeProject) {
      if (activeProject.priority === 'critical') return; // Yield to Genesis Project.
      return; // A normal project is active, so the loop should wait.
    }

    // If in creative mode, bypass survival desires and focus on creative tasks.
    if (bot.game.gameMode === 'creative') {
      sharedState.say("A creative canvas! What grand design shall we imagine next?");
      // Future logic could go here to start creative-only projects.
      return;
    }

    // Check for the village state.
    if (!sharedState.village || !sharedState.callings) {
      console.warn('[NarrativeLoop] Village or Callings system not loaded. Cannot determine purpose.');
      return;
    }

    // 2. INTERPRET: What does the village need most right now?
    const mostUrgentDesire = sharedState.village.getMostUrgentDesire();
    const callings = sharedState.callings.interpretation.callings;

    // Find the calling that matches the most urgent desire.
    const activeCalling = callings.find(c => c.id === mostUrgentDesire.name);

    if (!activeCalling || mostUrgentDesire.value < 0.4) { // Lowered threshold to encourage more action
      // If no strong desire, the village is content. The bot can choose to reflect or tell a story.
      if (Math.random() < 0.3 && typeof sharedState.runCritique === 'function') {
        // Decide to run self-critique
        sharedState.runCritique();
      } else if (sharedState.chronicle) {
        sharedState.chronicle.tellStory();
      }
      return;
    }
    
    console.log(`[NarrativeLoop] The village's most urgent desire is '${mostUrgentDesire.name}'. Responding to the calling: "${activeCalling.name}"`);

    // 3. PLAN & ACT: Formulate a project based on the calling's response.
    // This is a simplified example; a real implementation would use the brain to choose the best response.
    const response = activeCalling.responses[0]; // e.g., "Build a wall."
    
    // Determine the correct sub-agent for the task.
    let assignee = 'prime'; // Default to prime
    if (mostUrgentDesire.name === 'safety' || mostUrgentDesire.name === 'community') assignee = 'terra';
    if (mostUrgentDesire.name === 'curiosity') assignee = 'vision';
    if (mostUrgentDesire.name === 'memory' || mostUrgentDesire.name === 'legend') assignee = 'chronos';

    if (response && sharedState.startProject) {
      const project = {
        name: activeCalling.name,
        objective: response,
        tasks: [{ text: response, done: false, assignee: assignee }] // Assign the task
      };

      sharedState.say(`The village calls for ${activeCalling.id}. I will begin the project: ${project.name}.`);
      sharedState.startProject(bot.username, project);

      // Log this decision in the chronicle.
      if (sharedState.chronicle) {
        sharedState.chronicle.createDecision(
          `The Village Chose: ${activeCalling.name}`,
          `In response to a growing desire for ${activeCalling.id}, Prime has tasked ${assignee} with the project: ${response}`,
          ['Prime']
        );
      }
    }
  };

  const loopInterval = setInterval(decideNextAction, NARRATIVE_LOOP_INTERVAL_MS);

  // Ensure the loop doesn't keep the process alive unnaturally.
  if (typeof loopInterval.unref === 'function') {
    loopInterval.unref();
  }

  bot.on('end', () => clearInterval(loopInterval));
};