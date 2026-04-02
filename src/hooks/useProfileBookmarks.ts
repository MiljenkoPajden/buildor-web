/**
 * useProfileBookmarks — CRUD hook for per-profile bookmarks.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { useBrowserProfile } from '../context/BrowserProfileContext';
import { useAuth } from '../context/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

export interface Bookmark {
  id: string;
  profile_id: string;
  title: string;
  url: string;
  favicon_url: string | null;
  folder: string;
  sort_order: number;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfileBookmarks() {
  const { activeProfileId } = useBrowserProfile();
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<string[]>(['default']);
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    if (!activeProfileId || !user?.id) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    setIsLoading(true);
    try {
      const { data, error } = await sb
        .from('profile_bookmarks')
        .select('*')
        .eq('profile_id', activeProfileId)
        .order('pinned', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const items = (data ?? []) as Bookmark[];
      setBookmarks(items);
      const uniqueFolders = ['default', ...new Set(items.map(b => b.folder).filter(f => f !== 'default'))];
      setFolders(uniqueFolders);
    } catch (err) {
      console.warn('[useProfileBookmarks] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfileId, user?.id]);

  useEffect(() => {
    if (activeProfileId && activeProfileId !== loadedRef.current) {
      loadedRef.current = activeProfileId;
      loadBookmarks();
    }
  }, [activeProfileId, loadBookmarks]);

  const addBookmark = useCallback(async (
    title: string, url: string, folder = 'default', pinned = false,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!activeProfileId || !user?.id) return { ok: false, error: 'No active profile' };
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return { ok: false, error: 'Supabase not configured' };

    const { data, error } = await sb.from('profile_bookmarks').insert({
      profile_id: activeProfileId,
      owner_id: user.id,
      title: title.trim(),
      url: url.trim(),
      folder,
      pinned,
      sort_order: bookmarks.length,
    }).select().single();

    if (error) return { ok: false, error: error.message };
    setBookmarks(prev => [...prev, data as Bookmark]);
    return { ok: true };
  }, [activeProfileId, user?.id, bookmarks.length]);

  const removeBookmark = useCallback(async (id: string) => {
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    await sb.from('profile_bookmarks').delete().eq('id', id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const updateBookmark = useCallback(async (id: string, updates: Partial<Pick<Bookmark, 'title' | 'url' | 'folder' | 'pinned' | 'sort_order'>>) => {
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    await sb.from('profile_bookmarks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  return {
    bookmarks,
    folders,
    isLoading,
    addBookmark,
    removeBookmark,
    updateBookmark,
    refresh: loadBookmarks,
  };
}
