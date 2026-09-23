# Plan de consistencia técnica

Fecha: 2026-09-23. Estabilización progresiva conservando el comportamiento del producto.

## Diagnóstico inicial

- 61 archivos de pruebas: 217 pruebas pasan y 1 falla por esperar Follow V3 activo.
- ESLint: 39 errores y 70 advertencias.
- TypeScript falla en contratos de datos, navegación, temporizadores y pruebas.
- Simple Live Sync está activo; el proveedor antiguo sigue montado por dependencias de las páginas. Follow V3 está desactivado.
- El build solo ejecuta Vite. El README es una plantilla.
- No se ha validado Supabase desplegado ni una sesión real entre dispositivos.

## 1. Estabilizar tipos y pruebas — en curso

- [x] Incorporar `npm run typecheck` para reproducir el diagnóstico.
- [x] Importar `writeFollowDirector`, usado por el contexto de espectadores.
- [x] Corregir el contrato del parser de canciones de listas públicas.
- [x] Sustituir la prueba de bandera V3 y la prueba de mock por pruebas del hook real.
- [ ] Corregir contratos de navegación, recuperación, origen de sesión y payloads JSON.
- [ ] Corregir estrechamiento de tipos, temporizadores del navegador y fixtures de pruebas.
- [ ] Verificar también configuración Vite y endpoints API con configuraciones TypeScript adecuadas.
- [ ] Incorporar el chequeo de tipos al build y a CI una vez esté limpio.

Cierre: pruebas, tipos y build pasan sin ocultar errores mediante `any`, exclusiones o supresiones generales.

## 2. Limpiar lint y definir controles

- [ ] Resolver los errores empezando por módulos activos y datos externos.
- [ ] Revisar dependencias de hooks individualmente, comprobando reconexiones y bucles.
- [ ] Resolver o justificar individualmente las advertencias restantes.
- [ ] Elegir un gestor de paquetes y reconciliar lockfiles tras revisar el despliegue.
- [ ] Introducir opciones estrictas de TypeScript gradualmente.

Cierre: lint sin errores, advertencias resueltas o justificadas e instalación reproducible.

## 3. Unificar sincronización en vivo

- [ ] Documentar el flujo Simple Live Sync y consumidores restantes del contexto antiguo.
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

- [ ] Reemplazar README con instalación, variables, comandos, arquitectura y despliegue.
- [ ] Actualizar auditorías distinguiendo flujo actual de antecedentes históricos.
- [ ] Documentar migraciones y comprobar preparación de una base nueva.
- [ ] Validar login, biblioteca, listas, comunidad, transposición y sincronización.
- [ ] Validar PWA: actualización, navegación directa y caché entre usuarios al cerrar sesión.
- [ ] Completar validación móvil y offline de docs/SMOKE_TEST.md.

Cierre: configuración reproducible y evidencias de pruebas locales y conectadas. Registrar validaciones que requieran credenciales o dispositivos no disponibles.

## Primer bloque

Correcciones pequeñas del parser y la importación del contexto, pruebas reales del hook V3 y comando de tipos. El chequeo permanece independiente del build mientras se resuelven los errores restantes. Las banderas de producción se conservan.

Resultados: 61 archivos y 219 pruebas pasan. TypeScript conserva 57 errores; desaparecieron los cuatro diagnósticos del parser y de la importación faltante. `git diff --check` pasa. La etapa 1 sigue abierta; aún no se ha validado el build ni el comportamiento entre dispositivos.
