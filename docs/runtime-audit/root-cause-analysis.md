# Root Cause Analysis + Entregable Final (FASE A)

## Caso 1 — Director continuo, Spectator SongView, scroll 1→4

### Síntomas

- A veces cambia canción tarde / salta / vuelve.
- Scroll de sección heredado (incorrecto).
- Reconnect loop histórico.

### Causas (código)

| ID | Causa | Archivo |
|----|-------|---------|
| C1-A | SongView aplica `sharedSectionAnchor` si `getFollowerSongViewSyncGuard` inactivo (director no continuous en payload) | `SongViewPage.handleSharedSessionUpdate` |
| C1-B | `pendingSectionAnchor` useEffect + `handleSessionUpdate` legacy `scrollIntoView` | `SongViewPage` |
| C1-C | Solo debe navegar song: `navigateFollowerSongOnly`; si `wantsContinuous` y ya en SongView, rama early sin cambio songId | `SongViewPage` |
| C1-D | Reconnect storm desynchroniza (pre-7.6.3.1 `onOnline`) | `SpectatorSessionContext` |
| C1-E | `onFollowerRealtimeJoined` recovery mientras en SongView | `SpectatorSessionContext` |

### Respuesta P4

Scroll heredado = **section sync paths** no bloqueados o payload `sharedSectionAnchor` + legacy sync. Guard `songview-song-only` solo cuando `isFollowerSongViewOnlySync` (no en live).

---

## Caso 2 — Ambos live, director 2→3→1→5

### Síntomas

- 1–2 cambios OK, luego freeze o salto a 5 con director en 3.

### Causas

| ID | Causa | Mecanismo |
|----|-------|-----------|
| C2-A | Landing no settle antes del siguiente remote | `landing.isLandingInProgress` |
| C2-B | `syncTargetIndex` actualizado pero DOM no listo | virtual window / preload |
| C2-C | Director boundary no publica 1 | `DIRECTOR_SONG_IGNORE` boundary |
| C2-D | `[FOLLOW_DESYNC_WARNING]` tras 2 unsettled | `unsettledRemoteChangeCountRef` |
| C2-E | SUBSCRIBED replay entre cambios | `onFollowerRealtimeJoined` |

### Respuesta P5

El **tercer** cambio falla cuando landing + recovery + channel replay compiten; `lastAppliedIndex` desincronizado respecto a remote.

---

## Caso 3 — Spectator live, director SongView

### Síntomas

- Primera canción OK, luego expulsado a `/cancion/:id`.

### Causas

| ID | Path | Detalle |
|----|------|---------|
| C3-A | `resolvedViewMode === 'musician'` + **not** `onContinuousLive` | `auditedNavigate(/cancion)` |
| C3-B | `navigateFollowerToDirectorState` → recovery `song` target | retain falló (listId/path) |
| C3-C | `shared-session:sync-song-only` si pathname no match live | `!isFollowerInContinuousMode` |
| C3-D | `applyFollowerBroadcastFallback` | sin handler montado |

### Respuesta P3

Expulsión = **navegación explícita** a `/cancion` cuando `shouldRetainFollowerViewMode` es false o rama musician sin live-lock.

---

## Caso 4 — Reconnect storm

### Evento raíz (histórico)

```
ONLINE event → reconnect(true, SOCKET_DISCONNECTED)
  ↔ SUBSCRIBED → reconnect(false) + toast Reconectado
```

### Residual (auditar en consola)

```
CHANNEL_ERROR / TIMED_OUT (channel remount)
  → requestRealtimeReconnect (cooldown 5s)
```

Filtrar: `[REALTIME_RECONNECT_REQUEST] allowed:true` sin `[REALTIME_STABLE]` intermedio.

---

## Defecto de código observado (auditoría estática)

En `SpectatorSessionContext.onFollowerRealtimeJoined`, rama retain-live asigna `lastRecoverySequenceKeyRef.current = recoverySequenceKey` **antes** de declarar `recoverySequenceKey` (TDZ / ReferenceError potencial en runtime). **Corregido:** `recoverySequenceKey` se declara antes de usarse (~3305).

