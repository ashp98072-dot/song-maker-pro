# Plan de consistencia técnica

Fecha: 2026-09-23. Estabilización progresiva conservando el comportamiento del producto.

## Diagnóstico inicial

- 61 archivos de pruebas: 217 pruebas pasan y 1 falla por esperar Follow V3 activo.
- ESLint: 39 errores y 70 advertencias.
- TypeScript falla en contratos de datos, navegación, temporizadores y pruebas.
- Simple Live Sync está activo; el proveedor antiguo sigue montado por dependencias de las páginas. Follow V3 está desactivado.
- El build solo ejecuta Vite. El README es una plantilla.
- No se ha validado Supabase desplegado ni una sesión real entre dispositivos.

## 1. Estabilizar tipos y pruebas — validado localmente

- [x] Incorporar `npm run typecheck` para reproducir el diagnóstico.
- [x] Importar `writeFollowDirector`, usado por el contexto de espectadores.
- [x] Corregir el contrato del parser de canciones de listas públicas.
- [x] Sustituir la prueba de bandera V3 y la prueba de mock por pruebas del hook real.
- [x] Corregir contratos de navegación, recuperación, origen de sesión y payloads JSON.
- [x] Corregir estrechamiento de tipos, temporizadores del navegador y fixtures de pruebas.
- [x] Verificar también configuración Vite y endpoints API con configuraciones TypeScript adecuadas.
- [x] Incorporar el chequeo de tipos al build y a CI una vez esté limpio.

Cierre: pruebas, tipos y build pasan sin ocultar errores mediante `any`, exclusiones o supresiones generales.

## 2. Limpiar lint y definir controles

- [x] Resolver los errores empezando por módulos activos y datos externos.
- [ ] Revisar dependencias de hooks individualmente, comprobando reconexiones y bucles.
- [ ] Resolver o justificar individualmente las advertencias restantes.
- [ ] Elegir un gestor de paquetes y reconciliar lockfiles tras revisar el despliegue.
- [ ] Introducir opciones estrictas de TypeScript gradualmente.

Cierre: lint sin errores, advertencias resueltas o justificadas e instalación reproducible.

## 3. Unificar sincronización en vivo

- [x] Documentar el flujo Simple Live Sync y la dependencia restante del contexto antiguo; detalle en LIVE_SYNC_CURRENT.md.
- [ ] Cubrir crear, unirse, publicar, abandonar, reconectar y cambiar canción/lista.
- [ ] Definir una autoridad para estado remoto, navegación y persistencia.
- [ ] Migrar consumidores antiguos mediante adaptadores pequeños y verificables.
- [ ] Retirar Follow V3 y el proveedor antiguo cuando no tengan consumidores necesarios.
- [ ] Validar director y seguidor en dos sesiones con cambios rápidos y pérdida de conexión.

Cierre: una implementación activa, sin publicaciones duplicadas ni navegación competidora, verificada entre sesiones reales.

## 4. Dividir módulos grandes

- [ ] Extraer navegación, preferencias y aplicación/publicación de estado remoto de las páginas.
- [ ] Separar UI, persistencia y transporte mediante contratos explícitos.
- [ ] Dividir SongViewPage, ContinuousSetlistPage y el contexto restante por responsabilidad.
- [ ] Consolidar utilidades duplicadas tras comparar sus comportamientos.

Cierre: responsabilidades separadas y pruebas de comportamiento intactas. Evitar refactors masivos simultáneos a cambios funcionales.

## 5. Documentación y validación de entrega

- [x] Reemplazar README con instalación, variables, comandos, arquitectura y despliegue.
- [ ] Actualizar auditorías distinguiendo flujo actual de antecedentes históricos.
- [ ] Documentar migraciones y comprobar preparación de una base nueva.
- [ ] Validar login, biblioteca, listas, comunidad, transposición y sincronización.
- [ ] Validar PWA: actualización, navegación directa y caché entre usuarios al cerrar sesión.
- [ ] Completar validación móvil y offline de docs/SMOKE_TEST.md.

Cierre: configuración reproducible y evidencias de pruebas locales y conectadas. Registrar validaciones que requieran credenciales o dispositivos no disponibles.

## Primer bloque

Correcciones pequeñas del parser y la importación del contexto, pruebas reales del hook V3 y comando de tipos. El chequeo permanece independiente del build mientras se resuelven los errores restantes. Las banderas de producción se conservan.

Resultados: 61 archivos y 219 pruebas pasan. TypeScript conserva 57 errores; desaparecieron los cuatro diagnósticos del parser y de la importación faltante. `git diff --check` pasa. La etapa 1 sigue abierta; aún no se ha validado el build ni el comportamiento entre dispositivos.


