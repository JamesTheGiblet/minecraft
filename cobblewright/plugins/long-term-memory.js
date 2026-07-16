/**
 * @file This plugin integrates PostgreSQL for persistent long-term memory.
 */

const { Pool } = require('pg');
const http = require('http');

module.exports = (bot, sharedState) => {
  const postgresUrl =
    sharedState?.CONFIG?.POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    null;

  const pool = postgresUrl
    ? new Pool({ connectionString: postgresUrl })
    : null;

  const getDbBootstrapInfo = () => {
    if (!postgresUrl) return null;

    try {
      const url = new URL(postgresUrl);
      const dbName = decodeURIComponent(url.pathname.replace(/^\//, '') || '');
      if (!dbName || dbName.toLowerCase() === 'postgres') return null;

      url.pathname = '/postgres';
      url.search = '';
      return { dbName, adminConnectionString: url.toString() };
    } catch {
      return null;
    }
  };

  const ensureDatabaseExists = async () => {
    if (!pool) return;

    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (error?.code !== '3D000') throw error;
    }

    const bootstrap = getDbBootstrapInfo();
    if (!bootstrap) throw new Error('Target database is missing and bootstrap info could not be determined.');

    const adminPool = new Pool({ connectionString: bootstrap.adminConnectionString });
    try {
      const safeDbName = bootstrap.dbName.replace(/"/g, '""');
      await adminPool.query(`CREATE DATABASE "${safeDbName}"`);
      console.log(`[LTM] Created missing PostgreSQL database "${bootstrap.dbName}".`);
    } catch (error) {
      if (error?.code === '42P04') {
        console.log(`[LTM] PostgreSQL database "${bootstrap.dbName}" already exists.`);
      } else {
        throw error;
      }
    } finally {
      await adminPool.end().catch(() => {});
    }

    await pool.query('SELECT 1');
  };

  let dbReady = false;
  let vectorEnabled = false;

  const embeddingModel = sharedState?.CONFIG?.EMBEDDING_MODEL || 'nomic-embed-text';
  const configuredEmbeddingDimensions = Number.parseInt(sharedState?.CONFIG?.EMBEDDING_DIMENSIONS, 10);
  const defaultEmbeddingDimensions = String(embeddingModel).toLowerCase().includes('nomic-embed-text') ? 768 : null;
  const embeddingDimensions = Number.isInteger(configuredEmbeddingDimensions) && configuredEmbeddingDimensions > 0
    ? configuredEmbeddingDimensions
    : defaultEmbeddingDimensions;
  const ollamaHost = sharedState?.CONFIG?.OLLAMA_HOST || 'localhost';
  const ollamaPort = sharedState?.CONFIG?.OLLAMA_PORT || 11434;

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
    if (!dbReady || !retentionEnabled) return;

    try {
      const result = await pool.query(
        'SELECT id, metadata FROM memory_stream ORDER BY timestamp_ms DESC'
      );

      const entries = result.rows.map((row) => ({ id: row.id, metadata: row.metadata }));

      const { kept, deletedIds } = applyRetentionToEntries(entries);

      if (deletedIds.length > 0) {
        await pool.query('DELETE FROM memory_stream WHERE id = ANY($1::text[])', [deletedIds]);
        console.log(`[LTM] Pruned ${deletedIds.length} memory capsule(s) due to retention policy.`);
      }

      sharedState.memoryLog = kept
        .map((entry) => entry.metadata)
        .sort((a, b) => getTimestamp(a) - getTimestamp(b));
    } catch (e) {
      console.error('[LTM] Failed to apply retention pruning:', e);
    }
  };

  const toVectorLiteral = (embedding) => {
    if (!Array.isArray(embedding) || embedding.length === 0) return null;
    const values = embedding
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (values.length === 0) return null;
    return `[${values.join(',')}]`;
  };

  const callOllamaEmbeddings = async (text) => new Promise((resolve, reject) => {
    const payload = JSON.stringify({ model: embeddingModel, prompt: text });
    const options = {
      hostname: ollamaHost,
      port: ollamaPort,
      path: '/api/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (parsed.error) {
            reject(new Error(parsed.error));
            return;
          }

          const embedding = Array.isArray(parsed.embedding)
            ? parsed.embedding
            : Array.isArray(parsed.embeddings)
              ? parsed.embeddings[0]
              : null;

          if (!Array.isArray(embedding) || embedding.length === 0) {
            reject(new Error('Embedding response did not include a vector.'));
            return;
          }

          resolve(embedding);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const getEmbeddingForText = async (text) => {
    const cleanText = String(text || '').trim();
    if (!cleanText) return null;

    try {
      return await callOllamaEmbeddings(cleanText);
    } catch (error) {
      console.warn(`[LTM] Failed to create embedding with model "${embeddingModel}":`, error.message);
      return null;
    }
  };

  /**
   * @description Initializes the database connection and loads recent memories.
   */
  async function initializeMemory() {
    if (!pool) {
      console.warn('[LTM] POSTGRES_URL (or DATABASE_URL) is not configured. Long-term memory is disabled.');
      return;
    }

    try {
      console.log('[LTM] Connecting to PostgreSQL for long-term memory...');
      await ensureDatabaseExists();

      // pgvector extension is optional today, but enabled for future semantic indexing.
      try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        vectorEnabled = true;
      } catch (extensionError) {
        console.warn('[LTM] pgvector extension not enabled (continuing without vector indexing):', extensionError.message);
        vectorEnabled = false;
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS memory_stream (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          metadata JSONB NOT NULL,
          timestamp_ms BIGINT NOT NULL
        )
      `);

      await pool.query(
        'CREATE INDEX IF NOT EXISTS memory_stream_timestamp_idx ON memory_stream (timestamp_ms DESC)'
      );

      if (vectorEnabled) {
        await pool.query('ALTER TABLE memory_stream ADD COLUMN IF NOT EXISTS embedding vector');

        if (embeddingDimensions) {
          try {
            await pool.query(
              `ALTER TABLE memory_stream ALTER COLUMN embedding TYPE vector(${embeddingDimensions}) USING CASE WHEN embedding IS NULL THEN NULL ELSE embedding::vector(${embeddingDimensions}) END`
            );
          } catch (dimensionError) {
            console.warn(`[LTM] Could not set embedding dimension to ${embeddingDimensions}; vector indexing may be disabled:`, dimensionError.message);
          }
        }

        if (!embeddingDimensions) {
          console.warn('[LTM] EMBEDDING_DIMENSIONS is not configured; skipping vector index creation.');
        } else {
          // Prefer HNSW for cosine similarity; fall back to IVFFlat when HNSW is unavailable.
          try {
            await pool.query(
              'CREATE INDEX IF NOT EXISTS memory_stream_embedding_hnsw_idx ON memory_stream USING hnsw (embedding vector_cosine_ops)'
            );
            console.log('[LTM] Vector index ready: HNSW (cosine).');
          } catch (hnswError) {
            console.warn('[LTM] HNSW index unavailable, trying IVFFlat fallback:', hnswError.message);
            try {
              await pool.query(
                'CREATE INDEX IF NOT EXISTS memory_stream_embedding_ivfflat_idx ON memory_stream USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)'
              );
              console.log('[LTM] Vector index ready: IVFFlat (cosine).');
            } catch (ivfError) {
              console.warn('[LTM] IVFFlat index unavailable; vector queries will use sequential scan:', ivfError.message);
            }
          }
        }
      }

      dbReady = true;
      console.log('[LTM] Connected to PostgreSQL table "memory_stream".');

      // Load recent memories into the working memory log on startup.
      const limit = maxEntries ? Math.max(maxEntries, 100) : 100;
      const recentMemories = await pool.query(
        'SELECT metadata FROM memory_stream ORDER BY timestamp_ms DESC LIMIT $1',
        [limit]
      );

      // The bot's short-term memory is now seeded with long-term memories.
      const metadatas = recentMemories.rows
        .map((row) => row.metadata)
        .filter(Boolean);

      sharedState.memoryLog = metadatas.sort((a, b) => getTimestamp(a) - getTimestamp(b));
      console.log(`[LTM] Loaded ${sharedState.memoryLog.length} recent memories into the working memory log.`);

      await prunePersistentMemory();

    } catch (e) {
      console.error('[LTM] CRITICAL: Failed to initialize PostgreSQL memory backend. Long-term memory will be disabled.', e);
    }
  }

  /**
   * @description Adds a new memory to both the working log and the persistent database.
   * @param {object} memoryCapsule - The memory object to add.
   */
  async function addMemory(memoryCapsule) {
    if (!dbReady) {
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
      const embedding = vectorEnabled
        ? await getEmbeddingForText(memoryCapsule.content || '')
        : null;
      const embeddingLiteral = embedding ? toVectorLiteral(embedding) : null;

      await pool.query(
        `
          INSERT INTO memory_stream (id, content, metadata, timestamp_ms, embedding)
          VALUES ($1, $2, $3::jsonb, $4, $5::vector)
          ON CONFLICT (id) DO UPDATE
          SET content = EXCLUDED.content,
              metadata = EXCLUDED.metadata,
              timestamp_ms = EXCLUDED.timestamp_ms,
              embedding = EXCLUDED.embedding
        `,
        [
          memoryCapsule.id,
          memoryCapsule.content || '',
          JSON.stringify(memoryCapsule),
          getTimestamp(memoryCapsule),
          embeddingLiteral
        ]
      );

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
    if (!dbReady) return;

    const embedding = vectorEnabled
      ? await getEmbeddingForText(memoryCapsule.content || '')
      : null;
    const embeddingLiteral = embedding ? toVectorLiteral(embedding) : null;

    await pool.query(
      `
        UPDATE memory_stream
        SET content = $2,
            metadata = $3::jsonb,
            timestamp_ms = $4,
            embedding = $5::vector
        WHERE id = $1
      `,
      [
        memoryCapsule.id,
        memoryCapsule.content || '',
        JSON.stringify(memoryCapsule),
        getTimestamp(memoryCapsule),
        embeddingLiteral
      ]
    );
  }

  const scoreMemory = (memory, terms, username) => {
    if (!memory || typeof memory !== 'object') return -1;

    const content = String(memory.content || '').toLowerCase();
    const type = String(memory.type || '').toLowerCase();
    const capsuleUser = memory?.context?.username;

    let score = 0;
    if (username && capsuleUser === username) score += 4;
    if (type === 'advice') score += 1;

    terms.forEach((term) => {
      if (content.includes(term)) score += 2;
    });

    // Prefer recent memories as a tiebreaker.
    score += getTimestamp(memory) / 1e13;
    return score;
  };

  async function findRelevantMemories({ username, query, limit = 3 }) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 10) : 3;
    const terms = String(query || '')
      .toLowerCase()
      .split(/\W+/)
      .filter((term) => term.length >= 3)
      .slice(0, 12);

    if (terms.length === 0) {
      return sharedState.memoryLog
        .filter((entry) => !username || entry?.context?.username === username)
        .slice(-safeLimit);
    }

    if (dbReady && vectorEnabled) {
      try {
        const queryEmbedding = await getEmbeddingForText(String(query || ''));
        const queryVector = toVectorLiteral(queryEmbedding);
        if (queryVector) {
          const params = [queryVector];
          let sql = `
            SELECT metadata
            FROM memory_stream
            WHERE embedding IS NOT NULL
          `;

          if (username) {
            params.push(username);
            sql += ` AND (metadata->'context'->>'username' = $2 OR metadata->'context'->>'username' IS NULL)`;
          }

          sql += ` ORDER BY embedding <=> $1::vector LIMIT ${safeLimit * 4}`;

          const result = await pool.query(sql, params);
          const vectorCandidates = result.rows
            .map((row) => row.metadata)
            .filter(Boolean);

          if (vectorCandidates.length > 0) {
            return vectorCandidates.slice(0, safeLimit);
          }
        }
      } catch (error) {
        console.warn('[LTM] Vector memory lookup failed, falling back to text ranking:', error.message);
      }
    }

    if (dbReady) {
      try {
        const conditions = terms.map((_, i) => `content ILIKE $${i + 1}`).join(' OR ');
        const params = terms.map((term) => `%${term}%`);
        const sql = `
          SELECT metadata
          FROM memory_stream
          WHERE ${conditions}
          ORDER BY timestamp_ms DESC
          LIMIT ${safeLimit * 4}
        `;

        const result = await pool.query(sql, params);
        const candidates = result.rows
          .map((row) => row.metadata)
          .filter(Boolean)
          .sort((a, b) => scoreMemory(b, terms, username) - scoreMemory(a, terms, username));

        return candidates.slice(0, safeLimit);
      } catch (error) {
        console.warn('[LTM] Failed DB memory lookup, falling back to in-memory search:', error.message);
      }
    }

    return sharedState.memoryLog
      .filter(Boolean)
      .sort((a, b) => scoreMemory(b, terms, username) - scoreMemory(a, terms, username))
      .slice(0, safeLimit);
  }

  // Expose the new memory functions to other plugins.
  sharedState.addMemory = addMemory;
  sharedState.updateMemory = updateMemory;
  sharedState.findRelevantMemories = findRelevantMemories;

  bot.once('login', initializeMemory);
};