import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Lang } from "./answers";
import type { HistoryEntry } from "./history";
import { t } from "./i18n";

/**
 * "Did it come true?" reminders as local notifications (native only; the
 * browser preview silently does nothing). Permission is asked the first time
 * a question is saved, never at launch.
 */

export function remindersAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function ensureReminderPermission(): Promise<boolean> {
  if (!remindersAvailable()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    const asked = await LocalNotifications.requestPermissions();
    return asked.display === "granted";
  } catch {
    return false;
  }
}

/** Stable 31-bit id from the entry id, so rescheduling replaces the old notification. */
export function notificationIdFor(entryId: string): number {
  let h = 2166136261;
  for (let i = 0; i < entryId.length; i++) {
    h ^= entryId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2147483647 || 1;
}

export async function scheduleCheckIn(entry: HistoryEntry, lang: Lang): Promise<number | undefined> {
  if (!remindersAvailable() || !entry.checkAt) return undefined;
  const id = notificationIdFor(entry.id);
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // nothing scheduled yet
  }
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: t(lang, "appName"),
          body: `${t(lang, "youAsked")} “${entry.question}”. ${t(lang, "ballSaid")} “${entry.answerLabel}”. ${t(lang, "checkInTitle")}`,
          schedule: { at: new Date(entry.checkAt) },
          extra: { entryId: entry.id },
        },
      ],
    });
    return id;
  } catch {
    return undefined;
  }
}

export async function cancelCheckIn(notificationId?: number): Promise<void> {
  if (!remindersAvailable() || !notificationId) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch {
    // ignore
  }
}

/** Fires with the entry id when the person taps a reminder. */
export function onReminderTap(cb: (entryId: string) => void): () => void {
  if (!remindersAvailable()) return () => {};
  let handle: { remove: () => Promise<void> } | undefined;
  let disposed = false;
  LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const entryId = (action.notification.extra as { entryId?: string } | undefined)?.entryId;
    if (entryId) cb(entryId);
  })
    .then((h) => {
      handle = h;
      if (disposed) void h.remove();
    })
    .catch(() => {});
  return () => {
    disposed = true;
    void handle?.remove();
  };
}
