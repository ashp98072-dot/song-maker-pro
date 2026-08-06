import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createContinuousDirectorPublisher } from './continuousDirectorPublisher';

describe('createContinuousDirectorPublisher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes only the last stable song after rapid scroll', () => {
    const publish = vi.fn();
    const publisher = createContinuousDirectorPublisher({ publish, stableDelay: 300 });

    publisher.queueVisibilityUpdate({ currentSongId: 'a', currentIndex: 0 });
    vi.advanceTimersByTime(100);
    publisher.queueVisibilityUpdate({ currentSongId: 'b', currentIndex: 1 });
    vi.advanceTimersByTime(100);
    publisher.queueVisibilityUpdate({ currentSongId: 'c', currentIndex: 2 });
    vi.advanceTimersByTime(300);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith({
      currentSongId: 'c',
      currentIndex: 2,
      sectionAnchor: null,
    });
  });

  it('flushImmediate publishes without waiting stable delay', () => {
    const publish = vi.fn();
    const publisher = createContinuousDirectorPublisher({ publish, stableDelay: 300 });

    publisher.queueVisibilityUpdate({ currentSongId: 'a', currentIndex: 0 });
    publisher.flushImmediate({ currentSongId: 'z', currentIndex: 9 });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith({
      currentSongId: 'z',
      currentIndex: 9,
      sectionAnchor: null,
    });

    vi.advanceTimersByTime(500);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('skips duplicate full state after publish', () => {
    const publish = vi.fn();
    const publisher = createContinuousDirectorPublisher({ publish, stableDelay: 300 });

    publisher.flushImmediate({ currentSongId: 'a', currentIndex: 0 });
    publisher.queueVisibilityUpdate({ currentSongId: 'a', currentIndex: 0 });
    vi.advanceTimersByTime(300);

    expect(publish).toHaveBeenCalledTimes(1);
  });
});
