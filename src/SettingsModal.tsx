import type { Settings } from "./settings";
import { t } from "./i18n";

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

export default function SettingsModal({ open, settings, onChange, onClose }: Props) {
  if (!open) return null;
  const lang = settings.lang;

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

        <button className="modal-close" onClick={onClose}>
          {t(lang, "done")}
        </button>
      </div>
    </div>
  );
}
