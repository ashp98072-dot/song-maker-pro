/** Routes reachable without prior login (SEO / deep links). Auto-guest applies. */
export function isPublicAppPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '') return true;
  if (pathname.startsWith('/cancion/')) return true;
  if (pathname === '/comunidad' || pathname.startsWith('/comunidad/')) return true;
  if (pathname === '/perfil' || pathname.startsWith('/perfil/')) return true;
  if (pathname.startsWith('/unirse/')) return true;
  return false;
}
