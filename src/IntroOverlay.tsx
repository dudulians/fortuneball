import type { Lang } from "./answers";
import { t } from "./i18n";
import { requestMotionPermission } from "./motion";
import { unlockAudio } from "./sound";
import { BALL_IDLE_SRC } from "./Ball";

interface Props {
  open: boolean;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onDismiss: () => void;
}

export default function IntroOverlay({ open, lang, onLang, onDismiss }: Props) {
  if (!open) return null;

  const start = async () => {
    // Both must run inside the tap handler: iOS only grants motion access
    // and unlocks audio from a user gesture.
    unlockAudio();
    await requestMotionPermission();
    onDismiss();
  };

  return (
    <div className="intro-backdrop">
      <div className="intro-lang mode-switch" role="radiogroup" aria-label="Language">
        <button role="radio" aria-checked={lang === "en"} className={lang === "en" ? "active" : ""} onClick={() => onLang("en")}>
          EN
        </button>
        <button role="radio" aria-checked={lang === "ru"} className={lang === "ru" ? "active" : ""} onClick={() => onLang("ru")}>
          RU
        </button>
      </div>
      <div className="intro">
        <img className="intro-ball" src={BALL_IDLE_SRC} alt="" draggable={false} />
        <h2 className="intro-title">{t(lang, "appName")}</h2>
        <p className="intro-sub">{t(lang, "tagline")}</p>

        <ol className="intro-steps">
          <li>
            <span className="step-num">1</span>
            {t(lang, "introStep1")}
          </li>
          <li>
            <span className="step-num">2</span>
            {t(lang, "introStep2")}
          </li>
          <li>
            <span className="step-num">3</span>
            {t(lang, "introStep3")}
          </li>
        </ol>

        <button className="intro-start" onClick={start}>
          {t(lang, "start")}
        </button>
      </div>
    </div>
  );
}
