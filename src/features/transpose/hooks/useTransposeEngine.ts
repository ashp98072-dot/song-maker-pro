import { useMemo } from 'react';
import type { Song } from '@/types/music';
import {
  getKeyFromSemitones,
  toggleMajorMinor,
  calculateCapo,
  getGenderTransposeSemitones,
} from '@/utils/transpose';
import { convertKeyToLatin } from '@/utils/notation';
import { getOptimalSemitonesForRegister, type VocalRegister } from '@/utils/vocalRange';

const FLAT_KEY_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

export interface UseTransposeEngineParams {
  song: Song | undefined;
  vocalRegister: VocalRegister | '';
  genderShift: '' | 'male' | 'female';
  customSemitones: number;
  modeSwapped: boolean;
  useAmerican: boolean;
}

export interface UseTransposeEngineResult {
  registerSemitones: number;
  genderSemitones: number;
  semitones: number;
  effectiveSemitones: number;
  currentKey: string;
  displayKey: string;
  displayOriginalKey: string;
  useFlats: boolean;
  capoInfo: { capo: number; playAs: string } | null;
  displayCapoPlayAs: string | null;
  isMinor: boolean;
}

export function useTransposeEngine({
  song,
  vocalRegister,
  genderShift,
  customSemitones,
  modeSwapped,
  useAmerican,
}: UseTransposeEngineParams): UseTransposeEngineResult {
  const registerSemitones = useMemo(() => {
    if (vocalRegister && song) {
      return getOptimalSemitonesForRegister(song.originalKey, vocalRegister);
    }
    return 0;
  }, [vocalRegister, song]);

  const genderSemitones = useMemo(() => {
    if (!genderShift || !song) return 0;
    return getGenderTransposeSemitones(song.originalGender, genderShift);
  }, [genderShift, song]);

  const semitones = registerSemitones + genderSemitones + customSemitones;

  const effectiveSemitones = song
    ? modeSwapped
      ? semitones + (song.scaleMode === 'major' ? -3 : 3)
      : semitones
    : 0;

  const currentKey = useMemo(() => {
    if (!song) return '';
    const base = getKeyFromSemitones(song.originalKey, effectiveSemitones);
    if (modeSwapped) return toggleMajorMinor(getKeyFromSemitones(song.originalKey, semitones));
    return base;
  }, [song, effectiveSemitones, semitones, modeSwapped]);

  const displayKey = useAmerican ? currentKey : convertKeyToLatin(currentKey);
  const displayOriginalKey = useAmerican
    ? song?.originalKey || ''
    : convertKeyToLatin(song?.originalKey || '');

  const useFlats = currentKey
    ? FLAT_KEY_ROOTS.has(currentKey.replace('m', ''))
    : false;

  const capoInfo = useMemo(() => {
    if (!song || effectiveSemitones === 0) return null;
    return calculateCapo(song.originalKey, currentKey);
  }, [song, effectiveSemitones, currentKey]);

  const displayCapoPlayAs = capoInfo
    ? useAmerican
      ? capoInfo.playAs
      : convertKeyToLatin(capoInfo.playAs)
    : null;

  const isMinor = useMemo(() => {
    if (!song) return false;
    return song.scaleMode === 'minor' || currentKey.toLowerCase().includes('m');
  }, [song, currentKey]);

  return {
    registerSemitones,
    genderSemitones,
    semitones,
    effectiveSemitones,
    currentKey,
    displayKey,
    displayOriginalKey,
    useFlats,
    capoInfo,
    displayCapoPlayAs,
    isMinor,
  };
}
