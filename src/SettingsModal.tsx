import { useEffect, useState } from "react";
import type { Settings } from "./settings";
import { t } from "./i18n";
import { buyRemoveAds, hasRemovedAds, purchasesSupported, removeAdsPrice, restorePurchases } from "./purchases";

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  /** The purchase changed — the app stops preparing ads. */
  onAdsRemoved: () => void;
}

export default function SettingsModal({ open, settings, onChange, onClose, onAdsRemoved }: Props) {
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const removed = hasRemovedAds();
  const onDevice = purchasesSupported();

  // The App Store knows the price in this person's currency — ask only when the
  // row is actually on screen, and only while there is something to sell.
  useEffect(() => {
    if (!open || removed) return;
    let alive = true;
    removeAdsPrice()
      .then((p) => alive && setPrice(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, removed]);

  if (!open) return null;
  const lang = settings.lang;

  const buy = async () => {
    setBusy(true);
    setNote(null);
    const outcome = await buyRemoveAds();
    setBusy(false);
    if (outcome === "bought") {
      onAdsRemoved();
      setNote(t(lang, "removeAdsDone"));
    } else if (outcome === "pending") {
      setNote(t(lang, "purchasePending"));
    } else if (outcome === "failed") {
      setNote(t(lang, "purchaseFailed"));
    }
  };

  const restore = async () => {
    setBusy(true);
    setNote(null);
    const owned = await restorePurchases();
    setBusy(false);
    if (owned) {
      onAdsRemoved();
      setNote(t(lang, "removeAdsDone"));
    } else {
      setNote(t(lang, "restoreNothing"));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="modal-title">
          {t(lang, "settings")}
        </h2>

        <label className="row">
          <span>{t(lang, "sound")}</span>
          <input
            type="checkbox"
            className="toggle"
            checked={settings.sound}
            onChange={(e) => onChange({ sound: e.target.checked })}
          />
        </label>

        <label className="row">
          <span>{t(lang, "vibration")}</span>
          <input
            type="checkbox"
            className="toggle"
            checked={settings.haptics}
            onChange={(e) => onChange({ haptics: e.target.checked })}
          />
        </label>

        <label className="row">
          <span>{t(lang, "reminders")}</span>
          <input
            type="checkbox"
            className="toggle"
            checked={settings.reminders}
            onChange={(e) => onChange({ reminders: e.target.checked })}
          />
        </label>

        <div className="row">
          <span>{t(lang, "language")}</span>
          <div className="segmented" role="radiogroup" aria-label={t(lang, "language")}>
            <button
              type="button"
              role="radio"
              aria-checked={lang === "en"}
              className={lang === "en" ? "active" : ""}
              onClick={() => onChange({ lang: "en" })}
            >
              EN
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={lang === "ru"}
              className={lang === "ru" ? "active" : ""}
              onClick={() => onChange({ lang: "ru" })}
            >
              RU
            </button>
          </div>
        </div>

        {/* On the phone both rows always show. Hiding them when the App Store is
            slow to answer left someone who had already paid with no way to
            restore — and no way to tell "not for sale" from "not loaded yet". */}
        {onDevice && !removed && (
          <div className="row">
            <span>{t(lang, "removeAds")}</span>
            <button type="button" className="buy-btn" disabled={busy || !price} onClick={() => void buy()}>
              {price ?? "—"}
            </button>
          </div>
        )}

        {onDevice &&
          (removed ? (
            <p className="settings-note">{t(lang, "removeAdsDone")}</p>
          ) : (
            <button type="button" className="restore-btn" disabled={busy} onClick={() => void restore()}>
              {t(lang, "restorePurchase")}
            </button>
          ))}

        {note && <p className="settings-note">{note}</p>}

        <button className="modal-close" onClick={onClose}>
          {t(lang, "done")}
        </button>
      </div>
    </div>
  );
}
