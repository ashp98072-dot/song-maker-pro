# Smoke Test — validación post-deploy (Vercel)

Modo observabilidad **sin cambiar UX** en producción normal.

## Activar diagnóstico

| Contexto | Panel UI | `window.__APP_DEBUG__` | Logs `[APP_DEBUG]` |
|----------|----------|------------------------|-------------------|
| Producción sin query | No | No | No |
| Producción `?debug=1` | Sí | Sí | Sí |
| `npm run dev` | Solo con `?debug=1` | Sí | Con `?debug=1` o consola |

Ejemplo tras deploy:

```
https://tu-app.vercel.app/?debug=1
https://tu-app.vercel.app/cancion/UUID?debug=1
```

Consola:

```js
await __APP_DEBUG__.refresh()
__APP_DEBUG__.log()
await __APP_DEBUG__.runNetworkProbes()
__APP_DEBUG__.listSmokeRoutes()
```

---

## 1. Rutas — checklist manual

Navegar cada ruta (con sesión si `auth: required`). Marcar en panel o consola.

| Ruta | Qué validar |
|------|-------------|
| `/` | Home carga; sin pantalla blanca |
| `/login` | Formulario visible; no redirect loop |
| `/auth/callback` | Tras OAuth real: redirige a `/`; sin crash |
| `/cancion/:id` | Lazy chunk OK; acordes; worship dock en móvil |
| `/favoritos` | Lista favoritos |
| `/listas` | Listas |
| `/setlist/:id/live` | Lazy chunk; dock setlist; sin 404 al refresh |
| `/comunidad` | Biblioteca comunidad |

**Criterios de éxito**

- Sin pantalla blanca
- Sin `ChunkLoadError` / `Failed to fetch dynamically imported module` (si ocurre → reload automático o botón en boundary)
- Refresh directo en URL profunda → `index.html` (Vercel rewrite), no 404 del servidor

---

## 2. PWA

En `?debug=1`, panel muestra:

- `registered`, `updateAvailable`, `activeScriptUrl` (versión SW)
- `cacheNames` (workbox)

**Manual**

1. Instalar PWA (Chrome → Instalar app)
2. Deploy nueva versión → abrir app → debe recargar (autoUpdate + `onNeedReload`)
3. DevTools → Application → Service Workers: un SW activo
4. Tras deploy, abrir `/cancion/:id` — chunks JS deben cargar (NetworkFirst en `/assets/*.js`)

---

## 3. Móvil — riesgos conocidos (solo auditar)

| Área | Riesgo | Mitigación actual |
|------|--------|-------------------|
| Portrait + worship dock | Dock puede tapar últimas líneas | `pb-28` en SongView; safe-area en `FloatingDockShell` |
| Landscape | Dock vertical derecha vs contenido | `data-worship-landscape`; `mobile-deploy.css` z-index |
| Fullscreen | Doble padding / dock visible | `isFullscreen` oculta worship dock |
| Mobile Stage + Worship | Solapamiento z-index | stage 125, worship 122, sheet 130 |
| Teclado virtual | Sheet/input puede quedar cortado | `max-h-[min(90vh,...)]` + safe-area en sheet |
| Continuous setlist dock | Altura fija + scroll | `continuous-setlist.css` padding-bottom |

No cambiar UX en smoke; solo reportar si algo falla en dispositivo real.

---

## 4. Resiliencia de red (manual)

| Escenario | Cómo simular | Comportamiento esperado |
|-----------|--------------|-------------------------|
| Supabase fail | DevTools offline o env inválida | `EnvironmentErrorScreen` antes de mount; stub no crash en import |
| YouTube fail | Sin `VITE_YOUTUBE_API_KEY` | Provider Piped; búsqueda degradada, no white screen |
| Offline | Network offline | PWA shell; datos en caché limitada; Supabase falla gracefully |
| Chunk fail | SW cache viejo tras deploy | Reload global en `main.tsx`; `ChunkLoadErrorBoundary` con botón |

Probes automáticos (no destructivos): `await __APP_DEBUG__.runNetworkProbes()`

---

## 5. Variables Vercel

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_YOUTUBE_API_KEY` (opcional)

Panel `env.ready` debe ser `true` en producción con `?debug=1`.

---

## 6. Diagnóstico avanzado (no usar en prod normal)

- `VITE_RENDER_DIAG_STAGE=0..6` — aislar árbol React
- `VITE_YT_DIAG_STAGE=0..3` — aislar YouTube / mobile stage

Omitir o `99` en deploy real.
