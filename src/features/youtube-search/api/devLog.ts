export function youtubeSearchLog(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  const label = `[YT] ${message}`;
  if (detail !== undefined) {
    console.info(label, detail);
  } else {
    console.info(label);
  }
}

export function youtubeSearchError(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  const label = `[YT] ${message}`;
  if (detail !== undefined) {
    console.error(label, detail);
  } else {
    console.error(label);
  }
}
