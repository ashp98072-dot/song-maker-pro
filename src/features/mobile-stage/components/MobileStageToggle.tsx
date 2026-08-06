import { MonitorSmartphone } from 'lucide-react';

interface MobileStageToggleProps {
  active: boolean;
  onToggle: () => void;
}

/** Visible solo en móvil/tablet (el padre controla render). */
export function MobileStageToggle({ active, onToggle }: MobileStageToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-mobile-stage-toggle
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all active:scale-95 ${
        active
          ? 'border-gold bg-gold/15 text-gold shadow-[0_0_12px_rgba(212,175,55,0.25)]'
          : 'border-border bg-secondary/60 text-muted-foreground'
      }`}
      title={active ? 'Salir del modo escenario' : 'Modo escenario para músicos'}
      aria-pressed={active}
    >
      <MonitorSmartphone className="w-4 h-4" />
      {active ? 'Escenario ON' : 'Escenario'}
    </button>
  );
}
