#!/usr/bin/env node
/**
 * Cross-platform Vitest UI setup verification for the Student LMS.
 *
 * Verifies local dependencies, Vitest config, UI tests, Playwright exclusion,
 * and the Husky pre-push hook that runs `npm run test:ui:run`.
 *
 * Does not modify files, start the app, touch Supabase, or print secrets.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(join(root, 'package.json'));

let failures = 0;

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message, hint) {
  failures += 1;
  console.log(`[FAIL] ${message}`);
  if (hint) {
    console.log(`       ${hint}`);
  }
}

function info(message) {
  console.log(`       ${message}`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function packageInstalled(name) {
  try {
    require.resolve(`${name}/package.json`);
    return true;
  } catch {
    try {
      require.resolve(name);
      return true;
    } catch {
      return false;
    }
  }
}

function collectFiles(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      collectFiles(full, predicate, acc);
    } else if (predicate(full, entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function matchesGlobish(relPosix, pattern) {
  // Minimal matcher aligned with Vitest/picomatch: `**` matches zero or more path segments.
  const alts = [];
  const withPlaceholders = pattern.replace(/\{([^}]+)\}/g, (_, group) => {
    const index = alts.length;
    alts.push(
      group
        .split(',')
        .map((part) => part.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
    );
    return `__ALT${index}__`;
  });
  let escaped = withPlaceholders.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  escaped = escaped
    .replace(/\/\*\*\//g, '(?:/|/.*/)')
    .replace(/\*\*\//g, '(?:|.*/)')
    .replace(/\/\*\*/g, '(?:|/.*)')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  for (let i = 0; i < alts.length; i += 1) {
    escaped = escaped.replace(`__ALT${i}__`, `(?:${alts[i]})`);
  }
  return new RegExp(`^${escaped}$`).test(relPosix);
}

function readPrePushHook() {
  const hookPath = join(root, '.husky', 'pre-push');
  if (!existsSync(hookPath)) return { path: hookPath, content: null };
  return { path: hookPath, content: readFileSync(hookPath, 'utf8') };
}

console.log('Vitest UI setup check (Student LMS)\n');

// --- Node.js ---
const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
if (Number.isFinite(nodeMajor) && nodeMajor >= 18) {
  pass(`Node.js available (v${process.versions.node})`);
} else {
  fail(
    `Node.js unavailable or too old (found ${process.versions.node || 'none'})`,
    'Install Node.js 18+ (this repo is developed on Node.js 22).',
  );
}

// --- package.json ---
const packageJsonPath = join(root, 'package.json');
if (existsSync(packageJsonPath)) {
  pass('package.json is present');
} else {
  fail('package.json missing', 'Run this command from the LMS repository root.');
  process.exit(1);
}

const pkg = readJson(packageJsonPath);
const scripts = pkg.scripts ?? {};

for (const scriptName of ['test:ui', 'test:ui:run', 'test:ui:watch', 'test:ui:check']) {
  if (typeof scripts[scriptName] === 'string') {
    pass(`npm script "${scriptName}" exists`);
  } else {
    fail(`npm script "${scriptName}" missing`, 'Restore the script in package.json.');
  }
}

const testUiRun = String(scripts['test:ui:run'] ?? '');
const runsVitestOnce =
  /\bvitest(\.mjs)?\b/.test(testUiRun) &&
  /\brun\b/.test(testUiRun) &&
  !/\b--watch\b/.test(testUiRun) &&
  !/\b--changed\b/.test(testUiRun) &&
  !/tests\/(integration|unit)\//.test(testUiRun);
if (runsVitestOnce) {
  pass('test:ui:run runs a one-shot Vitest suite (no watch / no file list)');
} else {
  fail(
    `test:ui:run must run Vitest once for the full suite (found ${JSON.stringify(testUiRun)})`,
    'Update package.json so the pre-push gate runs the full suite once.',
  );
}

if (scripts.prepare && String(scripts.prepare).includes('husky')) {
  pass('prepare lifecycle installs Husky hooks');
} else {
  fail(
    'prepare script does not install Husky',
    'Add "prepare": "husky" to package.json (combine with any existing prepare command).',
  );
}

// --- Local dependencies ---
const requiredPackages = [
  'vitest',
  'jsdom',
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@testing-library/user-event',
  'husky',
];

for (const name of requiredPackages) {
  if (packageInstalled(name)) {
    pass(`${name} installed`);
  } else {
    fail(`${name} missing`, 'Run: npm install');
  }
}

// --- Config and setup files ---
const vitestConfigCandidates = ['vitest.config.mjs', 'vitest.config.mts', 'vitest.config.ts'];
const vitestConfigPath = vitestConfigCandidates
  .map((name) => join(root, name))
  .find((candidate) => existsSync(candidate));
if (vitestConfigPath) {
  pass(`Vitest configuration found (${vitestConfigPath.slice(root.length + 1)})`);
} else {
  fail(
    'vitest.config.(mts|ts|mjs) missing',
    'Restore vitest.config.mjs (or .ts) at the LMS root.',
  );
}

const setupPath = join(root, 'tests', 'setup', 'vitest.setup.ts');
if (existsSync(setupPath)) {
  pass('Vitest setup file found (tests/setup/vitest.setup.ts)');
} else {
  fail(
    'tests/setup/vitest.setup.ts missing',
    'Restore the Vitest setup file under tests/setup/.',
  );
}

const integrationDir = join(root, 'tests', 'integration');
if (existsSync(integrationDir) && statSync(integrationDir).isDirectory()) {
  pass('tests/integration exists');
} else {
  fail('tests/integration missing', 'Restore the Vitest UI integration tests.');
}

