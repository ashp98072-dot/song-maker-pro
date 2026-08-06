# Realtime Flow Audit (P2, reconnect storm)

## Componentes

```
LiveSessionChannelHost (canal Supabase, subscribe callbacks)
        ↓
SpectatorSessionContext (FSM, reconnect, dispatch, recovery)
        ↓
pageHandlersRef.onSharedSessionUpdate → ContinuousSetlistPage | SongViewPage
```

## Grafo por evento de canal

### SUBSCRIBED (follower)

```
channel.subscribe status === 'SUBSCRIBED'
  → handleRealtimeChannelStatus (log REALTIME_EVENT; NO reconnect)
  → onRealtimeSubscribed → liveSessionStatus = 'subscribed'
  → setConnection({ role: 'follower' })
  → markRealtimeSubscriptionStable → [REALTIME_STABLE] + active/passive
  → onFollowerRealtimeJoined(code)
        → si shouldRetainFollowerViewMode: handler(remote) ONLY [FOLLOW_LIVE_LOCK path]
        → si no: navigateFollowerToDirectorState (recovery replay)
```

**Regla 7.6.3.1:** SUBSCRIBED **no** llama `setIsReconnecting(true)`.

### CHANNEL_ERROR / TIMED_OUT (follower)

```
status === CHANNEL_ERROR | TIMED_OUT
  → handleRealtimeChannelStatus
  → requestRealtimeReconnect(status)  // solo si allowed + cooldown 5s
        → bumpReconnectSequence
        → liveSessionStatus = 'reconnecting'
        → scheduleReconnectFeedback (toast/spinner tras 3s)
```

### OFFLINE (browser)

```
window 'offline'
  → browserWasOfflineRef = true
  → requestRealtimeReconnect('OFFLINE')
```

### ONLINE (browser)

```
window 'online'
  → REALTIME_EVENT ONLINE
  → si wasOffline: setReconnectingWithStatus(false, 'ONLINE')  // NO inicia reconnect
```

### Director SUBSCRIBED

```
SUBSCRIBED → onRealtimeSubscribed → active
           → markRealtimeSubscriptionStable
           → (no onFollowerRealtimeJoined)
```

---

## Todos los puntos que tocan reconnect

| Ubicación | Función | Efecto |
|-----------|---------|--------|
| `SpectatorSessionContext` | `requestRealtimeReconnect` | Única puerta para `reconnecting` + sequence bump |
| `SpectatorSessionContext` | `setReconnectingWithStatus` | Delega a `requestRealtimeReconnect` si true |
| `SpectatorSessionContext` | `bumpReconnectSequence` | Alias de `requestRealtimeReconnect` |
| `LiveSessionChannelHost` | follower subscribe error | `requestRealtimeReconnect` vía `handleRealtimeChannelStatus` |
| `SpectatorSessionContext` | `window offline` | `OFFLINE` |
| `LiveSessionChannelHost` | (eliminado 7.6.3.1) toast Reconectado en SUBSCRIBED | — |

**Ya no reconectan:** `onOnline` con `SOCKET_DISCONNECTED` (causa histórica del storm).

---

## P2 — ¿Qué evento disparaba el reconnect storm? (evidencia)

### Causa raíz histórica (pre-7.6.3.1)

```
window 'online'
  → setReconnectingWithStatus(true, 'SOCKET_DISCONNECTED')  // PERMITIDO por guard antiguo
  → UI "Reconectando sesión..."
        ↓ (canal ya sano o re-SUBSCRIBE)
SUBSCRIBED
  → setIsReconnecting(false)
  → toast.success('Reconectado')
        ↓ (online event / channel flap repite)
LOOP
```

### Causas secundarias que amplifican

1. **Cada SUBSCRIBED** → `onFollowerRealtimeJoined` → `navigateFollowerToDirectorState` (recovery) aunque el canal esté bien.
2. **Effect cleanup** en `LiveSessionChannelHost` al cambiar deps → `removeChannel` → posible TIMED_OUT → reconnect request (ahora con cooldown 5s).
3. **Transición FSM** `reconnecting` ↔ `subscribed` ↔ `active` visible en SessionStatusBar si `reconnecting` + 3s.

### Estado actual post-hotfix

- Auto-reconnect **solo** `CHANNEL_ERROR`, `TIMED_OUT`, `OFFLINE`.
- Cooldown **5000ms** entre requests (`reconnectCooldownRef`).
- SUBSCRIBED → `[REALTIME_STABLE]` sin reconnect.

**Riesgo residual a validar en runtime:** ráfagas de `CHANNEL_ERROR`/`TIMED_OUT` por re-mount del effect `[liveIsFollower, liveFollowerCode]`.

---

## Secuencia sospechosa (follower en live)

```
shared-session update (canción N)
  ∥
SUBSCRIBED (re-subscribe)
  → onFollowerRealtimeJoined
  → si bug orden: recoverySequenceKey usado antes de definir (línea ~1639) → comportamiento impredecible
  → handler(remote) si retain live OK
```

Ver `follower-pipeline.md` y defecto documentado en `root-cause-analysis.md`.

---

## Logs forenses existentes

| Tag | Archivo |
|-----|---------|
| `[REALTIME_EVENT]` | `realtimeReconnectGuard.ts` |
| `[REALTIME_RECONNECT_REQUEST]` | idem |
| `[REALTIME_RECONNECT_BLOCKED]` | idem |
| `[REALTIME_STABLE]` | idem |
| `[REALTIME_RECONNECT]` | `followerRecoveryLog.ts` |
| `[AUDIT_EVENT]` | `auditEventLog.ts` (FASE A) |
