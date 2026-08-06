import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { isDebugPanelVisible } from '@/debug/appDebugMode';
import { refreshAppDebugSnapshot } from '@/debug/initAppDebug';
import { SMOKE_TEST_ROUTES } from '@/debug/smokeRoutes';
import { runAppDebugNetworkProbes } from '@/debug/collectAppDebugSnapshot';
import type { AppDebugNetworkProbeResult, AppDebugSnapshot } from '@/debug/types';

function StatusDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? '#94a3b8' : ok ? '#22c55e' : '#ef4444';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        marginRight: 6,
      }}
      aria-hidden
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11, lineHeight: 1.4 }}>
      <span style={{ opacity: 0.65, minWidth: 88, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}

const sectionTitle: CSSProperties = {
  fontWeight: 600,
  fontSize: 11,
  marginBottom: 4,
  color: '#d4af37',
};

const iconBtnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#e2e8f0',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function AppDebugPanel() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [snapshot, setSnapshot] = useState<AppDebugSnapshot | null>(null);
  const [probes, setProbes] = useState<AppDebugNetworkProbeResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isDebugPanelVisible()) return;
    setLoading(true);
    try {
      const snap = await refreshAppDebugSnapshot({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      });
      setSnapshot(snap);
    } finally {
      setLoading(false);
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isDebugPanelVisible()) return null;

  const envOk = snapshot?.env.ready ?? null;
  const supaOk = snapshot
    ? snapshot.supabase.configured && !snapshot.supabase.error
    : null;

  return (
    <div
      role="complementary"
      aria-label="App debug panel"
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 99999,
        width: collapsed ? 200 : 320,
        maxHeight: collapsed ? 'auto' : 'min(70vh, 520px)',
        overflow: 'auto',
        background: 'rgba(11, 18, 32, 0.94)',
        color: '#e2e8f0',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: collapsed ? 0 : 8,
        }}
      >
        <strong style={{ fontSize: 12, color: '#d4af37' }}>Smoke debug</strong>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refrescar"
            style={iconBtnStyle}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir' : 'Colapsar'}
            style={iconBtnStyle}
          >
            {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && snapshot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section>
            <div style={sectionTitle}>Env</div>
            <Row
              label="ready"
              value={`${envOk} ${snapshot.env.blockers.length ? `(${snapshot.env.blockers.join(', ')})` : ''}`}
            />
            <Row label="mode" value={snapshot.env.mode} />
          </section>

          <section>
            <div style={sectionTitle}>
              <StatusDot ok={supaOk} />
              Supabase
            </div>
            <Row label="configured" value={String(snapshot.supabase.configured)} />
            <Row label="session" value={String(snapshot.supabase.sessionActive)} />
            {snapshot.supabase.error && (
              <Row label="error" value={snapshot.supabase.error} />
            )}
          </section>

          <section>
            <div style={sectionTitle}>PWA / SW</div>
            <Row label="registered" value={String(snapshot.pwa.registered)} />
            <Row label="update" value={String(snapshot.pwa.updateAvailable)} />
            <Row
              label="sw script"
              value={snapshot.pwa.activeScriptUrl?.split('/').pop() ?? '—'}
            />
            <Row label="caches" value={snapshot.pwa.cacheNames.join(', ') || '—'} />
            <Row label="display" value={snapshot.pwa.displayMode} />
          </section>

          <section>
            <Row label="YouTube" value={snapshot.youtube.providerLabel} />
            <Row label="route" value={`${snapshot.route.pathname}${snapshot.route.search}`} />
            <Row
              label="mobile"
              value={`${snapshot.mobile.isMobileViewport ? 'mobile' : 'desktop'} ${snapshot.mobile.isLandscape ? 'landscape' : 'portrait'}`}
            />
            <Row
              label="diag"
              value={`render=${snapshot.diagnostics.renderDiagStage} yt=${snapshot.diagnostics.ytDiagStage}`}
            />
          </section>

          <section>
            <div style={sectionTitle}>Rutas smoke</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, opacity: 0.9 }}>
              {SMOKE_TEST_ROUTES.map((r) => (
                <li key={r.path} style={{ marginBottom: 2 }}>
                  {r.path}
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            style={{
              ...iconBtnStyle,
              width: '100%',
              padding: '6px 8px',
              fontSize: 11,
            }}
            onClick={() => {
              void runAppDebugNetworkProbes().then(setProbes);
            }}
          >
            Ejecutar network probes
          </button>
          {probes && (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 10 }}>
              {probes.map((p) => (
                <li key={p.name} style={{ marginBottom: 4 }}>
                  <StatusDot ok={p.ok} />
                  {p.name}: {p.detail}
                </li>
              ))}
            </ul>
          )}

          <p style={{ margin: 0, fontSize: 10, opacity: 0.6 }}>
            Consola: <code>__APP_DEBUG__.refresh()</code>
          </p>
        </div>
      )}
    </div>
  );
}
