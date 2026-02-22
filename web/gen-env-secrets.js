/**
 * Supabase .env용 시크릿 생성 스크립트 (Windows 호환)
 * 실행: node gen-env-secrets.js
 * 요구사항: https://supabase.com/docs/guides/self-hosting/docker#configure-environment
 */
const crypto = require('crypto');

const values = {
  // openssl rand -base64 48 → 최소 64자
  SECRET_KEY_BASE: crypto.randomBytes(48).toString('base64'),

  // openssl rand -hex 16 → 정확히 32자
  VAULT_ENC_KEY: crypto.randomBytes(16).toString('hex'),

  // openssl rand -base64 24 → 최소 32자
  PG_META_CRYPTO_KEY: crypto.randomBytes(24).toString('base64'),

  // openssl rand -base64 24 → 최소 32자
  LOGFLARE_PUBLIC_ACCESS_TOKEN: crypto.randomBytes(24).toString('base64'),

  // openssl rand -base64 24 → 최소 32자
  LOGFLARE_PRIVATE_ACCESS_TOKEN: crypto.randomBytes(24).toString('base64'),

  // openssl rand -hex 16 → 32자
  S3_PROTOCOL_ACCESS_KEY_ID: crypto.randomBytes(16).toString('hex'),

  // openssl rand -hex 32 → 64자
  S3_PROTOCOL_ACCESS_KEY_SECRET: crypto.randomBytes(32).toString('hex'),

  // openssl rand -hex 16 → 32자 (8자 이상 요구 충족)
  MINIO_ROOT_PASSWORD: crypto.randomBytes(16).toString('hex'),
};

Object.entries(values).forEach(([k, v]) => {
  console.log(`${k}=${v}`);
});
