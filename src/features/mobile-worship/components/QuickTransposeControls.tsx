import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { DockButton } from '@/features/mobile-worship/components/DockButton';
import { useLongPress } from '@/features/mobile-worship/hooks/useLongPress';
import { worshipHaptic } from '@/features/mobile-worship/utils/haptic';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

const SEMITONE_PRESETS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

export interface QuickTransposeControlsProps {
  displayKey: string;
  genderShift: '' | 'male' | 'female';
  customSemitones: number;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onSetCustomSemitones: (value: number) => void;
  onGenderToggle: () => void;
  onGenderSelect: (gender: '' | 'male' | 'female') => void;
  layout?: 'horizontal' | 'vertical';
}

export function QuickTransposeControls({
  displayKey,
  genderShift,
  customSemitones,
  onTransposeDown,
  onTransposeUp,
  onSetCustomSemitones,
  onGenderToggle,
  onGenderSelect,
  layout = 'horizontal',
}: QuickTransposeControlsProps) {
  const [semitoneOpen, setSemitoneOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);

  const genderLabel =
    genderShift === 'female' ? 'M' : genderShift === 'male' ? 'H' : 'H↔M';

  const plusPress = useLongPress({
    onTap: () => {
      worshipHaptic();
      onTransposeUp();
    },
    onLongPress: () => setSemitoneOpen(true),
  });

  const genderPress = useLongPress({
    onTap: () => {
      worshipHaptic();
      onGenderToggle();
    },
    onLongPress: () => setGenderOpen(true),
  });

  const pickSemitone = (n: number) => {
    worshipHaptic();
    onSetCustomSemitones(n);
    setSemitoneOpen(false);
  };

  const pickGender = (g: '' | 'male' | 'female') => {
    worshipHaptic();
    onGenderSelect(g);
    setGenderOpen(false);
  };

  const rowClass =
    layout === 'vertical'
      ? 'flex flex-col items-center gap-1.5'
      : 'flex items-center gap-1.5';

  return (
    <div className={rowClass} data-worship-quick-transpose>
      <DockButton
        onClick={() => {
          worshipHaptic();
          onTransposeDown();
        }}
        label="Bajar semitono"
      >
        <Minus className="w-4 h-4" />
      </DockButton>

      {layout === 'horizontal' && (
        <span className="text-[10px] font-mono font-bold text-gold min-w-[2rem] text-center">
          {displayKey || '—'}
        </span>
      )}

      <Popover open={semitoneOpen} onOpenChange={setSemitoneOpen}>
        <PopoverAnchor asChild>
          <DockButton
            label="Subir semitono. Mantén pulsado para elegir tono"
            className="touch-none"
            {...plusPress}
          >
            <Plus className="w-4 h-4" />
          </DockButton>
        </PopoverAnchor>
        <PopoverContent
          side={layout === 'vertical' ? 'left' : 'top'}
          className="z-[135] w-auto max-w-[min(100vw-2rem,20rem)] p-2"
          align="center"
        >
          <p className="text-[10px] text-muted-foreground mb-2 text-center">
            Transposición ({customSemitones > 0 ? '+' : ''}
            {customSemitones})
          </p>
          <div className="grid grid-cols-7 gap-1">
            {SEMITONE_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pickSemitone(n)}
                className={`py-1.5 rounded-md text-xs font-mono border ${
                  n === customSemitones
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                {n > 0 ? `+${n}` : n}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={genderOpen} onOpenChange={setGenderOpen}>
        <PopoverAnchor asChild>
          <DockButton
            label="Cambiar voz. Mantén pulsado para opciones"
            active={genderShift === 'male' || genderShift === 'female'}
            className="touch-none"
            {...genderPress}
          >
            <span className="text-[10px] font-bold">{genderLabel}</span>
          </DockButton>
        </PopoverAnchor>
        <PopoverContent
          side={layout === 'vertical' ? 'left' : 'top'}
          className="z-[135] w-40 p-2"
          align="center"
        >
          <div className="flex flex-col gap-1">
            {(
              [
                ['male', 'Hombre'],
                ['female', 'Mujer'],
                ['', 'Original'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => pickGender(value)}
                className={`py-2 rounded-lg text-xs border text-left px-3 ${
                  genderShift === value ? 'border-gold text-gold bg-gold/10' : 'border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {layout === 'vertical' && (
        <span className="text-[9px] font-mono font-bold text-gold text-center leading-tight max-w-[3rem]">
          {displayKey || '—'}
        </span>
      )}
    </div>
  );
}
