/**
 * Aislamiento del árbol React (TEMPORAL).
 *
 * En `.env.local`:
 * ```
 * # 0–6 = etapas de diagnóstico; omitir o 99 = app normal
 * VITE_RENDER_DIAG_STAGE=0
 * ```
 *
 * Etapas:
 * - **0** — Solo bloque negro “APP ROOT OK” (sin Router ni providers).
 * - **1** — + BrowserRouter mínimo.
 * - **2** — + providers + shell tipo layout **sin** Navbar (solo Outlet).
 * - **3** — + AppLayout real (Navbar + VisitedSongsRegistrar).
 * - **4** — + HomePage en `/`.
 * - **5** — + SongViewPage en `/cancion/:id` (ir manualmente a un id válido).
 * - **6** — Igual que 5; abrir selector YouTube en la UI para cargar lazy chunk.
 */

export function getRenderDiagStage(): number {
  const raw = import.meta.env.VITE_RENDER_DIAG_STAGE;
  if (raw === undefined || raw === '') return 99;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 99;
}

/** Entre 0 y 6 = diag; 99 producción */
export function isRenderDiagMode(): boolean {
  const s = getRenderDiagStage();
  return s < 99;
}
