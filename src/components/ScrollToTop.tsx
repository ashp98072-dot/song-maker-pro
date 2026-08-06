import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * Cada vez que cambia la ruta (incluido el id de la canción), sube al inicio.
 * Esencial para que al navegar entre canciones se empiece desde el primer verso.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Usamos 'auto' (instantáneo) para evitar mareos en navegación rápida en vivo
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
