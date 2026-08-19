import { config } from 'dotenv';
config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

type StripeMode = 'test' | 'live';

function parseStripeMode(): StripeMode {
  const raw = optional('STRIPE_MODE', 'test').trim().toLowerCase();
  if (raw !== 'test' && raw !== 'live') {
    throw new Error('STRIPE_MODE must be "test" or "live"');
  }
  return raw;
}

function pickStripeValue(mode: StripeMode, base: string, isRequired: boolean): string {
  const modeKey = `${base}_${mode.toUpperCase()}`;
  const value = process.env[modeKey] || process.env[base] || '';
  if (isRequired && !value) {
    throw new Error(`Missing ${modeKey} (or ${base}) for STRIPE_MODE=${mode}`);
  }
  return value;
}

function assertSecretMatchesMode(mode: StripeMode, secretKey: string) {
  const isTestKey = /_(test)_/.test(secretKey);
  const isLiveKey = /_(live)_/.test(secretKey);
  if (mode === 'test' && !isTestKey) {
    throw new Error('STRIPE_MODE=test requires sk_test_ or rk_test_');
  }
  if (mode === 'live' && !isLiveKey) {
    throw new Error('STRIPE_MODE=live requires sk_live_ or rk_live_');
  }
}

const stripeMode = parseStripeMode();
const stripeSecretKey = pickStripeValue(stripeMode, 'STRIPE_SECRET_KEY', true);
assertSecretMatchesMode(stripeMode, stripeSecretKey);

export const env = {
  port: Number(optional('PORT', '8787')),
  databaseUrl: required('DATABASE_URL'),
  webOrigin: optional('WEB_ORIGIN', 'http://localhost:5173'),
  appUrl: optional('APP_URL', 'http://localhost:5173'),
  clerkSecretKey: required('CLERK_SECRET_KEY'),
  clerkWebhookSecret: optional('CLERK_WEBHOOK_SIGNING_SECRET', ''),
  openrouterApiKey: required('OPENROUTER_API_KEY'),
  encryptionKey: required('APP_ENCRYPTION_KEY'),
  stripeMode,
  stripeSecretKey,
  stripeWebhookSecret: pickStripeValue(stripeMode, 'STRIPE_WEBHOOK_SECRET', false),
  stripePriceId: pickStripeValue(stripeMode, 'STRIPE_PRICE_ID', true),
  stripeTrialDays: Number(optional('STRIPE_TRIAL_DAYS', '14')),
};

export const ACTIVE_SUB_STATUSES = new Set(['trialing', 'active']);
