// Small server-side api for the LMS portal.
// It is the only place that holds the Supabase service_role key and the SMTP password.
//   POST   /api/otp/send          { email, name }          -> mails a 6-digit code
//   POST   /api/otp/verify        { email, code }          -> marks the code as verified
//   POST   /api/admin/users       { email, password, name, role, testPermission }
//   PATCH  /api/admin/users/:id   { name?, email?, password?, role?, testPermission? }
//   DELETE /api/admin/users/:id
//   GET    /api/health
// Admin routes require "Authorization: Bearer <access token of a user with role admin>".

import http from 'node:http';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable ${name}`);
    process.exit(1);
  }
  return value;
}

const PORT = Number(process.env.PORT || 8787);
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://kong:8000';
const SERVICE_ROLE_KEY = required('SERVICE_ROLE_KEY');
const OTP_SECRET = required('OTP_SECRET');
const SMTP_USER = required('SMTP_USER');
const SMTP_PASS = required('SMTP_PASS');
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Кваліфікаційний центр КЗ «ЗОІППО» ЗОР';

const CODE_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const ROLES = new Set(['user', 'teacher', 'admin']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const hashCode = (email, code) =>
  crypto.createHmac('sha256', OTP_SECRET).update(`${email}:${code}`).digest('hex');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, 'Запит завеликий'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Некоректний JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function count(query) {
  const { count: n, error } = await query;
  if (error) throw new HttpError(500, 'Помилка бази даних');
  return n || 0;
}

// --- Email codes --------------------------------------------------------------

async function otpSend(req, body) {
  const email = normalizeEmail(body.email);
  const name = String(body.name || 'Заявник').slice(0, 120);
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Некоректна адреса email');

  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || '';
  const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const base = () => db.from('email_codes').select('id', { count: 'exact', head: true });

  if (await count(base().eq('email', email).gt('created_at', minuteAgo)) > 0) {
    throw new HttpError(429, 'Код уже надіслано. Повторити можна через хвилину.');
  }
  if (await count(base().eq('email', email).gt('created_at', hourAgo)) >= 5) {
    throw new HttpError(429, 'Забагато запитів коду для цієї адреси. Спробуйте пізніше.');
  }
  if (ip && await count(base().eq('ip', ip).gt('created_at', hourAgo)) >= 20) {
    throw new HttpError(429, 'Забагато запитів. Спробуйте пізніше.');
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const { data: row, error } = await db.from('email_codes').insert({
    email,
    code_hash: hashCode(email, code),
    ip,
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()
  }).select('id').single();
  if (error) throw new HttpError(500, 'Помилка бази даних');

  try {
    await mailer.sendMail({
      from: { name: MAIL_FROM_NAME, address: SMTP_USER },
      to: email,
      subject: 'Код підтвердження для подання заяви до Кваліфікаційного центру',
      text:
        `Шановний(а) ${name}!\n\n` +
        `Ваш одноразовий код підтвердження email для подання заяви про присвоєння та/або підтвердження професійної кваліфікації:\n\n` +
        `${code}\n\n` +
        `Код дійсний протягом ${CODE_TTL_MINUTES} хвилин. Якщо ви не подавали заяву, проігноруйте цей лист.\n\n` +
        `З повагою,\nКваліфікаційний центр КЗ «ЗОІППО» ЗОР`
    });
  } catch (err) {
    console.error('SMTP error:', err.message);
    await db.from('email_codes').delete().eq('id', row.id);
    throw new HttpError(502, 'Не вдалося надіслати лист. Перевірте адресу або спробуйте пізніше.');
  }
  return { ok: true };
}

async function otpVerify(body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) throw new HttpError(400, 'Невірний код');

  const { data: row, error } = await db.from('email_codes')
    .select('id, code_hash, attempts, expires_at')
    .eq('email', email)
    .is('verified_at', null)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new HttpError(500, 'Помилка бази даних');
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    throw new HttpError(400, 'Код недійсний або прострочений. Надішліть новий.');
  }
  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new HttpError(429, 'Забагато невдалих спроб. Надішліть новий код.');
  }

  const expected = Buffer.from(row.code_hash, 'hex');
  const actual = Buffer.from(hashCode(email, code), 'hex');
  if (!crypto.timingSafeEqual(expected, actual)) {
    await db.from('email_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    throw new HttpError(400, 'Невірний код');
  }

  const { error: updError } = await db.from('email_codes')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', row.id);
  if (updError) throw new HttpError(500, 'Помилка бази даних');
  return { ok: true };
}

// --- Admin user management ------------------------------------------------------

async function requireAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Потрібна авторизація');

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Сесія недійсна. Увійдіть знову.');

  const { data: profile } = await db.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile?.role !== 'admin') throw new HttpError(403, 'Доступ лише для адміністратора');
  return data.user;
}

function validateUserFields(body, { partial }) {
  const out = {};
  if (body.email !== undefined || !partial) {
    const email = normalizeEmail(body.email);
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Некоректний email');
    out.email = email;
  }
  if ((body.password !== undefined && body.password !== '') || !partial) {
    const password = String(body.password || '');
    if (password.length < 8) throw new HttpError(400, 'Пароль має містити щонайменше 8 символів');
    out.password = password;
  }
  if (body.name !== undefined || !partial) {
    const name = String(body.name || '').trim();
    if (!name) throw new HttpError(400, 'Вкажіть імʼя');
    out.name = name.slice(0, 200);
  }
  if (body.role !== undefined || !partial) {
    if (!ROLES.has(body.role)) throw new HttpError(400, 'Некоректна роль');
    out.role = body.role;
  }
  if (body.testPermission !== undefined) out.testPermission = Boolean(body.testPermission);
  return out;
}

async function createUser(body) {
  const f = validateUserFields(body, { partial: false });
  const { data, error } = await db.auth.admin.createUser({
    email: f.email,
    password: f.password,
    email_confirm: true,
    user_metadata: { name: f.name, role: f.role }
  });
  if (error) throw new HttpError(400, error.message);

  const { error: profileError } = await db.from('profiles').insert({
    id: data.user.id,
    name: f.name,
    email: f.email,
    role: f.role,
    test_permission: f.testPermission ?? false
  });
  if (profileError) {
    // Do not leave a login without a profile behind.
    await db.auth.admin.deleteUser(data.user.id);
    throw new HttpError(500, `Не вдалося створити профіль: ${profileError.message}`);
  }
  return { ok: true, id: data.user.id };
}

async function updateUser(admin, userId, body) {
  const f = validateUserFields(body, { partial: true });
  if (userId === admin.id && f.role && f.role !== 'admin') {
    throw new HttpError(400, 'Не можна зняти роль адміністратора із самого себе');
  }

  const authUpdates = {};
  if (f.email) authUpdates.email = f.email;
  if (f.password) authUpdates.password = f.password;
  if (f.name || f.role) {
    authUpdates.user_metadata = {};
    if (f.name) authUpdates.user_metadata.name = f.name;
    if (f.role) authUpdates.user_metadata.role = f.role;
  }
  if (Object.keys(authUpdates).length > 0) {
    const { error } = await db.auth.admin.updateUserById(userId, authUpdates);
    if (error) throw new HttpError(400, error.message);
  }

  const profileUpdates = {};
  if (f.name) profileUpdates.name = f.name;
  if (f.email) profileUpdates.email = f.email;
  if (f.role) profileUpdates.role = f.role;
  if (f.testPermission !== undefined) profileUpdates.test_permission = f.testPermission;
  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await db.from('profiles').update(profileUpdates).eq('id', userId);
    if (error) throw new HttpError(500, `Акаунт оновлено, але профіль ні: ${error.message}`);
  }
  return { ok: true };
}

async function deleteUser(admin, userId) {
  if (userId === admin.id) throw new HttpError(400, 'Не можна видалити власний акаунт');
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new HttpError(400, error.message);
  const { error: profileError } = await db.from('profiles').delete().eq('id', userId);
  if (profileError) throw new HttpError(500, `Акаунт видалено, але профіль ні: ${profileError.message}`);
  return { ok: true };
}

// --- Router -------------------------------------------------------------------------

const USER_PATH = /^\/api\/admin\/users\/([0-9a-f-]{36})$/i;

const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;

    if (req.method === 'GET' && path === '/api/health') return send(res, 200, { ok: true });
    if (req.method === 'POST' && path === '/api/otp/send') return send(res, 200, await otpSend(req, await readJson(req)));
    if (req.method === 'POST' && path === '/api/otp/verify') return send(res, 200, await otpVerify(await readJson(req)));

    if (req.method === 'POST' && path === '/api/admin/users') {
      await requireAdmin(req);
      return send(res, 200, await createUser(await readJson(req)));
    }
    const match = path.match(USER_PATH);
    if (match && req.method === 'PATCH') {
      const admin = await requireAdmin(req);
      return send(res, 200, await updateUser(admin, match[1], await readJson(req)));
    }
    if (match && req.method === 'DELETE') {
      const admin = await requireAdmin(req);
      return send(res, 200, await deleteUser(admin, match[1]));
    }
    send(res, 404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: 'Внутрішня помилка сервера' });
  }
});

server.listen(PORT, () => console.log(`api listening on :${PORT}`));
