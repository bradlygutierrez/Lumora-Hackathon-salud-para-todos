const crypto = require('node:crypto');

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = value
    .replace(/[\s=-]/g, '')
    .toUpperCase();

  let bits = '';
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) {
      throw new Error('LUMORA_E2E_TOTP_SECRET no es Base32 válido.');
    }
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secret) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = crypto
    .createHmac('sha1', decodeBase32(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

module.exports = {
  video: false,
  screenshotOnRunFailure: false,
  trashAssetsBeforeRuns: true,
  retries: {
    runMode: 1,
    openMode: 0,
  },
  e2e: {
    baseUrl: process.env.LUMORA_E2E_BASE_URL || DEFAULT_BASE_URL,
    specPattern: 'e2e/specs/**/*.cy.js',
    supportFile: false,
    defaultCommandTimeout: 12_000,
    pageLoadTimeout: 60_000,
    requestTimeout: 20_000,
    setupNodeEvents(on, config) {
      on('task', {
        credential(name) {
          const keys = {
            login: 'LUMORA_E2E_LOGIN',
            password: 'LUMORA_E2E_PASSWORD',
            mfaCode: 'LUMORA_E2E_MFA_CODE',
          };
          const key = keys[name];
          if (!key) {
            throw new Error(`Credencial E2E desconocida: ${name}`);
          }
          return process.env[key] || null;
        },
        totp() {
          const secret = process.env.LUMORA_E2E_TOTP_SECRET;
          return secret ? generateTotp(secret) : null;
        },
      });
      return config;
    },
  },
};
