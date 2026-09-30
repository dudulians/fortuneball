# Вторая подача после отказа 4.3(b)

30 сентября 2026 Apple отклонила версию 1.0 по двум пунктам:

- **2.1(b)** — покупка не поехала на ревью: у неё не был загружен App Review Screenshot.
- **4.3(b) Design — Spam** — «приложение в основном про астрологию, гороскопы, хиромантию,
  гадание и зодиакальные отчёты, дублирует то, чего в сторе достаточно».

Второй пункт — про подачу, а не про код. Ревьюер увидел ровно то, что мы ему показали:
ключевые слова `tarot, horoscope, psychic, гадание`, категорию Entertainment, описание про
шар из детства и первый скриншот с ответом в шаре. При этом **ни одного** из перечисленного
в отказе в приложении нет: ни зодиака, ни карт, ни ладоней, ни астрологии.

Ниже — то, чем подача заменена. Идея одна: приложение помогает **выбрать** и потом
**проверяет, сбылось ли**. Шар — форма, а не суть.

---

## 1. Название

| | Сейчас | Предлагается |
|---|---|---|
| Name | ~~`Fortune Ball: Ask & Shake`~~ | **`Shake to Decide`** — выбрано 30.09.2026 |

Слово Fortune само по себе тянет в ту категорию, за которую завернули. Решение за
пользователем: установок пока нет, менять имя ничего не стоит. Если оставляем прежнее —
всё остальное ниже работает и с ним.

## 2. Подзаголовок (30 знаков)

- EN: `Decide, then see if it worked`
- RU: `Реши и проверь, сбылось ли`

## 3. Ключевые слова (100 знаков)

Из старого списка убраны `tarot`, `horoscope`, `psychic`, `oracle`, `fortune`, `гадание`,
`таро`, `гороскоп` — мы ими сами записались в переполненную категорию.

**EN:**

```
decide,decision,choose,choice,pick,yes or no,coin flip,random,dilemma,journal,track,outcome
```

**RU:**

```
решение,выбрать,выбор,да или нет,монетка,жребий,дилемма,случайно,дневник,проверить,итог
```

## 4. Promotional text

**EN:**

```
Two options, one shake, and the decision is made. A week later the app asks whether it worked out — and keeps the score.
```

**RU:**

```
Два варианта, одна тряска — решение принято. Через неделю приложение спросит, сбылось ли, и посчитает попадания.
```

## 5. Описание

### English

```
Can't decide? Give the ball two options, shake, and it picks one.

Then it does the thing no oracle does: it remembers. A week later it asks whether the decision worked out, and keeps a running score of how often it did.

TWO TO FOUR OPTIONS
Pizza or sushi. Stay in or go out. The blue one or the red one. Type them in, shake, and one of them surfaces.

YOUR DECISIONS, CHECKED
Every decision you write down is saved. A week later the app asks: did it come true? Yes, no, or not yet. The Decisions screen shows how many worked out — 73%, 51%, whatever yours turns out to be.

OR JUST ASK YES OR NO
Switch sides and it is the ball you remember: ask anything, shake, read the answer in the window.

MADE, NOT ASSEMBLED
The liquid is computed in real time, the die turns and settles with its own physics, and the answer lands with a tap you feel in your hand.

RARE ANSWERS
Fifteen rare answers hide inside. A golden one comes on your 15th shake, again on the 40th. Cosmic ones are about one in a thousand.

No horoscopes, no zodiac, no tarot. Everything stays on your phone: no account, no sign-up, nothing leaves the device. English and Russian.

Free, with an occasional full-screen ad between shakes. One tap in Settings removes them for good.

For entertainment only.
```

### Русский

```
Не можешь выбрать? Дай шару два варианта, встряхни — он выберет один.

А дальше он делает то, чего не делает ни один оракул: он помнит. Через неделю он спросит, сработало ли решение, и посчитает, как часто срабатывает.

ОТ ДВУХ ДО ЧЕТЫРЁХ ВАРИАНТОВ
Пицца или суши. Остаться или пойти. Синий или красный. Впиши, встряхни — один всплывёт.

ТВОИ РЕШЕНИЯ, ПРОВЕРЕННЫЕ
Каждое записанное решение сохраняется. Через неделю приложение спросит: сбылось? Да, нет или пока нет. На экране «Решения» видно, сколько сбылось — 73%, 51%, сколько получится у тебя.

ИЛИ ПРОСТО СПРОСИ: ДА ИЛИ НЕТ
Переключись — и это тот самый шар: спроси что угодно, встряхни, прочитай ответ в окошке.

СДЕЛАНО, А НЕ СОБРАНО
Жидкость считается в реальном времени, грань поворачивается и оседает по своей физике, а ответ приходит с толчком, который чувствуешь ладонью.

РЕДКИЕ ОТВЕТЫ
Внутри спрятаны пятнадцать редких ответов. Золотой выпадает на 15-й тряске, потом на 40-й. Космический — примерно один на тысячу.

Ни гороскопов, ни зодиака, ни таро. Всё хранится на телефоне: ни аккаунта, ни регистрации, ничего не уходит с устройства. Английский и русский.

Бесплатно, между трясками иногда появляется реклама на весь экран. Одна кнопка в настройках убирает её навсегда.

Только для развлечения.
```

