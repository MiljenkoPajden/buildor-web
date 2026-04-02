/**
 * ProfileManager — Browser Profile Isolation UI
 *
 * Sections: Profile list, Switcher, Bookmarks, Credential Vault, Activity Log
 */
import { useCallback, useEffect, useState } from 'react';
import { useBrowserProfile } from '../../context/BrowserProfileContext';
import type { BrowserProfile } from '../../context/BrowserProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useProfileBookmarks } from '../../hooks/useProfileBookmarks';
import type { Bookmark } from '../../hooks/useProfileBookmarks';
import { useProfileCredentials } from '../../hooks/useProfileCredentials';
import type { CredentialCategory } from '../../hooks/useProfileCredentials';
import { useProfileActivity } from '../../hooks/useProfileActivity';
import { deriveKey, generateSalt, saltFromBase64 } from '../../lib/crypto';
import { getSupabaseClient } from '../../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

// ── Color palette for profiles ──────────────────────────────────────────────
const PROFILE_COLORS = [
  '#57c3ff', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE SWITCHER — sidebar dropdown
// ═══════════════════════════════════════════════════════════════════════════════

export function ProfileSwitcher({ onNavigateToProfiles }: { onNavigateToProfiles: () => void }): JSX.Element {
  const { profiles, activeProfile, switchProfile, isLoading } = useBrowserProfile();
  const [open, setOpen] = useState(false);

  if (isLoading || profiles.length === 0) {
    return <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>Loading profiles...</div>;
  }

  return (
    <div style={{ position: 'relative', padding: '0 8px', marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: open ? 'rgba(87,195,255,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(87,195,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
          cursor: 'pointer', color: 'var(--text-primary, #e2e8f0)',
          fontSize: 12, fontWeight: 600, transition: '0.15s ease',
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: activeProfile?.icon_color ?? '#57c3ff',
          boxShadow: `0 0 6px ${activeProfile?.icon_color ?? '#57c3ff'}40`,
        }} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeProfile?.name ?? 'Personal'}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 8, right: 8, zIndex: 50,
          marginTop: 4, borderRadius: 8, overflow: 'hidden',
          background: 'rgba(13, 18, 25, 0.98)', border: '1px solid rgba(87,195,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {profiles.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { switchProfile(p.id); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer', border: 'none',
                background: p.id === activeProfile?.id ? 'rgba(87,195,255,0.08)' : 'transparent',
                color: 'var(--text-primary, #e2e8f0)', fontSize: 11,
                transition: '0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(87,195,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = p.id === activeProfile?.id ? 'rgba(87,195,255,0.08)' : 'transparent')}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: p.icon_color,
              }} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              {p.client_name && (
                <span style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)', flexShrink: 0 }}>
                  {p.client_name}
                </span>
              )}
              {p.is_default && (
                <span style={{ fontSize: 8, color: '#57c3ff', opacity: 0.6 }}>DEFAULT</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setOpen(false); onNavigateToProfiles(); }}
            style={{
              width: '100%', padding: '8px 12px', cursor: 'pointer', border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'transparent', color: '#57c3ff', fontSize: 11, fontWeight: 600,
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(87,195,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            + Manage Profiles
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE COLOR BANNER — shown when non-default profile is active
// ═══════════════════════════════════════════════════════════════════════════════

export function ProfileColorBanner(): JSX.Element | null {
  const { activeProfile } = useBrowserProfile();

  if (!activeProfile || activeProfile.is_default) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 16px', fontSize: 11, fontWeight: 600,
      background: `${activeProfile.icon_color}10`,
      borderBottom: `2px solid ${activeProfile.icon_color}40`,
      color: activeProfile.icon_color,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: activeProfile.icon_color,
        boxShadow: `0 0 8px ${activeProfile.icon_color}60`,
      }} />
      Working as: {activeProfile.name}
      {activeProfile.client_name && (
        <span style={{ opacity: 0.7 }}> — {activeProfile.client_name}</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE MANAGER PAGE — full profiles management
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminProfilesPage(): JSX.Element {
  const { user } = useAuth();

  if (!user) {
    return (
      <section className="admin-card">
        <h2 className="admin-card-title">Not signed in</h2>
        <p className="admin-desc">Sign in to manage browser profiles.</p>
      </section>
    );
  }

  return (
    <div className="admin-panel">
      <ProfileListSection />
      <BookmarksSection />
      <CredentialVaultSection />
      <ProfileSettingsSection />
      <ActivityLogSection />
    </div>
  );
}

// ── Profile List ─────────────────────────────────────────────────────────────

function ProfileListSection(): JSX.Element {
  const { user } = useAuth();
  const { profiles, activeProfile, switchProfile, createProfile, deleteProfile, profileLimit, isLoading } = useBrowserProfile();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClientId, setNewClientId] = useState<string>('');
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  // Load clients for the dropdown
  useEffect(() => {
    (async () => {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) return;
      const { data } = await sb.from('clients').select('id, name').order('name');
      if (data) setClients(data);
    })();
  }, []);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    const result = await createProfile(newName.trim(), newClientId || null, newColor);
    if (!result.ok) setCreateError(result.error ?? 'Failed');
    else { setNewName(''); setNewClientId(''); setShowCreate(false); }
    setCreating(false);
  }

  return (
    <section className="admin-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="admin-card-title">Browser Profiles</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary, #64748b)' }}>
            {profiles.length} / {profileLimit === 999 ? '∞' : profileLimit}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '4px 12px' }}
            onClick={() => setShowCreate(!showCreate)}
            disabled={profiles.length >= profileLimit}
          >
            + New Profile
          </button>
        </div>
      </div>

      <p className="admin-desc" style={{ marginTop: 4 }}>
        Each profile isolates bookmarks, credentials, and settings. Link a profile to a client for automatic context switching.
      </p>

      {showCreate && (
        <form onSubmit={handleCreate} style={{
          marginTop: 12, padding: 12, borderRadius: 8,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="admin-label" style={{ fontSize: 10 }}>
              Profile Name
              <input
                type="text" className="modal-field" placeholder="e.g. Client XYZ"
                value={newName} onChange={e => setNewName(e.target.value)}
                style={{ fontSize: 12, marginTop: 4 }}
              />
            </label>
            <label className="admin-label" style={{ fontSize: 10 }}>
              Linked Client (optional)
              <select
                className="modal-field" value={newClientId}
                onChange={e => setNewClientId(e.target.value)}
                style={{ fontSize: 12, marginTop: 4 }}
              >
                <option value="">— None (personal) —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary, #64748b)', marginRight: 4 }}>Color:</span>
            {PROFILE_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setNewColor(c)} style={{
                width: 18, height: 18, borderRadius: '50%', border: c === newColor ? '2px solid #fff' : '2px solid transparent',
                background: c, cursor: 'pointer', padding: 0,
              }} />
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 11, padding: '6px 16px' }} disabled={creating}>
              {creating ? 'Creating...' : 'Create Profile'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            {createError && <span style={{ fontSize: 10, color: '#ef4444' }}>{createError}</span>}
          </div>
        </form>
      )}

      {isLoading ? (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)', marginTop: 12 }}>Loading profiles...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginTop: 12 }}>
          {profiles.map(p => (
            <ProfileCard
              key={p.id}
              profile={p}
              isActive={p.id === activeProfile?.id}
              onSwitch={() => switchProfile(p.id)}
              onDelete={p.is_default ? undefined : () => deleteProfile(p.id)}
            />
          ))}
        </div>
      )}

      {!isLoading && profiles.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)', marginTop: 12 }}>No profiles yet. Create one above.</p>
      )}

      {/* Plan upgrade hint */}
      {profiles.length >= profileLimit && user?.plan !== 'team' && (
        <p style={{ fontSize: 10, color: '#f59e0b', marginTop: 8 }}>
          Profile limit reached. Upgrade to {user?.plan === 'free' ? 'Pro' : 'Team'} for more profiles.
        </p>
      )}
    </section>
  );
}

