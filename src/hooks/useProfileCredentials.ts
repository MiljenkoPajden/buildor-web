/**
 * useProfileCredentials — encrypted credential vault per profile.
 * All encryption/decryption happens client-side via Web Crypto API.
 * The server only stores ciphertext blobs.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { useBrowserProfile } from '../context/BrowserProfileContext';
import { useAuth } from '../context/AuthContext';
import { encrypt, decrypt } from '../lib/crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

export type CredentialCategory = 'general' | 'api_key' | 'ssh' | 'ftp' | 'oauth' | 'database' | 'other';

export interface Credential {
  id: string;
  profile_id: string;
  service_name: string;
  service_url: string | null;
  username: string | null;
  encrypted_value: string;
  encryption_iv: string;
  notes: string | null;
  category: CredentialCategory;
  last_used_at: string | null;
  created_at: string;
  /** Decrypted password (only in-memory when vault is unlocked) */
  _decrypted?: string;
}

export function useProfileCredentials() {
  const { activeProfileId, vaultKey } = useBrowserProfile();
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef<string | null>(null);

  const loadCredentials = useCallback(async () => {
    if (!activeProfileId || !user?.id) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    setIsLoading(true);
    try {
      const { data, error } = await sb
        .from('profile_credentials')
        .select('*')
        .eq('profile_id', activeProfileId)
        .order('service_name', { ascending: true });
      if (error) throw error;
      setCredentials((data ?? []) as Credential[]);
    } catch (err) {
      console.warn('[useProfileCredentials] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfileId, user?.id]);

  useEffect(() => {
    if (activeProfileId && activeProfileId !== loadedRef.current) {
      loadedRef.current = activeProfileId;
      loadCredentials();
    }
  }, [activeProfileId, loadCredentials]);

  const addCredential = useCallback(async (
    serviceName: string,
    password: string,
    opts?: { serviceUrl?: string; username?: string; notes?: string; category?: CredentialCategory },
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!activeProfileId || !user?.id) return { ok: false, error: 'No active profile' };
    if (!vaultKey) return { ok: false, error: 'Vault is locked. Enter master password first.' };

    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return { ok: false, error: 'Supabase not configured' };

    const { ciphertext, iv } = await encrypt(password, vaultKey);

    const { data, error } = await sb.from('profile_credentials').insert({
      profile_id: activeProfileId,
      owner_id: user.id,
      service_name: serviceName.trim(),
      service_url: opts?.serviceUrl?.trim() || null,
      username: opts?.username?.trim() || null,
      encrypted_value: ciphertext,
      encryption_iv: iv,
      notes: opts?.notes?.trim() || null,
      category: opts?.category ?? 'general',
    }).select().single();

    if (error) return { ok: false, error: error.message };
    setCredentials(prev => [...prev, data as Credential]);
    return { ok: true };
  }, [activeProfileId, user?.id, vaultKey]);

  const removeCredential = useCallback(async (id: string) => {
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    await sb.from('profile_credentials').delete().eq('id', id);
    setCredentials(prev => prev.filter(c => c.id !== id));
  }, []);

  const decryptCredential = useCallback(async (credential: Credential): Promise<string | null> => {
    if (!vaultKey) return null;
    try {
      return await decrypt(credential.encrypted_value, credential.encryption_iv, vaultKey);
    } catch {
      return null;
    }
  }, [vaultKey]);

  const decryptAll = useCallback(async (): Promise<Credential[]> => {
    if (!vaultKey) return credentials;
    const results = await Promise.all(
      credentials.map(async (c) => {
        try {
          const plain = await decrypt(c.encrypted_value, c.encryption_iv, vaultKey);
          return { ...c, _decrypted: plain };
        } catch {
          return { ...c, _decrypted: undefined };
        }
      }),
    );
    return results;
  }, [credentials, vaultKey]);

  return {
    credentials,
    isLoading,
    isVaultUnlocked: vaultKey !== null,
    addCredential,
    removeCredential,
    decryptCredential,
    decryptAll,
    refresh: loadCredentials,
  };
}