---

# Entregable final

## 1. Archivos auditados

- `SpectatorSessionContext.tsx`
- `LiveSessionChannelHost.tsx`
- `ContinuousSetlistPage.tsx`
- `SongViewPage.tsx`
- `followerViewMode.ts`
- `realtimeReconnectGuard.ts`
- `continuousDirectorSongDetection.ts`
- `useScrollVisibility.ts`
- `continuousLandingState.ts`
- `resolveFollowerRecovery.ts`
- `SessionStatusBar.tsx`
- `navigateToRecoveryTarget` / `followerJoinNavigation.ts`

## 2. Mapa runtime real

Ver diagrama en [README.md](./README.md) y grafos en [realtime-flow.md](./realtime-flow.md), [follower-pipeline.md](./follower-pipeline.md).

## 3. Root cause por bug

| # | Root cause one-liner |
|---|----------------------|
| 1 | Múltiples writers (shared-session + recovery + legacy section); reconnect interrumpe |
| 2 | Landing/settle race + director boundary publish gap + SUBSCRIBED replay |
| 3 | `musician` viewMode → `/cancion` cuando retain/live-lock no aplica |
| 4 | `onOnline` reconnect + SUBSCRIBED clear loop (histórico); channel flap residual |
| 5 | `onFollowerRealtimeJoined` + dedupe keys vs apply pipeline |
| 6 | `visibility` ≠ remote en follower; director solo en stable-song-change |
| 7 | Boundary + virtual DOM en índices 0 y n-1 |
| 8 | Join chain: auth + subscribe 10s + DB recovery retry |

## 4. Top 5 conflictos de arquitectura

1. **Dos pipelines de sync:** shared-session landing vs recovery navigation.
2. **SUBSCRIBED = recovery hook** aunque el canal ya está sano.
3. **ViewMode musician vs continuous** dispara rutas de navegación distintas.
4. **Visibility local** usada para director publish pero **syncTargetIndex** para follower — desalineación si publish tarde.
5. **FSM `reconnecting`** acoplado a UX aunque el canal esté SUBSCRIBED.

## 5. Propuesta mínima FASE 8 — **implementada**

1. ~~Arreglar TDZ `recoverySequenceKey`~~ — ya declarado antes de usarse.
2. ~~Separar channel healthy de recovery navigation~~ — V3 SUBSCRIBED usa `shouldSkipSubscribedRecovery`; sin rematch `force` si handler + remote sano.
3. ~~Unificar expulsión live~~ — eliminado hard-block V3 `/cancion` en ContinuousSetlistPage; único gate `enforceFollowerLiveRetention`.
4. ~~SongView section hard-disable cuando director continuous~~ — recovery + shared-session + pending-anchor.
5. `FOLLOW_CONTINUOUS_MODE: true` alineado con `USE_FOLLOW_V3: true`.
6. shared-session / director-view-sync: no remount `/live` en cada cambio de índice (solo sync index).

Métricas `FOLLOW_SETTLED` quedan como mejora opcional de observabilidad.

## 6. Quick wins (observabilidad ya añadida)

- Filtrar `[AUDIT_EVENT]` en consola.
- Confirmar `[REALTIME_STABLE]` sin spam `[REALTIME_RECONNECT_REQUEST]`.
- Correlacionar `[DIRECTOR_SONG_STABLE]` → `[FOLLOW_SETTLED]` mismo índice.

## 7. Riesgos

- Instrumentación extra console noise en producción (temporal).
- FASE 8 que toque `onFollowerRealtimeJoined` sin tests manuales puede romper join cold start.
- Cooldown 5s puede enmascarar errores reales de red.

## 8. Reversión

- Eliminar `auditEventLog.ts` y llamadas `[AUDIT_EVENT]`.
- Eliminar carpeta `docs/runtime-audit/` si no se necesita documentación.
