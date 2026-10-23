# Тека бренду

Усе, чим цей магазин відрізняється від копій рушія під інші бренди, — тут. Решта коду спільна.
Рушій бере теку через аліас `#brand` (`nuxt.config.ts`), тож у коді шляхів до неї немає.

| Файл | Що в ньому | Куди йде |
|---|---|---|
| `site.config.ts` | обличчя й будова сайту: ключ API, назва, домен, адреса, вкладки головної; необов'язкові — `features` (перемикачі розділів), `redirects` (301-карта), `font` (preload шрифту); `settingsFallback` — стартові значення налаштувань адмінки | `useBrand()`, `useFeatures()`; ключ, назва й адреса — ще й `runtimeConfig.public` (`site`, `siteName`, `siteUrl`); `redirects` — `server/middleware/brand-redirects.ts`; `features` і `font` — ще й `nuxt.config.ts`; `settingsFallback` — `useSiteSettings()` |
| `theme.css` | палітра: канали `--*-rgb`, кольори, тіні, затемнення, `--logo-color`, `--select-arrow`; за потреби — шрифт (`@font-face` + `--font`) і структурні токени | підключається після `main.css`; `theme-color`, кольори manifest, генератори |
| `public/` | фавікони, `images/logo.svg`, `images/og-default.jpg`, шрифт бренду (`fonts/`), файл верифікації Google | віддаються з кореня сайту, як і `public/` |
| `components/` | власні версії компонентів рушія з тими самими іменами | перекривають `components/` (`components/README.md`) |
| `robots.txt` | правила для ботів; `{siteUrl}` → адреса сайту | маршрут `/robots.txt` (`server/routes/robots.txt.ts`) |
| `i18n/ru.json`, `i18n/uk.json` | тексти, що описують сам магазин: title і description головної та блогу, h1 головної, «про нас» у футері, плитки переваг (можна перекрити будь-який ключ) | зливаються поверх спільних `i18n/locales/*.json` |

Тип конфігу — `types/brand.ts` (у рушії, щоб копії не розходились): пропущене поле IDE підсвітить.

**Що в коді, а що в адмінці** (однаково для всіх сайтів, `NOTES/plans/PLAN-MULTISITE.md` §5.0.1): усе, що
менеджер міняє без деплою, — у налаштуваннях адмінки: `public.common` (доставка, політики повернення й строки
доставки — спільні для всіх сайтів) і `public.{key}` (ціни, контакти з графіком, соцмережі, аксесуари «в набір»).
У `site.config.ts` — лише їх стартові значення (`settingsFallback`): на них живе новий сайт, поки вузла немає,
і будь-який сайт, коли адмінка лежить, а її копії на диску (`.cache/settings`) ще немає.

## Як зробити сайт під інший бренд

1. Скопіювати теку `brand/` і змінити:
   - `site.config.ts` — усі поля (ключ `key` — той, що в адмінці);
   - `theme.css` — кольори. Акцент: `--accent-rgb` **і** відтінки `--accent-hover`, `--accent-active`
     (окремі значення від дизайнера). Скруглення й інші розміри теж можна перевизначити тут — тема
     підключається після `main.css`;
   - `public/images/logo.svg` — один файл для шапки, футера, меню, JSON-LD і og. Колір контурів
     без власного `fill` задає `--logo-color`, розміри — `viewBox`. Частини з іншим кольором (знак
     у квадраті) — з `fill` літералом: той самий файл віддається окремо й іде в og, де CSS-змінних немає;
   - шрифт (якщо не Inter рушія) — `woff2` у `public/fonts/`, `@font-face` і `--font` у `theme.css`,
     preload — `font.preload` у `site.config.ts`. У dev до гідратації `<link>` теми йде раніше за
     `main.css` (так їх збирає dev-сервер), тож перевизначений шрифт видно після гідратації; у збірці
     порядок правильний (`main.css` → `theme.css`);
   - `features` — вимкнути розділи, яких у магазині немає (сторінка зникає з маршрутів і меню);
     `redirects` — 301 зі старих адрес;
   - `public/favicon.svg` — джерело всіх растрових іконок;
   - `public/googleXXXX.html` — файл верифікації свого ресурсу в Search Console (старий видалити);
   - `robots.txt` — правила (Host і Sitemap підставляються самі);
   - `i18n/*.json` — тексти про магазин.
2. Перегенерувати растрові іконки й прев'ю (портативний Node 22 з `.node/`):
   `node scripts/gen-icons.mjs` і `node scripts/gen-og.mjs` — пишуть у `brand/public/`.
3. В `.env` процесу: `SITE_URL` (домен сайту). `URL_API` і `URL_STORAGE` — спільна адмінка.
4. В адмінці («Налаштування» → `public`) — вузол `public.{key}` тієї самої структури, що й `public.floy`
   (копія гілки зі своїми значеннями; зразок SQL — `FLOY-ADMIN/NOTES/sql/settings-smarket-tree.sql`): ключі
   як у `settingsFallback`, крім спільних `delivery` і `policies`, — `prices`, `contacts` (з `schedule`),
   `social`, `promo_accessories`. Адмінка сама вивантажить `storage/settings/{key}.json` (злитий з
   `public.common`) — і ціни неопрінтів та аванс вона рахує теж звідси. Списки (`phones`, `schedule`,
   `promo_accessories`) — лише в одному з вузлів: `public.common` і `public.{key}` зливаються за
   індексами, і довший список із `common` дописав би зайві рядки.
5. Тестовий стенд — `NUXT_NOINDEX=1` в оточенні процесу: `robots.txt` закриває сайт, а всі відповіді
   йдуть із `X-Robots-Tag: noindex, nofollow`.
6. Перевірити: «тест бренду» — SEO-зліпок (`scripts/seo-snapshot.mjs`) не має показувати згадок
   старого бренду (`brand.*` — нулі; контексти — у `_brandSamples`). Порядок — `NOTES/plans/PLAN-SCALING.md`, 2.12.

Що ще спільне й лишається як є: шаблони FAQ і лідів сторінок (`{brand}`, `{domain}` підставляються),
ключі сховища `floy_*` у браузері (на іншому домені не конфліктують), адмінка `admin.floy.com.ua`.
