# Sincronización activa — 2 de octubre de 2026

El punto de entrada es `src/components/AppLayout.tsx`. Con las banderas actuales de `src/config/features.ts`, `SIMPLE_LIVE_SYNC` está activo y `USE_FOLLOW_V3` desactivado.

`SimpleLiveSyncProvider` envuelve al proveedor heredado `SpectatorSessionProvider`. Este último sigue montado porque las páginas consumen su contexto; la bandera simple desactiva su auto-restauración y el montaje de `LiveSessionChannelHost`. Por tanto, la presencia de código V3 en el repositorio no significa que sea la implementación activa.

## Recorrido principal

1. `SimpleLiveSyncPanel` conecta el estado de la página con el proveedor simple.
2. Al crear una sesión, el proveedor verifica autenticación, desactiva sesiones previas y persiste la nueva mediante utilidades RPC de `director-session`.
3. Al unirse, comprueba que el código identifica una sesión activa antes de suscribirse al canal.
4. El transporte usa Supabase Realtime: broadcasts de estado, petición de snapshot y cierre; también registra presencia. El director publica canción, lista, índice, vista, transposición y posición compartida mediante `SimpleLiveState`.
5. El proveedor recibe el estado; los consumidores de página aplican navegación y presentación. El transporte por sí solo no elimina las decisiones de seguimiento de las páginas.
6. La deduplicación compara toda la lista, no solo su longitud o primera canción. Las suscripciones reemplazadas se invalidan y el desmontaje limpia canal, heartbeat y temporizadores.
7. El recordatorio simple permite ofrecer reanudación; no equivale a demostrar que una sesión sigue activa. La persistencia heredada se limpia al arrancar para evitar restauraciones competidoras.

## Límites y trabajo pendiente

Las pruebas de `SimpleLiveSyncContext.test.tsx` usan canales simulados para comprobar deduplicación, limpieza, cancelación, callbacks tardíos, timeouts y reconexión. No sustituyen una prueba con dos clientes conectados al Supabase desplegado.

No retirar todavía `director-session`: además del contexto, el flujo simple reutiliza autenticación, persistencia y utilidades de códigos de sesión. La migración pendiente debe separar esas dependencias de las rutas heredadas y comprobar cada consumidor antes de eliminarlo.

Para validar una entrega, usar dos cuentas/sesiones: crear y unirse, cambiar canciones y orden de lista, modificar tonalidad/vista, abandonar, perder conexión, reconectar y cerrar la sesión. Registrar el resultado real; el plan no marca estas comprobaciones como completadas.

La [auditoría runtime anterior](runtime-audit/README.md) describe rutas y problemas investigados en otra etapa. Para decidir qué se ejecuta ahora, contrastar siempre las banderas, `AppLayout`, el proveedor simple y los consumidores actuales.
