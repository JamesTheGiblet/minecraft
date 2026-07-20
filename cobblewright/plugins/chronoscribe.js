/**
 * @file ChronoSCRIBE plugin: append-only signed hash-chain audit ledger.
 */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

module.exports = (bot, sharedState) => {
  const config = sharedState?.CONFIG || {};
  const enabled = config.CHRONOSCRIBE_ENABLED !== false;

  if (!enabled) {
    sharedState.recordAuditEvent = async () => null;
    sharedState.verifyAuditChain = async () => ({ ok: true, skipped: true, reason: 'ChronoSCRIBE disabled' });
    return;
  }

  const ledgerDir = path.resolve(__dirname, '..', 'data', 'chronoscribe');
  const ledgerFile = path.join(ledgerDir, 'ledger.ndjson');
  const stateFile = path.join(ledgerDir, 'state.json');
  const keyFile = path.join(ledgerDir, 'ed25519_keypair.json');
  const keyId = String(config.CHRONOSCRIBE_KEY_ID || 'cobblewright-ed25519-v1');
  const maxPayloadChars = Number.isInteger(Number(config.CHRONOSCRIBE_MAX_PAYLOAD_CHARS))
    ? Math.max(256, Number(config.CHRONOSCRIBE_MAX_PAYLOAD_CHARS))
    : 5000;

  const state = {
    initialized: false,
    initPromise: null,
    previousHash: 'GENESIS',
    sequence: 0,
    signer: null,
    verifier: null,
    publicKeyPem: null,
    writer: Promise.resolve()
  };

  const stableStringify = (value) => {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
    }

    const keys = Object.keys(value).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${pairs.join(',')}}`;
  };

  const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

  const compactPayload = (payload) => {
    try {
      const serialized = JSON.stringify(payload);
      if (serialized.length <= maxPayloadChars) return payload;

      return {
        _truncated: true,
        preview: serialized.slice(0, maxPayloadChars),
        original_length: serialized.length
      };
    } catch {
      return { _truncated: true, preview: String(payload).slice(0, maxPayloadChars) };
    }
  };

  const ensureDirectory = async () => {
    await fs.mkdir(ledgerDir, { recursive: true });
  };

  const loadOrCreateKeyPair = async () => {
    const inlinePrivateKey = String(config.CHRONOSCRIBE_PRIVATE_KEY_PEM || '').trim();
    const inlinePublicKey = String(config.CHRONOSCRIBE_PUBLIC_KEY_PEM || '').trim();

    if (inlinePrivateKey && inlinePublicKey) {
      state.signer = crypto.createPrivateKey(inlinePrivateKey);
      state.verifier = crypto.createPublicKey(inlinePublicKey);
      state.publicKeyPem = inlinePublicKey;
      return;
    }

    try {
      const existing = JSON.parse(await fs.readFile(keyFile, 'utf8'));
      if (existing?.privateKeyPem && existing?.publicKeyPem) {
        state.signer = crypto.createPrivateKey(existing.privateKeyPem);
        state.verifier = crypto.createPublicKey(existing.publicKeyPem);
        state.publicKeyPem = existing.publicKeyPem;
        return;
      }
    } catch {
      // No persisted key yet.
    }

    const generated = crypto.generateKeyPairSync('ed25519');
    const privateKeyPem = generated.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const publicKeyPem = generated.publicKey.export({ type: 'spki', format: 'pem' }).toString();

    await fs.writeFile(
      keyFile,
      JSON.stringify({ keyId, createdAt: Date.now(), publicKeyPem, privateKeyPem }, null, 2),
      'utf8'
    );

    state.signer = crypto.createPrivateKey(privateKeyPem);
    state.verifier = crypto.createPublicKey(publicKeyPem);
    state.publicKeyPem = publicKeyPem;
  };

  const restoreState = async () => {
    try {
      const parsed = JSON.parse(await fs.readFile(stateFile, 'utf8'));
      if (typeof parsed?.previousHash === 'string' && Number.isInteger(parsed?.sequence)) {
        state.previousHash = parsed.previousHash;
        state.sequence = parsed.sequence;
        return;
      }
    } catch {
      // Fall back to reading ledger tail.
    }

    try {
      const lines = (await fs.readFile(ledgerFile, 'utf8'))
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) return;

      const last = JSON.parse(lines[lines.length - 1]);
      if (last?.event_hash && Number.isInteger(last?.sequence)) {
        state.previousHash = String(last.event_hash);
        state.sequence = Number(last.sequence);
      }
    } catch {
      // Start fresh if ledger does not exist yet.
    }
  };

  const persistState = async () => {
    await fs.writeFile(
      stateFile,
      JSON.stringify({ previousHash: state.previousHash, sequence: state.sequence, keyId, updatedAt: Date.now() }, null, 2),
      'utf8'
    );
  };

  const initialize = async () => {
    if (state.initialized) return;
    if (state.initPromise) return state.initPromise;

    state.initPromise = (async () => {
      await ensureDirectory();
      await loadOrCreateKeyPair();
      await restoreState();
      state.initialized = true;
    })();

    try {
      await state.initPromise;
    } finally {
      state.initPromise = null;
    }
  };

  const appendRecord = async ({
    contributorId = bot.username || config.BOT_NAME || 'cobblewright',
    eventType = 'generic_event',
    payload = {},
    rationale = ''
  }) => {
    await initialize();

    const safePayload = compactPayload(payload);
    const timestamp = Date.now();
    const sequence = state.sequence + 1;
    const prevHash = state.previousHash;

    const digestSeed = {
      chain: 'ChronoSCRIBE',
      version: 1,
      sequence,
      timestamp,
      contributor_id: String(contributorId),
      event_type: String(eventType),
      payload: safePayload,
      rationale: String(rationale || ''),
      prev_hash: prevHash
    };

    const eventHash = sha256(stableStringify(digestSeed));
    const signature = crypto.sign(null, Buffer.from(eventHash, 'utf8'), state.signer).toString('base64');

    const record = {
      chain: 'ChronoSCRIBE',
      version: 1,
      sequence,
      timestamp,
      contributor_id: String(contributorId),
      event_type: String(eventType),
      event_hash: eventHash,
      prev_hash: prevHash,
      payload: safePayload,
      rationale: String(rationale || ''),
      signature,
      key_id: keyId
    };

    await fs.appendFile(ledgerFile, `${JSON.stringify(record)}\n`, 'utf8');

    state.sequence = sequence;
    state.previousHash = eventHash;
    await persistState();

    return {
      sequence,
      event_hash: eventHash,
      prev_hash: prevHash,
      timestamp
    };
  };

  const recordAuditEvent = async (event) => {
    state.writer = state.writer
      .then(() => appendRecord(event))
      .catch((error) => {
        console.warn('[ChronoSCRIBE] Failed to append record:', error.message);
        return null;
      });

    return state.writer;
  };

  const verifyAuditChain = async () => {
    await initialize();

    let previousHash = 'GENESIS';
    let expectedSequence = 1;
    let verified = 0;

    let lines = [];
    try {
      lines = (await fs.readFile(ledgerFile, 'utf8'))
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return { ok: true, verified: 0, lastHash: previousHash, message: 'Ledger empty' };
    }

    for (let i = 0; i < lines.length; i += 1) {
      let record;
      try {
        record = JSON.parse(lines[i]);
      } catch {
        return { ok: false, at: i + 1, reason: 'Invalid JSON record' };
      }

      if (record.prev_hash !== previousHash) {
        return {
          ok: false,
          at: i + 1,
          reason: 'prev_hash mismatch',
          expected: previousHash,
          actual: record.prev_hash
        };
      }

      if (record.sequence !== expectedSequence) {
        return {
          ok: false,
          at: i + 1,
          reason: 'sequence mismatch',
          expected: expectedSequence,
          actual: record.sequence
        };
      }

      const digestSeed = {
        chain: 'ChronoSCRIBE',
        version: 1,
        sequence: record.sequence,
        timestamp: record.timestamp,
        contributor_id: record.contributor_id,
        event_type: record.event_type,
        payload: record.payload,
        rationale: record.rationale,
        prev_hash: record.prev_hash
      };

      const recalculatedHash = sha256(stableStringify(digestSeed));
      if (recalculatedHash !== record.event_hash) {
        return { ok: false, at: i + 1, reason: 'event_hash mismatch' };
      }

      const validSignature = crypto.verify(
        null,
        Buffer.from(record.event_hash, 'utf8'),
        state.verifier,
        Buffer.from(String(record.signature || ''), 'base64')
      );

      if (!validSignature) {
        return { ok: false, at: i + 1, reason: 'signature invalid' };
      }

      previousHash = record.event_hash;
      expectedSequence += 1;
      verified += 1;
    }

    return {
      ok: true,
      verified,
      lastHash: previousHash,
      nextSequence: expectedSequence,
      ledgerPath: ledgerFile
    };
  };

  sharedState.recordAuditEvent = recordAuditEvent;
  sharedState.verifyAuditChain = verifyAuditChain;
  sharedState.getAuditLedgerPath = () => ledgerFile;

  bot.once('login', async () => {
    await recordAuditEvent({
      contributorId: bot.username || config.BOT_NAME || 'cobblewright',
      eventType: 'session_genesis',
      payload: {
        botVersion: bot.version || 'unknown',
        host: config?.bot?.host || 'localhost',
        port: config?.bot?.port || 25565
      },
      rationale: 'Boot attestation anchor for current runtime session.'
    });
  });
};
