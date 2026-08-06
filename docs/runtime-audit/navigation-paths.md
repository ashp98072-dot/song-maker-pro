# Navigation Paths Audit (P3)

## Búsqueda: `navigate(` en código de sesión / follow

(No incluye login, listas genéricas, donate, etc.)

---

## Hacia SongView `/cancion/:id`

| source | file | reason | can affect follower live? | expected? |
|--------|------|--------|---------------------------|-----------|
| shared-session sync-song-only | `ContinuousSetlistPage` `auditedNavigate` | director continuous, follower NOT on live | no (not on live) | sí |
| shared-session musician | `ContinuousSetlistPage` `auditedNavigate` | `viewMode musician`, follower NOT on live | no | sí |
| shared-session musician | `ContinuousSetlistPage` | follower ON live → **blocked** by `enforceFollowerLiveRetention` → `applyRemoteSongOnce` | **no expulsar** | sí |
| recovery song target | `SpectatorSessionContext.navigateToRecoveryTarget` | `target.type === 'song'` | **sí si no retain** | solo si no en live |
| recovery song + retain | `navigateToRecoveryTarget` early return | handler only | **no** | sí |
| live-lock | `enforceFollowerLiveRetention` | block `/cancion` | **no** | sí |
| broadcast fallback | `navigateFollowerToDirectorState` | no handler | **sí** | fallback |
| realtime-subscribed | `onFollowerRealtimeJoined` → recovery | SUBSCRIBED replay | **sí** si not retain | cuestionable |
| session recovered | `SongViewPage.handleSessionRecovered` | follower + director continuous | si en SongView | sí |
| shared-session | `SongViewPage.handleSharedSessionUpdate` | `navigateFollowerSongOnly` | si en SongView | sí |
| shared-session legacy | `SongViewPage` | `navigate(/cancion)` sin guard | si guard off | no |
| exit continuous | `exitContinuousNavigation.ts` | manual exit | user driven | sí |
| handleSessionRecovered | `ContinuousSetlistPage` | `auditedNavigate(/cancion)` musician !live | si not on live | parcial |

---

## Hacia Continuous `/setlist/:id/live`

| source | file | reason | can affect follower live? | expected? |
|--------|------|--------|---------------------------|-----------|
| join / recovery | `navigateToRecoveryTarget` | `continuous-live` target | lleva a live | sí |
| shared-session | `ContinuousSetlistPage` | wantsContinuous, navigate live | si no en live | sí |
| shared-session other-list | `ContinuousSetlistPage` | listId mismatch | **cambia lista** | edge |
| SongView | `SongViewPage` | director continuous, navigate live | desde SongView | sí |
| SessionStatusBar | `SessionStatusBar.tsx` | CTA "ver continuo" | user | sí |
| ListDetailPage | `ListDetailPage` | enter live | user | sí |

---

## P3 — ¿Qué path **todavía** puede expulsar de `/live`?

### Bloqueados en código actual

- `auditedNavigate('/cancion/...')` + `enforceFollowerLiveRetention`
- `navigateToRecoveryTarget` cuando `shouldRetainFollowerViewMode` → early return + handler
- `onFollowerRealtimeJoined` cuando retain → `handler(remote)` sin navigate

### Paths que **aún pueden** expulsar (riesgo)

| # | Path | Condición |
|---|------|-----------|
| 1 | `navigateFollowerToDirectorState` → `navigateToRecoveryTarget` → `song` | Follower en live pero `listId` mismatch / `shouldRetain` false |
| 2 | `shared-session:sync-song-only` | `wantsContinuous && !isFollowerInContinuousMode` → `auditedNavigate(/cancion)` |
| 3 | `applyFollowerBroadcastFallback` | Sin page handler; fuerza navigate |
| 4 | `handleSessionRecovered` musician branch | `auditedNavigate(/cancion)` si **no** `onContinuousLive` |
| 5 | Usuario / `exitContinuousNavigation` | salida manual |
| 6 | `shared-session:other-list` | navega a **otro** `/setlist/:other/live` (expulsión semántica) |

### Condición de retain

`shouldRetainFollowerViewMode` = pathname `/setlist/:listId/live` **y** `listId` coincide.

Si `state.listId` ≠ pathname listId → retain **falla** → navegación song posible.

---

## `auditedNavigate` (wrapper crítico)

Archivo: `ContinuousSetlistPage.tsx`

- Intercepta `/cancion/` → `applyRemoteSongOnce` si live-lock.
- Log: `[FOLLOW_LIVE_LOCK]`, `[FOLLOW_VIEW_ENFORCED]`.
- Otras rutas pasan a `navigate()` directo.
