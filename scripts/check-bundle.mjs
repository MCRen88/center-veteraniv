// Fails if any JWT with a non-anon role (e.g. service_role) is embedded in the built frontend.
// Usage: node scripts/check-bundle.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'dist';
const jwtRe = /eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g;
let bad = 0;

for (const file of fs.readdirSync(dir, { recursive: true })) {
  const full = path.join(dir, String(file));
  if (!fs.statSync(full).isFile() || !/\.(js|html|map)$/.test(full)) continue;
  for (const m of fs.readFileSync(full, 'utf8').matchAll(jwtRe)) {
    try {
      const role = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role;
      if (role && role !== 'anon') {
        console.error(`${full}: JWT with role "${role}" found in the bundle`);
        bad++;
      }
    } catch { /* not a JWT payload */ }
  }
}
if (bad) process.exit(1);
console.log('Bundle check: no privileged keys found.');
