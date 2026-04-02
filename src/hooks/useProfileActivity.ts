/**
 * useProfileActivity — in-app activity/history log per profile.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { useBrowserProfile } from '../context/BrowserProfileContext';
import { useAuth } from '../context/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

export interface ActivityEntry {
  id: string;
  profile_id: string;
  action: string;
  url: string | null;
  title: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useProfileActivity() {
  const { activeProfileId } = useBrowserProfile();
  const { user } = useAuth();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef<string | null>(null);

  const loadActivity = useCallback(async () => {
    if (!activeProfileId || !user?.id) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    setIsLoading(true);
    try {
      const { data, error } = await sb
        .from('profile_activity_log')
        .select('*')
        .eq('profile_id', activeProfileId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setEntries((data ?? []) as ActivityEntry[]);
    } catch (err) {
      console.warn('[useProfileActivity] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfileId, user?.id]);

  useEffect(() => {
    if (activeProfileId && activeProfileId !== loadedRef.current) {
      loadedRef.current = activeProfileId;
      loadActivity();
    }
  }, [activeProfileId, loadActivity]);

  const logActivity = useCallback(async (
    action: string,
    title?: string,
    url?: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!activeProfileId || !user?.id) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;

    const { data } = await sb.from('profile_activity_log').insert({
      profile_id: activeProfileId,
      owner_id: user.id,
      action,
      title: title ?? null,
      url: url ?? null,
      metadata: metadata ?? {},
    }).select().single();

    if (data) setEntries(prev => [data as ActivityEntry, ...prev].slice(0, 100));
  }, [activeProfileId, user?.id]);

  const clearActivity = useCallback(async () => {
    if (!activeProfileId) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    await sb.from('profile_activity_log').delete().eq('profile_id', activeProfileId);
    setEntries([]);
  }, [activeProfileId]);

  return { entries, isLoading, logActivity, clearActivity, refresh: loadActivity };
}