## Segundo bloque

Los 57 errores pendientes de la aplicación quedaron resueltos. Se corrigió además el entorno de tipos de los callbacks de navegador en Vite y se agregó un chequeo estricto para los endpoints API. El build normal y el de desarrollo ejecutan los tres chequeos. GitHub Actions ejecuta instalación, pruebas y build en PRs y pushes a main.

Validación local: 219 pruebas pasan; chequeos de aplicación, Vite y API pasan; build de producción y generación de PWA pasan. Vite conserva advertencias por módulos importados tanto estática como dinámicamente. ESLint conserva 39 errores y 70 advertencias; su limpieza corresponde a la etapa 2. La sincronización entre dispositivos todavía requiere validación conectada.


## Tercer bloque: errores de lint

Resueltos los 39 errores sin desactivar reglas. Tipos del esquema para canciones y canales Supabase; validación de mapas locales y respuestas SEO; manejo de errores desconocidos; setters de ajustes estables y tipados; limpieza de interfaces vacías, regex e importación Tailwind. Los eventos Realtime sin song_id ya no producen una canción vacía.

Validación: 230 pruebas de la suite completa y 2 pruebas adicionales del catálogo SEO pasan (232 en total); chequeo de tipos y build de producción/PWA pasan. Lint pasa con 0 errores y 62 advertencias. CI ahora ejecuta lint antes de pruebas/build.

La etapa 2 permanece abierta. Pendientes: 47 advertencias de dependencias de hooks, 14 de Fast Refresh y una directiva de lint innecesaria. Revisar primero los hooks del flujo activo con pruebas de reconexión, después los proveedores heredados y exportaciones compartidas. No se han desactivado advertencias ni validado sesiones reales entre dispositivos.

## Cuarto bloque: ciclo de vida del canal activo

El proveedor Simple Live Sync limpia el canal, heartbeat y temporizadores al desmontarse. Los callbacks de canales reemplazados no pueden modificar la sesión vigente; la suscripción comprueba su vigencia también después de operaciones asíncronas. Una conexión pendiente cancelada se distingue de un fallo para no borrar la sesión que la reemplaza. Los timeouts liberan el canal y la reconexión limpia el error anterior.

La deduplicación de publicaciones compara toda la lista de canciones, de modo que los cambios de orden no se pierden cuando coinciden la longitud y la primera canción. Los hooks públicos se separaron del proveedor para Fast Refresh. Se estabilizó el estado de ruta vacío y se retiró una dependencia redundante del observador de scroll.

Diez pruebas nuevas cubren estos comportamientos con canales simulados; las primeras seis reprodujeron fallos antes de la corrección. Validación del 2026-09-28: 242 pruebas pasan en 65 archivos; lint reporta 0 errores y 56 advertencias (seis menos). La validación entre dispositivos y las demás advertencias siguen pendientes; estas pruebas no sustituyen una prueba conectada a Supabase.

TypeScript, build de producción y generación PWA también pasan. Se conservan las advertencias de Vite por importaciones estáticas y dinámicas de los mismos módulos.

### Ampliación: callbacks de páginas y transposición

Se corrigieron las dependencias de navegación, recuperación y preferencias en SongViewPage. El registro de callbacks de DirectorSession conserva una suscripción y utiliza las funciones más recientes; cambiar un callback ya no vuelve a disparar el registro y la recuperación. El cierre por evento utiliza la función actual. ContinuousSongBlock vuelve a leer la transposición persistida al renderizar, incluido el reinicio a cero.

Cuatro pruebas adicionales cubren renovación de callbacks, activación/limpieza, preferencias de notificación y transposición persistida. Validación local del 2026-09-28: 246 pruebas en 67 archivos; lint con 0 errores y 43 advertencias. SongViewPage y ContinuousSongBlock quedan sin advertencias de hooks. Se mantiene pendiente la validación conectada y la limpieza de los proveedores heredados.

## Quinto bloque: límites de Fast Refresh en UI

Las variantes compartidas de Button y Toggle y la regla de visibilidad de la barra móvil se trasladaron a módulos independientes; sus consumidores importan desde esos módulos. Se retiraron exportaciones sin consumidores de Badge, NavigationMenu y Sonner. Los estilos y la regla de visibilidad se conservan.

ESLint pasa con 0 errores y 37 advertencias (seis menos). Este bloque no cambia los proveedores de sincronización; quedan pendientes sus advertencias de hooks, los demás límites de Fast Refresh y la validación entre dispositivos.

## Sexto bloque: importación administrativa Holyrics

