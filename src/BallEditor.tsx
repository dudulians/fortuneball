import { useState } from "react";
import type { Lang, Tone } from "./answers";
import { t } from "./i18n";
import {
  MAX_ANSWERS,
  MAX_ANSWER_LEN,
  MIN_ANSWERS,
  type BallHue,
  type CustomAnswer,
  type CustomBall,
} from "./customBall";

interface Props {
  open: boolean;
  lang: Lang;
  ball: CustomBall;
  onChange: (ball: CustomBall) => void;
  onClose: () => void;
}

const HUES: { key: BallHue; swatch: string }[] = [
  { key: "blue", swatch: "#2a5cdb" },
  { key: "violet", swatch: "#9e7af5" },
  { key: "amber", swatch: "#edbc4d" },
  { key: "green", swatch: "#3fb37a" },
  { key: "rose", swatch: "#e0668f" },
];

const TONES: Tone[] = ["positive", "neutral", "negative"];
const toneMark: Record<Tone, string> = { positive: "+", neutral: "~", negative: "−" };

/**
 * Your own ball: your answers, your colour, your name for it.
 *
 * The tone marks next to each answer are not decoration — the journal needs to
 * know which of your answers mean yes and which mean no, or the accuracy score
 * has nothing to count.
 */
export default function BallEditor({ open, lang, ball, onChange, onClose }: Props) {
  const [draft, setDraft] = useState("");
  if (!open) return null;

  const set = (patch: Partial<CustomBall>) => onChange({ ...ball, ...patch });
  const enough = ball.answers.length >= MIN_ANSWERS;

  const addAnswer = () => {
    const text = draft.trim().slice(0, MAX_ANSWER_LEN);
    if (!text || ball.answers.length >= MAX_ANSWERS) return;
    const answer: CustomAnswer = { id: `c${Date.now().toString(36)}`, text, tone: "positive" };
    set({ answers: [...ball.answers, answer] });
    setDraft("");
  };

  const editAnswer = (id: string, patch: Partial<CustomAnswer>) =>
    set({ answers: ball.answers.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  const removeAnswer = (id: string) => {
    const answers = ball.answers.filter((a) => a.id !== id);
    set({ answers, enabled: answers.length >= MIN_ANSWERS && ball.enabled });
  };

  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ball-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-body">
          <h2 id="ball-editor-title" className="modal-title">
            {t(lang, "myBall")}
          </h2>
          <p className="editor-intro">{t(lang, "myBallIntro")}</p>

          <label className="row">
            <span>{t(lang, "myBallUse")}</span>
            <input
              type="checkbox"
              className="toggle"
              checked={ball.enabled}
              disabled={!enough}
              onChange={(e) => set({ enabled: e.target.checked })}
            />
          </label>
          {!enough && <p className="editor-hint">{t(lang, "myBallNeedMore")}</p>}

          <label className="row">
            <span>{t(lang, "myBallName")}</span>
            <input
              className="editor-input name"
              type="text"
              value={ball.name}
              maxLength={24}
              placeholder={t(lang, "myBallNamePlaceholder")}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>

          <div className="row">
            <span>{t(lang, "myBallColour")}</span>
            <div className="hues" role="radiogroup" aria-label={t(lang, "myBallColour")}>
              {HUES.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  role="radio"
                  aria-checked={ball.hue === h.key}
                  aria-label={t(lang, `hue_${h.key}` as never)}
                  className={`hue ${ball.hue === h.key ? "active" : ""}`}
                  style={{ background: h.swatch }}
                  onClick={() => set({ hue: h.key })}
                />
              ))}
            </div>
          </div>

          <h3 className="editor-section">
            {t(lang, "myBallAnswers")} · {ball.answers.length}/{MAX_ANSWERS}
          </h3>

          <ul className="answer-list">
            {ball.answers.map((a) => (
              <li className="answer-row" key={a.id}>
                <input
                  className="editor-input"
                  type="text"
                  value={a.text}
                  maxLength={MAX_ANSWER_LEN}
                  aria-label={t(lang, "myBallAnswers")}
                  onChange={(e) => editAnswer(a.id, { text: e.target.value.slice(0, MAX_ANSWER_LEN) })}
                />
                <div className="tone-pick" role="radiogroup" aria-label={t(lang, "myBallTone")}>
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      role="radio"
                      aria-checked={a.tone === tone}
                      aria-label={t(lang, `tone_${tone}` as never)}
                      className={`tone-chip ${tone} ${a.tone === tone ? "active" : ""}`}
                      onClick={() => editAnswer(a.id, { tone })}
                    >
                      {toneMark[tone]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="answer-remove"
                  aria-label={t(lang, "deleteEntry")}
                  onClick={() => removeAnswer(a.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {ball.answers.length < MAX_ANSWERS && (
            <form
              className="answer-add"
              onSubmit={(e) => {
                e.preventDefault();
                addAnswer();
              }}
            >
              <input
                className="editor-input"
                type="text"
                value={draft}
                maxLength={MAX_ANSWER_LEN}
                placeholder={t(lang, "myBallAddPlaceholder")}
                aria-label={t(lang, "myBallAdd")}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="answer-add-btn" disabled={!draft.trim()}>
                {t(lang, "myBallAdd")}
              </button>
            </form>
          )}

          <p className="editor-hint">{t(lang, "myBallLengthHint")}</p>
        </div>

        <button className="modal-close" onClick={onClose}>
          {t(lang, "done")}
        </button>
      </div>
    </div>
  );
}
