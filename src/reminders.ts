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

/**
 * Every pending check-in lands on one of a few daily slots, and each slot gets
 * a single notification.
 *
 * One notification per question was the first design, and a week of ordinary
 * use turned into a burst of eight alerts in the same minute — nobody wants a
 * toy that behaves like a task manager. The slot is early evening, when a day
 * has actually had a chance to come true.
 */
const CHECK_HOUR = 19;
/** iOS caps pending local notifications; a couple of weeks ahead is plenty. */
const MAX_SCHEDULED_DAYS = 8;

/** The evening on or after `at` when its question gets asked about. */
function slotFor(at: number): number {
  const slot = new Date(at);
  slot.setHours(CHECK_HOUR, 0, 0, 0);
  if (slot.getTime() < at) slot.setDate(slot.getDate() + 1);
  return slot.getTime();
}

function idForSlot(at: number): number {
  const d = new Date(at);
  return Number(`${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

/**
 * Rebuilds the whole schedule from the journal: one notification per evening
 * that has questions waiting, however many questions that is. Call it after
 * anything that adds, resolves or deletes a question.
 */
export async function syncCheckInReminders(entries: HistoryEntry[], lang: Lang, enabled: boolean): Promise<void> {
  if (!remindersAvailable()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel(pending);
  } catch {
    // nothing pending
  }
  if (!enabled) return;

  const waiting = entries.filter((e) => e.kind === "question" && e.checkAt !== undefined && !e.outcome);
  const byEvening = new Map<number, HistoryEntry[]>();
  const now = Date.now();
  for (const e of waiting) {
    const at = slotFor(e.checkAt as number);
    if (at <= now) continue; // already due — the journal badge carries those
    byEvening.set(at, [...(byEvening.get(at) ?? []), e]);
  }

  const evenings = [...byEvening.entries()].sort((a, b) => a[0] - b[0]).slice(0, MAX_SCHEDULED_DAYS);
  if (!evenings.length) return;

  try {
    await LocalNotifications.schedule({
      notifications: evenings.map(([at, list]) => {
        const one = list.length === 1 ? list[0] : null;
        return {
          id: idForSlot(at),
          title: t(lang, "appName"),
          body: one
            ? `${t(lang, "youAsked")} “${one.question}”. ${t(lang, "ballSaid")} “${one.answerLabel}”. ${t(lang, "checkInTitle")}`
            : t(lang, "questionsWaiting").replace("%n", String(list.length)),
          schedule: { at: new Date(at) },
          extra: one ? { entryId: one.id } : {},
        };
      }),
    });
  } catch {
    // Permission revoked, or the OS refused — the journal still shows everything.
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
