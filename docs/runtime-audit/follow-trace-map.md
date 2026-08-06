# Follow pipeline trace map (FASE 8.1)

Observability only — no behavior changes. All events use `followTrace()` → console prefix `[FOLLOW_TRACE]` with monotonic `seq`, `perf`, `ts`, `event`, `payload`.

## Pipeline (happy path)

```
Director scroll
  → FOLLOW_DIRECTOR_SCROLL
  → FOLLOW_VISIBILITY_CHANGE
  → FOLLOW_STABLE_CANDIDATE (pending timer)
  → FOLLOW_STABLE_PUBLISHED (detection) OR skip FOLLOW_STABLE_CANCELLED
  → FOLLOW_PUBLISH_INTENT (directorPublishIntentLog)
  → [realtime broadcast]
  → FOLLOW_CHANNEL_STATE (SUBSCRIBED / TIMED_OUT / …)
  → FOLLOW_SHARED_RECEIVE (SpectatorSessionContext | ContinuousSetlistPage | SongViewPage)
  → FOLLOW_OWNER_DECISION (live-mounted vs provider fallback)
  → FOLLOW_ROUTE_DECISION (navigate vs apply-remote vs blocked)
  → FOLLOW_LIVE_LOCK_DECISION (enforceFollowerLiveRetention)
  → FOLLOW_APPLY_REMOTE_START
  → FOLLOW_APPLY_REMOTE_SKIP | FOLLOW_APPLY_REMOTE_END
  → FOLLOW_LANDING_START (followLandingLog + scroll path)
  → FOLLOW_LANDING_READY | FOLLOW_LANDING_ABORT
  → FOLLOW_SETTLED
```

## Casos de prueba

### Caso 1 — Director continuo, follower SongView, 1→2→3→4

**Esperado en consola (por canción):**

1. `FOLLOW_PUBLISH_INTENT` ×4 (director)
2. `FOLLOW_SHARED_RECEIVE` en **SongViewPage** (`page: song-view`)
3. `FOLLOW_SONGVIEW_GUARD` si hay intento de sección/scroll
4. `FOLLOW_ROUTE_DECISION` con `reason: song-only-sync` (no `/live`)
5. **Ausente:** `FOLLOW_APPLY_REMOTE_*`, `FOLLOW_SETTLED` (solo en live)
6. **Ausente:** ráfagas `FOLLOW_CHANNEL_STATE` TIMED_OUT entre cantos

**Si falla, buscar:**

| Síntoma | Evento roto probable |
|--------|----------------------|
| No cambia canción | Falta `FOLLOW_SHARED_RECEIVE` o `FOLLOW_ROUTE_DECISION` en SongView |
| Scroll sección | `FOLLOW_SONGVIEW_GUARD` sin `blockedScroll: true` antes de scroll |
| Reconnect storm | `FOLLOW_CHANNEL_STATE` entre cantos |

### Caso 2 — Ambos continuo, 2→3→1→5

**Esperado (por cambio de índice):**

1. `FOLLOW_PUBLISH_INTENT` con `remoteIndex` 2,3,0,4
2. `FOLLOW_SHARED_RECEIVE` en **ContinuousSetlistPage**
3. `FOLLOW_OWNER_DECISION` `liveMounted: true` (si aplica)
4. `FOLLOW_APPLY_REMOTE_START` → `END` → `FOLLOW_LANDING_START` → `FOLLOW_SETTLED` (1× por índice)
5. `FOLLOW_ROUTE_DECISION` con `blocked: true` + `live-lock-apply-remote` (no `/cancion`)

**Si falla:**

| Síntoma | Hipótesis a validar con trace |
|--------|-------------------------------|
| Solo 1–2 cantos | `FOLLOW_APPLY_REMOTE_SKIP` (`duplicate-settled`, `same-pending-landing`) |
| Freeze al final | `FOLLOW_STABLE_CANCELLED` `unstable-boundary` + sin `FOLLOW_PUBLISH_INTENT` |
| Salto tarde | `FOLLOW_LANDING_ABORT` `generation-stale` o `render-not-ready` |
| Queda atrás | `effectiveWindowIndex` en payload `FOLLOW_SHARED_RECEIVE` ≠ `remoteIndex` |

### Caso 3 — Follower live, director SongView

**Esperado:**

1. `FOLLOW_SHARED_RECEIVE` en ContinuousSetlistPage
2. `FOLLOW_LIVE_LOCK_DECISION` `allowed: false` si target `/cancion/…`
3. `FOLLOW_ROUTE_DECISION` `live-lock-apply-remote` → `FOLLOW_APPLY_REMOTE_*`
4. **Ausente:** `targetRoute: /cancion/…` con `blocked: false`

