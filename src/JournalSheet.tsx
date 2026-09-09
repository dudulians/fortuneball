import { useEffect, useState } from "react";
import type { Lang } from "./answers";
import { SPECIAL_ANSWERS, answerText } from "./answers";
import { accuracy, isCheckable, isDodge, type HistoryEntry } from "./history";
import { t } from "./i18n";
import { shakesToNextGolden, type Stats } from "./stats";

interface Props {
  open: boolean;
  /** Which tab to show when the sheet opens. */
  initialTab?: "answers" | "collection";
  lang: Lang;
  entries: HistoryEntry[];
  stats: Stats;
  onClose: () => void;
  onResolve: (entry: HistoryEntry, outcome: "yes" | "no") => void;
  onDelete: (entry: HistoryEntry) => void;
  onDeleteMany: (entries: HistoryEntry[]) => void;
  onClearAll: () => void;
  onShareAccuracy: () => void;
  sharing: boolean;
}

function statusOf(e: HistoryEntry, lang: Lang): { label: string; cls: string } {
  if (e.kind === "choice") return { label: "", cls: "" };
  if (e.outcome === "yes") return { label: t(lang, "statusYes"), cls: "is-yes" };
  if (e.outcome === "no") return { label: t(lang, "statusNo"), cls: "is-no" };
  if (e.outcome === "unknown") return { label: t(lang, "statusUnknown"), cls: "is-unknown" };
  if (e.rarity) return { label: t(lang, e.rarity === "cosmic" ? "cosmic" : "golden"), cls: "is-rare" };
  if (isDodge(e)) return { label: t(lang, "statusAskAgain"), cls: "is-unknown" };
  return { label: t(lang, "statusWaiting"), cls: "is-waiting" };
}

