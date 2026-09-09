import { useCallback, useEffect, useRef, useState } from "react";
import { ANSWERS, CHOICE_ID, findAnswer, makeChoiceAnswer, answerText, type Answer } from "./answers";
import Ball, { type Phase } from "./Ball";
import SettingsModal from "./SettingsModal";
import IntroOverlay from "./IntroOverlay";
import JournalSheet from "./JournalSheet";
import CheckInCard from "./CheckInCard";
import ChooseInputs from "./ChooseInputs";
import Sparkles from "./Sparkles";
import { useSettings } from "./settings";
import { t } from "./i18n";
import {
  DAY_MS,
  MAX_SNOOZES,
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  dueCheckIns,
  loadHistory,
  recordQuestion,
  updateHistoryEntry,
  type HistoryEntry,
} from "./history";
import { listenForShake, listenForTilt, requestMotionPermission, tiltState } from "./motion";
import { joltHaptic, startRattleHaptics, revealHaptic, tapHaptic } from "./haptics";
import { playBloopSound, playKnockSound, playShakeSound, unlockAudio } from "./sound";
import { useWobble } from "./useWobble";
import { GLOW, renderAccuracyCard, renderShareCard } from "./shareCard";
import { shareImage } from "./share";
import { isSpeechAvailable, startListening, stopListening } from "./speech";
import { useExampleRotation } from "./examples";
import { isGoldenDue, loadStats, recordFoundQuestion, rollAnswer, type Stats } from "./stats";
import { loadRecentChoices, rememberChoice } from "./choices";
import { wrapForDie } from "./wrapText";
import { cancelCheckIn, ensureReminderPermission, onReminderTap, scheduleCheckIn } from "./reminders";
import { accuracy } from "./history";

const SHAKE_MS = 1300;   // a tap-driven shake: ball rattles, "8" face turns away
const MIN_SHAKE_MS = 900; // a real shake never ends before this, even if the hand stops early
const MAX_SHAKE_MS = 8000;  // …and never lasts longer than this: the die "decides" on its own
const RISE_MS = 1150;    // die surfaces through the liquid
const KICK_EVERY_MS = 115;
const COOLDOWN_MS = 350;
const MAX_QUESTION = 120;
const CHECK_IN_DAYS = [1, 3, 7, 30] as const;
const DEFAULT_CHECK_IN_DAYS = 7;

type Mode = "yesno" | "choose";

