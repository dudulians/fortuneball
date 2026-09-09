import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "./answers";

/**
 * Example questions. They teach what the ball is for (love, work, small
 * decisions) and give a one-tap way to ask without typing.
 * Keep them short — they sit in a chip under the input.
 */
export const EXAMPLES: Record<Lang, string[]> = {
  en: [
    "Will he text me back tonight?",
    "Should I quit my job this year?",
    "Is it time to move to another city?",
    "Does she like me back?",
    "Should I send that message?",
    "Will I get the promotion?",
    "Am I making the right choice?",
    "Should I go out tonight?",
    "Is my ex thinking about me?",
    "Should I cut my hair short?",
    "Will this week be better?",
    "Should I book the trip?",
    "Is it too late to say sorry?",
    "Can I trust him?",
    "Will I pass the exam?",
    "Should I buy it?",
    "Is today a good day to start?",
    "Should I call my mom?",
    "Is this the one?",
    "Should I say yes?",
    "Am I overthinking this?",
    "Will they notice?",
    "Should I make the first move?",
    "Will it work out in the end?",
  ],
  ru: [
    "Он напишет сегодня?",
    "Пора увольняться?",
    "Стоит переехать в другой город?",
    "Я ей нравлюсь?",
    "Отправить это сообщение?",
    "Меня повысят в этом году?",
    "Я делаю правильный выбор?",
    "Идти сегодня гулять?",
    "Бывший думает обо мне?",
    "Постричься коротко?",
    "Эта неделя будет лучше?",
    "Бронировать поездку?",
    "Ещё не поздно извиниться?",
    "Ему можно доверять?",
    "Я сдам экзамен?",
    "Купить это?",
    "Сегодня хороший день, чтобы начать?",
    "Позвонить маме?",
    "Это тот самый человек?",
    "Сказать «да»?",
    "Я накручиваю себя?",
    "Они заметят?",
    "Стоит сделать первый шаг?",
    "В итоге всё получится?",
  ],
};

function shuffled<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * One example at a time from a shuffled deck. Rotates every `intervalMs`
 * while `active`; `next()` skips ahead immediately and restarts the timer;
 * every change of `advanceOn` (e.g. a shake counter) also moves to a new one.
 */
export function useExampleRotation(
  lang: Lang,
  active: boolean,
  intervalMs = 4200,
  advanceOn = 0
): { text: string; index: number; next: () => void } {
  const deck = useMemo(() => shuffled(EXAMPLES[lang]), [lang]);
  const [index, setIndex] = useState(0);
  const timer = useRef(0);

  useEffect(() => setIndex(0), [lang]);

  const firstAdvance = useRef(true);
  useEffect(() => {
    if (firstAdvance.current) {
      firstAdvance.current = false;
      return;
    }
    setIndex((i) => i + 1);
  }, [advanceOn]);

  const arm = useCallback(() => {
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setIndex((i) => i + 1), intervalMs);
  }, [intervalMs]);

  useEffect(() => {
    if (!active) {
      window.clearInterval(timer.current);
      return;
    }
    arm();
    return () => window.clearInterval(timer.current);
  }, [active, arm]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    if (active) arm();
  }, [active, arm]);

  return { text: deck[index % deck.length], index, next };
}