function ProfileCard({ profile, isActive, onSwitch, onDelete }: {
  profile: BrowserProfile;
  isActive: boolean;
  onSwitch: () => void;
  onDelete?: () => void;
}): JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{
      padding: 12, borderRadius: 8, position: 'relative',
      background: isActive ? `${profile.icon_color}08` : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isActive ? profile.icon_color + '30' : 'rgba(255,255,255,0.06)'}`,
      transition: '0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: profile.icon_color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#000',
        }}>
          {profile.name[0]?.toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary, #e2e8f0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.name}
          </div>
          {profile.client_name && (
            <div style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)' }}>Client: {profile.client_name}</div>
          )}
        </div>
        {isActive && (
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: `${profile.icon_color}20`, color: profile.icon_color, textTransform: 'uppercase',
          }}>Active</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, fontSize: 9, color: 'var(--text-tertiary, #64748b)', marginBottom: 8 }}>
        {profile.is_default && <span style={{ background: 'rgba(87,195,255,0.1)', color: '#57c3ff', padding: '1px 5px', borderRadius: 3 }}>Default</span>}
        <span>Last used: {profile.last_used_at ? new Date(profile.last_used_at).toLocaleDateString() : 'Never'}</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {!isActive && (
          <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }} onClick={onSwitch}>
            Switch
          </button>
        )}
        {onDelete && !confirmDelete && (
          <button type="button" style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
          }} onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
        {confirmDelete && (
          <>
            <button type="button" style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
            }} onClick={() => { onDelete?.(); setConfirmDelete(false); }}>
              Confirm
            </button>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Bookmarks Section ────────────────────────────────────────────────────────

function BookmarksSection(): JSX.Element {
  const { activeProfile } = useBrowserProfile();
  const { bookmarks, folders, isLoading, addBookmark, removeBookmark, updateBookmark } = useProfileBookmarks();
  const { logActivity } = useProfileActivity();
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newFolder] = useState('default');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    await addBookmark(newTitle.trim(), newUrl.trim(), newFolder);
    logActivity('bookmark_add', newTitle.trim(), newUrl.trim());
    setNewTitle('');
    setNewUrl('');
    setShowAdd(false);
  }

  function startEdit(b: Bookmark): void {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditUrl(b.url);
  }

  async function saveEdit(): Promise<void> {
    if (!editingId) return;
    await updateBookmark(editingId, { title: editTitle, url: editUrl });
    setEditingId(null);
  }

  function handleExport(): void {
    const data = bookmarks.map(b => ({ title: b.title, url: b.url, folder: b.folder, pinned: b.pinned }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${(activeProfile?.name ?? 'personal').toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity('bookmark_export', `Exported ${data.length} bookmarks`);
  }

  function handleImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const items = JSON.parse(text) as { title: string; url: string; folder?: string; pinned?: boolean }[];
        if (!Array.isArray(items)) return;
        let count = 0;
        for (const item of items) {
          if (item.title && item.url) {
            await addBookmark(item.title, item.url, item.folder ?? 'default', item.pinned ?? false);
            count++;
          }
        }
        logActivity('bookmark_import', `Imported ${count} bookmarks from ${file.name}`);
      } catch {
        console.warn('[Bookmarks] Import failed');
      }
    };
    input.click();
  }

  return (
    <section className="admin-card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Bookmarks
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary, #64748b)' }}>
            ({bookmarks.length}) — {activeProfile?.name ?? 'Personal'}
          </span>
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>{expanded ? 'Collapse' : 'Expand'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {/* Folder tabs */}
          {folders.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
              {folders.map(f => (
                <span key={f} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary, #94a3b8)',
                }}>{f}</span>
              ))}
            </div>
          )}

          {/* Add bookmark + import/export */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setShowAdd(!showAdd)}>
              + Add Bookmark
            </button>
            {bookmarks.length > 0 && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }} onClick={handleExport}>
                Export JSON
              </button>
            )}
            <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }} onClick={handleImport}>
              Import JSON
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAdd} style={{
              display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6, marginBottom: 10,
              padding: 8, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <input type="text" className="modal-field" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ fontSize: 11 }} />
              <input type="url" className="modal-field" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ fontSize: 11 }} />
              <button type="submit" className="btn btn-primary" style={{ fontSize: 10, padding: '4px 12px' }}>Add</button>
            </form>
          )}

          {isLoading ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>Loading...</p>
          ) : bookmarks.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>No bookmarks yet. Add one above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {bookmarks.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {b.pinned && <span style={{ fontSize: 9, color: '#f59e0b' }}>★</span>}
                  {editingId === b.id ? (
                    <>
                      <input type="text" className="modal-field" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ fontSize: 10, flex: 1 }} />
                      <input type="url" className="modal-field" value={editUrl} onChange={e => setEditUrl(e.target.value)} style={{ fontSize: 10, flex: 2 }} />
                      <button type="button" className="btn btn-primary" style={{ fontSize: 9, padding: '2px 8px' }} onClick={saveEdit}>Save</button>
                      <button type="button" className="btn btn-ghost" style={{ fontSize: 9, padding: '2px 6px' }} onClick={() => setEditingId(null)}>×</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.title}
                      </span>
                      <a href={b.url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 10, color: '#57c3ff', flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{b.url}</a>
                      <span style={{ fontSize: 8, color: 'var(--text-tertiary, #64748b)' }}>{b.folder}</span>
                      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary, #64748b)', fontSize: 10, padding: '0 4px' }} onClick={() => startEdit(b)}>✎</button>
                      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 10, padding: '0 4px' }} onClick={() => { removeBookmark(b.id); logActivity('bookmark_remove', b.title, b.url); }}>×</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Credential Vault Section ─────────────────────────────────────────────────

function CredentialVaultSection(): JSX.Element {
  const { activeProfile, setVaultKey, vaultSalt, setVaultSalt } = useBrowserProfile();
  const { credentials, isLoading, isVaultUnlocked, addCredential, removeCredential, decryptCredential } = useProfileCredentials();
  const { logActivity } = useProfileActivity();
  const [expanded, setExpanded] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add credential form
  const [newService, setNewService] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCategory, setNewCategory] = useState<CredentialCategory>('general');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Reveal state per credential
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const handleUnlock = useCallback(async () => {
    if (!masterPassword.trim()) return;
    setUnlockError(null);
    try {
      let salt = vaultSalt;
      if (!salt) {
        salt = generateSalt();
        setVaultSalt(salt);
      }
      const key = await deriveKey(masterPassword, saltFromBase64(salt));
      setVaultKey(key);
      setMasterPassword('');
      logActivity('vault_unlock', `Vault unlocked for ${activeProfile?.name ?? 'profile'}`);
    } catch {
      setUnlockError('Failed to derive key');
    }
  }, [masterPassword, vaultSalt, setVaultKey, setVaultSalt, activeProfile?.name, logActivity]);

  const handleLock = useCallback(() => {
    setVaultKey(null);
    setRevealed({});
  }, [setVaultKey]);

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!newService.trim() || !newPassword.trim()) return;
    setAdding(true);
    setAddError(null);
    const result = await addCredential(newService, newPassword, {
      serviceUrl: newUrl || undefined,
      username: newUsername || undefined,
      notes: newNotes || undefined,
      category: newCategory,
    });
    if (!result.ok) setAddError(result.error ?? 'Failed');
    else {
      logActivity('credential_add', newService, newUrl || undefined);
      setNewService(''); setNewUrl(''); setNewUsername('');
      setNewPassword(''); setNewNotes(''); setShowAdd(false);
    }
    setAdding(false);
  }

  async function handleReveal(id: string): Promise<void> {
    if (revealed[id]) {
      setRevealed(prev => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    const cred = credentials.find(c => c.id === id);
    if (!cred) return;
    const plain = await decryptCredential(cred);
    if (plain !== null) {
      setRevealed(prev => ({ ...prev, [id]: plain }));
      logActivity('credential_reveal', cred.service_name, cred.service_url ?? undefined);
      // Auto-hide after 30s
      setTimeout(() => setRevealed(prev => { const n = { ...prev }; delete n[id]; return n; }), 30000);
    }
  }

  async function handleCopy(id: string): Promise<void> {
    const cred = credentials.find(c => c.id === id);
    if (!cred) return;
    const plain = revealed[id] ?? await decryptCredential(cred);
    if (plain !== null) {
      await navigator.clipboard.writeText(plain);
      logActivity('credential_copy', cred.service_name, cred.service_url ?? undefined);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      // Auto-clear clipboard after 30s
      setTimeout(() => navigator.clipboard.writeText(''), 30000);
    }
  }

  const CATEGORY_LABELS: Record<CredentialCategory, string> = {
    general: 'General', api_key: 'API Key', ssh: 'SSH', ftp: 'FTP',
    oauth: 'OAuth', database: 'Database', other: 'Other',
  };

  const CATEGORY_COLORS: Record<CredentialCategory, string> = {
    general: '#94a3b8', api_key: '#f59e0b', ssh: '#22c55e', ftp: '#06b6d4',
    oauth: '#8b5cf6', database: '#ec4899', other: '#64748b',
  };

  return (
    <section className="admin-card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Credential Vault
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary, #64748b)' }}>
            ({credentials.length}) — {isVaultUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
          </span>
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>{expanded ? 'Collapse' : 'Expand'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <p className="admin-desc" style={{ fontSize: 10, marginBottom: 10 }}>
            Passwords are encrypted client-side (AES-256-GCM). The server never sees plaintext. Profile: <strong>{activeProfile?.name ?? 'Personal'}</strong>
          </p>

          {/* Unlock / Lock */}
          {!isVaultUnlocked ? (
            <div style={{
              padding: 12, borderRadius: 8,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', marginBottom: 8 }}>
                Enter Master Password to unlock vault
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password" className="modal-field" placeholder="Master password"
                  value={masterPassword} onChange={e => setMasterPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  style={{ fontSize: 12, flex: 1 }}
                />
                <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: '6px 16px' }} onClick={handleUnlock}>
                  Unlock
                </button>
              </div>
              {unlockError && <span style={{ fontSize: 10, color: '#ef4444', marginTop: 4, display: 'block' }}>{unlockError}</span>}
              <p style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)', marginTop: 6 }}>
                First time? Choose a strong master password. It will be used to encrypt all credentials in this vault.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setShowAdd(!showAdd)}>
                  + Add Credential
                </button>
                <button type="button" style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
                }} onClick={handleLock}>
                  Lock Vault
                </button>
              </div>

              {showAdd && (
                <form onSubmit={handleAdd} style={{
                  padding: 10, borderRadius: 8, marginBottom: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <label className="admin-label" style={{ fontSize: 10 }}>
                      Service Name *
                      <input type="text" className="modal-field" placeholder="GitHub" value={newService} onChange={e => setNewService(e.target.value)} style={{ fontSize: 11, marginTop: 2 }} />
                    </label>
                    <label className="admin-label" style={{ fontSize: 10 }}>
                      URL
                      <input type="url" className="modal-field" placeholder="https://github.com" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ fontSize: 11, marginTop: 2 }} />
                    </label>
                    <label className="admin-label" style={{ fontSize: 10 }}>
                      Username
                      <input type="text" className="modal-field" placeholder="user@email.com" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={{ fontSize: 11, marginTop: 2 }} />
                    </label>
                    <label className="admin-label" style={{ fontSize: 10 }}>
                      Password / Token *
                      <input type="password" className="modal-field" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ fontSize: 11, marginTop: 2 }} />
                    </label>
                    <label className="admin-label" style={{ fontSize: 10 }}>
                      Category
                      <select className="modal-field" value={newCategory} onChange={e => setNewCategory(e.target.value as CredentialCategory)} style={{ fontSize: 11, marginTop: 2 }}>
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </label>
                    <label className="admin-label" style={{ fontSize: 10 }}>
                      Notes
                      <input type="text" className="modal-field" placeholder="Optional notes" value={newNotes} onChange={e => setNewNotes(e.target.value)} style={{ fontSize: 11, marginTop: 2 }} />
                    </label>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="submit" className="btn btn-primary" style={{ fontSize: 11, padding: '6px 16px' }} disabled={adding}>
                      {adding ? 'Encrypting...' : 'Save Credential'}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setShowAdd(false)}>Cancel</button>
                    {addError && <span style={{ fontSize: 10, color: '#ef4444' }}>{addError}</span>}
                  </div>
                </form>
              )}

              {isLoading ? (
                <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>Loading...</p>
              ) : credentials.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>No credentials stored. Add one above.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {credentials.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 3, flexShrink: 0,
                        background: `${CATEGORY_COLORS[c.category]}15`, color: CATEGORY_COLORS[c.category],
                        textTransform: 'uppercase',
                      }}>
                        {CATEGORY_LABELS[c.category]}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)' }}>{c.service_name}</div>
                        {c.username && <div style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)' }}>{c.username}</div>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'var(--text-secondary, #94a3b8)', minWidth: 80 }}>
                        {revealed[c.id] ? revealed[c.id] : '••••••••'}
                      </div>
                      <button type="button" style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, padding: '2px 4px',
                        color: revealed[c.id] ? '#f59e0b' : 'var(--text-tertiary, #64748b)',
                      }} onClick={() => handleReveal(c.id)} title={revealed[c.id] ? 'Hide' : 'Reveal'}>
                        {revealed[c.id] ? '🙈' : '👁'}
                      </button>
                      <button type="button" style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, padding: '2px 4px',
                        color: copied === c.id ? '#22c55e' : 'var(--text-tertiary, #64748b)',
                      }} onClick={() => handleCopy(c.id)} title="Copy password">
                        {copied === c.id ? '✓' : '📋'}
                      </button>
                      <button type="button" style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 10, padding: '2px 4px',
                      }} onClick={() => removeCredential(c.id)} title="Delete">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── Profile Settings Section ────────────────────────────────────────────────

const THEME_COLORS = [
  { value: '#57c3ff', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
];

const DEFAULT_PAGES = [
  { value: 'api', label: 'API & Transfer' },
  { value: 'profiles', label: 'Browser Profiles' },
  { value: 'clients', label: 'Clients' },
  { value: 'portal', label: 'Client Portal' },
  { value: 'projects', label: 'Projects' },
  { value: 'deliverables', label: 'Deliverables' },
];

function ProfileSettingsSection(): JSX.Element {
  const { activeProfile } = useBrowserProfile();
  const { user } = useAuth();
  const { logActivity } = useProfileActivity();
  const [expanded, setExpanded] = useState(false);
  const [themeColor, setThemeColor] = useState(activeProfile?.icon_color ?? '#57c3ff');
  const [defaultPage, setDefaultPage] = useState('api');
  const [notifyActivity, setNotifyActivity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load settings from profile_settings table
  useEffect(() => {
    if (!activeProfile?.id || !user?.id) return;
    (async () => {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) return;
      const { data } = await sb
        .from('profile_settings')
        .select('key, value')
        .eq('profile_id', activeProfile.id)
        .eq('owner_id', user.id)
        .in('key', ['theme_color', 'default_page', 'notify_activity']);
      if (data) {
        for (const row of data as { key: string; value: Record<string, unknown> }[]) {
          if (row.key === 'theme_color' && row.value?.color) setThemeColor(row.value.color as string);
          if (row.key === 'default_page' && row.value?.page) setDefaultPage(row.value.page as string);
          if (row.key === 'notify_activity') setNotifyActivity(!!row.value?.enabled);
        }
      }
      setLoaded(true);
    })();
  }, [activeProfile?.id, user?.id]);

  async function saveSetting(key: string, value: Record<string, unknown>): Promise<void> {
    if (!activeProfile?.id || !user?.id) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    setSaving(true);
    await sb.from('profile_settings').upsert({
      profile_id: activeProfile.id,
      owner_id: user.id,
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,key' });
    setSaving(false);
  }

  function handleThemeChange(color: string): void {
    setThemeColor(color);
    saveSetting('theme_color', { color });
    logActivity('settings_change', `Theme color → ${color}`);
  }

  function handleDefaultPageChange(page: string): void {
    setDefaultPage(page);
    saveSetting('default_page', { page });
    logActivity('settings_change', `Default page → ${page}`);
  }

  function handleNotifyToggle(): void {
    const next = !notifyActivity;
    setNotifyActivity(next);
    saveSetting('notify_activity', { enabled: next });
    logActivity('settings_change', `Activity notifications → ${next ? 'on' : 'off'}`);
  }

  return (
    <section className="admin-card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Profile Settings
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary, #64748b)' }}>
            — {activeProfile?.name ?? 'Personal'}
          </span>
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>{expanded ? 'Collapse' : 'Expand'}</span>
      </div>

      {expanded && loaded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Theme Color */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              Theme Color
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {THEME_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleThemeChange(c.value)}
                  title={c.label}
                  style={{
                    width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                    background: c.value, border: themeColor === c.value ? '2px solid #fff' : '2px solid transparent',
                    outline: themeColor === c.value ? `2px solid ${c.value}` : 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Default Landing Page */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              Default Landing Page
            </label>
            <select
              className="modal-field"
              value={defaultPage}
              onChange={e => handleDefaultPageChange(e.target.value)}
              style={{ fontSize: 11, maxWidth: 220 }}
            >
              {DEFAULT_PAGES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Activity Notifications Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleNotifyToggle}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                background: notifyActivity ? '#22c55e' : 'rgba(255,255,255,0.08)',
                border: 'none', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: notifyActivity ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)' }}>
              Activity notifications
            </span>
          </div>

          {saving && <span style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)' }}>Saving...</span>}
        </div>
      )}
    </section>
  );
}

// ── Activity Log Section ─────────────────────────────────────────────────────

function ActivityLogSection(): JSX.Element {
  const { activeProfile } = useBrowserProfile();
  const { entries, isLoading, clearActivity } = useProfileActivity();
  const [expanded, setExpanded] = useState(false);

  const ACTION_COLORS: Record<string, string> = {
    page_visit: '#57c3ff',
    project_open: '#22c55e',
    file_upload: '#f59e0b',
    profile_switch: '#8b5cf6',
    bookmark_add: '#06b6d4',
    bookmark_remove: '#ef4444',
    credential_add: '#f59e0b',
    credential_reveal: '#ec4899',
    credential_copy: '#84cc16',
    vault_unlock: '#22c55e',
    bookmark_export: '#6366f1',
    bookmark_import: '#6366f1',
    settings_change: '#94a3b8',
  };

  return (
    <section className="admin-card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Profile Activity
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary, #64748b)' }}>
            ({entries.length}) — {activeProfile?.name ?? 'Personal'}
          </span>
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>{expanded ? 'Collapse' : 'Expand'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {entries.length > 0 && (
            <button type="button" style={{
              fontSize: 9, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444',
              marginBottom: 8,
            }} onClick={clearActivity}>
              Clear Activity
            </button>
          )}

          {isLoading ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>Loading...</p>
          ) : entries.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>No activity recorded for this profile.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {entries.slice(0, 50).map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                  fontSize: 10, color: 'var(--text-secondary, #94a3b8)',
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: ACTION_COLORS[e.action] ?? '#64748b',
                  }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', minWidth: 80 }}>{e.action}</span>
                  {e.title && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>}
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: '#57c3ff', fontSize: 9, flexShrink: 0 }}>
                      Link
                    </a>
                  )}
                  <span style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)', flexShrink: 0 }}>
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