**Si falla:**

| Síntoma | Evento |
|--------|--------|
| Sale a SongView | `FOLLOW_ROUTE_DECISION` `router-navigate` a `/cancion` sin `blocked: true` |
| No cambia canción | Sin `FOLLOW_APPLY_REMOTE_START` tras receive |

## Preguntas forenses (P1–P6)

### P1 — ¿Por qué falla caso 1?

Revisar secuencia SongView: si `FOLLOW_ROUTE_DECISION` no aparece tras cada `FOLLOW_SHARED_RECEIVE`, el handler no navega. Si aparece `FOLLOW_APPLY_REMOTE_*` en SongView, hay routing incorrecto hacia live pipeline.

### P2 — ¿Por qué falla caso 2?

Contar `FOLLOW_SETTLED` vs `FOLLOW_PUBLISH_INTENT`. Si skips > publishes, ver `FOLLOW_APPLY_REMOTE_SKIP`. Si publishes > settles, landing muere en `FOLLOW_LANDING_ABORT`.

### P3 — ¿Por qué falla caso 3?

`FOLLOW_LIVE_LOCK_DECISION` debe mostrar `allowed: false`. Si `allowed: true` o no hay evento, `enforceFollowerLiveRetention` no aplicó (pathname/listId/followDirector).

### P4 — ¿Qué evento rompe el pipeline?

Primer hueco en la cadena happy path (tabla arriba) después del último evento bueno.

### P5 — ¿Quién pisa a quién?

| Competidor | Señal en trace |
|------------|----------------|
| shared-session página | `FOLLOW_SHARED_RECEIVE` + `handleSharedSessionUpdate` |
| provider fallback | `FOLLOW_ROUTE_DECISION` `applyFollowerBroadcastFallback` |
| recovery navigate | `FOLLOW_ROUTE_DECISION` `navigateFollowerToDirectorState` |
| landing | `FOLLOW_APPLY_REMOTE_*` / `FOLLOW_LANDING_*` |

Orden de `seq` indica quién ganó.

### P6 — FIX mínimo propuesto (NO IMPLEMENTADO)

Documentar tras captura real. Candidatos típicos (solo hipótesis):

- Caso 1: routing SongView sin pasar por recovery navigate
- Caso 2: dedupe en `shouldIgnoreFollowerSongApply` demasiado agresivo tras settle
- Caso 3: rama `shared-session:musician` o `auditedNavigate` sin live lock

## Archivos instrumentados

| Archivo | Eventos |
|---------|---------|
| `followTrace.ts` | API |
| `continuousDirectorSongDetection.ts` | STABLE_CANDIDATE, CANCELLED, PUBLISHED |
| `continuousDirectorIntent.ts` | PUBLISH_INTENT |
| `ContinuousSetlistPage.tsx` | SCROLL, VISIBILITY, APPLY_*, ROUTE, SHARED_RECEIVE, LANDING_ABORT |
| `continuousFollowLanding.ts` | LANDING_START, READY, ABORT |
| `continuousFollowSyncLog.ts` | LANDING_START, SETTLED |
| `SpectatorSessionContext.tsx` | SHARED_RECEIVE, OWNER, ROUTE |
| `SongViewPage.tsx` | SHARED_RECEIVE, SONGVIEW_GUARD, ROUTE |
| `followerViewMode.ts` | LIVE_LOCK_DECISION |
| `LiveSessionChannelHost.tsx` | CHANNEL_STATE |

## Filtros consola

```text
[FOLLOW_TRACE]
FOLLOW_SETTLED
FOLLOW_ROUTE_DECISION
FOLLOW_OWNER_DECISION
FOLLOW_CHANNEL_STATE
```

Chrome DevTools filter examples:

- `event=FOLLOW_SETTLED` — no built-in; filter `[FOLLOW_TRACE]` then search `event=FOLLOW_SETTLED`
- `/FOLLOW_(TRACE|SETTLED|ROUTE_DECISION|OWNER_DECISION|CHANNEL_STATE)/`

PowerShell saved log:

```powershell
Select-String -Path trace.log -Pattern 'FOLLOW_TRACE|FOLLOW_SETTLED|FOLLOW_ROUTE_DECISION|FOLLOW_OWNER_DECISION|FOLLOW_CHANNEL_STATE'
```

## Validación build

```bash
npx tsc --noEmit
```

No cambia comportamiento runtime salvo `console.log`.
