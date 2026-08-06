export function sectionSyncLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[SECTION_SYNC] ${message}`, detail);
  } else {
    console.log(`[SECTION_SYNC] ${message}`);
  }
}

export function sectionApplyLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[SECTION_APPLY] ${message}`, detail);
  } else {
    console.log(`[SECTION_APPLY] ${message}`);
  }
}
