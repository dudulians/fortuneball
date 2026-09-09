import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.uliana.fortuneball",
  appName: "Fortune Ball",
  webDir: "dist",
  ios: {
    backgroundColor: "#12122a",
    contentInset: "never",
  },
  android: {
    backgroundColor: "#12122a",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#12122a",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
