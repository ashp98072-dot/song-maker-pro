export function mobileUiLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[MOBILE_UI] ${message}`, detail);
  } else {
    console.log(`[MOBILE_UI] ${message}`);
  }
}
