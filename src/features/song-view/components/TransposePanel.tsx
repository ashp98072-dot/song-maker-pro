import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  RotateCw,
  Save,
  User,
  Users as UsersIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Song } from '@/types/music';
import { VOCAL_REGISTERS, getRegisterInfo, type VocalRegister } from '@/utils/vocalRange';
import { useSingerVocalProfile } from '@/features/vocal-test';

export interface TransposePanelProps {
  song: Song;
  displayKey: string;
  displayOriginalKey: string;
  effectiveSemitones: number;
  customSemitones: number;
  registerSemitones: number;
  genderSemitones: number;
  vocalRegister: VocalRegister | '';
  genderShift: '' | 'male' | 'female';
  modeSwapped: boolean;
  capoInfo: { capo: number; playAs: string } | null;
  displayCapoPlayAs: string | null;
  isAdmin: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  onSaveNow: () => void;
  onVocalRegisterChange: (register: VocalRegister | '') => void;
  onGenderShiftToggle: (gender: 'male' | 'female') => void;
  onAdminSetOriginalGender: (gender: 'male' | 'female') => void;
  onDecreaseSemitone: () => void;
  onIncreaseSemitone: () => void;
  onResetTranspose: () => void;
  onToggleModeSwap: () => void;
  /** Optional root class — future mobile: sticky bottom, floating sheet, etc. */
  className?: string;
}

/**
 * Presentational transpose / tonal configuration panel (desktop sidebar).
 * Decoupled from page shell so layout can move to sticky-bottom or sheet on mobile later.
 */
