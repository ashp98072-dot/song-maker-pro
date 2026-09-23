/** Extract a readable message from Error instances and API error objects. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return typeof error.message === 'string' && error.message ? error.message : fallback;
  }
  return fallback;
}
