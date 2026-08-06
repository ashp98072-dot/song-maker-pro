/**
 * Diagnóstico pantalla blanca / integración YouTube (TEMPORAL).
 *
 * En `.env` local:
 *
 * ```
 * # Omitir o 99 = todo activo (producción)
 * VITE_YT_DIAG_STAGE=0
 * ```
 *
 * Etapas:
 * - **0** — Solo contenido principal (acordes, transpose, rehearsal sin smart picker ni dock móvil ni peek).
 * - **1** — + `MobileStageDock` (+ `FloatingDockShell` interno).
 * - **2** — + `MobileStageYouTubePeek`.
 * - **3** — + `YouTubeQuickPicker` lazy / `useYouTubeSearch` / API al abrir selector.
 *
 * Tras `npm run dev`, sube el número hasta encontrar la etapa que vuelve a romper.
 */

export function getYtDiagStage(): number {
  const raw = import.meta.env.VITE_YT_DIAG_STAGE;
  if (raw === undefined || raw === '') return 99;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 99;
}

/** Dock inferior modo escenario (incluye FloatingDockShell). */
export function ytDiagDockEnabled(): boolean {
  return getYtDiagStage() >= 1;
}

/** Peek flotante de video en mobile stage. */
export function ytDiagPeekEnabled(): boolean {
  return getYtDiagStage() >= 2;
}

/** Selector rápido lazy + búsqueda API al abrir (solo etapas diag ≥3). */
export function ytDiagPickerEnabled(): boolean {
  return isYoutubeQuickPickerAvailable();
}

/**
 * Producción (etapa 99) y diag ≥3: selector disponible.
 * Solo etapas de aislamiento 0–2 lo desactivan.
 */
export function isYoutubeQuickPickerAvailable(): boolean {
  const stage = getYtDiagStage();
  if (stage === 99) return true;
  if (stage >= 0 && stage <= 2) return false;
  return true;
}

export function ytDiagLog(...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  console.log('[YT]', ...args);
}
