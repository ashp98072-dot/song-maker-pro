/**
 * FASE A — Forensic runtime instrumentation.
 * Logs only; does not change control flow.
 */
export type AuditEventDetail = {
  source: string;
  action: string;
  sessionCode?: string | null;
  songId?: string | null;
  remoteIndex?: number | null;
  pathname?: string | null;
  liveSessionStatus?: string | null;
  reconnectState?: boolean | null;
  extra?: Record<string, unknown>;
};

export function auditEventLog(detail: AuditEventDetail): void {
  const pathname =
    detail.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : null);
  console.log('[AUDIT_EVENT]', {
    timestamp: Date.now(),
    sessionCode: detail.sessionCode ?? null,
    source: detail.source,
    action: detail.action,
    songId: detail.songId ?? null,
    remoteIndex: detail.remoteIndex ?? null,
    pathname,
    liveSessionStatus: detail.liveSessionStatus ?? null,
    reconnectState: detail.reconnectState ?? null,
    ...(detail.extra ?? {}),
  });
}
