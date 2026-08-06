export const FEATURES = {
  FOLLOW_CONTINUOUS_MODE: true,
  /** Legacy Follow V3 — off while SIMPLE_LIVE_SYNC is the active path. */
  USE_FOLLOW_V3: false,
  /**
   * Clean-room live sync (create / join / publish / leave).
   * Disables legacy auto-restore, recovery banners, and LiveSessionChannelHost.
   */
  SIMPLE_LIVE_SYNC: true,
};
