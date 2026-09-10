# App Store — что вписывать

Всё готовое для App Store Connect: название, тексты, ключевые слова, скриншоты.
Копировать как есть. Английский — основной язык, русский — второй.

Скриншоты лежат рядом: `store/screenshots/`. Иконка — `resources/icon.png` (1024×1024,
без прозрачности), она же уже стоит в проекте iOS.

---

## 1. Название и подзаголовок

**Name** (максимум 30 знаков) — по очереди, пока какое-нибудь не окажется свободным:

| | Английский | Русский |
|---|---|---|
| 1 | `Fortune Ball` | `Fortune Ball` |
| 2 | `Fortune Ball: Ask & Shake` | `Fortune Ball: спроси и тряси` |
| 3 | `Fortune Ball — Yes or No` | `Fortune Ball — да или нет` |

**Subtitle** (максимум 30 знаков):

- EN: `Ask, shake, get an answer`
- RU: `Спроси, встряхни, узнай`

> Слова «Magic 8 Ball» нельзя нигде: ни в названии, ни в подзаголовке, ни в ключевых
> словах, ни в описании. Это торговая марка Mattel, по ней снимают приложения из стора.

---

## 2. Ключевые слова

100 знаков, через запятую, без пробелов после запятых. Слова из названия и подзаголовка
не повторять — Apple их и так индексирует.

**EN** (93 знака):

```
oracle,fortune,predict,yesno,decide,destiny,psychic,tarot,horoscope,luck,answers,choice,shake
```

**RU** (92 знака):

```
оракул,предсказание,гадание,судьба,да или нет,решение,таро,гороскоп,удача,ответ,выбор,тряска
```

---

## 3. Promotional text

Строка над описанием, её можно менять без обновления приложения (170 знаков).

**EN:**

```
Ask a question, shake your phone, get an answer. The ball remembers what you asked — and a week later asks you whether it came true.
```

**RU:**

```
Задай вопрос, встряхни телефон, получи ответ. Шар помнит, о чём ты спрашивала, и через неделю сам спросит: сбылось?
```

---

## 4. Описание

### English

```
Ask a yes-or-no question. Shake your phone. The ball answers.

Fortune Ball is the ball you had as a kid, rebuilt for your phone: real liquid, a die that surfaces out of the dark, a steel bezel that catches the light, and a jolt in your hand the moment the answer lands.

THE BALL KEEPS SCORE
Type your question and the ball saves it. A week later it asks: did it come true? Yes, no, or not yet. Your journal shows how often the ball was right — 73%, 51%, whatever it earns. That number is yours to share.

CAN'T DECIDE?
Switch to Choose, type two to four options — pizza, sushi — and shake. The ball picks one.

RARE ANSWERS
Most answers are the classics. Some are rare: a golden one comes on your 15th shake, again on the 40th, then every 50. Cosmic ones are pure luck, about one in a thousand. Fifteen rare answers in all, and the collection screen shows which ones you have found.

ASK OUT LOUD
Tap the microphone and say your question instead of typing it.

Everything stays on your phone. No account, no sign-up, nothing leaves the device. English and Russian.

For entertainment only.
```

### Русский

```
Задай вопрос, на который можно ответить «да» или «нет». Встряхни телефон. Шар ответит.

Fortune Ball — тот самый шар из детства, пересобранный для телефона: настоящая жидкость, грань, всплывающая из темноты, стальное кольцо, ловящее свет, и толчок в ладони в тот момент, когда появляется ответ.

ШАР СЧИТАЕТ ПОПАДАНИЯ
Впиши вопрос — шар его сохранит. Через неделю он спросит: сбылось? Да, нет или пока нет. В журнале видно, как часто шар угадывал — 73%, 51%, сколько заслужил. Этим числом можно поделиться.

НЕ МОЖЕШЬ ВЫБРАТЬ?
Переключись на «Выбрать», впиши от двух до четырёх вариантов — пицца, суши — и тряси. Шар выберет один.

РЕДКИЕ ОТВЕТЫ
Обычные ответы — те самые, классические. Но есть редкие: золотой выпадает на 15-й тряске, потом на 40-й, дальше каждые 50. Космический — чистая удача, примерно один на тысячу. Всего пятнадцать редких ответов, и на экране коллекции видно, какие уже найдены.

СПРОСИ ГОЛОСОМ
Нажми микрофон и скажи вопрос вслух, вместо того чтобы печатать.

Всё хранится на телефоне. Ни аккаунта, ни регистрации, ничего не уходит с устройства. Английский и русский.

Только для развлечения.
```

---

## 5. Скриншоты

Пять штук, 1320×2868 (6.9", iPhone 16 Pro Max) — Apple сама уменьшит их для остальных
размеров, отдельно снимать не нужно.

Два комплекта на каждый язык, загружать какой-то один:

| Папка | Что это |
|---|---|
| `screenshots/en-captioned/`, `screenshots/ru-captioned/` | с подписью сверху — **этот и грузим** |
| `screenshots/en/`, `screenshots/ru/` | чистые кадры без подписей, на всякий случай |

Порядок в комплекте с подписями уже правильный: ответ → журнал с точностью → «Выбрать» →
золотой ответ → коллекция. Первый скриншот виден в поиске, поэтому он и есть ответ в шаре.

Пересобрать (нужен запущенный `npm run dev` на порту 5174):

```
node scripts/store-screenshots.mjs en
node scripts/store-screenshots.mjs ru
node scripts/store-frames.mjs en
node scripts/store-frames.mjs ru
```

---

## 6. Остальные поля в App Store Connect

| Поле | Что ставить |
|---|---|
| Primary category | Entertainment |
| Secondary category | Lifestyle |
| Age rating | 4+ (ничего из анкеты Apple в приложении нет) |
| Price | Free |
| Privacy Policy URL | обязательное поле, страницу надо выложить — см. `store/privacy-policy.html` |
| Support URL | можно ту же страницу или почту |
| App Privacy | **Data Not Collected** — приложение не собирает ничего |
| Encryption | уже отвечено в сборке (`ITSAppUsesNonExemptEncryption=false` в Info.plist) |
| Sign-in required | нет |

### Notes for App Review (вписать в поле Review Notes)

```
No account and no server: everything the app stores stays on the device.

- Microphone and speech recognition: only to dictate the question into the text field. iOS on-device speech, nothing is uploaded.
- Motion: to detect the shake that reveals the answer.
- Notifications: optional reminder that asks whether the answer came true. Asked for only after the first saved question.

The app is a toy fortune ball. It makes no claim of real prediction and says so in the description.
```

---

## 7. Что осталось сделать руками

1. Выложить политику приватности по публичному адресу и вписать его в Privacy Policy URL.
   `store/privacy-policy.html` — готовая страница, ей нужен только хостинг
   (GitHub Pages публичного репозитория, Netlify Drop, любой свой домен).
2. App Store Connect → создать приложение, вписать всё из этого файла.
3. Загрузить скриншоты из `screenshots/en-captioned/` и `screenshots/ru-captioned/`.
4. Отправить сборку из TestFlight на ревью.
