import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * One purchase: "Remove ads", non-consumable, bought once and kept forever.
 *
 * Backed by a small StoreKit 2 plugin (Swift, in ios/App/App/AppDelegate.swift)
 * rather than a third-party SDK — one product does not need RevenueCat, and an
 * extra SDK would be one more thing to declare in App Privacy.
 *
 * The answer is also cached in localStorage: the App Store call is async, and a
 * paying person must not see an ad in the seconds before it comes back.
 */
export interface StoreKitPurchasesPlugin {
  /** Does this Apple ID already own the purchase? */
  status(): Promise<{ owned: boolean }>;
  /** Localised price ("$2.99", "299 ₽") for the button. */
  price(): Promise<{ available: boolean; price: string }>;
  purchase(): Promise<{ owned: boolean; cancelled: boolean; pending?: boolean }>;
  /** Same Apple ID on a new phone. */
  restore(): Promise<{ owned: boolean }>;
}

const StoreKitPurchases = registerPlugin<StoreKitPurchasesPlugin>("StoreKitPurchases", {
  web: () => ({
    status: async () => ({ owned: false }),
    price: async () => ({ available: false, price: "" }),
    purchase: async () => ({ owned: false, cancelled: true }),
    restore: async () => ({ owned: false }),
  }),
});

const CACHE_KEY = "fortuneball.removedAds.v1";

function readCache(): boolean {
  try {
    return localStorage.getItem(CACHE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCache(owned: boolean): void {
  try {
    if (owned) localStorage.setItem(CACHE_KEY, "1");
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Storage unavailable — the App Store stays the source of truth.
  }
}

let owned = readCache();
const listeners = new Set<(owned: boolean) => void>();

function set(next: boolean): boolean {
  if (next !== owned) {
    owned = next;
    writeCache(next);
    listeners.forEach((fn) => fn(next));
  }
  return next;
}

/** What the app believes right now, without waiting for the App Store. */
export function hasRemovedAds(): boolean {
  return owned;
}

export function onRemovedAdsChange(fn: (owned: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Ask the App Store at startup; corrects the cache in either direction. */
export async function refreshPurchases(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "ios") return owned;
  try {
    const { owned: real } = await StoreKitPurchases.status();
    return set(real);
  } catch {
    return owned;
  }
}

export async function removeAdsPrice(): Promise<string | null> {
  if (Capacitor.getPlatform() !== "ios") return null;
  try {
    const { available, price } = await StoreKitPurchases.price();
    return available && price ? price : null;
  } catch {
    return null;
  }
}

export type PurchaseOutcome = "bought" | "cancelled" | "pending" | "failed";

export async function buyRemoveAds(): Promise<PurchaseOutcome> {
  if (Capacitor.getPlatform() !== "ios") return "failed";
  try {
    const result = await StoreKitPurchases.purchase();
    if (result.owned) {
      set(true);
      return "bought";
    }
    if (result.pending) return "pending";
    return result.cancelled ? "cancelled" : "failed";
  } catch {
    return "failed";
  }
}

/** "I already paid, on my old phone." */
export async function restorePurchases(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "ios") return false;
  try {
    const { owned: real } = await StoreKitPurchases.restore();
    return set(real);
  } catch {
    return owned;
  }
}
