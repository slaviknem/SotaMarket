# Рушій магазинів на Nuxt 3 (FLOY, SMARKET…)

Фронтенд на **Nuxt 3 + Vue 3** з SSR, один рушій для кількох сайтів — кожен сайт окремим проєктом-копією:
floy.com.ua (FLOY — `upstream`, заміна старого Nuxt 2) і steklomarket.com.ua (SMARKET, з 27.10.2026).
Усе своє в сайту — у теці `brand/`, решта коду однакова.
Дані — спільна адмінка `https://admin.floy.com.ua/apisite/` (ключ сайту — `brand/site.config.ts`).
Всі URL збережені 1-в-1 зі старим сайтом, тому заміна безболісна для SEO.

## Технології

- **Nuxt 3.21** (Vue 3.5, SSR) — повна серверна генерація для індексації
- **@nuxtjs/i18n** — `/` = ru, `/uk/...` = українська (як на старому сайті), hreflang автоматично
- **Swiper 11** — слайдер банерів
- Без Bootstrap — власна легка дизайн-система на CSS-змінних: палітра — `brand/theme.css`,
  розміри, шари й глобальні класи — `assets/css/main.css` (правила — `CLAUDE.md`)

## Структура URL (ідентична старому сайту)

| URL                                                       | Сторінка                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `/` , `/uk`                                               | Головна                                                                  |
| `/{category}`                                             | Категорія (бренд/серія/модель) з фільтрами                               |
| `/{category}/filter/{filter}`                             | Сторінка фільтра (SEO)                                                   |
| `/{category}/{product}`                                   | Товар                                                                    |
| `/{category}/{product}/attr/{attribute}`                  | Товар з вибраним атрибутом (SEO)                                         |
| `/chekhly` + `/chekhly/filter/...`                        | Всі чохли                                                                |
| `/article`, `/article/{type}`, `/article/{type}/{alias}`  | Блог (вимикає `features.blog` бренду)                                    |
| `/shop/cart`, `/shop/cart/success`                        | Кошик / успішне замовлення (+ MonoPay)                                   |
| `/shop/wishlist`, `/shop/compare`, `/shop/track-order`    | Обране / порівняння / трекінг                                            |
| `/about`, `/dostavka`, `/povernennya`, `/otzyvy-klientov` | Інфо-сторінки (контент з API; відгуки вимикає `features.reviews` бренду) |
| `/printcase`                                              | Конструктор чохлів (хаб)                                                 |
| `/printcase/{model}`                                      | Конструктор під модель — індексована сторінка (`?model=` 301-иться сюди) |
| `/neoprint/{model}/{design}`                              | Неопрінт — дизайн на моделі                                              |
| `/search?q=…`                                             | Пошук (noindex)                                                          |

Параметри листингу теж збережені: `?page=2&limit=12&sort=price-asc&filter_{group}=a,b`.

## Запуск (розробка)

На цій машині системний Node — v16, тому в `.node/` лежить портативний Node 22
(не чіпає інші проєкти на сервері):

| Сайт | Тека проєкту на ПК | dev (`PORT` з `brand/server.env`) |
|---|---|---|
| SMARKET | `C:\Web-SERVER\domains\SMARKET` | http://localhost:3010 |
| FLOY | `C:\Web-SERVER\domains\FLOY` | http://localhost:3000 |

У теці проєкту свого сайту (таблиця вище):

```powershell
.\install.cmd     # залежності, один раз (голий npm install під Node 16 ламає node_modules)
.\dev.cmd         # http://localhost:<PORT сайту> — SMARKET 3010, FLOY 3000
```

