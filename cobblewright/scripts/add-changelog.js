/**
 * @file This script automates adding entries to CHANGELOG.md and recording them in the ChronoSCRIBE audit ledger.
 *
 * USAGE:
 * npm run changelog
 *
 * The script will interactively prompt for "The Good," "The Bad," and "The Ugly" sections.
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

/**
 * Loads a minimal environment to get access to the ChronoSCRIBE audit function.
 * This is a "headless" version of architect.js that doesn't connect to Minecraft.
 */
async function getAuditFunction() {
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const CONFIG = JSON.parse(configData);

    if (!CONFIG.CHRONOSCRIBE_ENABLED) {
      console.warn('[WARN] ChronoSCRIBE is disabled in config.json. Skipping audit.');
      return () => {}; // Return a no-op function
    }

    const sharedState = { CONFIG };
    const chronoscribePluginPath = path.join(__dirname, '..', 'plugins', 'chronoscribe.js');
    const chronoscribePlugin = require(chronoscribePluginPath);

    // The bot object can be a mock for this script's purpose
    const mockBot = { on: () => {}, once: () => {} };
    await chronoscribePlugin(mockBot, sharedState);

    if (typeof sharedState.recordAuditEvent !== 'function') {
      throw new Error('chronoscribe.js plugin did not expose recordAuditEvent function.');
    }
    return sharedState.recordAuditEvent;
  } catch (error) {
    console.error(`[ERROR] Failed to initialize ChronoSCRIBE for auditing: ${error.message}`);
    console.error('[ERROR] The changelog entry will be written, but NOT audited. Please check your configuration.');
    return () => {}; // Return a no-op function on failure
  }
}

async function main() {
  console.log('Creating a new changelog entry...');

  const good = await question('Enter "The Good" (what worked): ');
  const bad = await question('Enter "The Bad" (limitations, tech debt): ');
  const ugly = await question('Enter "The Ugly" (hacks, workarounds): ');

  rl.close();

  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const existingContent = await fs.readFile(CHANGELOG_PATH, 'utf8');
  const entryCount = (existingContent.match(/## \d{4}-\d{2}-\d{2}/g) || []).length;
  const nextVersion = `0.${entryCount + 1}`;

  const newEntry = `## ${timestamp}
### The Good ${nextVersion}
- ${good.trim()}

### The Bad ${nextVersion}
- ${bad.trim() || 'N/A'}

### The Ugly ${nextVersion}
- ${ugly.trim() || 'N/A'}

---
`;

  // Prepend the new entry to the changelog
  const changelogHeader = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  const mainContent = existingContent.replace(changelogHeader, '');
  const newContent = `${changelogHeader}${newEntry}${mainContent}`;

  await fs.writeFile(CHANGELOG_PATH, newContent);
  console.log(`✅ Successfully added new entry to ${CHANGELOG_PATH}`);

  // Audit the new entry using ChronoSCRIBE
  const recordAuditEvent = await getAuditFunction();
  await recordAuditEvent({
    contributorId: 'changelog-script',
    eventType: 'changelog_entry',
    payload: newEntry,
    rationale: 'A new entry was added to the project changelog via the helper script.'
  });
  console.log('✅ Successfully recorded changelog entry in the audit ledger.');
}

main().catch(err => {
  console.error('An unexpected error occurred:', err);
  process.exit(1);
});