export default function TransposePanel({
  song,
  displayKey,
  displayOriginalKey,
  effectiveSemitones,
  customSemitones,
  registerSemitones,
  genderSemitones,
  vocalRegister,
  genderShift,
  modeSwapped,
  capoInfo,
  displayCapoPlayAs,
  isAdmin,
  isSaving,
  lastSavedAt,
  onSaveNow,
  onVocalRegisterChange,
  onGenderShiftToggle,
  onAdminSetOriginalGender,
  onDecreaseSemitone,
  onIncreaseSemitone,
  onResetTranspose,
  onToggleModeSwap,
  className,
}: TransposePanelProps) {
  const resetDisabled =
    !vocalRegister && !genderShift && customSemitones === 0 && !modeSwapped;
  const { preferredRegister, profile } = useSingerVocalProfile();
  const preferredLabel = preferredRegister
    ? getRegisterInfo(preferredRegister)?.label ?? preferredRegister
    : null;

  return (
    <div className={className ?? 'space-y-4'} data-transpose-panel-root>
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-5 h-5 text-gold" />
        <h2 className="font-display font-bold text-foreground">Transponer</h2>
        <div className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold">
          {isSaving ? (
            <span className="flex items-center gap-1 text-amber-400">
              <Cloud className="w-3 h-3 animate-pulse" /> Guardando…
            </span>
          ) : lastSavedAt ? (
            <span className="flex items-center gap-1 text-green-500">
              <Cloud className="w-3 h-3" /> Sincronizado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CloudOff className="w-3 h-3" /> Local
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onSaveNow}
        disabled={isSaving}
        className="w-full py-2 rounded-lg border border-gold/40 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/15 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        title="Guardar ajustes en la nube ahora"
      >
        <Save className="w-3.5 h-3.5" /> Guardar ajustes
      </button>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Registro Vocal
        </label>
        {preferredRegister ? (
          <div className="flex gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => onVocalRegisterChange(preferredRegister)}
              className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                vocalRegister === preferredRegister
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-gold/40 bg-gold/5 text-gold hover:bg-gold/10'
              }`}
            >
              Mi voz: {preferredLabel}
            </button>
            <Link
              to="/registro-vocal"
              className="shrink-0 px-2.5 py-2 rounded-lg border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              Test
            </Link>
          </div>
        ) : (
          <Link
            to="/registro-vocal"
            className="mb-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-gold/40 text-xs font-semibold text-gold hover:bg-gold/5"
          >
            Descubrir mi registro
          </Link>
        )}
        {profile && preferredRegister && vocalRegister !== preferredRegister ? (
          <p className="text-[10px] text-muted-foreground mb-2 text-center">
            Toca “Mi voz” para ajustar la tesitura a tu rango
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-1.5">
          {VOCAL_REGISTERS.map((r) => (
            <button
              key={r.id}
              onClick={() => onVocalRegisterChange(vocalRegister === r.id ? '' : r.id)}
              title={r.description}
              className={`group relative flex flex-col items-center justify-center py-2.5 rounded-lg border text-xs font-medium transition-all ${
                vocalRegister === r.id
                  ? 'border-gold bg-gold/10 text-gold shadow-[0_0_0_1px_hsl(var(--gold)/0.3)]'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <span className="text-[10px] leading-tight">{r.label}</span>
            </button>
          ))}
        </div>
        {vocalRegister && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Sugerido:{' '}
            <span className="text-gold font-mono font-bold">
              {registerSemitones > 0 ? '+' : ''}
              {registerSemitones}
            </span>{' '}
            semitonos desde original
          </p>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Ajuste rápido por género
        </label>
        {isAdmin && (
          <div className="mb-3 p-2 rounded-lg border border-gold/30 bg-gold/5">
            <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-1">
              Admin · Género original de la canción
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => onAdminSetOriginalGender(g)}
                  className={`py-1.5 rounded text-[11px] font-semibold border ${
                    song.originalGender === g
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {g === 'male' ? 'Hombre' : 'Mujer'}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onGenderShiftToggle('male')}
            title="Tono cómodo para voz masculina (-5 semitonos desde voz femenina)"
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all ${
              genderShift === 'male'
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Hombre
          </button>
          <button
            onClick={() => onGenderShiftToggle('female')}
            title="Tono cómodo para voz femenina (+5 semitonos desde voz masculina)"
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all ${
              genderShift === 'female'
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            <UsersIcon className="w-3.5 h-3.5" /> Mujer
          </button>
        </div>
        {genderShift && genderSemitones !== 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Género:{' '}
            <span className="text-gold font-mono font-bold">
              {genderSemitones > 0 ? '+' : ''}
              {genderSemitones}
            </span>{' '}
            semitonos
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-border pt-4">
        <button
          onClick={onDecreaseSemitone}
          className="w-8 h-8 rounded-lg bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/70 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Ajuste total</span>
          <span className="text-foreground font-mono font-bold text-lg">
            {effectiveSemitones > 0 ? '+' : ''}
            {effectiveSemitones}
          </span>
        </div>
        <button
          onClick={onIncreaseSemitone}
          className="w-8 h-8 rounded-lg bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/70 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tono actual</p>
          <p className="text-3xl font-bold font-mono text-gold tracking-wide">
            {displayKey || displayOriginalKey}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Original: <span className="font-mono">{displayOriginalKey}</span>
          </p>
        </div>

        <button
          onClick={onResetTranspose}
          disabled={resetDisabled}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gold/40 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/15 hover:border-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
          title={`Volver al tono original (${displayOriginalKey})`}
        >
          <RotateCw className="w-3.5 h-3.5" /> Restaurar tono original
        </button>

        <button
          onClick={onToggleModeSwap}
          className={`text-[10px] px-3 py-1 rounded-full border transition-colors ${
            modeSwapped
              ? 'border-gold text-gold'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {modeSwapped ? '↩ Restaurar modo' : '↔ Mayor / Menor'}
        </button>
      </div>

      {capoInfo && (
        <div className="p-3 rounded-lg bg-secondary text-sm border-l-4 border-gold">
          <p className="text-foreground">
            Usa <b>Capo en {capoInfo.capo}</b> y toca por <b>{displayCapoPlayAs}</b>
          </p>
        </div>
      )}
    </div>
  );
}