`.cmd` самі ставлять портативний Node 22 з `.node\`; для `npm`/`npx` руками — спершу
`$env:Path = "$PWD\.node\node-v22.14.0-win-x64;" + $env:Path`.

## Продакшн

```powershell
npx nuxt build
$env:PORT = (Select-String '^PORT=(\d+)' brand\server.env).Matches.Groups[1].Value   # порт сайту з профілю
node .output\server\index.mjs
```

Потрібен **Node 18+** (на проді v22.23.1): у node 16 немає глобальних `fetch`/`Headers`,
і Nuxt 3 піднімається мертвим — 200 без товарів і 404 на всіх сторінках моделей.

Запуск на сервері описано у **`ecosystem.config.cjs`** (у корені репозиторію), одна команда з теки сайту
(SMARKET — `/root/nodeapps/SMARKET`, FLOY — `/root/nodeapps/FLOY`; ім'я процесу й порт — з профілю):

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

Чим сайти відрізняються на сервері — **профіль `brand/server.env`**: процес PM2 (`APP`), порт (`PORT`, він же
порт dev), кількість копій (`WORKERS`), кеш nginx (`NGINX_CACHE`). Його читають `ecosystem.config.cjs`,
`deploy.sh` і `nuxt.config.ts`, тож ці файли однакові в усіх копіях рушія. FLOY — `FLOY`, 3000, 4 копії;
SMARKET — `SMARKET`, 3010, 2 копії.

Копії форкає **`cluster.mjs`**, а не PM2: у cluster-режимі PM2 ігнорує `--interpreter` і копії дістаються
від його демона на node 16. Тому в `pm2 list` завжди один рядок — це норма.

Nginx проксіює домен на порт сайту (шаблон HestiaCP: FLOY — `node`, SMARKET — `smarket`).

**Деталі експлуатації — `DEPLOY.md`, розділ «Як воно працює на сервері»:** дерево процесів,
зміна кількості копій, перевірки після підйому, логи, кеш nginx, відкат.

## Налаштування (.env)

```
URL_API='https://admin.floy.com.ua/apisite/'
URL_STORAGE='https://admin.floy.com.ua/storage/'
```

`.env` однаковий в усіх копіях рушія — лише спільна адмінка. Своє в кожного сайту — у `brand/`: адреса
(`url`) і лічильники (`analytics`: GA4, GTM, Meta Pixel) — `brand/site.config.ts`; порт dev — `PORT` у
`brand/server.env`. Перекрити на час збірки можна змінними `SITE_URL`, `GA4_ID` / `GTM_ID` / `META_PIXEL_ID`
(порожня — вимикає), порт dev — `NUXT_PORT`. Адреса й API зашиваються у збірку (canonical, og, robots.txt).
Для локального бекенда — розкоментувати localhost-рядки.

## SEO (вбудовано)

- SSR усіх сторінок, meta title/description з API (категорії, фільтри, статті)
- `hreflang` ru/uk/x-default + `canonical` на кожній сторінці
- JSON-LD: WebSite + Organization (головна), Product + Offer + Review (товар), ItemList (категорія), Article (блог), BreadcrumbList (мікродані в крихтах)
- Open Graph + Twitter Card
- `robots.txt` і `site.webmanifest` — маршрути (`server/routes/`) з `brand/`: шаблон `brand/robots.txt`,
  `Host` і `Sitemap` — з `SITE_URL`. Тестовий стенд — `NUXT_NOINDEX=1` (закриває від індексації)
- **Sitemap**: генерує адмінка (`App\Actions\Sitemap\SitemapGenerator`, крон 05:01 і `/do/generate_sitemap`) у
  `storage/app/public/sitemap/{ключ сайту}/`; `/sitemap.xml` і `/sitemaps/` віддає nginx сайту з цієї теки
  (доповнення вхоста `nginx.ssl.conf_sitemap`). У збірку рушія карта не входить: Nuxt 3 не роздає файли, що
  з'явились після збірки.

## Як зробити сайт під інший бренд

Рушій спільний, усе брендове — в одній теці `brand/` (аліас `#brand`). Докладно, з полями конфігу, —
**`brand/README.md`**; коротко:

1. **`brand/`** — змінити `site.config.ts` (ключ сайту в адмінці, назва, домен, адреса, запасні
   налаштування, графік, політики, вкладки головної, промотовари), `theme.css` (палітра; акцент —
   канал `--accent-rgb` **і** відтінки `--accent-hover`/`--accent-active`), `public/images/logo.svg`,
   `public/favicon.svg`, файл верифікації Google, `robots.txt`, `i18n/*.json` (тексти про магазин).
   Інший вигляд — власні компоненти з тими самими іменами в `brand/components/` (`brand/components/README.md`).
