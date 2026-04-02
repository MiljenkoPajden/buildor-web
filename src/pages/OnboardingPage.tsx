import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AccountType, PlanType } from '../context/AuthContext';
import { getSupabaseClient } from '../lib/supabase';

const ACCOUNT_TYPES: { id: AccountType; label: string; desc: string; color: string; icon: string }[] = [
  { id: 'personal', label: 'Personal', desc: 'Solo developer. One workspace, full control over your projects.', color: '#22c55e', icon: 'P' },
  { id: 'agency', label: 'Agency / Studio', desc: 'Manage client projects. Separate browser profiles per client, invite flow, and billing.', color: '#8b5cf6', icon: 'A' },
  { id: 'enterprise', label: 'Enterprise', desc: 'Teams with SSO, custom RBAC, audit logs, and compliance controls.', color: '#f59e0b', icon: 'E' },
];

const PLANS: { id: PlanType; label: string; price: string; features: string[] }[] = [
  { id: 'free', label: 'Free', price: '$0', features: ['1 project', '1 browser profile', 'Community support'] },
  { id: 'pro', label: 'Pro', price: '$19/mo', features: ['Unlimited projects', '5 browser profiles', 'Priority support', 'Custom domain email'] },
  { id: 'team', label: 'Team', price: '$49/mo', features: ['Everything in Pro', 'Unlimited profiles', 'RBAC & audit log', 'SSO integration'] },
];

export default function OnboardingPage(): JSX.Element {
  const navigate = useNavigate();
  const { user, isLoading, refreshProfile } = useAuth();

  // If onboarding is already completed, skip straight to admin
  if (!isLoading && user?.onboardingCompleted) {
    return <Navigate to="/admin" replace />;
  }

  const [step, setStep] = useState(0); // 0=welcome, 1=account type, 2=plan, 3=done
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [plan, setPlan] = useState<PlanType>('free');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      const client = getSupabaseClient();
      if (client) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (client as any)
          .from('profiles')
          .update({
            account_type: accountType,
            plan,
            display_name: displayName.trim() || null,
            onboarding_completed: true,
          })
          .eq('id', user.id);
        if (error) {
          console.error('[Onboarding] Supabase update failed:', error);
          setSaveError(error.message || 'Failed to save profile. Please try again.');
          setSaving(false);
          return;
        }
        await refreshProfile();
      }
    } catch (err) {
      console.error('[Onboarding] Save error:', err);
      setSaveError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setStep(3);
    setTimeout(() => navigate('/admin', { replace: true }), 1500);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base, #070b14)', padding: 20,
    }}>
      <div style={{
        maxWidth: 560, width: '100%',
        background: 'var(--bg-card, rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 2, padding: '12px 20px 0' }}>
          {['Welcome', 'Account Type', 'Plan', 'Ready'].map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 3, borderRadius: 2, marginBottom: 6,
                background: i <= step ? 'var(--accent, #57c3ff)' : 'rgba(255,255,255,0.06)',
                transition: 'background 0.3s',
              }} />
              <span style={{
                fontSize: 9, fontWeight: i === step ? 700 : 400,
                color: i <= step ? 'var(--accent, #57c3ff)' : 'rgba(255,255,255,0.25)',
                fontFamily: 'var(--font-mono, monospace)',
              }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          {/* Step 0: Welcome */}
          {step === 0 && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #e2e8f0)', margin: '0 0 8px', lineHeight: 1.2 }}>
                Welcome to Buildor
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Let's set up your workspace. This takes less than a minute.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={user?.email?.split('@')[0] || 'Your name'}
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: 14,
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: 'var(--text-primary, #e2e8f0)', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>
                Signed in as <strong style={{ color: 'var(--accent, #57c3ff)' }}>{user?.email}</strong>
              </p>
            </>
          )}

          {/* Step 1: Account Type */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #e2e8f0)', margin: '0 0 6px' }}>
                How will you use Buildor?
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)', margin: '0 0 16px' }}>
                This determines your workspace features. You can change this later.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ACCOUNT_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setAccountType(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                      background: accountType === t.id ? `${t.color}08` : 'transparent',
                      border: `1.5px solid ${accountType === t.id ? t.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: accountType === t.id ? t.color : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: accountType === t.id ? '#fff' : 'rgba(255,255,255,0.2)',
                      transition: 'all 0.2s',
                    }}>
                      {t.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: accountType === t.id ? t.color : 'var(--text-primary, #e2e8f0)', marginBottom: 2 }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)', lineHeight: 1.4 }}>
                        {t.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Plan */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #e2e8f0)', margin: '0 0 6px' }}>
                Choose your plan
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)', margin: '0 0 16px' }}>
                Start free, upgrade anytime. All plans include core Buildor features.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {PLANS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    style={{
                      flex: 1, padding: 14, textAlign: 'left',
                      background: plan === p.id ? 'rgba(87,195,255,0.04)' : 'transparent',
                      border: `1.5px solid ${plan === p.id ? 'rgba(87,195,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: plan === p.id ? 'var(--accent, #57c3ff)' : 'var(--text-primary, #e2e8f0)', marginBottom: 2 }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #e2e8f0)', marginBottom: 8 }}>
                      {p.price}
                    </div>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ fontSize: 10, color: 'var(--text-tertiary, #64748b)', lineHeight: 1.6, paddingLeft: 12, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: plan === p.id ? 'var(--accent, #57c3ff)' : 'rgba(255,255,255,0.2)' }}>+</span>
                        {f}
                      </div>
                    ))}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>&#10003;</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#22c55e', margin: '0 0 6px' }}>
                You're all set!
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)' }}>
                Redirecting to your dashboard...
              </p>
            </div>
          )}
        </div>

        {/* Error banner */}
        {saveError && (
          <div style={{
            margin: '0 24px 8px', padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 12, color: '#ef4444', lineHeight: 1.5,
          }}>
            {saveError}
          </div>
        )}

        {/* Footer buttons */}
        {step < 3 && (
          <div style={{
            padding: '12px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: 600,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer',
                }}
              >
                Back
              </button>
            ) : <div />}
            <button
              onClick={() => step === 2 ? handleComplete() : setStep(s => s + 1)}
              disabled={saving}
              style={{
                padding: '8px 20px', fontSize: 12, fontWeight: 700,
                background: 'var(--accent, #57c3ff)', border: 'none',
                borderRadius: 6, color: '#070b14', cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : step === 2 ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
