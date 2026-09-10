import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, MaxAdContentRating } from "@capacitor-community/admob";
import AudioSession from "./audioSession";
import { hasRemovedAds } from "./purchases";

/* ------------------------------------------------------------------ *
 * The ids. Replace both before release — see store/STORE.md, "AdMob". *
 * ------------------------------------------------------------------ *
 * These are Google's public test ids: they always fill, they never earn
 * anything, and using them in a live app is the safe failure. The real
 * interstitial id goes here; the real app id goes into Info.plist
 * (GADApplicationIdentifier).
 */
const INTERSTITIAL_AD_ID = "ca-app-pub-3940256099942544/4411468910";

/* ---------------- When an ad is allowed to appear ---------------- *
 * The ball is a five-second ritual. An ad that lands on the wrong
 * five seconds is the reason people delete this kind of app, so the
 * rules below are deliberately strict.
 */
/** Nobody meets an ad before the app has earned some patience. */
const FIRST_AD_AT_SHAKE = 12;
/** Then roughly this often. Goldens land on 15, 40, 90 — no collisions. */
const EVERY_N_SHAKES = 8;
/** Never twice inside this window, whatever the counter says. */
const MIN_GAP_MS = 90_000;
/** The first shake after opening the app is always instant. */
const QUIET_AFTER_LAUNCH_MS = 45_000;

const launchedAt = Date.now();
let lastShownAt = 0;
let ready = false;
let initialised = false;
let showing = false;

const isNative = () => Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android";

/** Loads the next interstitial in the background so the show is instant. */
async function preload(): Promise<void> {
  if (!isNative() || hasRemovedAds()) return;
  try {
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      // Non-personalised: no tracking, no ATT prompt, App Privacy stays small.
      npa: true,
    });
    ready = true;
  } catch {
    ready = false;
  }
}

/**
 * Consent (Europe asks for it), SDK, first ad in the pocket. Safe to call on
 * web and safe to call twice.
 */
export async function initAds(): Promise<void> {
  if (initialised || !isNative() || hasRemovedAds()) return;
  initialised = true;
  try {
    // UMP: shows Google's consent form where the law requires one. We only ever
    // request non-personalised ads, but the form is still what makes ads
    // servable in the EEA and the UK.
    const consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      await AdMob.showConsentForm();
    }
  } catch {
    // No consent flow available — ads still serve outside the regulated regions.
  }
  try {
    await AdMob.initialize({
      initializeForTesting: false,
      // The app is rated 4+; the ads in it have to match.
      maxAdContentRating: MaxAdContentRating.General,
    });
  } catch {
    return;
  }
  await preload();
}

/** The shake that is about to happen: should it be preceded by an ad? */
export function adDue(shakesSoFar: number, goldenDue: boolean): boolean {
  if (!isNative() || hasRemovedAds() || showing) return false;
  // Never on top of the moment the whole collection is built around.
  if (goldenDue) return false;
  if (Date.now() - launchedAt < QUIET_AFTER_LAUNCH_MS) return false;
  if (Date.now() - lastShownAt < MIN_GAP_MS) return false;
  const next = shakesSoFar + 1;
  if (next < FIRST_AD_AT_SHAKE) return false;
  return (next - FIRST_AD_AT_SHAKE) % EVERY_N_SHAKES === 0;
}

/**
 * Shows the interstitial and resolves when it is gone — dismissed, failed, or
 * never there in the first place. Never rejects: an ad that will not load must
 * not cost anyone their answer.
 */
export async function showInterstitial(): Promise<void> {
  if (!isNative() || hasRemovedAds() || showing) return;
  if (!ready) {
    // Nothing loaded (offline, no fill): let it go and try again next time.
    void preload();
    return;
  }
  showing = true;
  const handles: PluginListenerHandle[] = [];
  try {
    await new Promise<void>((resolve) => {
      let settled = false;
      // A stuck ad must not freeze the ball forever.
      const guard = window.setTimeout(() => finish(), 30_000);
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(guard);
        resolve();
      };
      void AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish).then((h) => handles.push(h));
      void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish).then((h) => handles.push(h));
      AdMob.showInterstitial().catch(finish);
    });
    lastShownAt = Date.now();
    ready = false;
  } catch {
    // ignore
  } finally {
    await Promise.all(handles.map((h) => h.remove().catch(() => {})));
    showing = false;
    // The ad's own sound leaves the audio session in playback mode; the knocks
    // of the die go quiet unless it is put back (same fix as after dictation).
    try {
      await AudioSession.restore();
    } catch {
      // not on a device
    }
    void preload();
  }
}

/** After the purchase: forget the loaded ad, stop preparing new ones. */
export function stopAds(): void {
  ready = false;
}