2. **Фавікони й og** — `node scripts/gen-icons.mjs` і `node scripts/gen-og.mjs` (портативний Node 22),
   пишуть у `brand/public/`.
3. **Сервер** — `brand/server.env` (процес PM2, порт, копії, кеш nginx), лічильники — `analytics` у
   `site.config.ts`; `.env`, `deploy.sh`, `ecosystem.config.cjs` — не чіпати (спільні).
4. **Адмінка** — вузол налаштувань `public.{key}` (ціни, доставка, контакти, соцмережі); поки його
   немає — `settingsFallback` з конфігу. Категорії, SEO-тексти, банери, статті — вміст бази під цим ключем.
5. **Перевірка** — тест бренду: SEO-зліпок (`node scripts/seo-snapshot.mjs <ім'я>`) без згадок старого
   бренду поза вмістом бази; тест палітри — `scripts/style-snapshot.mjs … find`. Порядок —
   `NOTES/plans/PLAN-SCALING.md`, 1.9 і 2.12.

Свідомо спільне: шаблони FAQ і лідів (`{brand}`/`{domain}` підставляються), ключі сховища `floy_*`
у браузері (на іншому домені не конфліктують), адмінка `admin.floy.com.ua`. Кожен сайт — окремий проєкт-копія
рушія з `upstream` = FLOY (перший — SMARKET, `C:\Web-SERVER\domains\SMARKET`, на проді з 27.10.2026): свій
`brand/`, `.env`, `ecosystem.config.cjs`, `deploy.sh`; порядок і сервер — `NOTES/plans/PLAN-MULTISITE.md` (§11).

## Що де лежить

- `brand/` — усе, чим магазин відрізняється від копій рушія (див. вище); `brand/components/` — його власні компоненти
- `composables/useShopApi.ts` — всі виклики до apisite (дзеркало старого `api/shop.ts`)
- `composables/useCart.ts`, `useLists.ts` — кошик / wishlist / compare (localStorage)
- `composables/useNovaPochta.ts` — пошук міст і відділень НП
- `composables/useSeo.ts` — canonical / OG / JSON-LD хелпери
- `components/shop/CategoryPage.vue` — спільна логіка категорії та сторінки фільтра (вигляд — `CategoryView.vue`,
  стан між ними — `useCategoryPage()`)
- `components/shop/ProductPage.vue` — товар (+ attr-сторінки)
- `i18n/locales/ru.json`, `uk.json` — переклади (перенесені зі старого сайту + нові ключі);
  тексти про сам магазин — поверх них з `brand/i18n/`
- `scripts/seo-snapshot.mjs`, `style-snapshot.mjs` — зліпки «до/після» для перевірки змін (`NOTES/plans/PLAN-SCALING.md` §2);
  `url-check.mjs` — прогін адрес (коди, 301, canonical; `NOTES/inventory/README.md`), `uniq-check.mjs` — унікальність
  текстів між сайтами, `site-inventory.mjs` — інвентар адрес старого сайту
- `NOTES/plans/` — плани робіт (`PLAN-*.md`, стан і порядок продовження — у шапці кожного);
  `NOTES/PROMTS.docx` — робочі нотатки із завданнями
- Бекенд (адмінка й apisite) — сусідній репозиторій `../FLOY-ADMIN` (не частина фронтенда)

## ДЕПЛОЙ

Однаково на всіх сайтах — з теки сайту на сервері (bash):

| Сайт | Команда |
|---|---|
| SMARKET — steklomarket.com.ua | `cd /root/nodeapps/SMARKET && bash deploy.sh` |
| FLOY — floy.com.ua | `cd /root/nodeapps/FLOY && bash deploy.sh` |

`deploy.sh` бере процес, порт і кеш nginx із `brand/server.env`: `git pull`, збірка під node 22, рестарт процесу,
чистка кешу nginx. Докладно — `DEPLOY.md`.
