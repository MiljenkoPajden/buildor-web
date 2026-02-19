import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  provider?: string;
}

/** Samo u dev modu (Vite DEV ili localhost). */
export const isDevMode = (): boolean =>
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

const DEV_USER: User = {
  id: 'dev-local',
  email: 'dev@buildor.local',
  displayName: 'Dev',
  provider: 'dev',
};

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  /** Samo u dev modu: prijava bez Supabasea */
  devLogin: () => void;
  /** Email + password sign in */
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Email + password sign up (registration) */
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithGitHub: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSupabaseUser(u: SupabaseUser | null): User | null {
  if (!u) return null;
  const email = u.email ?? '';
  return {
    id: u.id,
    email,
    displayName: u.user_metadata?.full_name ?? u.user_metadata?.name ?? undefined,
    avatarUrl: u.user_metadata?.avatar_url ?? undefined,
    provider: u.app_metadata?.provider,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [devUser, setDevUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  const user = useMemo(
    () => (session ? mapSupabaseUser(session.user) : devUser),
    [session, devUser]
  );

  useEffect(() => {
    const client = getSupabaseClient();
    if (!isSupabaseConfigured() || !client) {
      setLoading(false);
      return;
    }
    client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const client = getSupabaseClient();
      if (!isSupabaseConfigured() || !client) {
        return { ok: false, error: 'Supabase nije konfiguriran. Dodajte VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY u .env.' };
      }
      const trimmed = email.trim();
      if (!trimmed || !password.trim()) return { ok: false, error: 'Unesite email i lozinku.' };
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
    }),
    [user, isLoading, devLogin, login, signUp, signInWithGoogle, signInWithGitHub, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
