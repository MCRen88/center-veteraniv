#!/usr/bin/env node
// Brings a server .env up to the post-011 security requirements.
// Never prints secret values; only the names of the variables it changed.
//
//   node scripts/upgrade-env.mjs [--rotate] [--file PATH]
//
//   --rotate   generate a new JWT_SECRET and re-sign ANON_KEY, SERVICE_ROLE_KEY,
//              VITE_SUPABASE_ANON_KEY (all sessions become invalid).
//   --file     .env path (default: .env in the current directory).
//
// Always: removes VITE_SUPABASE_SERVICE_KEY (it was embedded in the public
// bundle), sets OTP_SECRET if missing or a placeholder, sets API_PORT if missing,
// keeps VITE_SUPABASE_ANON_KEY equal to ANON_KEY.
// POSTGRES_PASSWORD is not touched: the database volume is initialised with it.

import crypto from 'node:crypto';
import fs from 'node:fs';

const args = process.argv.slice(2);
const rotate = args.includes('--rotate');
const fileIdx = args.indexOf('--file');
const file = fileIdx >= 0 ? args[fileIdx + 1] : '.env';

if (!fs.existsSync(file)) {
  console.error(`❌ ${file} не знайдено`);
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
const changed = [];

const keyOf = (line) => {
  const m = /^([A-Z0-9_]+)=/.exec(line);
  return m ? m[1] : null;
};
const unquote = (v) => v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

const get = (key) => {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (keyOf(lines[i]) === key) return unquote(lines[i].slice(key.length + 1));
  }
  return undefined;
};

const set = (key, value) => {
  const idx = lines.findIndex((l) => keyOf(l) === key);
  if (idx >= 0) {
    if (unquote(lines[idx].slice(key.length + 1)) === value) return;
    lines[idx] = `${key}=${value}`;
    // Drop later duplicates so the value read by docker compose is the one set here.
    for (let i = lines.length - 1; i > idx; i--) if (keyOf(lines[i]) === key) lines.splice(i, 1);
  } else {
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    lines.push(`${key}=${value}`, '');
  }
  changed.push(key);
};

const remove = (key) => {
  const before = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) if (keyOf(lines[i]) === key) lines.splice(i, 1);
  if (lines.length !== before) changed.push(`-${key}`);
};

const isPlaceholder = (v) =>
  !v || /^(generate-|your-|change-?me|xxx)/i.test(v) || v.length < 32;

const base64url = (buf) => buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const signJWT = (payload, secret) => {
  const h = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const p = base64url(Buffer.from(JSON.stringify(payload)));
  const s = base64url(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${s}`;
};

// 1. The service_role key must never be a VITE_* variable.
remove('VITE_SUPABASE_SERVICE_KEY');

// 2. Key rotation (same payloads as generate-prod-keys.js).
let jwtSecret = get('JWT_SECRET');
if (rotate || isPlaceholder(jwtSecret)) {
  jwtSecret = crypto.randomBytes(32).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24 * 365 * 10;
  set('JWT_SECRET', jwtSecret);
  set('ANON_KEY', signJWT({ role: 'anon', iss: 'supabase', iat: now, exp }, jwtSecret));
  set('SERVICE_ROLE_KEY', signJWT({ role: 'service_role', iss: 'supabase', iat: now, exp }, jwtSecret));
  set('KEYS_ROTATED_AT', new Date().toISOString());
}

// 3. The browser gets the anon key only.
const anon = get('ANON_KEY');
if (anon) set('VITE_SUPABASE_ANON_KEY', anon);

// 4. api service secrets and port.
if (isPlaceholder(get('OTP_SECRET'))) set('OTP_SECRET', crypto.randomBytes(32).toString('hex'));
if (!get('API_PORT')) set('API_PORT', '54474');

if (changed.length) {
  fs.writeFileSync(file, lines.join('\n'), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  console.log(`✅ .env оновлено: ${changed.join(', ')}`);
} else {
  console.log('✅ .env: змін не потрібно');
}
