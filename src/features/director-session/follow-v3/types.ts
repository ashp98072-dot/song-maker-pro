export type FollowV3RemoteState = {
  sessionCode: string;
  seq: number;
  songId: string | null;
  listId?: string | null;
  mode?: 'song' | 'continuous';
  timestamp: number;
};
