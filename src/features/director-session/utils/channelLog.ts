type ChannelLogOptions = { always?: boolean };

export function channelLog(message: string, detail?: unknown, options?: ChannelLogOptions): void {
  if (!import.meta.env.DEV && !options?.always) return;
  if (detail !== undefined) {
    console.log(`[channel] ${message}`, detail);
  } else {
    console.log(`[channel] ${message}`);
  }
}
