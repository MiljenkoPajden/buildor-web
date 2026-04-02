/**
 * useProfileSettings — per-profile key-value settings.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { useBrowserProfile } from '../context/BrowserProfileContext';
import { useAuth } from '../context/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

export interface ProfileSetting {
  key: string;
  value: unknown;
}

export function useProfileSettings() {
  const { activeProfileId } = useBrowserProfile();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!activeProfileId || !user?.id) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    setIsLoading(true);
    try {
      const { data, error } = await sb
        .from('profile_settings')
        .select('key, value')
        .eq('profile_id', activeProfileId);
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of (data ?? [])) map[row.key] = row.value;
      setSettings(map);
    } catch (err) {
      console.warn('[useProfileSettings] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfileId, user?.id]);

  useEffect(() => {
    if (activeProfileId && activeProfileId !== loadedRef.current) {
      loadedRef.current = activeProfileId;
      loadSettings();
    }
  }, [activeProfileId, loadSettings]);

  const setSetting = useCallback(async (key: string, value: unknown) => {
    if (!activeProfileId || !user?.id) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;

    await sb.from('profile_settings').upsert({
      profile_id: activeProfileId,
      owner_id: user.id,
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,key' });

    setSettings(prev => ({ ...prev, [key]: value }));
  }, [activeProfileId, user?.id]);

  const getSetting = useCallback(<T = unknown>(key: string, fallback?: T): T => {
    return (settings[key] as T) ?? fallback as T;
  }, [settings]);

  return { settings, isLoading, setSetting, getSetting, refresh: loadSettings };
}
