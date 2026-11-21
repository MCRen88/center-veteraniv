import { supabase } from './supabase';

// Calls the server-side api service (api/server.js). The service holds the
// service_role key; the browser only sends the user's own session token.
export async function apiRequest<T = Record<string, unknown>>(path: string, method: string, body?: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || `Помилка сервера (HTTP ${res.status})`);
  }
  return payload as T;
}
