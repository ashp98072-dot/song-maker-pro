import { shouldDisableLegacyFollowPipeline } from '@/features/director-session/follow-v3/followV3Ownership';

/** @deprecated Use shouldDisableLegacyFollowPipeline() */
export function isFollowV3NavigationOwner(): boolean {
  return shouldDisableLegacyFollowPipeline();
}
