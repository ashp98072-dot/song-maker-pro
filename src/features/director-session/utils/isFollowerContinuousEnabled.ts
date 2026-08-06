import { FEATURES } from '@/config/features';

export function isFollowerContinuousEnabled(followDirector?: boolean): boolean {
  if (!followDirector) return true;

  return FEATURES.FOLLOW_CONTINUOUS_MODE;
}
