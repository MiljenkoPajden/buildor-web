/**
 * BrowserProfileContext — manages browser profile isolation.
 *
 * @features
 * - Loads all browser profiles for the current user
 * - Tracks active profile (synced to DB + localStorage cache)
 * - Profile CRUD (create, switch, delete)
 * - Exposes activeClientId for downstream contexts (PortalContext)
 * - Vault master key state for credential encryption
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any; rpc: any };

export interface BrowserProfile {
  id: string;
  owner_id: string;
  client_id: string | null;
  name: string;
  partition_key: string;
  icon_color: string;
  is_default: boolean;
  last_used_at: string | null;
  created_at: string;
  /** Joined client name (if client_id is set) */
  client_name?: string;
}

interface BrowserProfileContextValue {
  profiles: BrowserProfile[];
  activeProfile: BrowserProfile | null;
  activeProfileId: string | null;
  activeClientId: string | null;
  isLoading: boolean;
  /** Switch to a different profile */
  switchProfile: (profileId: string) => Promise<void>;
  /** Create a new browser profile */
  createProfile: (name: string, clientId?: string | null, iconColor?: string) => Promise<{ ok: boolean; error?: string }>;
  /** Delete a browser profile */
  deleteProfile: (profileId: string) => Promise<void>;
  /** Refresh profiles from DB */
  refresh: () => Promise<void>;
  /** Vault master key (in-memory only, never persisted) */
  vaultKey: CryptoKey | null;
  setVaultKey: (key: CryptoKey | null) => void;
  /** Vault salt (base64, stored in DB) */
  vaultSalt: string | null;
  setVaultSalt: (salt: string) => void;
  /** Plan limits */
  profileLimit: number;
}

const BrowserProfileContext = createContext<BrowserProfileContextValue | null>(null);

const ACTIVE_PROFILE_CACHE_KEY = 'buildor_active_profile_id';

