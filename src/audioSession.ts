import { registerPlugin } from "@capacitor/core";

/**
 * Tiny native plugin (Swift, in ios/App/App/AppDelegate.swift) that puts the
 * iOS audio session back to ordinary playback after speech recognition has
 * switched it to record mode. Web and Android: no-op.
 */
export interface AudioSessionPlugin {
  restore(): Promise<{ restored: boolean }>;
}

const AudioSession = registerPlugin<AudioSessionPlugin>("AudioSession", {
  web: () => ({ restore: async () => ({ restored: false }) }),
});

export default AudioSession;
