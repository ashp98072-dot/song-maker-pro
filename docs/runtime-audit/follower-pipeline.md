# Follower Pipeline Trace (P5)

## Pipeline nominal (follower en live)

```
Director: visibility stable → publishDirectorIntent('stable-song-change')
  → publishSharedSessionIfDirector (immediate)
    → Supabase broadcast
      → LiveSessionChannelHost attachSharedSessionListeners onUpdate
        → dispatchSharedSessionUpdate
          → ContinuousSetlistPage.handleSharedSessionUpdate
            → setSyncTargetIndexAudited(remoteIdx)
            → applyRemoteSongOnce(...)
              → shouldIgnoreFollowerSongApply (live: solo same-pending-landing)
              → landing.queuePendingScroll / beginLanding
              → scrollToSongId (landing pipeline)
              → [FOLLOW_SETTLED] (continuousFollowSyncLog)
```

## Caso A — Director 2 → 3 (timeline + ramas paralelas)

| Paso | Director | Follower (live) | Rama paralela posible |
|------|----------|-----------------|------------------------|
| T0 | Scroll; visibility index 3 candidato | — | — |
| T1 | `DIRECTOR_SONG_DETECTED` ×N | — | IO + scroll RAF |
| T2 | Tras ~350ms: `DIRECTOR_SONG_STABLE` | — | boundary +80ms si 0 o last |
| T3 | `publishDirectorIntent('stable-song-change')` | — | — |
| T4 | — | `shared-session` receive | `dispatchSharedSessionUpdate` |
| T5 | — | `setSyncTargetIndex(3)` | — |
| T6 | — | `applyRemoteSongOnce` | **BLOCK** si `landingInProgress && pending.index===3` |
| T7 | — | Landing scroll | `visibility` local NO mueve ventana |
| T8 | — | `[FOLLOW_SETTLED] index:3` | — |

### ¿Qué interrumpe el **segundo** cambio (3 → 1)?

1. **`onFollowerRealtimeJoined` en SUBSCRIBED** entre medias → recovery / navigate (si no retain).
2. **`shouldIgnoreFollowerSongApply` fuera de live** (stale, duplicate-settled) — no aplica en live salvo same-pending.
3. **`landing.isLandingInProgress()`** — segundo apply con mismo pending index bloqueado.
4. **`isStaleRemoteReplay`** en ramas no-live.
5. **`unsettledRemoteChangeCountRef`** — warning `[FOLLOW_DESYNC_WARNING]` no bloquea pero indica carrera.
6. **`syncTargetIndex` null** o resolución `targetSongId` fallida si `remoteListIds` desalineado.
7. **Virtual window** sin nodo DOM (`renderedNodeFound: false` en `[FOLLOW_TARGET]`) — landing espera render.

## Caso B — Ambos live 2 → 3 → 1 → 5

Orden esperado en logs:

```
[FOLLOW_APPLY_ALLOWED] remote-index-changed
[FOLLOW_SETTLED] 3
[FOLLOW_SETTLED] 1
[FOLLOW_SETTLED] 5
```

### Fallo observado: sigue 1–2 y muere

Hipótesis alineadas al código:

| # | Mecanismo | Evidencia en código |
|---|-----------|---------------------|
| H1 | Salto a 5 = `syncTargetIndex` aplicado pero landing no settle en 1/3 | `effectiveWindowIndex` = remote; scroll async |
| H2 | Recovery replay pisa `lastAppliedIndex` | `onFollowerRealtimeJoined` + `navigateFollowerToDirectorState` |
| H3 | `lastJoinNavigationKeyRef` bloquea nav pero no apply | duplicate navKey vs apply continúa |
| H4 | Director no publica 1 o 5 (boundary unstable) | primer/último canto +350+80ms |
| H5 | `applyRemoteSectionOnce` o section en payload desvía scroll | `sharedSectionAnchor` en rama continuous no retain |

## Ramas que NO deben mover follower en live pero existen

| Rama | Archivo | Condición |
|------|---------|-----------|
| visibility → scroll | `useScrollVisibility` | follower `isFollowerVisibilityReadOnly` en scroll local |
| recovery | `handleSessionRecovered` | mount / reconnect |
| legacy sync | `SongViewPage` si mal montado | wrong page handler |
| fallback | `applyFollowerBroadcastFallback` | sin handler |

## Logs a correlacionar (repro 2→3)

```
[DIRECTOR_SONG_STABLE]
[DIRECTOR_PUBLISH] stable-song-change
[AUDIT_EVENT] source:ContinuousSetlist action:shared-session-receive
[AUDIT_EVENT] action:applyRemoteSongOnce-queued
[FOLLOW_APPLY_ALLOWED] | [FOLLOW_APPLY_BLOCKED]
[FOLLOW_SETTLED]
[FOLLOW_TARGET] effectiveWindowIndex === remoteIndex
[REALTIME_EVENT] type CHANNEL_SUBSCRIBED  ← si aparece entre cambios, sospechar replay
[FOLLOW_RECOVERY_BLOCKED] | [FOLLOW_IGNORE]
```
