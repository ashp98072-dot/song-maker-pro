/** Rutas críticas para smoke test manual tras deploy (ver docs/SMOKE_TEST.md). */
export const SMOKE_TEST_ROUTES = [
  { path: '/', label: 'Inicio / biblioteca', auth: 'required' as const },
  { path: '/login', label: 'Login', auth: 'public' as const },
  { path: '/auth/callback', label: 'Auth OAuth callback', auth: 'public' as const },
  { path: '/cancion/:id', label: 'Vista canción (lazy chunk)', auth: 'required' as const },
  { path: '/favoritos', label: 'Favoritos', auth: 'required' as const },
  { path: '/listas', label: 'Listas', auth: 'required' as const },
  { path: '/setlist/:id/live', label: 'Setlist continuo (lazy)', auth: 'required' as const },
  { path: '/comunidad', label: 'Biblioteca comunidad', auth: 'required' as const },
] as const;
