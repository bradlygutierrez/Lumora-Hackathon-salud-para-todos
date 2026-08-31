import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const appRoot = resolve(import.meta.dirname, '..');
const mode = process.argv[2] ?? 'smoke';
const validModes = new Set(['smoke', 'clinical']);

if (!validModes.has(mode)) {
  console.error('Uso: node e2e/run-web-e2e.mjs <smoke|clinical>');
  process.exit(2);
}

function loadLocalEnv() {
  const path = resolve(appRoot, '.env.e2e.local');
  if (!existsSync(path)) return;

  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

if (mode === 'clinical') {
  if (!process.env.LUMORA_E2E_LOGIN || !process.env.LUMORA_E2E_PASSWORD) {
    console.error(
      'E2E clínico requiere LUMORA_E2E_LOGIN y LUMORA_E2E_PASSWORD. ' +
        'Copiá .env.e2e.example a .env.e2e.local y usa solo una cuenta QA sintética.',
    );
    process.exit(2);
  }
}

const baseUrl =
  process.env.LUMORA_E2E_BASE_URL || 'http://127.0.0.1:4173';
const parsedBaseUrl = new URL(baseUrl);
const port = parsedBaseUrl.port || '4173';
const npx = 'npx';
const useShell = process.platform === 'win32';

function start(command, args, options = {}) {
  return spawn(command, args, {
    cwd: appRoot,
    env: {
      ...process.env,
      CI: process.env.CI || '1',
      EXPO_PUBLIC_ENABLE_UI_PREVIEW: 'false',
    },
    shell: useShell,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }

  throw new Error(
    `Expo web no respondió en ${url}. ${lastError ? String(lastError) : ''}`,
  );
}

function stopProcessTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;

  if (process.platform === 'win32') {
    const killer = spawn(
      'taskkill',
      ['/pid', String(child.pid), '/t', '/f'],
      { stdio: 'ignore', windowsHide: true },
    );
    return new Promise((resolveStop) => killer.on('exit', resolveStop));
  }

  child.kill('SIGTERM');
  return Promise.resolve();
}

const expo = start(npx, ['expo', 'start', '--web', '--port', port]);
expo.stdout.on('data', (chunk) => process.stdout.write(`[expo] ${chunk}`));
expo.stderr.on('data', (chunk) => process.stderr.write(`[expo] ${chunk}`));

let exitCode = 1;

try {
  await waitForServer(`${baseUrl}/login`);

  const spec =
    mode === 'clinical'
      ? 'e2e/specs/clinical-readonly.cy.js'
      : 'e2e/specs/auth-smoke.cy.js';

  const cypress = start(
    npx,
    [
      '--yes',
      'cypress@15.21.1',
      'run',
      '--config-file',
      'e2e/cypress.config.cjs',
      '--spec',
      spec,
    ],
    { stdio: 'inherit' },
  );

  exitCode = await new Promise((resolveExit) => {
    cypress.on('exit', (code) => resolveExit(code ?? 1));
  });
} finally {
  await stopProcessTree(expo);
}

process.exit(exitCode);
