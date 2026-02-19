import { createClient } from '@supabase/supabase-js';

const STORAGE_URL = 'buildor_supabase_url';
const STORAGE_ANON_KEY = 'buildor_supabase_anon_key';

function getConfig(): { url: string; anonKey: string } {
  const fromEnv = {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  };
  if (fromEnv.url && fromEnv.anonKey) return fromEnv;
  if (typeof localStorage === 'undefined') return fromEnv;
  return {
    url: localStorage.getItem(STORAGE_URL) ?? '',
    anonKey: localStorage.getItem(STORAGE_ANON_KEY) ?? '',
  };
}

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  return getConfig();
}

export function setStoredSupabaseConfig(url: string, anonKey: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_URL, url.trim());
  localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
}

// NOTE: Lazy singleton — kreira klijent tek pri prvom pozivu, uvijek čita aktualni config
// (localStorage može biti popunjen nakon module load-a, statički export bi ostao null)
type SupabaseClient = ReturnType<typeof createClient>;
let _client: SupabaseClient | null = null;
let _clientUrl = '';

function getClient(): SupabaseClient | null {
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;
  // NOTE: Re-kreira klijent samo ako se URL promijenio (npr. admin promijeni projekt)
  if (_client && _clientUrl === url) return _client;
  _client = createClient(url, anonKey);
  _clientUrl = url;
  return _client;
}


export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getConfig();
  return Boolean(url && anonKey);
}

/** Load admin config from database (single source of truth). Returns empty object if not configured or error. */
export async function fetchAppConfig(): Promise<Record<string, string>> {
  const client = getClient();
  if (!client) return {};
  const { data, error } = await client.from('app_config').select('key, value');
  if (error) return {};
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.key != null && row.value != null) out[row.key] = row.value;
  }
  return out;
}

/** Save admin config to database. Merges with existing keys. */
export async function saveAppConfig(entries: Record<string, string>): Promise<{ error: string | null }> {
  const client = getClient();
  if (!client) return { error: 'Supabase not configured' };
  const rows = Object.entries(entries)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([key, value]) => ({ key, value: String(value).trim() }));
  if (rows.length === 0) return { error: null };
  const { error } = await client.from('app_config').upsert(rows, { onConflict: 'key' });
  return { error: error?.message ?? null };
}

/** Interni getter za AuthContext */
export function getSupabaseClient(): SupabaseClient | null {
  return getClient();
}
