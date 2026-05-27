#!/usr/bin/env node
/**
 * patch-manifest.js <mfe-name> <url> [commit-sha]
 *
 * Updates one MFE entry in shell/public/remoteEntry.json.
 * Saves previous state to manifest-history.json for rollback.
 *
 * Usage (local simulation):
 *   node scripts/patch-manifest.js checkout http://localhost:3001/remoteEntry.js abc123
 *
 * Usage (CI post-deploy):
 *   node scripts/patch-manifest.js checkout https://cdn.netlify.app/remoteEntry.js $GITHUB_SHA
 */

const fs = require('fs');
const path = require('path');

const [,, name, url, sha = 'local'] = process.argv;

if (!name || !url) {
  console.error('Usage: patch-manifest.js <name> <url> [sha]');
  process.exit(1);
}

const MANIFEST_PATH = path.join(__dirname, '../shell/public/remoteEntry.json');
const HISTORY_PATH  = path.join(__dirname, '../shell/public/manifest-history.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

if (!manifest[name]) {
  console.error(`MFE "${name}" not found in manifest`);
  process.exit(1);
}

// Save history before patching — enables rollback.
const history = fs.existsSync(HISTORY_PATH)
  ? JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'))
  : {};

history[name] = history[name] || [];
history[name].unshift({
  ...manifest[name],
  patchedAt: new Date().toISOString(),
});
// Keep last 10 entries per MFE.
history[name] = history[name].slice(0, 10);

// Bump version (simple timestamp-based for local; CI uses semver tags).
const newVersion = sha.slice(0, 7);

const previous = manifest[name];
manifest[name] = { ...manifest[name], url, version: newVersion };

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
fs.writeFileSync(HISTORY_PATH,  JSON.stringify(history,  null, 2));

console.log(`✓ Manifest patched`);
console.log(`  MFE:      ${name}`);
console.log(`  Previous: ${previous.url} @ ${previous.version}`);
console.log(`  Current:  ${url} @ ${newVersion}`);
console.log(`  Rollback: node scripts/rollback-manifest.js ${name}`);
