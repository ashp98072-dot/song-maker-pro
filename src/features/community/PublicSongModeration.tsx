import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModerationActions } from './ModerationActions';
export function PublicSongModeration({ songId }: { songId: string }) {
  const [owner, setOwner] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setOwner(null);
    void supabase.from('public_songs').select('uploader_id').eq('song_id', songId).maybeSingle().then(({ data }) => { if (!cancelled) setOwner(data?.uploader_id ?? null); });
    return () => { cancelled = true; };
  }, [songId]);
  return owner ? <ModerationActions kind="song" targetId={songId} ownerId={owner} /> : null;
}
