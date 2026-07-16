const fs = require('fs');
const path = require('path');

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base)) return override;
  if (!isObject(override)) return override;

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(merged[key])) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function normalizeAreaFromFile(fileName) {
  return fileName
    .replace(/\.sc\.json$/i, '')
    .replace(/\.scp\.json$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'core';
}

function summarizeCapsule(capsule) {
  if (!isObject(capsule)) return [];

  const summary = [];
  if (capsule.intent?.primary_goal) summary.push(`goal: ${capsule.intent.primary_goal}`);
  if (capsule.identity?.role) summary.push(`role: ${capsule.identity.role}`);

  const priorities = Array.isArray(capsule.behavior_rules?.priorities)
    ? capsule.behavior_rules.priorities.slice(0, 3)
    : [];
  if (priorities.length > 0) summary.push(`priorities: ${priorities.join(', ')}`);

  const domains = Array.isArray(capsule.knowledge_focus?.domains)
    ? capsule.knowledge_focus.domains.slice(0, 4)
    : [];
  if (domains.length > 0) summary.push(`domains: ${domains.join(', ')}`);

  return summary;
}

function loadSCCapsules(rootDir, options = {}) {
  const capsuleDir = options.capsuleDir || path.join(rootDir, 'data', 'S.C');
  const strict = options.strict === true;
  const log = options.log || (() => {});

  const capsules = {};
  const diagnostics = [];

  if (!fs.existsSync(capsuleDir)) {
    diagnostics.push({ level: 'warn', message: `Capsule directory not found: ${capsuleDir}` });
    return { capsules, diagnostics, capsuleDir, merged: {} };
  }

  const files = fs.readdirSync(capsuleDir)
    .filter((file) => /\.(sc|scp)\.json$/i.test(file));

  for (const fileName of files) {
    const area = normalizeAreaFromFile(fileName);
    const fullPath = path.join(capsuleDir, fileName);

    try {
      const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (!isObject(parsed)) {
        diagnostics.push({ level: 'warn', message: `Capsule is not an object: ${fileName}` });
        continue;
      }

      parsed._meta = {
        area,
        fileName,
        fullPath,
        summary: summarizeCapsule(parsed)
      };

      capsules[area] = parsed;
      diagnostics.push({ level: 'info', message: `Loaded capsule [${area}] from ${fileName}` });
    } catch (error) {
      const msg = `Failed to load capsule ${fileName}: ${error.message}`;
      diagnostics.push({ level: strict ? 'error' : 'warn', message: msg });
      if (strict) {
        throw new Error(msg);
      }
    }
  }

  const merged = Object.keys(capsules)
    .sort()
    .reduce((acc, key) => deepMerge(acc, capsules[key]), {});

  diagnostics.forEach((entry) => log(entry));

  return { capsules, diagnostics, capsuleDir, merged };
}

function getCapsule(capsules, area) {
  if (!capsules || typeof capsules !== 'object') return null;
  const normalized = String(area || 'core').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return capsules[normalized] || null;
}

module.exports = {
  deepMerge,
  getCapsule,
  loadSCCapsules,
  summarizeCapsule
};
