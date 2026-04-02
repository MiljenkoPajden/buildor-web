import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export type AccountType = 'personal' | 'agency' | 'enterprise';
export type PlanType = 'free' | 'pro' | 'team';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  provider?: string;
  /** Identity fields from profiles table */
  accountType: AccountType;
  plan: PlanType;
  traceId: string;
  onboardingCompleted: boolean;
}

/** Only in dev mode (Vite DEV or localhost). */
export const isDevMode = (): boolean =>
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

const DEV_USER: User = {
  id: 'dev-local',
  email: 'dev@buildor.local',
  displayName: 'Dev',
  provider: 'dev',
  accountType: 'agency',
  plan: 'pro',
  traceId: 'dev-trace-000',
  onboardingCompleted: true,
};

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  /** Dev mode only: sign in without Supabase */
  devLogin: () => void;
  /** Email + password sign in */
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Email + password sign up (registration) */
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithGitHub: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  /** Refresh profile data from Supabase */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ProfileRow {
  account_type: AccountType;
  plan: PlanType;
  trace_id: string;
  display_name: string | null;
  onboarding_completed: boolean;
  active_profile_id: string | null;
}

function mapSupabaseUser(u: SupabaseUser | null, profile?: ProfileRow | null): User | null {
  if (!u) return null;
  const email = u.email ?? '';
  return {
    id: u.id,
    email,
    displayName: profile?.display_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? undefined,
    avatarUrl: u.user_metadata?.avatar_url ?? undefined,
    provider: u.app_metadata?.provider,
    accountType: profile?.account_type ?? 'personal',
    plan: profile?.plan ?? 'free',
    traceId: profile?.trace_id ?? '',
    onboardingCompleted: profile?.onboarding_completed ?? false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [devUser, setDevUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  const user = useMemo(
    () => (session ? mapSupabaseUser(session.user, profile) : devUser),
    [session, profile, devUser]
  );

  // Fetch profile from Supabase when session changes
  const fetchProfile = useCallback(async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    const { data } = await client
      .from('profiles')
      .select('account_type, plan, trace_id, display_name, onboarding_completed, active_profile_id')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as ProfileRow);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!isSupabaseConfigured() || !client) {
      setLoading(false);
      return;
    }
    client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user?.id) fetchProfile(s.user.id).then(() => setLoading(false));
      else setLoading(false);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.id) fetchProfile(s.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const client = getSupabaseClient();
      if (!isSupabaseConfigured() || !client) {
        return { ok: false, error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.' };
      }
      const trimmed = email.trim();
      if (!trimmed || !password.trim()) return { ok: false, error: 'Enter email and password.' };
      const { error } = await client.auth.signInWithPassword({ email: trimmed, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    []
  );

  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';

  const signInWithGoogle = useCallback(async (): Promise<{ error?: string }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase is not configured. Go to Admin → API & transfer and add your Project URL and anon key, then reload.' };
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) return { error: error.message };
    if (data?.url) window.location.href = data.url;
    return {};
  }, [redirectTo]);

  const signInWithGitHub = useCallback(async (): Promise<{ error?: string }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase is not configured. Go to Admin → API & transfer and add your Project URL and anon key, then reload.' };
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    });
    if (error) return { error: error.message };
    if (data?.url) window.location.href = data.url;
    return {};
  }, [redirectTo]);

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const client = getSupabaseClient();
      if (!isSupabaseConfigured() || !client) {
        return { ok: false, error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.' };
      }
      const trimmed = email.trim();
      if (!trimmed || !password.trim()) return { ok: false, error: 'Enter email and password.' };
      const { error } = await client.auth.signUp({ email: trimmed, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    []
  );

  const devLogin = useCallback((): void => {
    if (!isDevMode()) return;
    setDevUser(DEV_USER);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    setSession(null);
    setDevUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: user !== null,
      isLoading,
      devLogin,
      login,
      signUp,
      signInWithGoogle,
      signInWithGitHub,
      logout,
      refreshProfile,
    }),
    [user, isLoading, devLogin, login, signUp, signInWithGoogle, signInWithGitHub, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
