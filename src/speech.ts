import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import type { Lang } from "./answers";

/**
 * Voice input for the question.
 * Native (iPhone): the system speech recognizer via
 * @capgo/capacitor-speech-recognition — free, on-device for EN/RU, no server.
 * (The @capacitor-community plugin has the same API but ships no Package.swift,
 * so Capacitor 8's Swift Package Manager build silently leaves it out.)
 * Browser preview: Web Speech API where it exists.
 * Exactly one of onError / onEnd is called per session.
 */

export type SpeechError = "denied" | "unavailable" | "failed";

export interface ListenOptions {
  lang: Lang;
  onPartial: (text: string) => void;
  onEnd: (finalText: string) => void;
  onError: (err: SpeechError) => void;
}

const LOCALE: Record<Lang, string> = { en: "en-US", ru: "ru-RU" };
const SILENCE_MS = 1700; // stop this long after the last words
const MAX_MS = 12000; // hard cap per question

type WebRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function webRecognitionCtor(): (new () => WebRecognition) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => WebRecognition;
    webkitSpeechRecognition?: new () => WebRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export async function isSpeechAvailable(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const r = await SpeechRecognition.available();
      return !!r.available;
    } catch {
      return false;
    }
  }
  return webRecognitionCtor() !== null;
}

let activeStop: (() => Promise<void>) | null = null;

export async function stopListening(): Promise<void> {
  const s = activeStop;
  activeStop = null;
  if (s) await s();
}

export async function startListening(opts: ListenOptions): Promise<void> {
  await stopListening();
  if (Capacitor.isNativePlatform()) return startNative(opts);
  return startWeb(opts);
}

/* ---------------- native ---------------- */

async function startNative(opts: ListenOptions): Promise<void> {
  let done = false;
  let last = "";
  let silenceTimer = 0;
  let capTimer = 0;
  const handles: PluginListenerHandle[] = [];

  const cleanup = async () => {
    window.clearTimeout(silenceTimer);
    window.clearTimeout(capTimer);
    for (const h of handles) {
      try {
        await h.remove();
      } catch {
        // ignore
      }
    }
  };

  const finish = async (err?: SpeechError) => {
    if (done) return;
    done = true;
    activeStop = null;
    await cleanup();
    try {
      await SpeechRecognition.stop();
    } catch {
      // already stopped
    }
    if (err) opts.onError(err);
    else opts.onEnd(last.trim());
  };

  const armSilence = () => {
    window.clearTimeout(silenceTimer);
    silenceTimer = window.setTimeout(() => void finish(), SILENCE_MS);
  };

  try {
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") {
      opts.onError("denied");
      return;
    }
  } catch {
    opts.onError("unavailable");
    return;
  }

  handles.push(
    await SpeechRecognition.addListener("partialResults", (data) => {
      const text = data.matches?.[0] ?? "";
      if (!text) return;
      last = text;
      opts.onPartial(text);
      armSilence();
    })
  );
  handles.push(
    await SpeechRecognition.addListener("listeningState", (data) => {
      if (data.status === "stopped" || data.state === "stopped") void finish();
    })
  );
  handles.push(
    await SpeechRecognition.addListener("error", () => {
      void finish(last ? undefined : "failed");
    })
  );

  activeStop = () => finish();
  capTimer = window.setTimeout(() => void finish(), MAX_MS);

  try {
    const result = await SpeechRecognition.start({
      language: LOCALE[opts.lang],
      maxResults: 1,
      partialResults: true,
      popup: false,
    });
    // Android resolves with the final matches when the utterance ends.
    if (result?.matches?.length) {
      last = result.matches[0];
      opts.onPartial(last);
      void finish();
    }
  } catch {
    void finish(last ? undefined : "failed");
  }
}

/* ---------------- web (dev preview) ---------------- */

async function startWeb(opts: ListenOptions): Promise<void> {
  const Ctor = webRecognitionCtor();
  if (!Ctor) {
    opts.onError("unavailable");
    return;
  }
  const rec = new Ctor();
  rec.lang = LOCALE[opts.lang];
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let done = false;
  let last = "";
  let errored: SpeechError | null = null;
  const capTimer = window.setTimeout(() => rec.stop(), MAX_MS);

  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0]?.transcript ?? "";
    last = text;
    opts.onPartial(text);
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") errored = "denied";
    else if (e.error === "aborted") errored = null;
    else if (e.error === "no-speech") errored = last ? null : "failed";
    else errored = "failed";
  };
  rec.onend = () => {
    if (done) return;
    done = true;
    activeStop = null;
    window.clearTimeout(capTimer);
    if (errored) opts.onError(errored);
    else opts.onEnd(last.trim());
  };

  activeStop = async () => {
    rec.stop();
  };

  try {
    rec.start();
  } catch {
    done = true;
    activeStop = null;
    window.clearTimeout(capTimer);
    opts.onError("failed");
  }
}
