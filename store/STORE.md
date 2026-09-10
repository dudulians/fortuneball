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

Everything stays on your phone. No account, no sign-up, your questions never leave the device. English and Russian.

Free, with an occasional full-screen ad between shakes — never on your first ones, never on top of a rare answer. One tap in Settings removes the ads for good.

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

Всё хранится на телефоне. Ни аккаунта, ни регистрации, вопросы не уходят с устройства. Английский и русский.

Бесплатно, между трясками иногда появляется реклама на весь экран — никогда в первые тряски и никогда поверх редкого ответа. Одна кнопка в настройках убирает её навсегда.

Только для развлечения.
```

---

## 5. Скриншоты

Пять штук на язык. Папки разложены по размеру, потому что **каждый слот в App Store
Connect принимает только свои размеры** — чужой отбивается словами «The dimensions of one
or more screenshots are wrong»:

| Слот в App Store Connect | Что грузить |
|---|---|
| iPhone 6.5" Display (просит 1242×2688 или 1284×2778) | `screenshots/1284x2778/` |
| iPhone 6.9" Display (просит 1290×2796 или 1320×2868) | `screenshots/1320x2868/` |

Внутри каждого размера — четыре папки:

| Папка | Что это |
|---|---|
| `en-captioned/`, `ru-captioned/` | с подписью сверху — **этот комплект и грузим** |
| `en/`, `ru/` | чистые кадры без подписей, на всякий случай |

Порядок в комплекте с подписями уже правильный: ответ → журнал с точностью → «Выбрать» →
золотой ответ → коллекция. Первый скриншот виден в поиске, поэтому он и есть ответ в шаре.

Пересобрать (нужен запущенный `npm run dev` на порту 5174):

```
node scripts/store-screenshots.mjs en 1284x2778
node scripts/store-screenshots.mjs ru 1284x2778
node scripts/store-frames.mjs en 1284x2778
node scripts/store-frames.mjs ru 1284x2778
```

Размеры, которые понимают скрипты, перечислены в `scripts/store-sizes.mjs`:
`1320x2868`, `1290x2796`, `1284x2778`, `1242x2688`. Нужен ещё один — добавить строку туда
и прогнать те же четыре команды.

---

## 6. Остальные поля в App Store Connect

| Поле | Что ставить |
|---|---|
| Primary category | Entertainment |
| Secondary category | Lifestyle |
| Age rating | 4+ (ничего из анкеты Apple в приложении нет; реклама ограничена рейтингом General) |
| Price | Free (деньги — со встроенной покупки и рекламы) |
| Privacy Policy URL | обязательное поле, страницу надо выложить — см. `store/site/` |
| Support URL | можно ту же страницу или почту |
| Encryption | уже отвечено в сборке (`ITSAppUsesNonExemptEncryption=false` в Info.plist) |
| Sign-in required | нет |
| Contains ads | да (галочка при создании приложения) |

### Notes for App Review (вписать в поле Review Notes)

```
No account and no server: the questions, the answers and the settings stay on the device.

- Microphone and speech recognition: only to dictate the question into the text field. iOS on-device speech, nothing is uploaded.
- Motion: to detect the shake that reveals the answer.
- Notifications: optional reminder that asks whether the answer came true. Asked for only after the first saved question.
- Ads: Google AdMob, a full-screen ad roughly every eighth shake, never on the first shakes and never on top of a rare answer. Ads are non-personalised, so the app does not use App Tracking Transparency and does not track.
- In-app purchase: "Remove ads", one-time, non-consumable. It is in Settings (the gear in the top right corner). Restore purchase is right under it.

