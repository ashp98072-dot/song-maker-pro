/** Routes reachable without prior login (SEO / deep links). Auto-guest applies. */
export function isPublicAppPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/cancion/')) return true;
  if (pathname === '/comunidad' || pathname.startsWith('/comunidad/')) return true;
  return false;
}
