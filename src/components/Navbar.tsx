import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Heart,
  ListMusic,
  Plus,
  LogOut,
  ChevronDown,
  Globe,
  Heart as HeartIcon,
  Sun,
  Moon,
  User,
  Library,
  AudioLines,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useState, useRef, useEffect, useCallback } from 'react';
import logoUrl from '@/assets/worship-transpose-logo.png';
import { getRenderDiagStage } from '@/renderDiag';
import { useTheme } from '@/context/ThemeContext';
import {
  fetchOwnAvatarUrl,
  PROFILE_UPDATED_EVENT,
} from '@/features/profile/profileApi';

const navItems = [
  { label: 'Inicio', path: '/', icon: Home },
  { label: 'Favoritos', path: '/favoritos', icon: Heart },
  { label: 'Mis Listas', path: '/listas', icon: ListMusic },
  { label: 'Comunidad', path: '/comunidad', icon: Globe },
  { label: 'Acordes', path: '/acordes', icon: Library },
  { label: 'Agregar', path: '/agregar', icon: Plus },
];

export default function Navbar() {
  const location = useLocation();
  const { userName, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const refreshAvatar = useCallback(() => {
    void fetchOwnAvatarUrl().then(setAvatarUrl).catch(() => setAvatarUrl(null));
  }, []);

  useEffect(() => {
    const s = getRenderDiagStage();
    if (s >= 3 && s <= 6) {
      console.log('[RENDER] Navbar');
    }
  }, []);

  useEffect(() => {
    refreshAvatar();
    const onUpdated = () => refreshAvatar();
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdated);
  }, [refreshAvatar, userName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm app-navbar-safe">
      <div className="container flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 min-w-0 shrink-0">
          <img
            src={logoUrl}
            alt="Worship Transpose"
            className="w-9 h-9 rounded-full object-cover ring-1 ring-gold/40"
          />
          <span className="font-display font-bold text-foreground hidden sm:inline truncate">
            Worship Transpose
          </span>
        </Link>

        {/* Desktop: full top nav. Mobile: bottom tab bar (Facebook-style). */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const active =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'text-gold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            to="/agregar"
            className="lg:hidden p-2 rounded-lg border border-border text-muted-foreground hover:text-gold transition-colors"
            aria-label="Agregar canción"
            title="Agregar"
          >
            <Plus className="w-4 h-4" />
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-gold transition-colors"
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            to="/donaciones"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold shadow-md hover:opacity-90 hover:shadow-lg transition-all active:scale-[0.98]"
            aria-label="Donar"
          >
            <HeartIcon className="w-4 h-4" fill="currentColor" />
            <span className="hidden md:inline">Donar</span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-foreground font-semibold text-xs ring-1 ring-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">{userName}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg bg-card border border-border shadow-lg py-1 z-50">
                <Link
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <User className="w-4 h-4" /> Mi perfil
                </Link>
                <Link
                  to="/acordes"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Library className="w-4 h-4" /> Biblioteca de acordes
                </Link>
                <Link
                  to="/afinador"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <AudioLines className="w-4 h-4" /> Afinador
                </Link>
                <Link
                  to="/agregar"
                  onClick={() => setMenuOpen(false)}
                  className="lg:hidden w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar canción
                </Link>
                <Link
                  to="/donaciones"
                  onClick={() => setMenuOpen(false)}
                  className="sm:hidden w-full flex items-center gap-2 px-3 py-2 text-sm text-gold hover:bg-secondary transition-colors font-medium"
                >
                  <HeartIcon className="w-4 h-4" fill="currentColor" /> Donar
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
