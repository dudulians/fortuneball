import { registerPlugin } from "@capacitor/core";

/**
 * Core Haptics — a tiny custom plugin (Swift, in ios/App/App/AppDelegate.swift)
 * that drives the iPhone's Taptic Engine directly. On the user's phone the
 * stock @capacitor/haptics path produced nothing she could feel; Core Haptics
 * did (MeMap ships the same trick). Web and Android resolve to no-ops here;
 * haptics.ts decides which backend to use.
 */
export interface CoreHapticsPlugin {
  /** One transient pulse. intensity and sharpness are 0..1. */
  knock(options: { intensity: number; sharpness: number }): Promise<void>;
  /** The die landing on the glass: thump + two soft pulses. */
  reveal(): Promise<void>;
  /** False on devices without a Taptic Engine (or when the plugin is missing). */
  isAvailable(): Promise<{ available: boolean }>;
}

const noop = async () => {};

const CoreHaptics = registerPlugin<CoreHapticsPlugin>("CoreHaptics", {
  web: () => ({
    knock: noop,
    reveal: noop,
    isAvailable: async () => ({ available: false }),
  }),
});

export default CoreHaptics;
