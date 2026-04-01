import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Keep-Alive — prevents free-tier database from pausing due to inactivity.
 * Called by Vercel Cron every 4 days.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase.from('app_config').select('key').limit(1);

    if (error) {
      return res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
    }

    return res.status(200).json({
      ok: true,
      rows: data?.length ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}
