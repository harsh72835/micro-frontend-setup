#!/usr/bin/env node
/**
 * rollback-manifest.js <mfe-name>
 *
 * Reverts one MFE entry in remoteEntry.json to its previous version.
 * Shell picks up the rollback on next navigation — no redeploy needed.
 *
 * Usage:
 *   node scripts/rollback-manifest.js checkout
 */

const fs = require('fs');
const path = require('path');

const [,, name] = process.argv;

if (!name) {
  console.error('Usage: rollback-manifest.js <name>');
  process.exit(1);
}

const MANIFEST_PATH = path.join(__dirname, '../shell/public/remoteEntry.json');
const HISTORY_PATH  = path.join(__dirname, '../shell/public/manifest-history.json');

if (!fs.existsSync(HISTORY_PATH)) {
  console.error('No history found. Nothing to roll back to.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const history  = JSON.parse(fs.readFileSync(HISTORY_PATH,  'utf8'));

const entries = history[name];
if (!entries || entries.length === 0) {
  console.error(`No history for "${name}"`);
  process.exit(1);
}

const previous = entries.shift(); // pop most recent history entry
const current  = manifest[name];

manifest[name] = {
  name:    previous.name,
  version: previous.version,
  url:     previous.url,
  scope:   previous.scope,
};

history[name] = entries;

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
fs.writeFileSync(HISTORY_PATH,  JSON.stringify(history,  null, 2));

console.log(`✓ Rolled back`);
console.log(`  MFE:      ${name}`);
console.log(`  Reverted: ${current.url} @ ${current.version}`);
console.log(`  Restored: ${previous.url} @ ${previous.version}`);
console.log(`  Shell picks up change on next navigation — no redeploy.`);
