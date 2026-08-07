import { Link, useLocation } from 'react-router-dom';
import { Home, Globe, ListMusic, User, Library } from 'lucide-react';

const tabs = [
  { label: 'Inicio', path: '/', match: (p: string) => p === '/', icon: Home },
  {
    label: 'Comunidad',
    path: '/comunidad',
    match: (p: string) => p.startsWith('/comunidad'),
    icon: Globe,
  },
  {
    label: 'Listas',
    path: '/listas',
    match: (p: string) => p === '/listas' || p.startsWith('/lista/'),
    icon: ListMusic,
  },
  {
    label: 'Acordes',
    path: '/acordes',
    match: (p: string) => p.startsWith('/acordes'),
    icon: Library,
  },
  {
    label: 'Perfil',
    path: '/perfil',
    match: (p: string) => p === '/perfil' || p.startsWith('/perfil/'),
    icon: User,
  },
] as const;

/** Hide tab bar on worship / live focus screens so docks aren't crowded. */
export function shouldShowMobileTabBar(pathname: string): boolean {
  if (pathname.startsWith('/cancion/')) return false;
  if (pathname.startsWith('/setlist/') && pathname.includes('/live')) return false;
  if (pathname.startsWith('/unirse/')) return false;
  return true;
}

export default function MobileBottomTabBar() {
  const { pathname } = useLocation();

  if (!shouldShowMobileTabBar(pathname)) return null;

  return (
    <nav
      data-mobile-tab-bar
      className="fixed inset-x-0 bottom-0 z-[60] lg:hidden border-t border-border bg-background/95 backdrop-blur-md app-tab-bar-safe"
      aria-label="Navegación principal"
    >
      <ul className="grid grid-cols-5 h-[var(--app-tab-bar-height,3.25rem)] max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.path} className="min-w-0">
              <Link
                to={tab.path}
                className={`flex flex-col items-center justify-center gap-0.5 h-full px-1 transition-colors ${
                  active ? 'text-gold' : 'text-muted-foreground active:text-foreground'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <tab.icon
                  className={`w-5 h-5 shrink-0 ${active ? 'stroke-[2.25]' : ''}`}
                  aria-hidden
                />
                <span className="text-[10px] font-semibold leading-none truncate max-w-full">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