Implementado lector de datos Java para .muf/.mufl, integrado con revisión y selección previa. Se preservan título, artista y letra; no se inventan acordes. La muestra de 666 registros contiene 663 canciones válidas, 3 incompletas y 2 posibles duplicados por título/artista.

Guardado en lotes de diez mediante RPC exclusiva de administrador, con deduplicación, progreso, errores por canción y reintentos de pendientes. Pruebas locales: 259 pruebas pasan; lint sin errores y con las mismas 37 advertencias. La función SQL pasó pruebas aisladas de autorización, duplicados y rollback.

La migración admin_import_songs debe aplicarse antes de desplegar. No se ha aplicado a Supabase remoto ni publicado el catálogo de ejemplo. Detalles y límites en HOLYRICS_IMPORT.md.

## Octavo bloque: dependencias de la vista continua (2026-10-02)

Se corrigieron siete advertencias en ContinuousSetlistPage: referencias al estado estable de desplazamiento, código de sesión en navegación, diagnóstico del listener de scroll y catálogo al desactivar seguimiento. Se retiró la dependencia de genderShift del botón de salida, que no la utiliza. El estado landing ya está memoizado, por lo que incluirlo en el reinicio no agrega reinicios por render.

Lint pasa con 0 errores y 30 advertencias. Quedan cinco advertencias en esta página, relacionadas con aplicación/recuperación del estado remoto y efectos de seguimiento; requieren una revisión separada de su ciclo de vida. La validación entre dispositivos continúa pendiente.

Validación local: 266 pruebas en 71 archivos, TypeScript y build de producción/PWA pasan. Se conservan las advertencias de Vite por importaciones estáticas y dinámicas.

## Noveno bloque: opciones de hooks Follow V3 (2026-10-02)

Los hooks de montaje de ruta y recepción del seguidor desestructuran las opciones que usan, de modo que sus dependencias describen esos valores sin depender del objeto completo. Se corrigen tres advertencias. Follow V3 sigue desactivado en producción.

Tres pruebas adicionales cubren la ausencia de reintentos con V3 desactivado, la conservación del plazo al recrear opciones equivalentes y la cancelación al desmontar o salir del modo seguidor. La suite pasa con 269 pruebas en 72 archivos. Lint: 0 errores y 27 advertencias. La validación conectada sigue pendiente.

## Décimo bloque: tema compartido de notificaciones (2026-10-02)

Sonner leía el tema desde next-themes aunque la aplicación usa un proveedor propio. Ahora comparte el mismo contexto que Navbar, de modo que las notificaciones reciben la elección claro/oscuro. El hook/contexto se separa del componente proveedor para Fast Refresh; las rutas de diagnóstico también reciben el proveedor.

Tres pruebas cubren tema persistido, alternancia y cambios procedentes de otra pestaña. Pasan 272 pruebas en 73 archivos. Lint: 0 errores y 26 advertencias. La comprobación visual en dispositivos reales queda pendiente.

## Undécimo bloque: límites de Fast Refresh (2026-10-05)

El contexto y useApp se trasladaron a un módulo propio; AppProvider mantiene su implementación y todos los consumidores y mocks usan la nueva ruta del hook. Form y Sidebar dejan de exportar hooks sin consumidores externos, conservándolos internamente.

Se resuelven tres advertencias: lint con 0 errores y 23 advertencias. Pasan 272 pruebas en 73 archivos. No se modifican los flujos de autenticación, persistencia o sincronización.

## Duodécimo bloque: contexto de espectadores (2026-10-05)

El contrato, el contexto y los hooks useSpectatorSession/useSpectatorSessionOptional pasan a un módulo independiente. El proveedor conserva su lógica y los consumidores y el índice público usan las nuevas exportaciones. Se resuelven las dos advertencias restantes de Fast Refresh.

Validación: 272 pruebas en 73 archivos; lint con 0 errores y 21 advertencias, todas de dependencias de hooks. TypeScript y build/PWA pasan. Siguen pendientes la revisión del ciclo de vida heredado y las pruebas conectadas entre dispositivos.

## Decimotercer bloque: ciclo de vida de publicación (2026-10-06)

useLiveSessionBroadcast cancela el temporizador pendiente y descarta overrides al desmontarse. Una prueba reprodujo el temporizador sin limpiar antes del cambio; otra verifica que un render conserve el plazo y publique el estado más reciente. Se declaran tres dependencias de broadcastStateRef, cuya identidad permanece estable entre renders.

Validación: 274 pruebas en 74 archivos; lint con 0 errores y 18 advertencias. TypeScript y build/PWA pasan. Este bloque cubre el hook del proveedor heredado; no activa Follow V3 ni sustituye las pruebas conectadas entre dispositivos.
