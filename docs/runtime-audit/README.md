# FASE A — Runtime Forensic Audit

Auditoría **solo observabilidad** (sin fixes de comportamiento en esta fase).

## Documentos

| Archivo | Contenido |
|---------|-----------|
| [source-of-truth.md](./source-of-truth.md) | P1, P6 — quién cambia canción / prioridades |
| [realtime-flow.md](./realtime-flow.md) | P2, P4 — reconnect / canal realtime |
| [follower-pipeline.md](./follower-pipeline.md) | P5 — timeline follow 2→3 y ramas paralelas |
| [navigation-paths.md](./navigation-paths.md) | P3 — todos los `navigate` relevantes |
| [continuous-song-detection.md](./continuous-song-detection.md) | Director — detección canto X |
| [root-cause-analysis.md](./root-cause-analysis.md) | Casos 1–4 + entregable final |

## Instrumentación temporal

- Utilidad: `src/features/director-session/utils/auditEventLog.ts`
- Log unificado: `[AUDIT_EVENT]` con `timestamp`, `source`, `action`, `songId`, `remoteIndex`, `pathname`, `liveSessionStatus`, `reconnectState`

## Cómo capturar evidencia en dispositivo

1. Abrir DevTools → Console.
2. Filtrar: `AUDIT_EVENT` | `REALTIME_` | `FOLLOW_` | `DIRECTOR_SONG_`
3. Reproducir un caso (A/B/C) y exportar log.
4. Correlacionar `timestamp` entre director publish y follower receive.
