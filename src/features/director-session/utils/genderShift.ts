import type { SharedSessionGenderShift } from '@/features/director-session/types';

export type LocalGenderShift = '' | 'male' | 'female';

export function toSharedGenderShift(local: LocalGenderShift): SharedSessionGenderShift {
  if (local === 'male' || local === 'female') return local;
  return 'original';
}

export function fromSharedGenderShift(shared: SharedSessionGenderShift): LocalGenderShift {
  if (shared === 'male' || shared === 'female') return shared;
  return '';
}
