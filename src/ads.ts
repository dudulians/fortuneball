import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, MaxAdContentRating } from "@capacitor-community/admob";
import AudioSession from "./audioSession";
import { hasRemovedAds } from "./purchases";

/* The live interstitial from the AdMob account. Its other half — the app id —
 * lives in ios/App/App/Info.plist as GADApplicationIdentifier. Both are real,
 * which means the ads on the phone are real: look at them, never tap them.
 * Google's test unit, if one is ever needed again, is
 * ca-app-pub-3940256099942544/4411468910. */
const INTERSTITIAL_AD_ID = "ca-app-pub-5868480097993711/1994062304";

/* ---------------- When an ad is allowed to appear ---------------- *
 * The ball is a five-second ritual. An ad that lands on the wrong
 * five seconds is the reason people delete this kind of app, so the
 * rules below are deliberately strict.
 */
/** Nobody meets an ad before the app has earned some patience. */
const FIRST_AD_AT_SHAKE = 5;
/** Then this often. A shake due a golden answer skips its ad, not the golden. */
const EVERY_N_SHAKES = 5;
/** Never twice inside this window, whatever the counter says. Five shakes take
 *  about a minute with reading, so this trims the fastest hands and no one else. */
const MIN_GAP_MS = 60_000;
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
 * Everything heavy about advertising is deferred to the shake before an ad is
 * due, and nothing is kept loaded afterwards.
 *
 * The first version started the SDK and held a prepared interstitial from
 * launch. On the phone that showed up as the app freezing for a moment around
 * the fifteenth shake and coming back at its first screen: iOS had run out of
 * room and thrown away the web page, which is a lot of memory to spend on an
 * ad that is still ten shakes away. A prepared interstitial can hold a video.
 */
export async function warmAds(shakesSoFar: number): Promise<void> {
  if (!isNative() || hasRemovedAds() || showing) return;
  // One shake of warning is enough for the SDK to have an ad in hand.
  if (!isAdShake(shakesSoFar + 1) && !isAdShake(shakesSoFar + 2)) return;
  if (!initialised) {
    initialised = true;
    try {
      // UMP: Google's consent form, where the law requires one. We only ever
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
  }
  if (!ready) await preload();
}

/** Is the n-th shake of this ball's life an ad shake? */
function isAdShake(n: number): boolean {
  return n >= FIRST_AD_AT_SHAKE && (n - FIRST_AD_AT_SHAKE) % EVERY_N_SHAKES === 0;
}

/** The shake that is about to happen: should it be preceded by an ad? */
export function adDue(shakesSoFar: number, goldenDue: boolean): boolean {
  if (!isNative() || hasRemovedAds() || showing) return false;
  // Never on top of the moment the whole collection is built around.
  if (goldenDue) return false;
  if (Date.now() - launchedAt < QUIET_AFTER_LAUNCH_MS) return false;
  if (Date.now() - lastShownAt < MIN_GAP_MS) return false;
  return isAdShake(shakesSoFar + 1);
}

/**
 * Shows the interstitial and resolves when it is gone — dismissed, failed, or
 * never there in the first place. Never rejects: an ad that will not load must
 * not cost anyone their answer.
 */
export async function showInterstitial(): Promise<void> {
  if (!isNative() || hasRemovedAds() || showing) return;
  if (!ready) {
    // Nothing in hand (offline, no fill, warmed too late): let the shake through.
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
    // No preloading here: the next ad is five shakes away, and warmAds will
    // fetch it one shake before it is needed.
  }
}

/** After the purchase: forget the loaded ad, stop preparing new ones. */
export function stopAds(): void {
  ready = false;
}
