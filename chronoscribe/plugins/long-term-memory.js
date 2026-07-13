/**
 * @file This plugin integrates ChromaDB for persistent long-term memory.
 */

const { ChromaClient } = require('chromadb');
const path = require('path');

module.exports = (bot, sharedState) => {
  const client = new ChromaClient({ path: path.join(__dirname, '..', 'chroma-db') });
  let collection;

  const retentionEnabled = sharedState.CONFIG.MEMORY_RETENTION_ENABLED !== false;
  const configuredMaxEntries = Number.parseInt(sharedState.CONFIG.MEMORY_MAX_ENTRIES, 10);
  const configuredMaxAgeDays = Number.parseInt(sharedState.CONFIG.MEMORY_MAX_AGE_DAYS, 10);

  const maxEntries = Number.isInteger(configuredMaxEntries) && configuredMaxEntries > 0
    ? configuredMaxEntries
    : null;
  const maxAgeMs = Number.isInteger(configuredMaxAgeDays) && configuredMaxAgeDays > 0
    ? configuredMaxAgeDays * 24 * 60 * 60 * 1000
    : null;

  const getTimestamp = (capsule) => {
    const ts = Number(capsule?.timestamp);
    return Number.isFinite(ts) ? ts : 0;
  };

  const applyRetentionToEntries = (entries) => {
    if (!retentionEnabled || !Array.isArray(entries) || entries.length === 0) {
      return { kept: Array.isArray(entries) ? entries : [], deletedIds: [] };
    }

    const now = Date.now();
    let working = [...entries];

    if (maxAgeMs) {
      working = working.filter((entry) => {
        const ts = getTimestamp(entry.metadata);
        if (!ts) return false;
        return (now - ts) <= maxAgeMs;
      });
    }

    working.sort((a, b) => getTimestamp(b.metadata) - getTimestamp(a.metadata));

    if (maxEntries && working.length > maxEntries) {
      working = working.slice(0, maxEntries);
    }

    const keptIdSet = new Set(working.map((entry) => entry.id).filter(Boolean));
    const deletedIds = entries
      .map((entry) => entry.id)
      .filter((id) => id && !keptIdSet.has(id));

    return { kept: working, deletedIds };
  };

  const prunePersistentMemory = async () => {
    if (!collection || !retentionEnabled) return;

    try {
      const allMemories = await collection.get({ include: ['metadatas'] });
      const ids = Array.isArray(allMemories?.ids) ? allMemories.ids : [];
      const metadatas = Array.isArray(allMemories?.metadatas) ? allMemories.metadatas : [];

      const entries = [];
      for (let i = 0; i < ids.length; i++) {
        if (!ids[i] || !metadatas[i]) continue;
        entries.push({ id: ids[i], metadata: metadatas[i] });
      }

      const { kept, deletedIds } = applyRetentionToEntries(entries);

      if (deletedIds.length > 0) {
        await collection.delete({ ids: deletedIds });
        console.log(`[LTM] Pruned ${deletedIds.length} memory capsule(s) due to retention policy.`);
      }

      sharedState.memoryLog = kept
        .map((entry) => entry.metadata)
        .sort((a, b) => getTimestamp(a) - getTimestamp(b));
    } catch (e) {
      console.error('[LTM] Failed to apply retention pruning:', e);
    }
  };

  /**
   * @description Initializes the database connection and loads recent memories.
   */
  async function initializeMemory() {
    try {
      collection = await client.getOrCreateCollection({ name: "memory_stream" });
      console.log('[LTM] Connected to ChromaDB collection "memory_stream".');

      // Load recent memories into the working memory log on startup.
      const recentMemories = await collection.get({
        limit: maxEntries ? Math.max(maxEntries, 100) : 100,
        include: ["metadatas"]
      });

      // The bot's short-term memory is now seeded with long-term memories.
      sharedState.memoryLog = recentMemories.metadatas.sort((a, b) => getTimestamp(a) - getTimestamp(b));
      console.log(`[LTM] Loaded ${sharedState.memoryLog.length} recent memories into the working memory log.`);

      await prunePersistentMemory();

    } catch (e) {
      console.error('[LTM] CRITICAL: Failed to initialize ChromaDB. Long-term memory will be disabled.', e);
    }
  }

  /**
   * @description Adds a new memory to both the working log and the persistent database.
   * @param {object} memoryCapsule - The memory object to add.
   */
  async function addMemory(memoryCapsule) {
    if (!collection) {
      console.warn('[LTM] Cannot add memory, database not initialized.');
      // Fallback to just using the in-memory log for this session.
      sharedState.memoryLog.push(memoryCapsule);

      if (retentionEnabled) {
        const fallbackEntries = sharedState.memoryLog
          .map((metadata) => ({ id: metadata?.id, metadata }))
          .filter((entry) => entry.id);
        const { kept } = applyRetentionToEntries(fallbackEntries);
        sharedState.memoryLog = kept
          .map((entry) => entry.metadata)
          .sort((a, b) => getTimestamp(a) - getTimestamp(b));
      }
      return;
    }

    // Add to the working memory log first for immediate access.
    sharedState.memoryLog.push(memoryCapsule);

    try {
      // Add to the persistent vector database.
      await collection.add({
        ids: [memoryCapsule.id],
        documents: [memoryCapsule.content], // The text content is used for embedding/semantic search.
        metadatas: [memoryCapsule] // Store the entire capsule as metadata.
      });
      console.log(`[LTM] Persisted memory capsule ${memoryCapsule.id}.`);

      await prunePersistentMemory();
    } catch (e) {
      console.error(`[LTM] Failed to persist memory capsule ${memoryCapsule.id}:`, e);
    }
  }

  /**
   * @description Updates a memory in the database (used by the critique loop).
   * @param {object} memoryCapsule - The memory object to update.
   */
  async function updateMemory(memoryCapsule) {
    if (!collection) return;
    await collection.update({ ids: [memoryCapsule.id], metadatas: [memoryCapsule] });
  }

  // Expose the new memory functions to other plugins.
  sharedState.addMemory = addMemory;
  sharedState.updateMemory = updateMemory;

  bot.once('login', initializeMemory);
};