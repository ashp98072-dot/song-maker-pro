# Continuous Song Detection Audit (Director)

## Pregunta — ¿Cómo el director decide “estoy en el canto X”?

Cadena actual (post-7.6.3):

```
scroll / IntersectionObserver
  → useScrollVisibility.measure()
      → querySelectorAll [data-continuous-song-id]
      → distancia al viewportMid (35% altura root)
      → visibility { currentSongIndex, currentSongId, currentSection }
  → useEffect (ContinuousSetlistPage, isDirector)
      → processDirectorSongDetection({ candidateIndex, candidateSongId, totalSongs })
          → pending estable ≥ 350ms (430ms si índice 0 o last)
          → [DIRECTOR_SONG_STABLE]
      → publishDirectorIntent('stable-song-change')
      → publishSharedSessionIfDirector (viewMode continuous)
```

**Archivos:** `useScrollVisibility.ts`, `continuousDirectorSongDetection.ts`, `ContinuousSetlistPage.tsx`, `continuousDirectorIntent.ts`.

---

## Mecanismos

| Mecanismo | Rol |
|-----------|-----|
| `visibility` | Candidato instantáneo por scroll |
| `processDirectorSongDetection` | Filtro temporal + anti-republish mismo índice |
| `stable-song-change` | Intent publicado al canal |
| `publishDirectorIntent` (otros) | prev/next, mini-nav, route-initial, section-anchor — **inmediatos** |
| `scrollToSongId` | Scroll local director (no follower) |

**NO hay** `scrollToContinuousSong` global; existe `scrollToSongId` / `scrollToSongStart` en hook.

---

## Primer canto / último canto — ¿por qué fallan más?

### Boundary instability (código)

En `continuousDirectorSongDetection.ts`:

```ts
requiredStableMs = index === 0 || index === totalSongs - 1
  ? DIRECTOR_SONG_STABLE_MS + DIRECTOR_SONG_BOUNDARY_EXTRA_MS  // 350 + 80
  : DIRECTOR_SONG_STABLE_MS
```

Logs: `[DIRECTOR_SONG_IGNORE] reason: unstable boundary` mientras no cumple ms.

### DOM / virtual window

- `useVirtualSongWindow` renderiza subconjunto de canciones.
- En índice **0** o **last**, el nodo puede entrar/salir del viewport con inercia de scroll → candidato oscila.
- `IntersectionObserver` dispara `measure` frecuente → reinicia `pending` en detection.

### Virtual window director

Director usa `visibility.currentSongIndex` para `currentEntry` UI; publicación usa detection estable, no visibility cruda.

### Síntoma en follower

Si director **no publica** en boundary → follower se queda en índice anterior → “primer/último canto peor”.

---

## Tabla de acciones director que publican

| action | trigger | stable? |
|--------|---------|---------|
| `stable-song-change` | visibility + detection | sí (~350ms) |
| `enter-continuous` | mount director | once |
| `navigate-song` / `mini-nav` | UI | inmediato |
| `section-anchor` | sección | inmediato (+ anchor) |
| `route-initial` | route | mount |
| `recovery` | session recovered | hydrate |
| `song-start` | scroll start | inmediato |

---

## Logs director

```
[DIRECTOR_SONG_DETECTED] candidate: N
[DIRECTOR_SONG_STABLE] index: N
[DIRECTOR_SONG_IGNORE] reason: unstable boundary | same-as-published
[DIRECTOR_PUBLISH] source: stable-visibility, action: stable-song-change
[DIRECTOR_INTENT]
```

---

## Desktop connect lento (relacionado)

Cadena join follower:

```
restorePersistedSession / joinWithCode
  → beginFollowerSession
  → LiveSessionChannelHost effect async
      → supabase.auth.getSession
      → realtime.setAuth
      → channel.subscribe (hasta SUBSCRIBED, timeout 10s)
  → onFollowerRealtimeJoined
  → navigateFollowerToDirectorState (DB retry possible)
```

Cuellos de botella documentados: auth, subscribe timeout 10s, `resolveLiveSessionForReconnectWithRetry`, join in flight guards.