function dateLabel(ms: number, lang: Lang): string {
  try {
    return new Date(ms).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

/** History with the accuracy stat, and the collection of rare answers. */
export default function JournalSheet({
  open,
  initialTab,
  lang,
  entries,
  stats,
  onClose,
  onResolve,
  onDelete,
  onDeleteMany,
  onClearAll,
  onShareAccuracy,
  sharing,
}: Props) {
  const [tab, setTab] = useState<"answers" | "collection">("answers");
  const [confirmClear, setConfirmClear] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const toggleFlip = (id: string) => {
    const next = new Set(flipped);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFlipped(next);
  };

  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  const acc = accuracy(entries);
  const list = entries.slice().reverse();
  const toNextGolden = shakesToNextGolden(stats);
  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const foundCount = SPECIAL_ANSWERS.filter((a) => stats.found[a.id]).length;

  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t(lang, "journal")} onClick={(e) => e.stopPropagation()}>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "answers"} className={tab === "answers" ? "active" : ""} onClick={() => setTab("answers")}>
            {t(lang, "tabAnswers")}
          </button>
          <button role="tab" aria-selected={tab === "collection"} className={tab === "collection" ? "active" : ""} onClick={() => setTab("collection")}>
            {t(lang, "tabCollection")} · {foundCount}/{SPECIAL_ANSWERS.length}
          </button>
        </div>

        {tab === "answers" && (
          <div className="sheet-body">
            <div className="accuracy">
              <div className="accuracy-title">{t(lang, "accuracyTitle")}</div>
              {acc.percent === null ? (
                <div className="accuracy-none">{t(lang, "accuracyNone")}</div>
              ) : (
                <>
                  <div className="accuracy-value">{acc.percent}%</div>
                  <div className="accuracy-sub">
                    {t(lang, "accuracyChecked")} {acc.hits} {t(lang, "of")} {acc.checked}
                  </div>
                  <button className="share-btn small" onClick={onShareAccuracy} disabled={sharing}>
                    {t(lang, "share")}
                  </button>
                </>
              )}
            </div>

            {list.length === 0 ? (
              <p className="empty">{t(lang, "emptyHistory")}</p>
            ) : (
              <>
                <div className="list-tools">
                  {selecting ? (
                    <>
                      <button
                        className="outcome outcome-yes"
                        disabled={selected.size === 0}
                        onClick={() => {
                          onDeleteMany(list.filter((e) => selected.has(e.id)));
                          stopSelecting();
                        }}
                      >
                        {t(lang, "deleteSelected")} ({selected.size})
                      </button>
                      <button className="text-button" onClick={stopSelecting}>
                        {t(lang, "cancel")}
                      </button>
                    </>
                  ) : confirmClear ? (
                    <>
                      <span className="resolve-label">{t(lang, "confirmClear")}</span>
                      <button
                        className="outcome outcome-yes"
                        onClick={() => {
                          setConfirmClear(false);
                          onClearAll();
                        }}
                      >
                        {t(lang, "yesDelete")}
                      </button>
                      <button className="text-button" onClick={() => setConfirmClear(false)}>
                        {t(lang, "cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="text-button" onClick={() => setSelecting(true)}>
                        {t(lang, "select")}
                      </button>
                      <button className="text-button" onClick={() => setConfirmClear(true)}>
                        {t(lang, "clearAll")}
                      </button>
                    </>
                  )}
                </div>

                <ul className="entries">
                  {list.map((e) => {
                    const s = statusOf(e, lang);
                    const isOpen = isCheckable(e);
                    const repeats = e.repeats ?? [];
                    const checked = selected.has(e.id);
                    return (
                      <li className={`entry ${e.rarity ?? ""} ${selecting ? "selecting" : ""}`} key={e.id}>
                        <div className="entry-head">
                          {selecting && (
                            <button
                              className={`check ${checked ? "on" : ""}`}
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => toggleSelected(e.id)}
                              aria-label={e.question}
                            >
                              {checked && (
                                <svg viewBox="0 0 24 24" aria-hidden>
                                  <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />
                                </svg>
                              )}
                            </button>
                          )}
                          <div className="entry-q">{e.question}</div>
                          <span className="entry-date">{dateLabel(e.askedAt, lang)}</span>
                          {!selecting && (
                            <button className="entry-delete" onClick={() => onDelete(e)} aria-label={t(lang, "deleteEntry")}>
                              <svg viewBox="0 0 24 24" aria-hidden>
                                <path
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 7h14M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        <div className="entry-a">
                          <span className="entry-a-label">{t(lang, "ballSaid")} </span>
                          {e.answerLabel}
                          {repeats.length > 0 && (
                            <span className="repeat-badge" title={t(lang, "askedAgain")}>
                              ×{repeats.length + 1}
                            </span>
                          )}
                        </div>
                        {repeats.length > 0 && (
                          <div className="entry-repeats">
                            <span className="entry-a-label">{t(lang, "earlierAnswers")} </span>
                            {repeats
                              .slice(-3)
                              .map((r) => r.answerLabel)
                              .join(" · ")}
                          </div>
                        )}

                        {e.kind === "question" &&
                          (isOpen ? (
                            <div className="entry-resolve">
                              <span className="resolve-label">{t(lang, "checkInTitle")}</span>
                              <div className="entry-resolve-buttons">
                                <button className="outcome outcome-yes" onClick={() => onResolve(e, "yes")}>
                                  {t(lang, "outcomeYes")}
                                </button>
                                <button className="outcome outcome-no" onClick={() => onResolve(e, "no")}>
                                  {t(lang, "outcomeNo")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="entry-resolve">
                              <span className="resolve-label">{t(lang, "checkInTitle")}</span>
                              <span className={`status ${s.cls}`}>{s.label}</span>
                            </div>
                          ))}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}

        {tab === "collection" && (
          <div className="sheet-body">
            <p className="collection-intro">{t(lang, "collectionIntro")}</p>
            <p className="collection-progress">
              {t(lang, "collectionFound")} {foundCount} {t(lang, "of")} {SPECIAL_ANSWERS.length} · {t(lang, "shakesSoFar")}: {stats.shakes}
              <span className="collection-first">
                {" · "}
                {toNextGolden > 0
                  ? `${t(lang, "nextGoldenIn")} ${toNextGolden} ${t(lang, "shakesWord")}`
                  : t(lang, "nextGoldenNow")}
              </span>
            </p>
            <ul className="slots">
              {SPECIAL_ANSWERS.map((a) => {
                const found = !!stats.found[a.id];
                const kind = t(lang, a.rarity === "cosmic" ? "cosmic" : "golden");
                if (!found) {
                  return (
                    <li className={`slot ${a.rarity}`} key={a.id}>
                      <span className="slot-kind">{kind}</span>
                      <span className="slot-text">???</span>
                      <span className="slot-hint">{t(lang, "collectionHint")}</span>
                    </li>
                  );
                }
                const question = (stats.foundQuestion[a.id] ?? "").trim();
                const isFlipped = flipped.has(a.id);
                return (
                  <li className={`slot ${a.rarity} found ${isFlipped ? "flipped" : ""}`} key={a.id}>
                    <button className="slot-inner" onClick={() => toggleFlip(a.id)} aria-pressed={isFlipped} aria-label={`${kind}: ${answerText(a, lang).replace(/\n/g, " ")}`}>
                      <span className="slot-face slot-front">
                        <span className="slot-kind">{kind}</span>
                        <span className="slot-text">{answerText(a, lang).replace(/\n/g, " ")}</span>
                        <span className="slot-hint">{dateLabel(stats.found[a.id], lang)}</span>
                      </span>
                      <span className="slot-face slot-back">
                        {question ? (
                          <>
                            <span className="slot-kind">{t(lang, "cardQuestion")}</span>
                            <span className="slot-question">{question}</span>
                          </>
                        ) : (
                          <span className="slot-question muted">{t(lang, "askedSilently")}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button className="modal-close" onClick={onClose}>
          {t(lang, "done")}
        </button>
      </div>
    </div>
  );
}
