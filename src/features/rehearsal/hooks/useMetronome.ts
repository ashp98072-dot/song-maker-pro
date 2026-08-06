import { useState, useRef, useCallback, useEffect } from 'react';

export function useMetronome(initialBpm = 80) {
  const [metronomeBpm, setMetronomeBpm] = useState(initialBpm);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [beatCount, setBeatCount] = useState(0);
  const [bpmFlash, setBpmFlash] = useState(false);
  const metronomeRef = useRef<ReturnType<typeof setInterval>>();

  const startMetronome = useCallback(() => {
    import('@/utils/metronomeAudio').then(({ playClick }) => {
      setMetronomeActive(true);
      let count = 0;
      const interval = 60000 / metronomeBpm;
      playClick(true);
      setBeatCount(1);
      metronomeRef.current = setInterval(() => {
        count = (count + 1) % 4;
        playClick(count === 0);
        setBeatCount(count + 1);
      }, interval);
    });
  }, [metronomeBpm]);

  const stopMetronome = useCallback(() => {
    setMetronomeActive(false);
    setBeatCount(0);
    if (metronomeRef.current) clearInterval(metronomeRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (metronomeRef.current) clearInterval(metronomeRef.current);
    };
  }, []);

  return {
    metronomeBpm,
    setMetronomeBpm,
    metronomeActive,
    beatCount,
    bpmFlash,
    setBpmFlash,
    startMetronome,
    stopMetronome,
  };
}
