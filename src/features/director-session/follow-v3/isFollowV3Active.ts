import { shouldDisableLegacyFollowPipeline } from '@/features/director-session/follow-v3/followV3Ownership';

export function isFollowV3SpectatorActive(liveIsFollower: boolean): boolean {
  return shouldDisableLegacyFollowPipeline('follower') && liveIsFollower;
}

export { shouldDisableLegacyFollowPipeline, getFollowV3CurrentSongId, useFollowV3CurrentSongId } from '@/features/director-session/follow-v3/followV3Ownership';
export {
  useFollowV3Song,
  getFollowV3State,
  setFollowV3Song,
  resetFollowV3State,
  resolveFollowV3SongById,
} from '@/features/director-session/follow-v3/followV3Store';
export { isFollowV3NavigationOwner } from '@/features/director-session/follow-v3/isFollowV3NavigationOwner';
