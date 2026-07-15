/**
 * @file Project management plugin for multi-session goal tracking.
 */

const { Pool } = require('pg');

module.exports = (bot, sharedState) => {
  const postgresUrl =
    sharedState?.CONFIG?.POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    null;

  const pool = postgresUrl ? new Pool({ connectionString: postgresUrl }) : null;
  let ready = false;

  const phaseOrder = ['foundation', 'structure', 'utility', 'polish'];

  const normalizePhase = (phase) => {
    const clean = String(phase || 'foundation').toLowerCase();
    return phaseOrder.includes(clean) ? clean : 'foundation';
  };

  const nextPhase = (phase) => {
    const index = phaseOrder.indexOf(normalizePhase(phase));
    if (index < 0 || index >= phaseOrder.length - 1) return null;
    return phaseOrder[index + 1];
  };

  const phaseLabel = (phase) => normalizePhase(phase).charAt(0).toUpperCase() + normalizePhase(phase).slice(1);

  const getOpenTasks = (tasks = []) => (Array.isArray(tasks) ? tasks : []).filter((task) => task && !task.done);

  const getOpenBlockers = (blockers = []) => (Array.isArray(blockers) ? blockers : []).filter((blocker) => blocker && blocker.status === 'open');

  const formatSelectionList = (items) => items.map((item, index) => `${index + 1}. ${item}`).join(' ');

  const selectByReply = (reply, items) => {
    const normalized = String(reply || '').trim().toLowerCase();
    if (!normalized) return null;

    const numericChoice = Number.parseInt(normalized, 10);
    if (Number.isInteger(numericChoice) && numericChoice >= 1 && numericChoice <= items.length) {
      return items[numericChoice - 1];
    }

    return items.find((item) => {
      const label = String(item.label || item.text || item.reason || '').toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags : [];
      return label.includes(normalized) || tags.some((tag) => String(tag).toLowerCase().includes(normalized));
    }) || null;
  };

  const askForSelection = (username, message, items, handler) => {
    const prompt = `${message} Reply with a number, a keyword, or say cancel.`;
    const display = formatSelectionList(items.map((item) => item.label || item.text || item.reason || 'option'));

    if (sharedState.setPendingConversation) {
      sharedState.setPendingConversation(username, {
        kind: 'project-selection',
        ttlMs: 2 * 60 * 1000,
        prompt,
        handle: handler
      });
    }

    sharedState.say(`${prompt} ${display}`.trim());
  };

  const buildTaskSelectionItems = (tasks) => getOpenTasks(tasks).slice(0, 5).map((task, index) => ({
    label: task.text,
    text: task.text,
    value: task.text,
    tags: [String(index + 1)]
  }));

  const buildBlockerSelectionItems = (blockers) => getOpenBlockers(blockers).slice(0, 5).map((blocker, index) => ({
    label: blocker.reason,
    reason: blocker.reason,
    value: blocker.reason,
    tags: [String(index + 1)]
  }));

  const buildPhasePrompt = (objective, phase) => `
You are a Minecraft project planner.
Create a concise JSON task set for the ${phase} phase of a project.
Return ONLY valid JSON in this shape:
{
  "phase": "${phaseOrder.join('|')}",
  "tasks": [{"text":"...","done":false}, {"text":"...","done":false}, {"text":"...","done":false}, {"text":"...","done":false}]
}
Rules:
- 4 tasks exactly.
- Tasks must be actionable and in order.
- Keep each task under 110 characters.
- Focus only on the ${phase} phase.
Objective: ${objective}
`;

  const defaultPlan = (objective) => ({
    phase: 'foundation',
    tasks: [
      { text: `Survey and mark a build site for ${objective}.`, done: false },
      { text: 'Gather core materials for the foundation and frame.', done: false },
      { text: 'Build the first structural pass (shape + safe shelter).', done: false },
      { text: 'Add utility and polishing details.', done: false }
    ]
  });

  const proposePlan = async (objective, phase = 'foundation') => {
    const fallback = defaultPlan(objective);

    if (!sharedState.callOllama) {
      return fallback;
    }

    const prompt = buildPhasePrompt(objective, phase);

    try {
      const response = await sharedState.callOllama(prompt);
      const json = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
      const parsed = JSON.parse(json);

      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks) || parsed.tasks.length < 2) {
        return fallback;
      }

      const tasks = parsed.tasks
        .slice(0, 6)
        .map((task) => ({ text: String(task.text || '').trim(), done: Boolean(task.done) }))
        .filter((task) => task.text.length > 0)
        .slice(0, 4);

      if (tasks.length === 0) return fallback;

      return {
        phase: normalizePhase(parsed.phase || phase),
        tasks
      };
    } catch {
      return fallback;
    }
  };

  const getPhaseSnapshot = (tasks = []) => {
    const phaseTasks = Array.isArray(tasks) ? tasks : [];
    const doneCount = phaseTasks.filter((task) => task?.done).length;
    const totalCount = phaseTasks.length;
    return {
      doneCount,
      totalCount,
      complete: totalCount > 0 && doneCount >= totalCount
    };
  };

  const createPhaseBlocker = (reason) => ({
    id: `blocker_${Date.now()}`,
    reason: String(reason || 'Unknown blocker').trim(),
    status: 'open',
    created_at: Date.now(),
    resolved_at: null
  });

  const updateProjectRecord = async (projectId, patch) => {
    const fields = [];
    const values = [];
    let idx = 1;

    Object.entries(patch).forEach(([key, value]) => {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    });

    if (fields.length === 0) return;
    values.push(projectId, Date.now());

    await pool.query(
      `UPDATE project_goals SET ${fields.join(', ')}, updated_at = $${idx + 1} WHERE id = $${idx}`,
      values
    );
  };

  const ensureSchema = async () => {
    if (!pool) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_goals (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        name TEXT NOT NULL,
        objective TEXT NOT NULL,
        phase TEXT NOT NULL,
        phase_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        tasks JSONB NOT NULL,
        blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
        next_action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS project_goals_user_status_idx ON project_goals (username, status)');
    await pool.query('ALTER TABLE project_goals ADD COLUMN IF NOT EXISTS phase_history JSONB NOT NULL DEFAULT ''[]''::jsonb');
    ready = true;
    console.log('[Project] PostgreSQL project goal storage is ready.');
  };

  const getActiveProject = async (username) => {
    if (!ready || !username) return null;

    const result = await pool.query(
      `
      SELECT *
      FROM project_goals
      WHERE username = $1 AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [username]
    );

    return result.rows[0] || null;
  };

  const summarizeProject = (project) => {
    if (!project) return null;

    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    const done = tasks.filter((task) => task?.done).length;
    const total = tasks.length;
    const blockers = Array.isArray(project.blockers) ? project.blockers : [];

    return {
      name: project.name,
      objective: project.objective,
      phase: project.phase,
      nextAction: project.next_action,
      progress: total > 0 ? `${done}/${total}` : '0/0',
      blockers: blockers.filter((blocker) => blocker?.status === 'open').length,
      openTasks: getOpenTasks(tasks).length
    };
  };

  const regenerateNextPhaseTasks = async (project) => {
    const upcomingPhase = nextPhase(project.phase);
    if (!upcomingPhase) return project;

    const plan = await proposePlan(project.objective, upcomingPhase);
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const nextAction = tasks.find((task) => !task.done)?.text || 'Define the next concrete build step.';
    const phaseHistory = Array.isArray(project.phase_history) ? [...project.phase_history] : [];
    phaseHistory.push({ phase: normalizePhase(project.phase), completed_at: Date.now() });

    await updateProjectRecord(project.id, {
      phase: normalizePhase(upcomingPhase),
      phase_history: JSON.stringify(phaseHistory),
      tasks: JSON.stringify(tasks),
      next_action: nextAction,
      blockers: JSON.stringify([])
    });

    return getActiveProject(project.username);
  };

  const askToClarifyTaskCompletion = async (username, project, taskHint) => {
    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    const openTasks = getOpenTasks(tasks);

    if (openTasks.length === 0) {
      return project;
    }

    const matchingTasks = taskHint
      ? openTasks.filter((task) => String(task.text || '').toLowerCase().includes(String(taskHint || '').trim().toLowerCase()))
      : [];

    const candidates = matchingTasks.length > 0 ? matchingTasks : openTasks.slice(0, 5);
    const items = buildTaskSelectionItems(candidates);

    if (items.length === 0) {
      return project;
    }

    askForSelection(
      username,
      matchingTasks.length > 1
        ? 'Multiple project tasks match that description. Which one did you finish?'
        : 'Which project task did you finish?'
      ,
      items,
      async ({ message, normalizedMessage, clear, say }) => {
        const selection = selectByReply(message, items);
        if (!selection) {
          say(`I still need a clearer task choice. ${formatSelectionList(items.map((item) => item.label))}`);
          return { handled: true, clear: false };
        }

        clear();
        const updated = await markProjectTaskDone(username, selection.value);
        if (!updated) {
          say('No active project found to update.');
          return { handled: true };
        }

        say(`Task marked complete. Next action: ${updated.next_action}`);
        return { handled: true };
      }
    );

    return project;
  };

  const askToClarifyBlocker = async (username, project, blockerHint) => {
    const blockers = Array.isArray(project.blockers) ? project.blockers : [];
    const openBlockers = getOpenBlockers(blockers);

    if (openBlockers.length === 0) {
      return project;
    }

    const matchingBlockers = blockerHint
      ? openBlockers.filter((blocker) => String(blocker.reason || '').toLowerCase().includes(String(blockerHint || '').trim().toLowerCase()))
      : [];

    const candidates = matchingBlockers.length > 0 ? matchingBlockers : openBlockers.slice(0, 5);
    const items = buildBlockerSelectionItems(candidates);

    if (items.length === 0) {
      return project;
    }

    askForSelection(
      username,
      matchingBlockers.length > 1
        ? 'Multiple blockers match that description. Which one should I resolve?'
        : 'Which blocker should I resolve?',
      items,
      async ({ message, clear, say }) => {
        const selection = selectByReply(message, items);
        if (!selection) {
          say(`I still need a clearer blocker choice. ${formatSelectionList(items.map((item) => item.label))}`);
          return { handled: true, clear: false };
        }

        clear();
        const updated = await resolveBlocker(username, selection.value);
        if (!updated) {
          say('No active project found to update.');
          return { handled: true };
        }

        say(`Blocker updated. Open blockers: ${getOpenBlockers(updated.blockers).length}.`);
        return { handled: true };
      }
    );

    return project;
  };

  const setActiveProject = async (username, objective) => {
    if (!ready) throw new Error('Project database is not ready.');

    const cleanObjective = String(objective || '').trim();
    if (!cleanObjective) throw new Error('Project objective is required.');

    const now = Date.now();
    const plan = await proposePlan(cleanObjective, 'foundation');
    const tasks = plan.tasks;
    const nextAction = tasks.find((task) => !task.done)?.text || tasks[0]?.text || 'Define the first concrete build step.';

    await pool.query(
      `
      UPDATE project_goals
      SET status = 'paused', updated_at = $2
      WHERE username = $1 AND status = 'active'
      `,
      [username, now]
    );

    const projectId = `project_${username}_${now}`;
    const projectName = cleanObjective.length > 60 ? `${cleanObjective.slice(0, 57)}...` : cleanObjective;

    await pool.query(
      `
      INSERT INTO project_goals (id, username, name, objective, phase, phase_history, tasks, blockers, next_action, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, $6::jsonb, '[]'::jsonb, $7, 'active', $8, $8)
      `,
      [projectId, username, projectName, cleanObjective, plan.phase || 'foundation', JSON.stringify(tasks), nextAction, now]
    );

    return getActiveProject(username);
  };

  const markProjectTaskDone = async (username, taskHint) => {
    if (!ready) throw new Error('Project database is not ready.');

    const project = await getActiveProject(username);
    if (!project) return null;

    const tasks = Array.isArray(project.tasks) ? [...project.tasks] : [];
    if (tasks.length === 0) return project;

    const openTasks = getOpenTasks(tasks);
    const normalizedHint = String(taskHint || '').trim().toLowerCase();
    const matchingTasks = normalizedHint
      ? openTasks.filter((task) => String(task.text || '').toLowerCase().includes(normalizedHint))
      : [];

    if (!normalizedHint || matchingTasks.length !== 1) {
      return askToClarifyTaskCompletion(username, project, normalizedHint);
    }

    let targetIndex = -1;
    if (matchingTasks.length === 1) {
      targetIndex = tasks.findIndex((task) => !task.done && String(task.text || '').toLowerCase().includes(normalizedHint));
    }

    if (targetIndex >= 0) {
      tasks[targetIndex] = { ...tasks[targetIndex], done: true };
    }

    const snapshot = getPhaseSnapshot(tasks);
    const nextAction = snapshot.complete
      ? `Phase ${phaseLabel(project.phase)} is complete. Use project advance to move to ${phaseLabel(nextPhase(project.phase) || project.phase)}.`
      : tasks.find((task) => !task.done)?.text || 'Project phase in progress.';
    const now = Date.now();

    await pool.query(
      `
      UPDATE project_goals
      SET tasks = $2::jsonb,
          next_action = $3,
          updated_at = $4
      WHERE id = $1
      `,
      [project.id, JSON.stringify(tasks), nextAction, now]
    );

    return getActiveProject(username);
  };

  const addBlocker = async (username, reason) => {
    if (!ready) throw new Error('Project database is not ready.');

    const project = await getActiveProject(username);
    if (!project) return null;

    const cleanReason = String(reason || '').trim();
    if (!cleanReason) {
      return askToClarifyBlocker(username, project, cleanReason);
    }

    const blockers = Array.isArray(project.blockers) ? [...project.blockers] : [];
    blockers.push(createPhaseBlocker(cleanReason));

    await updateProjectRecord(project.id, {
      blockers: JSON.stringify(blockers),
      next_action: 'Resolve blockers before continuing this phase.'
    });

    return getActiveProject(username);
  };

  const resolveBlocker = async (username, blockerHint) => {
    if (!ready) throw new Error('Project database is not ready.');

    const project = await getActiveProject(username);
    if (!project) return null;

    const blockers = Array.isArray(project.blockers) ? [...project.blockers] : [];
    const hint = String(blockerHint || '').trim().toLowerCase();
    const openBlockers = getOpenBlockers(blockers);
    const matchingBlockers = hint
      ? openBlockers.filter((blocker) => String(blocker.reason || '').toLowerCase().includes(hint))
      : [];

    if (!hint || matchingBlockers.length !== 1) {
      return askToClarifyBlocker(username, project, hint);
    }

    const targetBlocker = matchingBlockers[0];
    const targetIndex = blockers.findIndex((blocker) => blocker?.status === 'open' && blocker.id === targetBlocker.id);

    if (targetIndex >= 0) {
      blockers[targetIndex] = {
        ...blockers[targetIndex],
        status: 'resolved',
        resolved_at: Date.now()
      };
    }

    const openBlockers = blockers.filter((blocker) => blocker?.status === 'open').length;
    const nextAction = openBlockers > 0
      ? 'Resolve remaining blockers before advancing.'
      : project.next_action;

    await updateProjectRecord(project.id, {
      blockers: JSON.stringify(blockers),
      next_action: nextAction
    });

    return getActiveProject(username);
  };

  const advanceProjectPhase = async (username, forced = false) => {
    if (!ready) throw new Error('Project database is not ready.');

    const project = await getActiveProject(username);
    if (!project) return null;

    const openBlockers = Array.isArray(project.blockers)
      ? project.blockers.filter((blocker) => blocker?.status === 'open').length
      : 0;

    if (openBlockers > 0 && !forced) {
      await updateProjectRecord(project.id, {
        next_action: 'Resolve blockers before advancing to the next phase.'
      });
      return getActiveProject(username);
    }

    const advanced = await regenerateNextPhaseTasks(project);
    if (!advanced) return project;
    return advanced;
  };

  const updateProjectFromAdvice = async (username, advice) => {
    if (!ready || !advice?.step1) return;

    const project = await getActiveProject(username);
    if (!project) return;

    const nextAction = String(advice.step1).trim();
    if (!nextAction) return;

    await pool.query(
      `
      UPDATE project_goals
      SET next_action = $2,
          updated_at = $3
      WHERE id = $1
      `,
      [project.id, nextAction, Date.now()]
    );
  };

  const formatStatusMessage = (project) => {
    if (!project) return 'No active project yet. Start one with: project start <goal>.';

    const summary = summarizeProject(project);
    return `Active project: ${summary.name}. Phase: ${summary.phase}. Progress: ${summary.progress}. Open blockers: ${summary.blockers}. Next: ${summary.nextAction}`;
  };

  if (sharedState.registerCommand) {
    sharedState.registerCommand('project', async (username, args) => {
      const sub = (args[1] || '').toLowerCase();
      const remainder = args.slice(2).join(' ').trim();

      if (!sub || sub === 'help') {
        sharedState.say('Project commands: project start <goal>, project status, project next, project done [task], project block <reason>, project resolve <blocker>, project advance.');
        return;
      }

      if (!ready) {
        sharedState.say('Project manager is not ready. Check PostgreSQL connection.');
        return;
      }

      try {
        if (sub === 'start') {
          if (!remainder) {
            sharedState.say('Tell me the goal. Example: project start build a riverside castle');
            return;
          }

          const project = await setActiveProject(username, remainder);
          const summary = summarizeProject(project);
          sharedState.say(`Project started: ${summary.name}. Phase: ${summary.phase}. Next: ${summary.nextAction}`);
          return;
        }

        if (sub === 'status') {
          const project = await getActiveProject(username);
          sharedState.say(formatStatusMessage(project));
          return;
        }

        if (sub === 'next') {
          const project = await getActiveProject(username);
          if (!project) {
            sharedState.say('No active project yet. Start one with: project start <goal>.');
            return;
          }
          sharedState.say(`Next project action: ${project.next_action}`);
          return;
        }

        if (sub === 'done') {
          const project = await markProjectTaskDone(username, remainder);
          if (!project) {
            sharedState.say('No active project found to update.');
            return;
          }
          sharedState.say(`Progress updated. Next action: ${project.next_action}`);
          return;
        }

        if (sub === 'block') {
          const project = await addBlocker(username, remainder);
          if (!project) {
            sharedState.say('No active project found to update.');
            return;
          }

          sharedState.say(`Blocker added. Current next action: ${project.next_action}`);
          return;
        }

        if (sub === 'unblock' || sub === 'resolve') {
          const project = await resolveBlocker(username, remainder);
          if (!project) {
            sharedState.say('No active project found to update.');
            return;
          }

          sharedState.say(`Blocker updated. Open blockers: ${(Array.isArray(project.blockers) ? project.blockers.filter((blocker) => blocker?.status === 'open').length : 0)}.`);
          return;
        }

        if (sub === 'advance' || sub === 'nextphase' || sub === 'phase') {
          const project = await advanceProjectPhase(username, false);
          if (!project) {
            sharedState.say('No active project found to update.');
            return;
          }

          sharedState.say(`Phase updated. Now in ${project.phase}. Next action: ${project.next_action}`);
          return;
        }

        sharedState.say('Unknown project subcommand. Use: project start|status|next|done');
      } catch (error) {
        console.error('[Project] Command failed:', error);
        sharedState.say('I had trouble updating the project right now.');
      }
    });
  }

  sharedState.getActiveProject = getActiveProject;
  sharedState.updateProjectFromAdvice = updateProjectFromAdvice;
  sharedState.advanceProjectPhase = advanceProjectPhase;
  sharedState.resolveProjectBlocker = resolveBlocker;

  bot.once('login', async () => {
    if (!pool) {
      console.warn('[Project] POSTGRES_URL is not configured. Project manager is disabled.');
      return;
    }

    try {
      await ensureSchema();
    } catch (error) {
      console.error('[Project] Failed to initialize project manager:', error);
    }
  });
};
