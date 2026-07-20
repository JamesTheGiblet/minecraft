/**
 * @file This plugin contains the "Leighton Weight" self-correction loop.
 * Its purpose is to analyze the outcome of advice to make future suggestions better.
 */

module.exports = (bot, sharedState) => {
  const telemetryByUser = new Map();
  let physicsTickCounter = 0;

  // A more robust mapping from advice keywords to inventory summary keys.
  const materialToInvKey = {
    'log': 'woodLogs',
    'plank': 'planks',
    'stone': 'stone',
    'cobblestone': 'stone',
    'iron': 'iron_ore',
    'coal': 'coal',
    'furnace': 'has_furnace',
    'crafting_table': 'has_crafting_table'
  };

  const FAILURE_HINTS = {
    low_mobility: 'reduce complexity and suggest shorter local tasks',
    no_build_progress: 'prioritize concrete placement goals and explicit first action',
    hazard_pressure: 'prioritize safety, lighting, and defensive positioning first',
    resource_friction: 'prefer gather-friendly alternatives and lower-tier materials',
    project_stall: 'restate current project next action before new ideas'
  };

  const getTelemetryRecord = (username) => {
    if (!telemetryByUser.has(username)) {
      telemetryByUser.set(username, {
        movementDistance: 0,
        blockChangesNearPlayer: 0,
        hazardEvents: 0,
        lastPosition: null
      });
    }
    return telemetryByUser.get(username);
  };

  const getTelemetrySnapshot = (username) => {
    const record = getTelemetryRecord(username);
    return {
      movementDistance: record.movementDistance,
      blockChangesNearPlayer: record.blockChangesNearPlayer,
      hazardEvents: record.hazardEvents
    };
  };

  const recordHazardEvent = (username) => {
    if (!username) return;
    const record = getTelemetryRecord(username);
    record.hazardEvents += 1;
  };

  sharedState.getLearningTelemetrySnapshot = getTelemetrySnapshot;
  sharedState.recordHazardEvent = recordHazardEvent;

  const buildFailurePatterns = ({ movementScore, blockScore, projectScore, hazardDelta, inventorySignal, hadProject }) => {
    const patterns = [];
    if (movementScore < 0.15) patterns.push('low_mobility');
    if (blockScore <= 0 && projectScore <= 0) patterns.push('no_build_progress');
    if (hazardDelta > 0) patterns.push('hazard_pressure');
    if (!inventorySignal) patterns.push('resource_friction');
    if (hadProject && projectScore <= 0) patterns.push('project_stall');
    return patterns;
  };

  const updateSignalAverage = (profile, key, value) => {
    if (!profile.signalAverages) profile.signalAverages = {};
    const prev = Number(profile.signalAverages[key]) || 0;
    profile.signalAverages[key] = Number((prev * 0.8 + value * 0.2).toFixed(4));
  };

  const updateLearningProfile = async (username, scoredOutcome, playerStyle) => {
    if (!sharedState.getLearningProfile || !sharedState.saveLearningProfile) return; // The updateMemory check was incorrect here.

    const profile = await sharedState.getLearningProfile(username);
    profile.successCount = Number(profile.successCount || 0);
    profile.failureCount = Number(profile.failureCount || 0);
    profile.runningScore = Number(profile.runningScore || 0);
    profile.styleAffinity = profile.styleAffinity || {};
    profile.failurePatternCounts = profile.failurePatternCounts || {};

    if (scoredOutcome.outcome === 'likely_successful') {
      profile.successCount += 1;
      if (playerStyle && playerStyle !== 'any') {
        profile.styleAffinity[playerStyle] = Number(profile.styleAffinity[playerStyle] || 0) + 1;
      }
    } else {
      profile.failureCount += 1;
      scoredOutcome.failurePatterns.forEach((pattern) => {
        profile.failurePatternCounts[pattern] = Number(profile.failurePatternCounts[pattern] || 0) + 1;
      });
    }

    profile.runningScore = Number((profile.runningScore * 0.7 + scoredOutcome.compositeScore * 0.3).toFixed(4));

    updateSignalAverage(profile, 'movement', scoredOutcome.movementScore);
    updateSignalAverage(profile, 'blockProgress', scoredOutcome.blockScore);
    updateSignalAverage(profile, 'projectProgress', scoredOutcome.projectScore);
    updateSignalAverage(profile, 'hazardPenalty', scoredOutcome.hazardPenalty);

    const sortedPatterns = Object.entries(profile.failurePatternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    profile.topFailurePatterns = sortedPatterns;

    const hints = sortedPatterns
      .map((pattern) => FAILURE_HINTS[pattern])
      .filter(Boolean);

    profile.priorityHints = hints.length > 0
      ? hints
      : [
        'favor realistic, resource-aware steps',
        'include safety and site-readiness checks',
        'prefer short actionable sequences'
      ];

    if (profile.runningScore > 0.6 && profile.successCount >= 5) {
      profile.preferredDifficulty = 'advanced';
    } else if (profile.runningScore > 0.25) {
      profile.preferredDifficulty = 'balanced';
    } else {
      profile.preferredDifficulty = 'guided';
    }

    await sharedState.saveLearningProfile(username, profile);
  };

  const scoreAdviceOutcome = async (capsule) => {
    const username = capsule?.context?.username;
    if (!username) return null;

    const previousInv = capsule.context.inventory || {};
    const currentInv = sharedState.getInventorySummary(username);
    const telemetryNow = (typeof sharedState.getLearningTelemetrySnapshot === 'function'
      ? sharedState.getLearningTelemetrySnapshot(username)
      : getTelemetrySnapshot(username)) || { movementDistance: 0, blockChangesNearPlayer: 0, hazardEvents: 0 };
    const telemetryAtAdvice = capsule.context.telemetryAtAdvice || { movementDistance: 0, blockChangesNearPlayer: 0, hazardEvents: 0 };

    const movementDelta = Math.max(0, (telemetryNow.movementDistance || 0) - (telemetryAtAdvice.movementDistance || 0));
    const blockDelta = Math.max(0, (telemetryNow.blockChangesNearPlayer || 0) - (telemetryAtAdvice.blockChangesNearPlayer || 0));
    const hazardDelta = Math.max(0, (telemetryNow.hazardEvents || 0) - (telemetryAtAdvice.hazardEvents || 0));

    let inventorySignal = false;
    if (capsule.context.mentionedMaterials && capsule.context.mentionedMaterials.length > 0) {
      for (const material of capsule.context.mentionedMaterials) {
        const invKey = materialToInvKey[material];
        if (!invKey) continue;

        const previousValue = previousInv[invKey];
        const currentValue = currentInv[invKey];
        if (typeof previousValue === 'boolean' && previousValue === false && currentValue === true) {
          inventorySignal = true;
          break;
        }
        if (typeof previousValue === 'number' && typeof currentValue === 'number' && currentValue < previousValue) {
          inventorySignal = true;
          break;
        }
      }
    } else {
      inventorySignal = currentInv.woodLogs < (previousInv.woodLogs || 0) || currentInv.stone < (previousInv.stone || 0);
    }

    let projectScore = 0;
    const projectSnapshot = capsule.context.projectAtAdvice || null;
    const hadProject = Boolean(projectSnapshot?.id && sharedState.getActiveProject);
    if (hadProject) {
      const currentProject = await sharedState.getActiveProject(username).catch(() => null);
      if (currentProject && currentProject.id === projectSnapshot.id) {
        const doneBefore = Number(projectSnapshot.doneCount || 0);
        const doneAfter = Array.isArray(currentProject.tasks) ? currentProject.tasks.filter((task) => task?.done).length : 0;
        const phaseChanged = currentProject.phase !== projectSnapshot.phase;
        if (doneAfter > doneBefore) projectScore = 1;
        else if (phaseChanged) projectScore = 0.7;
      }
    }

    const movementScore = Math.min(1, movementDelta / 20);
    const blockScore = Math.min(1, blockDelta / 8);
    const hazardPenalty = Math.min(1, hazardDelta / 2);
    const inventoryScore = inventorySignal ? 1 : 0;

    const compositeScore = Number((
      inventoryScore * 0.35 +
      movementScore * 0.2 +
      blockScore * 0.2 +
      projectScore * 0.25 -
      hazardPenalty * 0.25
    ).toFixed(4));

    let outcome = 'likely_ignored';
    if (compositeScore >= 0.3) outcome = 'likely_successful';
    else if (compositeScore <= 0) outcome = 'likely_failed';

    const failurePatterns = buildFailurePatterns({
      movementScore,
      blockScore,
      projectScore,
      hazardDelta,
      inventorySignal,
      hadProject
    });

    return {
      outcome,
      compositeScore,
      inventorySignal,
      movementScore,
      blockScore,
      projectScore,
      hazardPenalty,
      failurePatterns
    };
  };

  const critiqueLoop = async () => {
    const unreviewedAdvice = sharedState.memoryLog.filter(entry => entry.type === 'advice' && entry.outcome === 'unknown');
    if (unreviewedAdvice.length === 0) return;

    console.log(`[Leighton Weight] Running critique loop on ${unreviewedAdvice.length} unreviewed capsule(s)...`);

    for (const capsule of unreviewedAdvice) {
      const username = capsule.context.username;
      const playerState = sharedState.playerStates.get(username);

      // 1. Check for player inactivity first. If the player is AFK, we can't make a judgment.
      if (playerState && (Date.now() - playerState.lastActivityTime) > playerState.inactivityThreshold) {
        console.log(`[Critique] Skipping critique for AFK player: ${username}`);
        continue;
      }

      const timeSinceAdvice = Date.now() - capsule.timestamp;
      const CRITIQUE_DELAY_MS = 60000; // Wait 60 seconds before judging.

      if (timeSinceAdvice > CRITIQUE_DELAY_MS) {
        const scoredOutcome = await scoreAdviceOutcome(capsule);
        if (!scoredOutcome) continue;

        capsule.outcome = scoredOutcome.outcome;
        capsule.learningSignals = {
          compositeScore: scoredOutcome.compositeScore,
          inventorySignal: scoredOutcome.inventorySignal,
          movementScore: scoredOutcome.movementScore,
          blockScore: scoredOutcome.blockScore,
          projectScore: scoredOutcome.projectScore,
          hazardPenalty: scoredOutcome.hazardPenalty,
          failurePatterns: scoredOutcome.failurePatterns
        };

        console.log(`[Critique] Outcome for capsule ${capsule.id} set to: ${capsule.outcome} (score ${scoredOutcome.compositeScore}).`);

        const playerStyle = sharedState.playerStates.get(username)?.currentStyle || 'any';
        await updateLearningProfile(username, scoredOutcome, playerStyle);

        // Persist the updated outcome to the long-term memory.
        if (sharedState.updateMemory) {
          await sharedState.updateMemory(capsule).catch((error) => {
            console.warn('[Leighton Weight] Failed to persist updated capsule:', error.message);
          });
        }
      }
    }
  };

  bot.on('physicsTick', () => {
    physicsTickCounter += 1;
    if (physicsTickCounter % 20 !== 0) return;

    for (const [username, state] of sharedState.playerStates.entries()) {
      const entity = bot.players[username]?.entity;
      if (!entity?.position) continue;

      const telemetry = getTelemetryRecord(username);
      if (telemetry.lastPosition) {
        const delta = entity.position.distanceTo(telemetry.lastPosition);
        if (Number.isFinite(delta) && delta > 0.2) {
          telemetry.movementDistance += delta;
        }
      }

      telemetry.lastPosition = entity.position.clone ? entity.position.clone() : entity.position;
      state.lastPosition = telemetry.lastPosition;
    }
  });

  bot.on('blockUpdate', (_oldBlock, newBlock) => {
    if (!newBlock?.position) return;

    for (const [username] of sharedState.playerStates.entries()) {
      const entity = bot.players[username]?.entity;
      if (!entity?.position) continue;

      if (entity.position.distanceTo(newBlock.position) <= 8) {
        const telemetry = getTelemetryRecord(username);
        telemetry.blockChangesNearPlayer += 1;
      }
    }
  });

  bot.on('entityHurt', (entity) => {
    if (!entity) return;
    for (const [username] of sharedState.playerStates.entries()) {
      const playerEntity = bot.players[username]?.entity;
      if (playerEntity && entity.id === playerEntity.id) {
        recordHazardEvent(username);
      }
    }
  });

  bot.on('messagestr', (message, messagePosition) => {
    if (messagePosition !== 'chat') return;
    const deathRegex = /^(\w+) (was slain by|was shot by|drowned|blew up|fell from a high place|hit the ground too hard|starved to death|suffocated in a wall)/;
    const match = message.match(deathRegex);
    if (match && match[1]) {
      recordHazardEvent(match[1]);
    }
  });

  bot.once('login', () => {
    // Run the critique loop slightly more often than advice is given to ensure timely review.
    setInterval(() => {
      critiqueLoop().catch((error) => {
        console.warn('[Leighton Weight] Critique loop failed:', error.message);
      });
    }, sharedState.CONFIG.ADVICE_INTERVAL_MS * 2);
  });
};