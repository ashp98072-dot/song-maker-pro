/** Hide tab bar on worship / live focus screens so docks aren't crowded. */
export function shouldShowMobileTabBar(pathname: string): boolean {
  if (pathname.startsWith('/cancion/')) return false;
  if (pathname.startsWith('/setlist/') && pathname.includes('/live')) return false;
  if (pathname.startsWith('/unirse/')) return false;
  return true;
}