// --- Discover UI tests from config include patterns ---
let configSource = '';
if (vitestConfigPath) {
  configSource = readFileSync(vitestConfigPath, 'utf8');
}

const includePatterns = [
  'tests/unit/**/*.test.tsx',
  'tests/integration/**/*.test.{ts,tsx}',
];
const excludePatterns = [
  'tests/e2e/**',
  'node_modules/**',
  '.next/**',
  'playwright-report/**',
  'test-results/**',
];

const discovered = collectFiles(join(root, 'tests'), (full, name) => {
  const rel = relative(root, full).split('\\').join('/');
  const included = includePatterns.some((pattern) => matchesGlobish(rel, pattern));
  if (!included) return false;
  const excluded = excludePatterns.some((pattern) => matchesGlobish(rel, pattern));
  return !excluded && /\.test\.(ts|tsx)$/.test(name);
});

if (discovered.length > 0) {
  pass(`UI tests discovered (${discovered.length} file${discovered.length === 1 ? '' : 's'})`);
  for (const file of discovered) {
    info(relative(root, file).split('\\').join('/'));
  }
} else {
  fail(
    'no Vitest UI tests discovered',
    'Ensure files match tests/unit/**/*.test.tsx or tests/integration/**/*.test.{ts,tsx}.',
  );
}

// --- Playwright must stay excluded ---
const e2eDir = join(root, 'tests', 'e2e');
const playwrightFiles = existsSync(e2eDir)
  ? collectFiles(e2eDir, (_full, name) => /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(name))
  : [];

const accidentallyIncludedPlaywright = discovered.filter((file) => {
  const rel = relative(root, file).split('\\').join('/');
  return rel.startsWith('tests/e2e/') || /\.spec\.(ts|tsx)$/.test(rel);
});

if (
  configSource.includes("tests/e2e/**") &&
  /exclude\s*:\s*\[/.test(configSource) &&
  accidentallyIncludedPlaywright.length === 0
) {
  pass('Playwright tests remain excluded by Vitest configuration');
  if (playwrightFiles.length > 0) {
    info(`${playwrightFiles.length} Playwright file(s) under tests/e2e (not run by Vitest)`);
  }
} else if (accidentallyIncludedPlaywright.length > 0) {
  fail(
    'Vitest would discover Playwright tests',
    'Keep tests/e2e/** in vitest.config.mjs exclude.',
  );
} else {
  fail(
    'Vitest exclude rules do not clearly exclude tests/e2e/**',
    'Confirm vitest.config.mjs exclude includes "tests/e2e/**".',
  );
}

// Hard-coded / changed-only / watch-mode gate checks on the hook
const { path: hookPath, content: hookContent } = readPrePushHook();
if (hookContent == null) {
  fail(
    'Git pre-push hook missing',
    'Restore .husky/pre-push and run: npm run prepare',
  );
} else {
  const normalized = hookContent.replace(/\r\n/g, '\n').trim();
  const invokesSuite =
    /\bnpm\s+run\s+test:ui:run\b/.test(normalized) ||
    /\bnpm\s+exec\s+vitest\s+run\b/.test(normalized);
  const usesWatch =
    /\btest:ui\b(?!:run)/.test(normalized) ||
    /\bvitest\b(?!\s+run)/.test(normalized.replace(/npm\s+run\s+test:ui:run/g, ''));
  const hardCodesFiles =
    /tests\/(?:integration|unit)\/[^\s]+\.test\.(?:ts|tsx)/.test(normalized);
  const changedOnly = /--changed\b|--related\b/.test(normalized);
  const swallowsFailure = /\|\|\s*true\b/.test(normalized);

  if (invokesSuite && !usesWatch && !hardCodesFiles && !changedOnly && !swallowsFailure) {
    pass('Git pre-push hook configured');
    info(`Hook file: ${relative(root, hookPath).split('\\').join('/')}`);
    info('Invokes: npm run test:ui:run (full suite via vitest.config.mjs)');
  } else {
    if (!invokesSuite) {
      fail(
        'Git pre-push hook does not invoke npm run test:ui:run',
        'Set .husky/pre-push contents to: npm run test:ui:run',
      );
    }
    if (usesWatch) {
      fail(
        'Git pre-push hook appears to use watch mode',
        'Use npm run test:ui:run, not npm run test:ui / vitest watch.',
      );
    }
    if (hardCodesFiles) {
      fail(
        'Git pre-push hook hard-codes test filenames',
        'Rely on vitest.config.mjs discovery instead of listing files.',
      );
    }
    if (changedOnly) {
      fail(
        'Git pre-push hook runs changed/related tests only',
        'Remove --changed / --related so the full suite always runs.',
      );
    }
    if (swallowsFailure) {
      fail(
        'Git pre-push hook swallows Vitest failures (|| true)',
        'Remove || true so a failing suite blocks the push.',
      );
    }
  }
}

const hooksPath = (() => {
  try {
    const { execSync } = require('node:child_process');
    return execSync('git config --get core.hooksPath', {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
})();

if (hooksPath === '.husky/_' || hooksPath.endsWith('.husky/_') || hooksPath.includes('.husky')) {
  pass(`Git core.hooksPath points at Husky (${hooksPath || '.husky'})`);
} else if (existsSync(join(root, '.husky', '_'))) {
  fail(
    `Git core.hooksPath is not set to Husky (found "${hooksPath || '(empty)'}")`,
    'Run: npm run prepare',
  );
} else {
  fail(
    'Husky internal hooks directory missing',
    'Run: npm run prepare',
  );
}

console.log('');
if (failures > 0) {
  console.log(`Setup check failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('Setup check passed. Pre-push will run the complete Vitest UI suite.');
process.exit(0);
