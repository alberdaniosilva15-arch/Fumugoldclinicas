// FumuGold — Supabase Auth
import { createClient } from '@supabase/supabase-js';

const SUPA_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
const SUPA_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = SUPA_URL && SUPA_KEY
  ? createClient(SUPA_URL, SUPA_KEY)
  : null;

export async function signIn(email, password) {
  if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, session: data.session, user: data.user };
  } catch (e) {
    return { ok: false, error: e.message || 'Erro de autenticação.' };
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function makeAuthHeaders(accessToken) {
  const key = SUPA_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${accessToken || key}`,
    'Content-Type': 'application/json',
  };
}
