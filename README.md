# Worship Transpose

Aplicación React para consultar canciones, transponer acordes, preparar listas y compartir sesiones en vivo. Incluye biblioteca comunitaria, importación administrativa de Holyrics/ChordPro y una guía inicial para usuarios nuevos.

## Desarrollo local

Usa Node.js 22, la versión configurada en CI, y npm con `package-lock.json`.

```sh
npm ci
```

Copia `.env.example` a `.env.local` y completa las variables de tu proyecto Supabase. En PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Vite utiliza el puerto 8080 por defecto; abre la dirección que indique la consola. La aplicación local usa el Supabase configurado: para pruebas de escritura utiliza un proyecto de pruebas.

El repositorio también conserva `bun.lock` y `bun.lockb`; CI usa npm. Su reconciliación está pendiente en el [plan de estabilización](docs/PLAN_ESTABILIZACION.md).

## Variables

| Variable | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto para el cliente |
| `VITE_SUPABASE_ANON_KEY` | Clave pública del cliente; también se admite el alias `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `VITE_YOUTUBE_API_KEY` | Opcional: búsqueda mediante YouTube Data API |
| `VITE_YOUTUBE_SEARCH_MODE`, `VITE_PIPED_API_BASE` | Configuración alternativa de búsqueda; ver `.env.example` |
| `VITE_PAYPAL_CLIENT_ID` | Cliente PayPal para donaciones; el código usa `sb` si no se configura |
| `SUPABASE_URL` | URL usada por las funciones SEO; acepta `VITE_SUPABASE_URL` como alternativa |
| `SUPABASE_SERVICE_ROLE_KEY` | Credencial exclusiva del servidor para el catálogo SEO |
| `SITE_URL` | Origen público para sitemap/prerender; por defecto `https://worshiptranspose.com` |

Las variables `VITE_*` forman parte del cliente distribuido. Nunca pongas una clave `service_role` en ellas. `.env.local` está excluido de Git. Las variables de diagnóstico de `.env.example` deben quedar sin configurar en producción normal.

## Comandos y controles

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run typecheck` | Chequeo TypeScript de aplicación, Vite y API |
| `npm run lint` | ESLint |
| `npm test` | Suite Vitest |
| `npm run test:watch` | Pruebas durante desarrollo |
| `npm run build` | Genera iconos PWA, comprueba tipos y construye `dist/` con service worker |
| `npm run preview` | Sirve el build local; no ejecuta las funciones Vercel de `api/` |
| `npm run sitemap` | Generación manual del sitemap; el despliegue Vercel usa `/api/sitemap` |

[GitHub Actions](.github/workflows/quality.yml) ejecuta `npm ci`, lint, pruebas y build en PRs y cambios a `main`. Las pruebas simuladas no confirman el funcionamiento de Supabase ni de dos dispositivos reales.

## Supabase y despliegue

La aplicación utiliza Auth, tablas con permisos y Realtime. Las migraciones están en `supabase/migrations/`, y los tipos del cliente en `src/integrations/supabase/types.ts`. No se ha validado que este historial baste para reconstruir una base nueva desde cero; antes de usarlo en otro proyecto hay que comprobar el esquema base y sus dependencias.

Para la importación administrativa se necesita `20260929190000_admin_import_songs.sql`. El administrador confirmó su aplicación al proyecto existente el 29 de septiembre de 2026; sigue pendiente una prueba completa de importación contra ese despliegue. Consulta [Holyrics](docs/HOLYRICS_IMPORT.md). El [tutorial inicial](docs/USER_TUTORIAL.md) guarda su avance en Auth y no necesita migración SQL.

El despliegue está configurado en [vercel.json](vercel.json): framework Vite, build `npm run build`, salida `dist/`, funciones en `api/` y rutas de SPA. Configura las variables para cada entorno de Vercel y las URLs permitidas de Auth del proyecto Supabase. Cambiar variables del cliente requiere un nuevo build.

Después del despliegue, comprueba navegación directa a canciones, login, `/sitemap.xml`, `/api/seo-status`, actualización de PWA y sincronización con dos sesiones. Usa la lista de [smoke tests](docs/SMOKE_TEST.md). La caché offline no reemplaza la conexión necesaria para sincronizar en vivo.

## Estructura y documentación

| Ruta | Responsabilidad |
| --- | --- |
| `src/pages/`, `src/components/` | Pantallas y componentes compartidos |
| `src/context/AppContext.tsx` | Identidad y estado de biblioteca/listas |
| `src/features/simple-live-sync/` | Proveedor y panel del flujo en vivo activo |
| `src/features/director-session/` | Utilidades compartidas y proveedor heredado todavía montado |
| `src/features/song-import/` | Lectores y guardado administrativo por lotes |
| `src/features/onboarding/` | Guía inicial y avance de la cuenta |
| `src/pwa/` | Funcionalidad de instalación y caché |
| `api/` | Sitemap, diagnóstico SEO y prerender de canciones |

- [Estado actual de sincronización](docs/LIVE_SYNC_CURRENT.md)
- [Plan de estabilización y resultados](docs/PLAN_ESTABILIZACION.md)
- [Importación Holyrics](docs/HOLYRICS_IMPORT.md)
- [Tutorial de usuarios](docs/USER_TUTORIAL.md)
- [Auditoría histórica](docs/runtime-audit/README.md)

Última suite verificada (7 de octubre de 2026): 285 pruebas; TypeScript y build/PWA pasan; lint tiene 0 errores y 0 advertencias. Quedan pendientes la revisión de supresiones históricas de lint, la unificación de proveedores, la reconstrucción de una base nueva y las comprobaciones conectadas/móviles del plan.

### Actualizar canciones desde el catálogo administrativo

Aplicar primero `supabase/migrations/20261007100000_admin_import_updates.sql`. En Importar catálogo, activar **Actualizar canciones existentes**, revisar letra/acordes/tono y seleccionar las filas (Todas permite seleccionar las omitidas previamente). Solo biblioteca actualiza la biblioteca del administrador; Publicar actualiza comunidad. Las coincidencias usan título y artista sin distinguir mayúsculas ni espacios exteriores. Varias coincidencias requieren revisión manual. Se conservan identificadores, atribución, enlaces y BPM cuando el archivo no los incluye. Las bibliotecas privadas de otras personas no se modifican.
La revisión de importación sugiere tonalidad a partir de las líneas de acordes, con confianza y alternativas. Las sugerencias requieren confirmación; las tonalidades explícitas de ChordPro se conservan. Los archivos ChordPro sin tono dejan el campo vacío en la revisión administrativa y no pueden guardarse hasta confirmarlo. La heurística no analiza audio y puede equivocarse en modulaciones o armonías ambiguas.

La pantalla incluye instrucciones para extraer ZIP en Windows y cargar hasta 20 archivos .chopro por lote. No requiere migración SQL.
