# Source of Truth Audit (P1, P6)

## Pregunta P1 — ¿Quién decide REALMENTE la canción del spectator?

**Respuesta corta:** depende de la superficie (ruta) y del rol. No hay un único writer.

| Superficie follower | Decisor efectivo | Mecanismo |
|---------------------|------------------|-----------|
| `/setlist/:id/live` + `followDirector` | **Remote shared-session** (`currentIndex` / `currentSongId`) | `dispatchSharedSessionUpdate` → `ContinuousSetlistPage.handleSharedSessionUpdate` → `applyRemoteSongOnce` → landing → `scrollToSongId` |
| `/cancion/:id` + director en continuo | **Remote `currentSongId` only** | `SongViewPage.handleSharedSessionUpdate` → `navigateFollowerSongOnly` (sin sección) |
| Sin page handler montado | **Recovery / join** | `SpectatorSessionContext.applyFollowerBroadcastFallback` → `navigateFollowerToDirectorState` |
| Tras `SUBSCRIBED` (no en live) | **Recovery replay** | `onFollowerRealtimeJoined` → `navigateFollowerToDirectorState` → `navigateToRecoveryTarget` |

**Índice de ventana en live (follower):** `syncTargetIndex` (remoto) gobierna `effectiveWindowIndex`; **no** `visibility.currentSongIndex` local.

**Director en continuo:** `visibility` (scroll DOM) → `processDirectorSongDetection` → `publishDirectorIntent('stable-song-change')` → shared-session broadcast.

---

## Tabla de fuentes

| source | archivo | puede cambiar canción | puede navegar | puede scroll | prioridad real |
|--------|---------|----------------------|---------------|--------------|----------------|
| shared-session | `LiveSessionChannelHost` → `SpectatorSessionContext.dispatchSharedSessionUpdate` | indirecto (handler) | no | no | **alta** si página montada |
| shared-session | `ContinuousSetlistPage.handleSharedSessionUpdate` | sí (`applyRemoteSongOnce`) | sí (`auditedNavigate`) | sí (`scrollToSongId`, `applyRemoteSectionOnce`) | **#1 en live** |
| shared-session | `SongViewPage.handleSharedSessionUpdate` | sí (`navigate` song-only) | sí | sí (si guard off) | **#1 en SongView** |
| recovery | `SpectatorSessionContext.navigateToRecoveryTarget` | sí (ruta) | sí | no | alta en mount/reconnect |
| recovery | `ContinuousSetlistPage.handleSessionRecovered` | sí | sí (`auditedNavigate`) | sí | alta al recuperar |
| reconnect | `onFollowerRealtimeJoined` | sí (replay recovery) | sí | no | media-alta en cada SUBSCRIBED |
| route restore | `restorePersistedSession` | sí | sí | no | alta al boot |
| mount replay | `ContinuousSetlistPage` route-initial / `publishDirectorIntent('route-initial')` | director only | no | no | media (director) |
| visibility | `useScrollVisibility` | **solo director** publish | no | local director | **director UX only** |
| stable-song-change | `processDirectorSongDetection` + `publishDirectorIntent` | sí (broadcast) | no | no | **director source of truth** |
| legacy sync | `SongViewPage.handleSessionUpdate` | sí | sí | `scrollIntoView` | baja (broadcast `sync`) |
| session update | `LiveSessionChannelHost` broadcast `sync` event | sí (SongView) | sí | sí | baja |
| fallback navigation | `applyFollowerBroadcastFallback` | sí | sí | no | cuando no hay handler |
| landing | `continuousLandingState` | sí (índice aplicado) | no | sí (post-settle) | **ejecutor** en live |
| syncTargetIndex | `ContinuousSetlistPage` state | ventana virtual | no | indirecto | **follower window** |
| lastAppliedIndex | `continuousLandingState` | dedupe / settled | no | no | **anti-replay local** |

---

## Clasificación por tipo

```
shared-session     → SpectatorSessionContext, ContinuousSetlistPage, SongViewPage
recovery           → navigateToRecoveryTarget, handleSessionRecovered, resolveFollowerRecovery
reconnect          → onFollowerRealtimeJoined, bumpReconnectSequence, requestRealtimeReconnect
route restore      → restorePersistedSession, route-initial
mount replay       → registerPageHandlers, pageRecoveryHandledKeyRef
visibility         → useScrollVisibility (director)
stable visibility  → processDirectorSongDetection → stable-song-change
legacy sync        → handleSessionUpdate (SessionState)
session update     → channel broadcast sync
fallback navigation→ applyFollowerBroadcastFallback
```

---

## P6 — ¿Qué source of truth gana cuando hay conflicto?

Orden observado en código (follower en **live**):

1. **`handleSharedSessionUpdate` en ContinuousSetlistPage** si la página está montada y `followDirector` — gana sobre recovery diferida.
2. **`applyRemoteSongOnce` + landing** — aplica índice remoto; bloqueos en `shouldIgnoreFollowerSongApply` (en live: solo `same-pending-landing`).
3. **`syncTargetIndex`** — actualizado antes de apply; gana sobre `visibility` local del follower.
4. **`onFollowerRealtimeJoined` / `navigateFollowerToDirectorState`** — puede **pisar** si corre después de SUBSCRIBED y el follower no está en live o el live-lock no aplica.
5. **`visibility` local** — **no** debe mover al follower en live; solo director publica desde ahí.
6. **Legacy `handleSessionUpdate`** — paralelo en SongView; puede scroll de sección si guard inactivo.

**Conflicto crítico documentado:** `SUBSCRIBED` → `onFollowerRealtimeJoined` → recovery navigation compite con shared-session en vuelo.

---

## Variables clave (grep global)

| Variable | Rol |
|----------|-----|
| `state.currentSongId` / `currentIndex` | Payload remoto authoritative |
| `syncTargetIndex` | Follower ventana virtual = remoto |
| `visibility.currentSongIndex` | Director detección + UI director |
| `landing.getLastAppliedIndex()` | Último índice asentado localmente |
| `lastSettledRemoteIndexRef` | Auditoría desync |
| `followerRemoteWindowIndex` | Derivado de syncTarget / pending / lastApplied |
