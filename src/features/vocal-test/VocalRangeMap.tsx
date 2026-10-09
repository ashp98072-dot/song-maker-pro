import { VOCAL_REGISTERS, type VocalRegister } from '@/utils/vocalRange';
import { midiNoteLabel } from './vocalTestMath';
import { latinPitchLabel } from '@/features/tuner/tunerFeedback';

export function VocalRangeMap({ low, high, selected }: {
  low: number | null; high: number | null; selected?: VocalRegister;
}) {
  const measured = low != null && high != null;
  const start = Math.min(41, low ?? 41, high ?? 41);
  const end = Math.max(84, low ?? 84, high ?? 84);
  const position = (midi: number) => ((midi - start) / (end - start)) * 100;
  const bounds = (a: number, b: number) => ({
    left: `${position(Math.min(a, b))}%`, width: `${position(Math.max(a, b)) - position(Math.min(a, b))}%`,
  });
  return (
    <details className="rounded-xl border border-border bg-secondary/20 p-3 mt-4" open={measured || undefined}>
      <summary className="text-sm font-semibold cursor-pointer">Mapa de registros de voz</summary>
      <p className="text-xs text-muted-foreground mt-2 mb-3">
        Compara tus notas cómodas con los rangos de referencia de la app. Se superponen: el resultado es orientativo.
      </p>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
        <span>← Más grave</span><span>Más agudo →</span>
      </div>
      {measured && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gold mb-1">Tu rango medido: {latinPitchLabel(midiNoteLabel(low!))} – {latinPitchLabel(midiNoteLabel(high!))}</p>
          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 items-center">
            <span className="text-xs font-bold text-gold">Tu voz</span>
            <div className="relative h-3 rounded bg-secondary overflow-hidden" aria-label={`Tu rango medido: ${midiNoteLabel(low!)} a ${midiNoteLabel(high!)}`}>
              <span className="absolute h-full rounded bg-gold min-w-[2px]" style={bounds(low!, high!)} />
            </div>
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {[...VOCAL_REGISTERS].reverse().map((register) => (
          <li key={register.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 items-center">
            <span className={`text-xs ${selected === register.id ? 'text-gold font-bold' : 'text-muted-foreground'}`}>
              {register.label}{selected === register.id ? ' ✓' : ''}
            </span>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{latinPitchLabel(midiNoteLabel(register.rangeLow))} – {latinPitchLabel(midiNoteLabel(register.rangeHigh))}</p>
              <div className="h-2 relative rounded bg-secondary overflow-hidden">
                <span className={`absolute h-full rounded ${selected === register.id ? 'bg-gold' : 'bg-muted-foreground/50'}`} style={bounds(register.rangeLow, register.rangeHigh)} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {selected && <p className="text-xs text-gold mt-3">✓ Registro orientativo más cercano</p>}
      <p className="text-[10px] text-muted-foreground mt-3">El número identifica la octava: Do4 y Do5 son la misma nota a distinta altura.</p>
    </details>
  );
}