## 6. Категория

| | Было | Предлагается |
|---|---|---|
| Primary | Entertainment | **Utilities** |
| Secondary | Lifestyle | Lifestyle |

Entertainment — та самая полка, где Apple видит переизбыток гадалок. Инструмент выбора
живёт в Utilities, и это ещё один сигнал, что приложение не из той корзины.

## 7. Скриншоты

Пересняты в новом порядке (`store/screenshots/1284x2778/en-captioned` и `ru-captioned`):

1. `1-choose` — режим выбора с результатом: «Two options. One shake. Decided.»
2. `2-decisions` — экран решений с процентом: «Every decision, checked a week later.»
3. `3-answer` — шар с ответом: «Or just ask yes or no.»
4. `4-golden` — золотой ответ
5. `5-collection` — коллекция

Первый скриншот виден в поиске и в выдаче — теперь он про выбор, а не про предсказание.

## 8. Что изменилось в самом приложении

- Новый человек открывает приложение в режиме **«Выбрать»**, а не «Да / Нет»
  (выбор запоминается: кто переключился на «Да / Нет», тот там и останется).
- Журнал называется **«Решения»**, заголовок статистики — «Твои решения».
- Карточка для шеринга теперь говорит «Мои решения сбылись в 73% случаев».

## 9. Что на самом деле написано в правиле 4.3(b)

Прочитано на developer.apple.com 30.09.2026, чтобы строить ответ на тексте правила,
а не на догадках.

- Правило прямо перечисляет насыщенные категории, и **гадальные приложения там названы**
  вместе со знакомствами, фонариками, обоями, звуками и простыми таймерами. То есть отнести
  шар к этой полке — не ошибка ревьюера, а применение правила по букве.
- Планка для новых приложений в такой категории сформулирована как «meaningfully different
  or improved experience» (Apple, App Review Guidelines 4.3(b)) — заметно иной или лучший
  опыт.
- Там же: повторные отправки низкокачественных приложений могут кончиться исключением
  из Apple Developer Program.

**Вывод для письма.** Не спорить с категорией и не просить исключения. Показывать, чем
опыт заметно иной: приложение **проверяет собственные ответы** и ведёт счёт сбывшегося —
ровно того, чего гадальные приложения не делают, потому что предсказание им нужно забыть.

## 10. Письмо в Resolution Center

Отправляется вместе с новой подачей. Английский — язык переписки с ревью.

```
Hello,

Thank you for the review. We understand that 4.3(b) names fortune telling among the saturated categories, and we are not asking for an exception. We would like to show why we believe this app offers a meaningfully different experience, and what we changed after your feedback.

What makes it different:

1. It is a decision tool first. You enter two to four options, shake, and one of them is chosen. This is the mode the app opens in for a new user.

2. It checks its own answers. Every decision you write down is saved, and a week later the app asks whether it actually worked out: yes, no, or not yet. The "Decisions" screen shows the share of decisions that came true as a running percentage. A fortune-telling app gives a prediction and forgets it. The point of this one is that it follows up on every answer it gives, and the resulting number belongs to the person, not to the ball.

3. It is built rather than assembled. The liquid inside the window is rendered in real time with WebGL, the die has its own physics and settles differently every time, and answers are delivered through Core Haptics. There is no pre-rendered video and no wrapped web page.

The app also contains none of the content described in the decision: no astrology, no horoscopes, no zodiac signs, no palm reading and no tarot.

What we changed after your feedback:
- the app now opens in the decision mode instead of the yes/no ball;
- the history screen is now "Decisions" and leads with the outcome statistics;
- the app has been renamed "Shake to Decide";
- the subtitle, keywords, description and screenshots now describe a decision tool, and the primary category is Utilities;
- the 2.1(b) issue is fixed: the "Remove ads" in-app purchase now has an App Review screenshot and is submitted together with this version.

Thank you for taking another look.
```