export default function App() {
  const [settings, updateSettings] = useSettings();
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [bubbleSeed, setBubbleSeed] = useState(0);
  const [sparkleSeed, setSparkleSeed] = useState(0);
  const [question, setQuestion] = useState("");
  /** The question the current answer was given to (the field itself is cleared after the answer). */
  const [askedQuestion, setAskedQuestion] = useState("");
  const [mode, setMode] = useState<Mode>("yesno");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [recent, setRecent] = useState<string[][]>(() => loadRecentChoices());
  const [chooseHint, setChooseHint] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalTab, setJournalTab] = useState<"answers" | "collection">("answers");
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory());
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [checkIn, setCheckIn] = useState<HistoryEntry | null>(null);
  const [goldenConfirm, setGoldenConfirm] = useState(false);
  const goldenDecisionRef = useRef<"spend" | "skip" | null>(null);
  const [lastEntry, setLastEntry] = useState<HistoryEntry | null>(null);
  const [checkDays, setCheckDays] = useState<number>(DEFAULT_CHECK_IN_DAYS);
  // the reminder pill is open, showing the four intervals instead of the action row
  const [pickingDays, setPickingDays] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);

  const busyRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const shakeSourceRef = useRef<"tap" | "motion">("tap");
  const shakeStartedAtRef = useRef(0);
  const shakeFinishedRef = useRef(false);
  const stopRattleRef = useRef<(() => void) | null>(null);
  const pendingFinishRef = useRef(0);
  const safetyFinishRef = useRef(0);
  const forceSpecialRef = useRef<string | undefined>(undefined);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const questionRef = useRef(question);
  questionRef.current = question;
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const answerRef = useRef(answer);
  answerRef.current = answer;
  const timersRef = useRef<number[]>([]);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { ref: wobbleRef, kick } = useWobble<HTMLDivElement>();

  const lang = settings.lang;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Dev-only console hook: window.__fortune.setAnswer("p05") / setLang("ru") / forceSpecial("g01")
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __fortune?: unknown }).__fortune = {
      setAnswer: (id: string) => {
        const a = findAnswer(id);
        if (!a) return false;
        setAnswer(a);
        setPhase("shown");
        return true;
      },
      setLang: (l: "en" | "ru") => updateSettings({ lang: l }),
      ids: ANSWERS.map((a) => a.id),
      phase: () => phaseRef.current,
      forceSpecial: (id: string) => {
        forceSpecialRef.current = id;
      },
      setMode: (m: Mode) => setMode(m),
    };
  }, [updateSettings]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const refreshEntries = useCallback(() => setEntries(loadHistory()), []);

  /** Schedules (or re-schedules) the "did it come true?" reminder for a question. */
  const armReminder = useCallback(async (entry: HistoryEntry) => {
    if (!settingsRef.current.reminders || !entry.checkAt) return;
    const ok = await ensureReminderPermission();
    if (!ok) return;
    const id = await scheduleCheckIn(entry, settingsRef.current.lang);
    if (id) updateHistoryEntry(entry.id, { notificationId: id });
  }, []);

  /** The shake is over (hand stopped, or the tap-driven rattle ran out): the die surfaces. */
  const finishShake = useCallback(() => {
    if (phaseRef.current !== "shaking" || shakeFinishedRef.current) return;
    shakeFinishedRef.current = true;
    window.clearTimeout(pendingFinishRef.current);
    window.clearTimeout(safetyFinishRef.current);
    stopRattleRef.current?.();
    stopRattleRef.current = null;

    let next: Answer;
    let chosenOptions: string[] | null = null;
    if (modeRef.current === "choose") {
      chosenOptions = optionsRef.current.map((o) => o.trim()).filter(Boolean);
      const pick = chosenOptions[Math.floor(Math.random() * chosenOptions.length)];
      next = makeChoiceAnswer(wrapForDie(pick));
      setRecent(rememberChoice(chosenOptions));
    } else {
      const rolled = rollAnswer(answerRef.current?.id, forceSpecialRef.current, {
        skipGolden: goldenDecisionRef.current === "skip",
      });
      forceSpecialRef.current = undefined;
      goldenDecisionRef.current = null;
      setStats(rolled.stats);
      next = rolled.answer;
    }

    setAnswer(next);
    setBubbleSeed((s) => s + 1);
    setPhase("rising");

    later(() => playBloopSound(settingsRef.current.sound), 380);

    later(() => {
      setPhase("shown");
      void revealHaptic(settingsRef.current.haptics);
      if (next.rarity) {
        setSparkleSeed((s) => s + 1);
        later(() => void revealHaptic(settingsRef.current.haptics), 260);
      }

      const label = answerText(next, settingsRef.current.lang).replace(/\n/g, " ");
      if (chosenOptions) {
        addHistoryEntry({
          kind: "choice",
          question: chosenOptions.join(" · "),
          answerId: CHOICE_ID,
          answerLabel: label,
          tone: "positive",
          lang: settingsRef.current.lang,
        });
        setLastEntry(null);
      } else {
        const q = questionRef.current.trim();
        setAskedQuestion(q);
        // A rare answer remembers the question it came up for (shown on the back of its card)
        if (next.rarity) setStats(recordFoundQuestion(next.id, q));
        // The field empties so the next example question appears right away;
        // the question itself lives on in the journal and on the share card.
        setQuestion("");
        if (q) {
          // The same open question asked again folds into its first entry (marked ×N);
          // only the first answer gets the "did it come true?" check.
          // Rare answers and "ask later" dodges get no check-in.
          const checkable = !next.rarity && next.tone !== "neutral";
          const { entry, repeated } = recordQuestion({
            question: q,
            answerId: next.id,
            answerLabel: label,
            tone: next.tone,
            rarity: next.rarity,
            lang: settingsRef.current.lang,
            checkAt: checkable ? Date.now() + DEFAULT_CHECK_IN_DAYS * DAY_MS : undefined,
          });
          if (repeated) {
            setLastEntry(entry.checkAt ? entry : null);
            setCheckDays(entry.checkAt ? Math.max(1, Math.round((entry.checkAt - entry.askedAt) / DAY_MS)) : DEFAULT_CHECK_IN_DAYS);
          } else {
            setLastEntry(checkable ? entry : null);
            setCheckDays(DEFAULT_CHECK_IN_DAYS);
            if (checkable) void armReminder(entry);
          }
        } else {
          setLastEntry(null);
        }
      }
      refreshEntries();

      later(() => {
        busyRef.current = false;
      }, COOLDOWN_MS);
    }, RISE_MS);
  }, [later, armReminder, refreshEntries]);

  /**
   * Start a shake. A tap plays a fixed rattle; a real shake ("motion") is driven
   * jolt by jolt from the sensor and ends only when the hand stops.
   */
  const beginShake = useCallback(
    (source: "tap" | "motion") => {
      if (busyRef.current) return false;
      if (modeRef.current === "choose" && optionsRef.current.filter((o) => o.trim()).length < 2) {
        setChooseHint(t(settingsRef.current.lang, "needTwoOptions"));
        later(() => setChooseHint(null), 3000);
        return false;
      }
      // A golden answer is due: ask before spending it (the shake starts from the dialog).
      if (modeRef.current === "yesno" && isGoldenDue(loadStats()) && !goldenDecisionRef.current && !forceSpecialRef.current) {
        setGoldenConfirm(true);
        return false;
      }
      busyRef.current = true;
      shakeSourceRef.current = source;
      shakeStartedAtRef.current = performance.now();
      shakeFinishedRef.current = false;

      inputRef.current?.blur();
      (document.activeElement as HTMLElement | null)?.blur?.();
      unlockAudio();
      setPhase("shaking");
      phaseRef.current = "shaking";
      setLastEntry(null);

      if (source === "tap") {
        void tapHaptic(settingsRef.current.haptics);
        playShakeSound(settingsRef.current.sound, SHAKE_MS);
        stopRattleRef.current = startRattleHaptics(settingsRef.current.haptics);

        // Continuous impulses while "shaking", fading out towards the end.
        const started = performance.now();
        const kickLoop = () => {
          const elapsed = performance.now() - started;
          if (elapsed >= SHAKE_MS || phaseRef.current !== "shaking") return;
          kick(1 - (elapsed / SHAKE_MS) * 0.6);
          later(kickLoop, KICK_EVERY_MS);
        };
        kick(1.2);
        later(kickLoop, KICK_EVERY_MS);
        later(finishShake, SHAKE_MS);
      } else {
        // Nothing scripted: every jolt of the hand becomes a knock, a vibration and a wobble.
        safetyFinishRef.current = window.setTimeout(finishShake, MAX_SHAKE_MS);
      }
      return true;
    },
    [kick, later, finishShake]
  );

  const shake = useCallback(async () => {
    beginShake("tap");
  }, [beginShake]);

  // The sensor: the shake lasts as long as the hand moves, and every jolt is felt.
  useEffect(
    () =>
      listenForShake({
        onStart: () => {
          if (phaseRef.current === "shaking" && shakeSourceRef.current === "motion") {
            // the hand paused briefly and resumed: keep the same shake going
            window.clearTimeout(pendingFinishRef.current);
            return;
          }
          beginShake("motion");
        },
        onJolt: (magnitude) => {
          if (phaseRef.current !== "shaking" || shakeSourceRef.current !== "motion") return;
          joltHaptic(settingsRef.current.haptics, magnitude);
          playKnockSound(settingsRef.current.sound, magnitude / 30);
          kick(Math.min(1.6, magnitude / 16));
        },
        onStop: () => {
          if (phaseRef.current !== "shaking" || shakeSourceRef.current !== "motion") return;
          const elapsed = performance.now() - shakeStartedAtRef.current;
          window.clearTimeout(pendingFinishRef.current);
          if (elapsed >= MIN_SHAKE_MS) finishShake();
          else pendingFinishRef.current = window.setTimeout(finishShake, MIN_SHAKE_MS - elapsed);
        },
      }),
    [beginShake, finishShake, kick]
  );

  // Tilt → CSS variables on the scene (smoothed in rAF).
  useEffect(() => {
    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };
    let raf = 0;
    const loop = () => {
      cur = { x: cur.x + (target.x - cur.x) * 0.1, y: cur.y + (target.y - cur.y) * 0.1 };
      tiltState.x = cur.x;
      tiltState.y = cur.y;
      const el = sceneRef.current;
      if (el) {
        el.style.setProperty("--tx", cur.x.toFixed(3));
        el.style.setProperty("--ty", cur.y.toFixed(3));
      }
      if (Math.abs(target.x - cur.x) > 0.002 || Math.abs(target.y - cur.y) > 0.002) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };
    const stop = listenForTilt((x, y) => {
      target = { x, y };
      if (!raf) raf = requestAnimationFrame(loop);
    });
    return () => {
      stop();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // "Did it come true?" — when a reminder is tapped, and whenever a check-in is due on open/return.
  useEffect(() => {
    const showDue = () => {
      const due = dueCheckIns();
      if (due.length) setCheckIn(due[0]);
    };
    showDue();
    const onVisible = () => {
      if (!document.hidden) showDue();
    };
    document.addEventListener("visibilitychange", onVisible);
    const stopTap = onReminderTap((entryId) => {
      const entry = loadHistory().find((e) => e.id === entryId);
      if (entry && !entry.outcome) setCheckIn(entry);
    });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      stopTap();
    };
  }, []);

  const onBallTap = () => {
    // Returning users never saw the intro prompt again — ask on first tap.
    void requestMotionPermission();
    void shake();
  };

  useEffect(() => {
    let alive = true;
    isSpeechAvailable()
      .then((ok) => alive && setMicAvailable(ok))
      .catch(() => alive && setMicAvailable(false));
    return () => {
      alive = false;
      void stopListening();
    };
  }, []);

  const toggleMic = async () => {
    if (listening) {
      await stopListening();
      return;
    }
    if (busyRef.current) return;
    setMicHint(null);
    setQuestion("");
    setListening(true);
    inputRef.current?.blur();
    const micLang = settingsRef.current.lang;
    await startListening({
      lang: micLang,
      onPartial: (text) => setQuestion(text.slice(0, MAX_QUESTION)),
      onEnd: (finalText) => {
        setListening(false);
        const q = finalText.slice(0, MAX_QUESTION);
        setQuestion(q);
        // Said something → the ball answers by itself, no extra tap.
        if (q.trim()) later(() => void shake(), 450);
      },
      onError: (err) => {
        setListening(false);
        setMicHint(t(micLang, err === "denied" ? "micDenied" : "micFailed"));
        later(() => setMicHint(null), 4500);
      },
    });
  };

  const onShare = async () => {
    if (!answer || sharing) return;
    setSharing(true);
    setShareFailed(false);
    try {
      const q = mode === "choose" ? options.map((o) => o.trim()).filter(Boolean).join(" · ") : askedQuestion;
      const blob = await renderShareCard({ question: q, answer, lang });
      const text = q.trim()
        ? `${q.trim()} — ${answerText(answer, lang).replace(/\n/g, " ")}`
        : answerText(answer, lang).replace(/\n/g, " ");
      await shareImage(blob, `fortune-ball-${Date.now()}.jpg`, text);
    } catch (err) {
      const name = (err as { name?: string } | undefined)?.name;
      if (name !== "AbortError") setShareFailed(true);
    } finally {
      setSharing(false);
    }
  };

  const onShareAccuracy = async () => {
    const acc = accuracy(entries);
    if (acc.percent === null || sharing) return;
    setSharing(true);
    try {
      const blob = await renderAccuracyCard({ percent: acc.percent, hits: acc.hits, checked: acc.checked, lang });
      await shareImage(blob, `fortune-ball-accuracy-${Date.now()}.jpg`, `${t(lang, "shareAccuracyTitle")} ${acc.percent}%`);
    } catch {
      // cancelled or failed — nothing to do
    } finally {
      setSharing(false);
    }
  };

  /** Chips under the answer: when to ask "did it come true?" */
  const onCheckDays = async (days: number) => {
    if (!lastEntry) return;
    setCheckDays(days);
    const updated = updateHistoryEntry(lastEntry.id, { checkAt: Date.now() + days * DAY_MS });
    if (!updated) return;
    setLastEntry(updated);
    refreshEntries();
    await armReminder(updated);
  };

  const resolveEntry = async (entry: HistoryEntry, outcome: "yes" | "no" | "later") => {
    if (outcome === "later") {
      const snoozes = (entry.snoozes ?? 0) + 1;
      if (snoozes >= MAX_SNOOZES) {
        updateHistoryEntry(entry.id, { outcome: "unknown", snoozes });
        await cancelCheckIn(entry.notificationId);
      } else {
        const updated = updateHistoryEntry(entry.id, { snoozes, checkAt: Date.now() + 7 * DAY_MS });
        if (updated) await armReminder(updated);
      }
    } else {
      updateHistoryEntry(entry.id, { outcome });
      await cancelCheckIn(entry.notificationId);
    }
    refreshEntries();
    const due = dueCheckIns().filter((e) => e.id !== entry.id);
    setCheckIn(due[0] ?? null);
  };

  const deleteEntry = async (entry: HistoryEntry) => {
    const removed = deleteHistoryEntry(entry.id);
    if (removed?.notificationId) await cancelCheckIn(removed.notificationId);
    if (lastEntry?.id === entry.id) setLastEntry(null);
    if (checkIn?.id === entry.id) setCheckIn(null);
    refreshEntries();
  };

  const deleteEntries = async (list: HistoryEntry[]) => {
    for (const e of list) await deleteEntry(e);
  };

  const clearAllEntries = async () => {
    const removed = clearHistory();
    for (const e of removed) if (e.notificationId) await cancelCheckIn(e.notificationId);
    setLastEntry(null);
    setCheckIn(null);
    refreshEntries();
  };

  const examplesActive = mode === "yesno" && !question && !listening && (phase === "idle" || phase === "shown");
  // A fresh example after every shake (bubbleSeed grows once per answer)
  const example = useExampleRotation(lang, examplesActive, 6500, bubbleSeed);

  const decideGolden = (decision: "spend" | "skip") => {
    goldenDecisionRef.current = decision;
    setGoldenConfirm(false);
    beginShake("tap");
  };

  const goldenDue = mode === "yesno" && isGoldenDue(stats);
  const rareShown = phase === "shown" && !!answer?.rarity;
  const hint =
    chooseHint ??
    (phase === "shaking" || phase === "rising"
      ? t(lang, "hintThinking")
      : rareShown
        ? `✦ ${t(lang, answer?.rarity === "cosmic" ? "cosmic" : "golden")} — ${t(lang, "rareFound")}`
        : phase === "shown"
          ? t(lang, "hintAnswered")
          : mode === "choose"
            ? t(lang, "hintChoose")
            : t(lang, "hintIdle"));

  const glow = GLOW[answer?.rarity ?? answer?.tone ?? "positive"];
  const showCheckIn = phase === "shown" && mode === "yesno" && !!lastEntry && !answer?.rarity;
  const dayLabel = (d: number) => t(lang, d === 1 ? "in1Day" : d === 3 ? "in3Days" : d === 7 ? "in1Week" : "in1Month");
  const bellIcon = (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0"
      />
    </svg>
  );

  // a new shake closes the interval picker
  useEffect(() => {
    if (phase !== "shown") setPickingDays(false);
  }, [phase]);

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="journal-button"
          onClick={() => {
            refreshEntries();
            setJournalTab("answers");
            setJournalOpen(true);
          }}
          aria-label={t(lang, "journal")}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 4.5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2v-13zM5 17.5a2 2 0 0 1 2-2h11M9 8.5h5M9 11.5h5"
            />
          </svg>
        </button>
        <h1 className="title">{t(lang, "appName")}</h1>
        <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label={t(lang, "settings")}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
            />
          </svg>
        </button>
      </header>

      <div className="content">
      <div className="mode-switch" role="radiogroup" aria-label="Mode">
        <button role="radio" aria-checked={mode === "yesno"} className={mode === "yesno" ? "active" : ""} onClick={() => setMode("yesno")}>
          {t(lang, "modeYesNo")}
        </button>
        <button role="radio" aria-checked={mode === "choose"} className={mode === "choose" ? "active" : ""} onClick={() => setMode("choose")}>
          {t(lang, "modeChoose")}
        </button>
      </div>

      {/* The instruction sits above the ball; the question field and examples below it */}
      <p className="hint" aria-live="polite" key={hint}>
        {hint}
      </p>

      <div className={`stage phase-${phase}`} ref={sceneRef} style={{ "--glow": glow } as React.CSSProperties}>
        <div className="ball-glow" />
        <div className="ball-shadow" />
        <button className="ball" onClick={onBallTap} aria-label={t(lang, "shakeAria")}>
          <Ball ref={wobbleRef} phase={phase} answer={answer} lang={lang} bubbleSeed={bubbleSeed} />
        </button>
        {answer?.rarity && phase === "shown" && sparkleSeed > 0 && <Sparkles seed={sparkleSeed} kind={answer.rarity} />}
      </div>

      {mode === "yesno" ? (
        <>
          <form
            className={`question ${listening ? "listening" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              void shake();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={question}
              maxLength={MAX_QUESTION}
              readOnly={listening}
              placeholder={listening ? t(lang, "listening") : t(lang, "questionPlaceholder")}
              aria-label={t(lang, "questionAria")}
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              onChange={(e) => setQuestion(e.target.value)}
            />
            {question && !listening && (
              <button
                type="button"
                className="question-clear"
                onClick={() => {
                  setQuestion("");
                  inputRef.current?.focus();
                }}
                aria-label={t(lang, "clearQuestion")}
              >
                ×
              </button>
            )}
            {micAvailable && (
              <button
                type="button"
                className={`mic-btn ${listening ? "listening" : ""}`}
                onClick={() => void toggleMic()}
                aria-label={t(lang, listening ? "micStopAria" : "micAria")}
                aria-pressed={listening}
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15zM6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5M9 20.5h6"
                  />
                </svg>
              </button>
            )}
          </form>
          {micHint && <p className="mic-hint">{micHint}</p>}

          {goldenDue && (phase === "idle" || phase === "shown") ? (
            <div className="examples visible golden-notice" role="status">
              {t(lang, "goldenNext")}
            </div>
          ) : (
          <div className={`examples ${examplesActive ? "visible" : ""}`} aria-hidden={!examplesActive} aria-label={t(lang, "tryLabel")}>
            <button
              type="button"
              className="example-chip"
              key={example.index}
              tabIndex={examplesActive ? 0 : -1}
              onClick={() => setQuestion(example.text.slice(0, MAX_QUESTION))}
            >
              {example.text}
            </button>
            <button
              type="button"
              className="example-more"
              tabIndex={examplesActive ? 0 : -1}
              onClick={example.next}
              aria-label={t(lang, "moreExamples")}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5"
                />
              </svg>
            </button>
          </div>
          )}
        </>
      ) : (
        <ChooseInputs lang={lang} options={options} onChange={setOptions} recent={recent} disabled={phase === "shaking" || phase === "rising"} />
      )}

      {/* One fixed-height row at the very bottom: "Share" and the reminder pill (a bell with the
          chosen interval). Tapping the pill swaps the row for the four intervals; nothing above jumps. */}
      <div className={`actions ${phase === "shown" ? "visible" : ""}`}>
        {showCheckIn && pickingDays ? (
          <div className="checkin" role="radiogroup" aria-label={t(lang, "remind")}>
            <span className="checkin-label" aria-hidden>
              {bellIcon}
            </span>
            {CHECK_IN_DAYS.map((d) => (
              <button
                type="button"
                role="radio"
                aria-checked={checkDays === d}
                key={d}
                className={`chip ${checkDays === d ? "active" : ""}`}
                onClick={() => {
                  setPickingDays(false);
                  void onCheckDays(d);
                }}
              >
                {dayLabel(d)}
              </button>
            ))}
          </div>
        ) : (
          <div className="actions-row">
            <button className="share-btn" onClick={onShare} disabled={sharing || phase !== "shown"}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
                />
              </svg>
              {t(lang, "share")}
            </button>
            {rareShown && (
              <button
                className={`chip rare-chip ${answer?.rarity ?? ""}`}
                onClick={() => {
                  refreshEntries();
                  setJournalTab("collection");
                  setJournalOpen(true);
                }}
              >
                ✦ {t(lang, "openCollection")}
              </button>
            )}
            {showCheckIn && (
              <button className="share-btn remind-btn" onClick={() => setPickingDays(true)} aria-label={t(lang, "remind")}>
                {bellIcon}
                {dayLabel(checkDays)}
              </button>
            )}
          </div>
        )}
        {shareFailed && <p className="share-error">{t(lang, "shareError")}</p>}
      </div>
      </div>

      <SettingsModal open={settingsOpen} settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />

      <JournalSheet
        open={journalOpen}
        initialTab={journalTab}
        lang={lang}
        entries={entries}
        stats={stats}
        onClose={() => setJournalOpen(false)}
        onResolve={(e, o) => void resolveEntry(e, o)}
        onDelete={(e) => void deleteEntry(e)}
        onDeleteMany={(list) => void deleteEntries(list)}
        onClearAll={() => void clearAllEntries()}
        onShareAccuracy={() => void onShareAccuracy()}
        sharing={sharing}
      />

      {checkIn && !settingsOpen && <CheckInCard entry={checkIn} lang={lang} onOutcome={(e, o) => void resolveEntry(e, o)} />}

      {goldenConfirm && (
        <div className="modal-backdrop" onClick={() => setGoldenConfirm(false)}>
          <div className="modal golden-modal" role="dialog" aria-modal="true" aria-labelledby="golden-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="golden-title" className="modal-title golden-title">
              ✦ {t(lang, "goldenConfirmTitle")}
            </h2>
            <p className="checkin-line">{t(lang, "goldenConfirmBody")}</p>
            <div className="checkin-actions">
              <button className="outcome outcome-yes" onClick={() => decideGolden("spend")}>
                {t(lang, "goldenYes")}
              </button>
              <button className="outcome outcome-no" onClick={() => decideGolden("skip")}>
                {t(lang, "goldenLater")}
              </button>
            </div>
          </div>
        </div>
      )}

      <IntroOverlay
        open={!settings.hasSeenIntro}
        lang={lang}
        onLang={(l) => updateSettings({ lang: l })}
        onDismiss={() => updateSettings({ hasSeenIntro: true })}
      />
    </div>
  );
}
