# Live Session Status — mapa de transiciones (FASE 3)

Estado único: `LiveSessionStatus` en `SpectatorSessionContext` (los booleans legacy no se eliminan).

## Estados

| Estado | Significado |
|--------|-------------|
| `idle` | Sin sesión recuperable / limpiada |
| `detected` | Sesión en storage/DB, banner recovery, sin canal |
| `joining` | Intención de unirse / canal creándose |
| `subscribed` | Realtime `SUBSCRIBED` |
| `active` | Follower usable (`onFollowerRealtimeJoined`) o director listo |
| `passive` | `followDirector` desactivado (explorar libre) |
| `reconnecting` | `CHANNEL_ERROR`, `TIMED_OUT`, offline |
| `ended` | Director cerró sesión o fin explícito |

## Transiciones implementadas

```
idle
  → detected     refreshDetection / restore (solo setDetected)
  → joining      beginFollowerSession / beginDirectorSession / markExplicitJoin / volverASesion / restore follower auto

detected
  → joining      volverASesion / continuarSesionDirector (beginDirectorSession)
  → idle         refreshDetection null / hard clear / salir / leave

joining
  → subscribed   onRealtimeSubscribed (LiveSessionChannelHost SUBSCRIBED)
  → idle         leaveFollowerSession / hard clear
  → ended        endDirectorSession

subscribed
  → active       onFollowerRealtimeJoined (follower) | director onRealtimeSubscribed
  → reconnecting setIsReconnecting(true)
  → ended        completeFollowerSessionEndedByDirector

active
  → passive      ignorarSesion (follower) | passiveListenMode at join
  → reconnecting channel error / offline
  → ended        director end / follower session ended
  → idle         leaveFollowerSession / salirDeSesion

passive
  → active       (reservado FASE 4 — re-enable followDirector)
  → reconnecting / ended / idle (mismos que active)

reconnecting
  → subscribed   onRealtimeSubscribed tras re-SUBSCRIBED
  → active       onFollowerRealtimeJoined tras reconnect

ended
  → idle         leaveFollowerSession / hard clear / post navigate home
```

## Logs

Cada cambio: `[SESSION_STATUS] { from, to, reason }` vía `sessionStatusLog.ts`.
