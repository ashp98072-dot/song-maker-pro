import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { VocalRangeTestPanel } from '@/features/vocal-test';

export default function VocalRangeTestPage() {
  return (
    <div className="container max-w-lg px-4 py-6 pb-24">
      <Link
        to="/perfil"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Perfil
      </Link>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Test de registro vocal</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Descubre si eres soprano, tenor, etc. Luego aplica “Mi voz” en cualquier canción para
        ajustar la tesitura.
      </p>
      <div className="glass-card p-4 sm:p-5">
        <VocalRangeTestPanel />
      </div>
    </div>
  );
}
