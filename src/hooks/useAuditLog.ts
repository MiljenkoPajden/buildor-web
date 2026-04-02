import { useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase';

export interface AuditEventParams {
  action: string;            // e.g. 'project.create', 'member.invite', 'invoice.pay'
  targetType?: string;       // e.g. 'project', 'invoice', 'client_member'
  targetId?: string;         // UUID of affected resource
  projectId?: string;
  clientId?: string;
  outcome?: 'success' | 'failure' | 'denied' | 'error';
  confidence?: number;       // 0.0-1.0 for AI-assisted actions
  metadata?: Record<string, unknown>;
}

/**
 * Hook for logging audit events to Supabase.
 * Uses the log_audit_event() RPC function which auto-resolves trace_id from the user's profile.
 *
 * Usage:
 *   const { logEvent } = useAuditLog();
 *   await logEvent({ action: 'project.create', targetType: 'project', targetId: newId });
 */
export function useAuditLog() {
  const logEvent = useCallback(async (params: AuditEventParams): Promise<string | null> => {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).rpc('log_audit_event', {
        p_action: params.action,
        p_target_type: params.targetType ?? null,
        p_target_id: params.targetId ?? null,
        p_project_id: params.projectId ?? null,
        p_client_id: params.clientId ?? null,
        p_outcome: params.outcome ?? 'success',
        p_confidence: params.confidence ?? null,
        p_metadata: params.metadata ?? {},
      });

      if (error) {
        console.error('[audit] Failed to log event:', error.message);
        return null;
      }

      return data as string; // returns event_id UUID
    } catch (err) {
      console.error('[audit] Error:', err);
      return null;
    }
  }, []);

  return { logEvent };
}
