# LMS Portal — Qualification Center for veteran support specialists

Web portal of the Qualification Center (КЗ «ЗОІППО» ЗОР): public information, candidate
applications, exams, and the public certificate registry.

## Architecture

| Part | Where | Notes |
|---|---|---|
| Frontend | `src/` (React + Vite + TS) | Talks to Supabase with the public **anon** key only. |
| Supabase (self-hosted) | `docker-compose.yml`, `supabase/` | Postgres + GoTrue + PostgREST + Kong + Studio. All ports bound to `127.0.0.1`. |
| api service | `api/server.js` | The only holder of `SERVICE_ROLE_KEY` and SMTP credentials. Admin user management (`/api/admin/*`) and email verification codes (`/api/otp/*`). |
| nginx | `nginx.conf.template`, `nginx-security-headers.conf` | Public entry point: static files, `/rest/v1`, `/auth/v1`, `/api/*`. |

### Security rules (enforced in the database, migrations `011_security.sql`, `012_hide_answers.sql`, `013_enable_rls.sql`)

- Row level security is enabled on every table in `public` (`013_enable_rls.sql`; older
  deploys never applied `002_rls.sql`). Profiles: own row or staff can read, only admins can
  change. Registry: public read, admin writes. Applications: admins only.
  `scripts/check-rls.sh` fails if any table in `public` has RLS disabled.

- Exam results are scored by a trigger on `test_scores` from the `questions` table; a candidate
  needs `test_permission`, which is revoked in the same transaction.
- Candidates cannot read `questions.correct` / `explanation` (column privileges); admins and
  teachers load the full bank through `get_questions_full()`. The bundle contains no answers.
  The behaviour profile of an attempt is computed in the UI from the saved, verified answers
  (`src/utils/testAnalytics.ts`).
- Applications are submitted only via `submit_application()`: the application number comes from a
  sequence, and the applicant's email must be confirmed with a code sent by the api service.
- `user_visits` is insert-only for visitors and readable by staff; logs older than 180 days are
  purged on deploy.
- Self sign-up is disabled (`GOTRUE_DISABLE_SIGNUP=true`); accounts are created by admins.
- Electronic signature: the portal really verifies only PKCS#12 (RSA) signatures against the
  attached certificate and the JKS keystore password. DSTU 4145 keys are not opened in the browser,
  and certificate validity (TSL / OCSP) is not checked. The UI says so explicitly.

**Never put the service_role key into a `VITE_*` variable** — Vite embeds those into the public
bundle. `npm run check:bundle` (also run by `deploy_prod.sh`) fails if a privileged key is found.

## Development

```bash
cp .env.example .env          # anon key + local Supabase URL
docker compose up -d          # or ./restart_stack.sh
npm ci && npm run dev
```

For admin actions and email codes in development, run the api service as well
(`docker compose up -d api`, or `cd api && npm ci && node server.js` with the variables from
`.env.production.example`); Vite proxies `/api/admin` and `/api/otp` to `http://localhost:8787`
(override with `API_DEV_URL`).

## Production

1. `node generate-prod-keys.js` → fill `.env` from `.env.production.example`
   (Gmail requires an App Password for `SMTP_PASS`).
2. Install `nginx.conf.template` as the site config and `nginx-security-headers.conf` as
   `/etc/nginx/snippets/lms-security-headers.conf`.
3. `./deploy_prod.sh` — pulls, applies **pending** migrations only (tracked in
   `public.app_migrations`), purges old visit logs, rebuilds the api service, runs
   `scripts/check-rls.sh`, builds the frontend and checks the bundle.

**Upgrading a server deployed before migration 011:** the old frontend bundle contained the
service_role key, so treat it as leaked. Run the one-time upgrade on the server:

```bash
./upgrade_security.sh --check   # preflight only: tools, clean tree, SMTP, KONG_PORT, SITE_URL, nginx
./upgrade_security.sh           # backup .env + DB dump, fix .env, rotate keys, deploy, verify
```

It backs up `.env` and a database dump to `~/lms-portal-backups` (`BACKUP_DIR`), removes
`VITE_SUPABASE_SERVICE_KEY`, sets `OTP_SECRET`, rotates `JWT_SECRET` / `ANON_KEY` /
`SERVICE_ROLE_KEY` once (`scripts/upgrade-env.mjs`; `--rotate-keys` / `--no-rotate` override),
installs the nginx headers snippet and runs `./deploy_prod.sh`. After a rotation all users sign in
again. Before running, add `SMTP_USER` / `SMTP_PASS` to `.env` and install `nginx.conf.template`
as the site config (it proxies `/api/admin/`, `/api/otp/`, `/api/health` to the api service).

Create users from the server: `node scripts/create-user.js <email> "<full name>" [user|teacher|admin]`
(password from `USER_PASSWORD`, otherwise a random one is printed once).