export function BrowserProfileProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { user, isLoggedIn } = useAuth();
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_PROFILE_CACHE_KEY),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultSalt, setVaultSaltState] = useState<string | null>(null);

  const profileLimit = useMemo(() => {
    if (!user) return 1;
    switch (user.plan) {
      case 'team': return 999;
      case 'pro': return 5;
      default: return 1;
    }
  }, [user]);

  const loadProfiles = useCallback(async () => {
    if (!user?.id) {
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) { setIsLoading(false); return; }

    try {
      // Load profiles with optional client name join
      const { data, error } = await sb
        .from('browser_profiles')
        .select('*, clients(name)')
        .eq('owner_id', user.id)
        .order('is_default', { ascending: false })
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        client_name: (p.clients as Record<string, string> | null)?.name ?? undefined,
        clients: undefined,
      })) as BrowserProfile[];

      setProfiles(mapped);

      // If no profiles exist, create default
      if (mapped.length === 0) {
        const { data: ensureData } = await sb.rpc('ensure_default_profile');
        if (ensureData) {
          // Reload
          const { data: reloaded } = await sb
            .from('browser_profiles')
            .select('*, clients(name)')
            .eq('owner_id', user.id)
            .order('is_default', { ascending: false });
          if (reloaded) {
            const remapped = reloaded.map((p: Record<string, unknown>) => ({
              ...p,
              client_name: (p.clients as Record<string, string> | null)?.name ?? undefined,
              clients: undefined,
            })) as BrowserProfile[];
            setProfiles(remapped);
            if (remapped[0]) {
              setActiveProfileId(remapped[0].id);
              localStorage.setItem(ACTIVE_PROFILE_CACHE_KEY, remapped[0].id);
            }
          }
        }
      } else {
        // Resolve active profile from DB
        const { data: profileData } = await sb
          .from('profiles')
          .select('active_profile_id')
          .eq('id', user.id)
          .single();

        const dbActiveId = profileData?.active_profile_id;
        const resolvedId = dbActiveId && mapped.some(p => p.id === dbActiveId)
          ? dbActiveId
          : mapped.find(p => p.is_default)?.id ?? mapped[0]?.id ?? null;

        setActiveProfileId(resolvedId);
        if (resolvedId) localStorage.setItem(ACTIVE_PROFILE_CACHE_KEY, resolvedId);
      }

      // Load vault salt from profile_settings
      const defaultProfile = mapped.find(p => p.is_default) ?? mapped[0];
      if (defaultProfile) {
        const { data: saltData } = await sb
          .from('profile_settings')
          .select('value')
          .eq('owner_id', user.id)
          .eq('key', 'vault_salt')
          .limit(1)
          .single();
        if (saltData?.value?.salt) {
          setVaultSaltState(saltData.value.salt);
        }
      }
    } catch (err) {
      console.warn('[BrowserProfileContext] Failed to load profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadProfiles();
    } else {
      setProfiles([]);
      setActiveProfileId(null);
      setIsLoading(false);
    }
  }, [isLoggedIn, user?.id, loadProfiles]);

  const switchProfile = useCallback(async (profileId: string) => {
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;

    const { data } = await sb.rpc('switch_profile', { target_profile_id: profileId });
    if (data?.ok) {
      setActiveProfileId(profileId);
      localStorage.setItem(ACTIVE_PROFILE_CACHE_KEY, profileId);
      // Clear vault key on profile switch for security
      setVaultKey(null);
    }
  }, []);

  const createProfile = useCallback(async (
    name: string,
    clientId?: string | null,
    iconColor?: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return { ok: false, error: 'Supabase not configured' };

    if (profiles.length >= profileLimit) {
      return { ok: false, error: `Profile limit reached (max ${profileLimit} on ${user?.plan ?? 'free'} plan)` };
    }

    const { data, error } = await sb.rpc('create_browser_profile', {
      p_name: name,
      p_client_id: clientId ?? null,
      p_icon_color: iconColor ?? '#57c3ff',
    });

    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };

    await loadProfiles();
    return { ok: true };
  }, [profiles.length, profileLimit, user?.plan, loadProfiles]);

  const deleteProfile = useCallback(async (profileId: string) => {
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;

    // Don't allow deleting the default profile
    const target = profiles.find(p => p.id === profileId);
    if (target?.is_default) return;

    await sb.from('browser_profiles').delete().eq('id', profileId);

    // If we deleted the active profile, switch to default
    if (activeProfileId === profileId) {
      const defaultP = profiles.find(p => p.is_default);
      if (defaultP) await switchProfile(defaultP.id);
    }

    await loadProfiles();
  }, [profiles, activeProfileId, switchProfile, loadProfiles]);

  const setVaultSalt = useCallback(async (salt: string) => {
    setVaultSaltState(salt);
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb || !user?.id) return;

    // Upsert the vault salt in profile_settings
    await sb.from('profile_settings').upsert({
      profile_id: profiles.find(p => p.is_default)?.id ?? profiles[0]?.id,
      owner_id: user.id,
      key: 'vault_salt',
      value: { salt },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,key' });
  }, [user?.id, profiles]);

  const activeProfile = useMemo(
    () => profiles.find(p => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const activeClientId = useMemo(
    () => activeProfile?.client_id ?? null,
    [activeProfile],
  );

  const value = useMemo<BrowserProfileContextValue>(() => ({
    profiles,
    activeProfile,
    activeProfileId,
    activeClientId,
    isLoading,
    switchProfile,
    createProfile,
    deleteProfile,
    refresh: loadProfiles,
    vaultKey,
    setVaultKey,
    vaultSalt,
    setVaultSalt,
    profileLimit,
  }), [profiles, activeProfile, activeProfileId, activeClientId, isLoading, switchProfile, createProfile, deleteProfile, loadProfiles, vaultKey, vaultSalt, setVaultSalt, profileLimit]);

  return (
    <BrowserProfileContext.Provider value={value}>
      {children}
    </BrowserProfileContext.Provider>
  );
}

export function useBrowserProfile(): BrowserProfileContextValue {
  const ctx = useContext(BrowserProfileContext);
  if (!ctx) throw new Error('useBrowserProfile must be used within BrowserProfileProvider');
  return ctx;
}