The app is a toy fortune ball. It makes no claim of real prediction and says so in the description.
```

---

## 7. App Privacy (анкета «Data Collection»)

Из-за рекламы ответ больше не «Data Not Collected». Само приложение по-прежнему не собирает
ничего — всё, что ниже, собирает SDK рекламы Google. Заполнять так:

**Вопрос «Do you or your third-party partners collect data from this app?» → Yes.**

| Категория Apple | Что отмечать | Purposes | Linked to identity | Used for tracking |
|---|---|---|---|---|
| Identifiers → Device ID | Да | Third-Party Advertising | Нет | **Нет** |
| Usage Data → Product Interaction | Да | Third-Party Advertising, Analytics | Нет | **Нет** |
| Diagnostics → Crash Data | Да | App Functionality | Нет | Нет |
| Diagnostics → Performance Data | Да | App Functionality | Нет | Нет |
| Location → Coarse Location | Да | Third-Party Advertising | Нет | **Нет** |
| Всё остальное (контакты, фото, здоровье, покупки, поиск, контент) | Не отмечать | | | |

Почему везде «Used for tracking — No»: приложение запрашивает **неперсонализированную**
рекламу (`npa: true` в `src/ads.ts`), не показывает окно App Tracking Transparency и не имеет
доступа к рекламному идентификатору. Если когда-нибудь включить персонализацию — эти ответы
придётся поменять на Yes и добавить ATT.

Вопросы человека (текст вопроса в шаре) и журнал — **не отмечать нигде**: они не покидают
телефон.

---

## 8. AdMob: что завести до релиза

1. [admob.google.com](https://admob.google.com) → Apps → Add app → iOS → «Fortune Ball».
   Пока приложения нет в сторе, выбрать «Not listed yet»; после публикации связать с ним.
2. ~~App ID в `Info.plist`~~ — **сделано 10.09.2026**: `ca-app-pub-5868480097993711~3279223817`.
3. ~~Межстраничный блок в `src/ads.ts`~~ — **сделано**: `ca-app-pub-5868480097993711/1994062304`.
4. Privacy & messaging → **GDPR** → создать сообщение о согласии и опубликовать.
   Без него форма согласия в Европе не покажется, и реклама там не пойдёт.
   Там же **US states** — включить, если нужно.
5. Id боевые, значит и реклама в сборке боевая: **смотреть можно, нажимать нельзя ни разу** —
   за клики по своей рекламе блокируют аккаунт. Пока приложение в AdMob помечено
   «Требуется проверка» (оно не в сторе), показов может не быть вовсе — это не поломка.
6. `app-ads.txt` — нужен, только когда появится свой сайт; кладётся в корень домена,
   который указан в App Store Connect как Marketing URL. Без него реклама работает, но
   покупателей меньше.

**Как реклама ведёт себя в приложении** (`src/ads.ts`, там же все числа):
первая — не раньше 12-й тряски, дальше каждая 8-я (12, 20, 28…), не чаще одного раза
в 90 секунд, не в первые 45 секунд после запуска, никогда поверх золотого или космического
ответа и никогда у того, кто купил «Убрать рекламу».

---

## 9. Встроенная покупка «Убрать рекламу»

App Store Connect → приложение → **Features → In-App Purchases → +**

| Поле | Значение |
|---|---|
| Type | Non-Consumable (разовая, навсегда) |
| Reference Name | Remove ads |
| Product ID | `com.uliana.fortuneball.noads` — **ровно так**, id зашит в коде |
| Price | Tier 3 (~$2.99) |
| Display Name (EN) | `Remove ads` |
| Description (EN) | `Turns off the ads for good. The ball stays exactly as it is.` |
| Display Name (RU) | `Убрать рекламу` |
| Description (RU) | `Выключает рекламу навсегда. Сам шар остаётся прежним.` |
| Review Screenshot | `store/iap-review-screenshot.png` (экран настроек с ценой) |
| Review Notes | `Settings (gear, top right) → "Remove ads". Restore purchase is under it.` |

Покупку нужно отправить на ревью **вместе с первой сборкой** — иначе она останется
в статусе «Waiting for Review» и в приложении цена не появится.

Ещё: Agreements, Tax, and Banking → **Paid Applications** договор должен быть подписан,
иначе покупка не будет работать вообще и в TestFlight цена не подтянется.

---

## 10. Что осталось сделать руками

1. Выложить политику приватности по публичному адресу и вписать его в Privacy Policy URL.
   `store/site/` — готовая папка: перетащить её на app.netlify.com/drop или положить
   в публичный репозиторий с GitHub Pages, и адрес готов. Внутри один `index.html`,
   так что адресом политики будет сам корень сайта.
2. AdMob: завести приложение и рекламный блок, подставить оба id (раздел 8).
3. App Store Connect → создать приложение, вписать всё из этого файла, завести покупку
   (раздел 9), заполнить App Privacy (раздел 7).
4. Загрузить скриншоты из `screenshots/1284x2778/en-captioned/` и `.../ru-captioned/`.
5. Подписать Paid Applications Agreement.
6. Новая сборка через Codemagic (в ней и реклама, и покупка) → TestFlight → проверить
   на телефоне: цена видна, покупка проходит, реклама после 12-й тряски, после покупки
   рекламы нет → отправить на ревью.
