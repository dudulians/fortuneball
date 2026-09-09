import type { Lang } from "./answers";
import type { HistoryEntry } from "./history";
import { t } from "./i18n";

interface Props {
  entry: HistoryEntry;
  lang: Lang;
  onOutcome: (entry: HistoryEntry, outcome: "yes" | "no" | "later") => void;
}

/** "Did it come true?" — shown when a reminder is tapped or a check-in is due. */
export default function CheckInCard({ entry, lang, onOutcome }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal checkin-card" role="dialog" aria-modal="true" aria-labelledby="checkin-title">
        <h2 id="checkin-title" className="modal-title">
          {t(lang, "checkInTitle")}
        </h2>
        <p className="checkin-line">
          <span className="checkin-label">{t(lang, "youAsked")}</span> “{entry.question}”
        </p>
        <p className="checkin-line">
          <span className="checkin-label">{t(lang, "ballSaid")}</span> {entry.answerLabel}
        </p>
        <div className="checkin-actions">
          <button className="outcome outcome-yes" onClick={() => onOutcome(entry, "yes")}>
            {t(lang, "outcomeYes")}
          </button>
          <button className="outcome outcome-no" onClick={() => onOutcome(entry, "no")}>
            {t(lang, "outcomeNo")}
          </button>
          <button className="outcome outcome-later" onClick={() => onOutcome(entry, "later")}>
            {t(lang, "outcomeLater")}
          </button>
        </div>
      </div>
    </div>
  );
}
