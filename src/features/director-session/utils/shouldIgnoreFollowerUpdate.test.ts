import { describe, expect, it } from 'vitest';
import { shouldIgnoreFollowerUpdate } from '@/features/director-session/utils/shouldIgnoreFollowerUpdate';

const base = {
  source: 'page-recovery',
  navKey: 'CODE|continuous-live|s1|list1|continuous|1',
  previousNavKey: 'CODE|continuous-live|s1|list1|continuous|0',
  isLiveMounted: true,
  isFollowerLiveOwner: true,
  followDirector: true,
};

describe('shouldIgnoreFollowerUpdate', () => {
  it('allows when index changed even if previous navKey was set', () => {
    const r = shouldIgnoreFollowerUpdate({
      ...base,
      currentIndex: 1,
      songId: 's1',
      previousIndex: 0,
      previousSongId: 's1',
      previousNavKey: base.navKey,
    });
    expect(r.ignore).toBe(false);
    expect(r.reason).toBe('index-changed');
  });

  it('allows when songId changed', () => {
    const r = shouldIgnoreFollowerUpdate({
      ...base,
      currentIndex: 1,
      songId: 's2',
      previousIndex: 1,
      previousSongId: 's1',
      previousNavKey: base.navKey,
    });
    expect(r.ignore).toBe(false);
    expect(r.reason).toBe('song-id-changed');
  });

  it('bypasses dedupe on continuous-live simple mode', () => {
    const r = shouldIgnoreFollowerUpdate({
      ...base,
      pathname: '/setlist/list1/live',
      currentIndex: 1,
      songId: 's1',
      previousIndex: 1,
      previousSongId: 's1',
      previousNavKey: base.navKey,
      navKey: base.navKey,
    });
    expect(r.ignore).toBe(false);
    expect(r.reason).toBe('continuous-live-simple-mode');
  });

  it('blocks exact duplicate on live when pathname is not /live', () => {
    const r = shouldIgnoreFollowerUpdate({
      ...base,
      pathname: '/cancion/s1',
      currentIndex: 1,
      songId: 's1',
      previousIndex: 1,
      previousSongId: 's1',
      previousNavKey: base.navKey,
      navKey: base.navKey,
    });
    expect(r.ignore).toBe(true);
    expect(r.reason).toBe('duplicate-nav-key-live');
  });
});
