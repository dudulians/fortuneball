import type { Lang } from "./answers";
import { t } from "./i18n";

interface Props {
  lang: Lang;
  options: string[];
  onChange: (options: string[]) => void;
  recent: string[][];
  disabled?: boolean;
}

const MAX_OPTIONS = 4;
const MAX_LEN = 40;

/** The "choose" mode: two to four options, plus the last few sets for one-tap reuse. */
export default function ChooseInputs({ lang, options, onChange, recent, disabled }: Props) {
  const set = (i: number, value: string) => {
    const next = options.slice();
    next[i] = value.slice(0, MAX_LEN);
    onChange(next);
  };
  const remove = (i: number) => onChange(options.filter((_, j) => j !== i));
  const add = () => {
    if (options.length < MAX_OPTIONS) onChange([...options, ""]);
  };

  return (
    <div className="choose">
      <div className="options">
        {options.map((o, i) => (
          <div className="option" key={i}>
            <input
              type="text"
              value={o}
              maxLength={MAX_LEN}
              placeholder={`${t(lang, "option")} ${i + 1}`}
              aria-label={`${t(lang, "option")} ${i + 1}`}
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              disabled={disabled}
              onChange={(e) => set(i, e.target.value)}
            />
            {options.length > 2 && (
              <button type="button" className="option-remove" onClick={() => remove(i)} aria-label={t(lang, "removeOption")}>
                ×
              </button>
            )}
          </div>
        ))}
        {options.length < MAX_OPTIONS && (
          <button type="button" className="option-add" onClick={add} aria-label={t(lang, "addOption")}>
            +
          </button>
        )}
      </div>

      {recent.length > 0 && (
        <div className="recent">
          <span className="recent-label">{t(lang, "recentLabel")}:</span>
          {recent.slice(0, 3).map((setOptions, i) => (
            <button type="button" className="chip" key={i} onClick={() => onChange(setOptions.slice())}>
              {setOptions.join(" · ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
