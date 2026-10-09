import { describe, expect, it } from 'vitest';
import { tuningInstruction, latinPitchLabel } from './tunerFeedback';

describe('tuner guidance', () => {
  it('matches the direction of a flat or sharp string', () => {
    expect(tuningInstruction(-18, true)).toContain('tensa');
    expect(tuningInstruction(18, true)).toContain('afloja');
    expect(tuningInstruction(-18, false)).toContain('sube');
    expect(tuningInstruction(18, false)).toContain('baja');
  });
  it('uses the same inclusive five-cent tolerance as the tuned indicator', () => {
    expect(tuningInstruction(-5, true)).toContain('Afinado');
    expect(tuningInstruction(5, true)).toContain('Afinado');
    expect(tuningInstruction(5.1, true)).toContain('Baja');
    expect(tuningInstruction(null, true)).not.toContain('Afinado');
    expect(tuningInstruction(NaN, true)).not.toContain('Afinado');
  });
  it('preserves octave and accidental in Spanish note names', () => {
    expect(latinPitchLabel('E2')).toBe('Mi2');
    expect(latinPitchLabel('F#4')).toBe('Fa♯4');
    expect(latinPitchLabel('Bb3')).toBe('Si♭3');
  });
});
