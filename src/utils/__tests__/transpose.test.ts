import { describe, it, expect } from 'vitest';
import {
  transposeText,
  isChordLine,
  getKeyFromSemitones,
  calculateCapo,
  transposeChord,
} from '@/utils/transpose';
import { convertKeyToLatin } from '@/utils/notation';

describe('transposeChord', () => {
  it('transpone acordes mayores con sostenidos', () => {
    expect(transposeChord('C', 2, false)).toBe('D');
    expect(transposeChord('G', 1, false)).toBe('G#');
  });

  it('transpone acordes menores', () => {
    expect(transposeChord('Am', 2, false)).toBe('Bm');
    expect(transposeChord('Dm', -2, false)).toBe('Cm');
  });

  it('conserva sufijos sus4 y m7b5', () => {
    expect(transposeChord('Fsus4', 2, false)).toBe('Gsus4');
    expect(transposeChord('Dm7b5', 1, false)).toBe('D#m7b5');
    expect(transposeChord('Dm7b5', 1, true)).toBe('Ebm7b5');
  });

  it('transpone slash chords en raíz y bajo', () => {
    expect(transposeChord('Bb/F', 2, true)).toBe('C/G');
    expect(transposeChord('G/B', 2, false)).toBe('A/C#');
  });

  it('usa bemoles cuando useFlats es true', () => {
    expect(transposeChord('Bb', 1, true)).toBe('B');
    expect(transposeChord('Eb', 2, true)).toBe('F');
  });
});

describe('transposeText', () => {
  it('transpone una línea de acordes mayores y menores', () => {
    expect(transposeText('C    Am    F    G', 2, false)).toBe('D    Bm    G    A');
  });

  it('transpone acordes con bemoles en contexto flat', () => {
    expect(transposeText('Bb  Eb  Ab', 2, true)).toBe('C  F  Bb');
  });

  it('transpone sus4, m7b5 y slash en la misma línea', () => {
    const line = 'Fsus4  Dm7b5  Bb/F';
    expect(transposeText(line, 2, true)).toBe('Gsus4  Em7b5  C/G');
  });

  it('no altera líneas que no contienen acordes reconocibles', () => {
    const lyrics = 'En la cruz do su sangre vertió';
    expect(transposeText(lyrics, 5, false)).toBe(lyrics);
  });

  it('transpone solo tokens de acorde en línea mixta (letra + acordes)', () => {
    const mixed = 'C G Am sobre el texto';
    const result = transposeText(mixed, 2, false);
    expect(result).toContain('D');
    expect(result).toContain('Bm');
    expect(result).toContain('sobre el texto');
  });

  it('respeta semitonos negativos y envoltura octava', () => {
    expect(transposeText('C', -1, false)).toBe('B');
    expect(transposeText('C', 12, false)).toBe('C');
  });
});

describe('isChordLine', () => {
  it('detecta líneas predominantemente de acordes', () => {
    expect(isChordLine('C   Am   F   G')).toBe(true);
    expect(isChordLine('Bb  Eb  Fsus4  Dm7b5')).toBe(true);
    expect(isChordLine('G/B')).toBe(true);
  });

  it('rechaza etiquetas de sección, vacío y letra pura', () => {
    expect(isChordLine('[Verso 1]')).toBe(false);
    expect(isChordLine('')).toBe(false);
    expect(isChordLine('   ')).toBe(false);
    expect(isChordLine('Santo, santo, santo Señor')).toBe(false);
  });

  it('acepta línea mixta cuando al menos la mitad son acordes', () => {
    expect(isChordLine('C G Am palabra')).toBe(true);
    expect(isChordLine('palabra C G Am')).toBe(true);
  });

  it('rechaza línea mixta con mayoría de texto', () => {
    expect(isChordLine('solo una C palabra más texto aquí')).toBe(false);
  });
});

describe('getKeyFromSemitones', () => {
  it('transpone tonalidades mayores', () => {
    expect(getKeyFromSemitones('C', 2)).toBe('D');
    expect(getKeyFromSemitones('G', -2)).toBe('F');
  });

  it('transpone tonalidades menores conservando m', () => {
    expect(getKeyFromSemitones('Am', 2)).toBe('Bm');
    expect(getKeyFromSemitones('Em', -1)).toBe('D#m');
  });

  it('usa preferencia de bemoles en armaduras planas', () => {
    expect(getKeyFromSemitones('F', 1)).toBe('Gb');
    expect(getKeyFromSemitones('Bb', 2)).toBe('C');
  });

  it('no confunde dim con menor al detectar m final', () => {
    expect(getKeyFromSemitones('C', 0)).toBe('C');
  });
});

describe('calculateCapo', () => {
  it('calcula cejilla entre dos tonalidades distintas', () => {
    expect(calculateCapo('G', 'A')).toEqual({ capo: 2, playAs: 'G' });
    expect(calculateCapo('C', 'D')).toEqual({ capo: 2, playAs: 'C' });
  });

  it('devuelve null si origen y destino son la misma raíz', () => {
    expect(calculateCapo('C', 'C')).toBeNull();
    expect(calculateCapo('Am', 'Am')).toBeNull();
  });

  it('funciona con bemoles', () => {
    expect(calculateCapo('Eb', 'F')).toEqual({ capo: 2, playAs: 'Eb' });
  });

  it('devuelve null para raíces no reconocidas', () => {
    expect(calculateCapo('H', 'C')).toBeNull();
  });
});

describe('convertKeyToLatin', () => {
  it('convierte tonalidades mayores americanas', () => {
    expect(convertKeyToLatin('C')).toBe('Do');
    expect(convertKeyToLatin('G')).toBe('Sol');
    expect(convertKeyToLatin('F')).toBe('Fa');
  });

  it('convierte tonalidades menores', () => {
    expect(convertKeyToLatin('Am')).toBe('Lam');
    expect(convertKeyToLatin('Em')).toBe('Mim');
  });

  it('conserva alteraciones en la raíz', () => {
    expect(convertKeyToLatin('F#')).toBe('Fa#');
    expect(convertKeyToLatin('Bb')).toBe('Sib');
    expect(convertKeyToLatin('C#m')).toBe('Do#m');
  });

  it('devuelve la entrada si no puede parsear la raíz', () => {
    expect(convertKeyToLatin('')).toBe('');
    expect(convertKeyToLatin('Do')).toBe('Do');
  });
});
