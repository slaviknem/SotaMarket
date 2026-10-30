# SotaMARKET на рушії FLOY — план сайту (проєкт `SOTAMARKET`)

> **Стан на 30.10.2026:** **T0 зроблено** — проєкт `C:\Web-SERVER\domains\SOTAMARKET` створено (клон FLOY з
> історією, `upstream` = FLOY, `origin` = SOTAMARKET; §0 крок 1), dev на 3011 — 0 помилок консолі й гідратації. Перший
> коміт і push — власник. **T1 почато** (§9 T1): конфіг бренду (ключ `sotamarket`, стартові значення, 301), тема C2,
> шрифт Nunito, тексти про магазин; лишилось лого/фавікони/og (чекає §3 п. 4) і перемикач блогу. Відповіді власника —
> §3 «Відкриті». План переписано 30.10 зі старої чернетки (21–22.10, під
> задум «тека `sites/sotamarket/` в одному репо») за досвідом SMARKET: етапи T0–T9 повторюють S0–S9
> (`../../../SMARKET/NOTES/plans/PLAN-SITE-SMARKET.md`), але механізми рушія вже готові — §0 «Що вже є».
> Ключ API — `sotamarket`, домен — `sotamarket.com.ua` (без www), назва — **SotaMARKET**.
> Загальні правила для всіх сайтів — `PLAN-MULTISITE.md` (§5.0 «одна логіка даних», §7.1 «форма стилями»,
> §11 «перемикання за зразком SMARKET», §14 критерії).
>
> **Де живе цей файл:** головна копія — у репозиторії SOTAMARKET (`C:\Web-SERVER\domains\SOTAMARKET\NOTES\plans\`).
> Копія у FLOY — та сама версія 30.10 і більше не правиться (так `merge upstream/main` на ній чистий): стан, рішення й
> журнал змін рушія (§10) дивитись у SOTAMARKET.

## 0. Як почати й продовжити

### Крок 1 (T0) — створити проєкт ✅ 30.10

Зроблено (чат у FLOY, пише в сусідню теку):
1. `git clone https://github.com/slaviknem/FLOY.git C:\Web-SERVER\domains\SOTAMARKET` з `042aebc`;
   `git remote rename origin upstream`, `git remote add origin https://github.com/slaviknem/SOTAMARKET.git`.
2. `.node\` — `robocopy` з FLOY; `install.cmd`.
3. `brand/server.env` — профіль Sota (процес `SOTAMARKET`, порт **3011**, 2 копії, кеш `/var/cache/nginx-sotamarket`),
   щоб dev не займав 3000 (FLOY) і 3010 (SMARKET). Решта `brand/` — ще FLOY (як у SMARKET на S0), міняє T1.
   `.env`, `deploy.sh`, `ecosystem.config.cjs` — спільні з FLOY, не правимо (з 27.10 — `PLAN-MULTISITE.md` §11).
4. `CLAUDE.md` і `README.md` — зверху блок SotaMARKET (додаток А), далі — текст рушія без змін (злиття чисте).
5. Пам'ять нового проєкту (`C:\Users\Станислав\.claude\projects\c--Web-SERVER-domains-SOTAMARKET\memory\`) — додаток Б.
6. Поза git з FLOY скопійовано `.snapshots/inventory/sotamarket/` (повні списки адрес) і `.snapshots/prototypes/sotamarket/`.
7. Перевірка: dev на 3011 — §9 T0.

**Від власника (ПК, PowerShell):**
1. GitHub → створити порожній приватний репозиторій **`SOTAMARKET`** (без README, .gitignore і ліцензії).
2. Перший коміт і push:
   ```powershell
   cd C:\Web-SERVER\domains\SOTAMARKET
   git add -A
   git commit -m "T0: проєкт SotaMARKET — копія рушія FLOY"
   git push -u origin main
   ```
3. У FLOY і SMARKET закомітити зміни нотаток 30.10 — `NOTES/plans/PLAN-SITE-SOTAMARKET.md`,
   `NOTES/plans/PLAN-MULTISITE.md`, `NOTES/README.md` (у SOTAMARKET — ті самі файли в тому самому вигляді, тож
   `merge upstream/main` на них чистий).
4. Далі VS Code відкривати в `C:\Web-SERVER\domains\SOTAMARKET`.

### Далі — у SOTAMARKET

**Сказати в новому чаті (VS Code у SOTAMARKET):** «Продовжуємо `NOTES/plans/PLAN-SITE-SOTAMARKET.md` за §0» (або назвати
етап з §9). Етапи — по черзі, стан — позначки ✅ у §9. Перед кожним етапом перечитати §1 і §10 і відповідний етап SMARKET
(`../../../SMARKET/NOTES/plans/PLAN-SITE-SMARKET.md` §9 S1–S9 — там «що зламалось і як виправили»).

### Що вже є (через це Sota швидше за SMARKET)

У SMARKET на S1–S9 у рушій додано все, що потрібно копії; у FLOY воно є (перевірено 30.10: файли рушія SMARKET і FLOY
однакові, різняться лише `brand/`, `NOTES/`, шапки `CLAUDE.md`/`README.md`). Тож у Sota — **лише `brand/` і дані адмінки**:

| Готове | Де | Що лишається Sota |
|---|---|---|
| `brand/components/` перекриває рушій; `features`; 301-карта; шрифт і лічильники з бренду; профіль сервера | рушій, `brand/README.md` | заповнити `brand/` |
| Світла тема: `--on-deep*`, `--border-deep`, `--logo-on-deep`, `--text-on-img`, статуси на білому | рушій; тема SMARKET — зразок | значення C2 |
| Логіка й вигляд розділені: `ShopCategoryPage` / `CategoryView` (`useCategoryPage()`), `useProductCard` / `ProductCard`; `SeoText` окремим блоком | рушій | свій вигляд у `brand/components/` |
| Логіка шапки (мегаменю, «Каталог», hover intent), мобільного меню й футера в бренді | `SMARKET/brand/components/` | взяти логіку, вигляд — C2 |
| Форма стилями без копій великих екранів (товар, конструктор, крихти, чипи) | `SMARKET/brand/overrides.css`, `PLAN-MULTISITE.md` §7.1 | свої значення (не як SMARKET) |
| Реєстр сайтів адмінки (`SiteRegistry`): пошук, відгуки, MonoPay, персона чату | FLOY-ADMIN | персона Sota |
| Карта сайту `SitemapGenerator` з налаштуванням на сайт | FLOY-ADMIN | запис `sotamarket` (зараз — старий `SitemapUtil`) |
| Інструменти: `url-check`, `uniq-check`, `seo-snapshot`, `style-snapshot`, `site-inventory`, `gen-icons`, `gen-og` | `scripts/` | свій список адрес |
| Тексти адмінки чернетками → SQL (`build-sql.mjs`), скіли тем і конструктора | `SMARKET/NOTES/texts/`, `.claude/skills/` | свої тексти |
| Сервер: шаблон Hestia, кеш з мовою (`|lang=`), карта, лог, ліміти; `s9-state`/`s9-check`/`*-health` | `SMARKET/NOTES/nginx/` | замінити домен, порт, зону |

**Що в Sota інакше, ніж у SMARKET:** асортимент — лише чохли з картинками (`alphaprint`, ≈25 на модель), аксесуарів і
скла немає → немає вкладок новинок за розділами, плиток категорій, «Аксесуарів до смартфона» й фільтра «Тип чохла»
(`caseFilter` — вимкнено); статей і відгуків 0 → блог і відгуки вимкнено (§3); головне на сторінці моделі — **теми**
(8) і конструктор; тон «на ти»; старий сайт падає (§2) — переїзд виграшний уже стабільністю.

### Правила роботи (є й у `CLAUDE.md` SOTAMARKET, додаток А)

- Відповідати українською. **Не комітити й не робити `git add`** — власник переглядає diff і комітить сам (і злиття з
  upstream теж).
- **Build не запускати** — dev можна (`npm run dev` / `dev.cmd`, порт 3011 з `brand/server.env`).
- **Локальну БД адмінки не запитувати.** Факти — з коду й живого apisite
  (`https://admin.floy.com.ua/apisite/…?site=sotamarket&lang=uk`). Зміни даних — лише SQL у `FLOY-ADMIN/NOTES/sql/` для
  власника; прод — **MariaDB 10.6** (не MySQL 8: без `REGEXP_LIKE`).
- **Команди для власника — з місцем запуску:** сервер (bash, `/root/nodeapps/SOTAMARKET`) чи ПК (PowerShell,
  `C:\Web-SERVER\domains\SOTAMARKET`). Зліпки й перевірки адрес ззовні Claude робить сам.
- `ecosystem.config.cjs` і `cluster.mjs` **не спрощувати** (`DEPLOY.md`, «Як воно працює на сервері»).
- Загальні зміни рушія — у FLOY теж (дозвіл власника 24.10 — переносити самому, з доказом «FLOY піксель у піксель»),
  запис — у §10.

## 1. Як SotaMARKET пов'язаний з рушієм FLOY

Так само, як SMARKET (`../../../SMARKET/NOTES/plans/PLAN-SITE-SMARKET.md` §1):
- **Дані** — адмінка `admin.floy.com.ua`, запити з `?site=sotamarket`; правила даних однакові для всіх сайтів
  (`PLAN-MULTISITE.md` §5.0).
- **Код** — копія FLOY з історією; виправлення рушія приходять `git fetch upstream` → `git merge upstream/main` (ПК,
  PowerShell, `C:\Web-SERVER\domains\SOTAMARKET`; злиття — коміт, робить власник). У конфліктах у `brand/`, у верхніх
  блоках `CLAUDE.md`/`README.md` і в цьому плані — лишати версію SOTAMARKET (копія плану у FLOY заморожена на 30.10).
- **Своє** — лише `brand/` (конфіг, тема, `overrides.css`, i18n, `public/`, `robots.txt`, `components/`, `server.env`,
  `skills/`) і `NOTES/` сайту (`nginx/`, `texts/`, `inventory/sotamarket-check.tsv`).
- **Дизайн — окремо, логіка — спільна** (`PLAN-MULTISITE.md` §4.0): вигляд — копія компонента в `brand/components/`;
  загальною зміною — лише логіка й токени, без яких спільні екрани не працюють. FLOY з нею — піксель у піксель, ні
  важчий, ні повільніший; запис у §10, перенесення у FLOY.

## 2. Факти

**21.10** (інвентар — `../inventory/sotamarket.md`, повні списки — `.snapshots/inventory/sotamarket/`):
- Sitemap 46 264 адреси: 22 тис. товарів × 2 мови, 1 008 моделей, 22 бренди; **не оновлюється з 4.05.2026** (128 нових
  моделей поза ним); серій і тем у sitemap немає, хоча сторінки віддають 200.
- **Асортимент — альфапринти:** `group = alphaprint`, по 5–9 варіантів принта (`alpha_print`), 25–26 товарів на модель,
  259–269 ₴. Тем-фільтрів 8 (Футбол, Аніме, Українські, Брендові, Тварини, Мультики, Ігри, Кіно). Категорій-аксесуарів
  немає (у меню — «Чохли» і конструктор). Неопрінтів, відгуків, банерів, статей — 0.
- Старий сайт: Nuxt 2; `www.` — дубль на 200, `http://` — 403, неіснуюча адреса — 301 на `/chekhly`; мовні пари
  інфо-сторінок — `/about/uk/` → 301 на ru.
- **Дані з вадами:** `price_old` < ціни (iPhone 16e — 23 з 25 товарів: 259 ₴ при «старій» 249 ₴; рушій «знижку» не
  покаже, але дані хибні), фото A26/A17 — від A16 5G, помилки в назвах («з  картинкою», «логтипом», «прнтом»).

**30.10 (перевірено заново):**
- Контакти: **телефону на сайті немає** (у JSON-LD `telephone: ""`), пошта у футері з помилкою `info@sotamaket.com.ua`,
  адреса в JSON-LD — лише «м. Львів»; графік — «Пн–Сб 9:00–18:00» (з плану 22.10). Лого — растр `logo.png`/`logo-white.png`.
  Title головної «Чохли для смартфонів — sotamarket.com.ua».
- Адмінка: **вузла `public.sotamarket` немає** (`storage/settings/sotamarket.json` → 302 на логін; сайт жив би на стартових
  значеннях); банерів — 0 (`banners?site=sotamarket` → `[]`); статей `articles/info` — 0. У `SiteRegistry` sotamarket є
  (назва `SotaMARKET`, `title` `SotaMARKET.com.ua`, без `chat_intro`). Карта — старий `SitemapUtil` у кроні
  (`Kernel.php`, `DoController.php`), пише в теку старого сайту.
- **Старий процес падає по колу (діагноз 28.10):** PM2 id 7 `[3003] SotaMarket`, Nuxt 2
  (`/home/wm/web/sotamarket.com.ua/public_html`, `nuxt start --port 3003`), `cluster_mode`, node демона (16),
  `--max-old-space-size=512`; **52 691 перезапуск**, uptime — секунди–хвилини, пам'ять перед перезапуском ~500 МБ. У лозі
  помилок (`/root/.pm2/logs/-3003--SotaMarket-error-11.log`) — суцільне `Cannot read properties of undefined (reading
  'image_file')` у `getJsonLd` сторінки товару (товар без картинки) — імовірно, 500 на сторінці, а не причина перезапусків.
  Сайт відповідає (30.10: `/uk` — 200 за 1,7 с). Діагноз далі (сервер, по одній):
  `pm2 describe 7 | grep -iE "max memory|node.js version|created at"` і `grep -E "Process 7|\[3003\]" /root/.pm2/pm2.log | tail -5`.
  Ремонтувати старий Nuxt 2 не варто — переїзд це прибирає; до переїзду — хіба трохи підняти ліміт пам'яті.

## 3. Рішення власника

| Питання | Рішення |
|---|---|
| Порядок і форма | **другий сайт після SMARKET, окремий проєкт `SOTAMARKET`** — копія FLOY з upstream (22.10, 30.10) |
| Назва / домен / хост | **SotaMARKET** / `sotamarket.com.ua` / **без www** (21.10) |
| Дизайн | **C2 «Вітрина+», «Глибокий синій»** (21.10), §4 |
| Перший екран | **слайдер банерів з адмінки** + колонка (підбір моделі, конструктор) (22.10, `PLAN-MULTISITE.md` §5.4) |
| Мови | ru без префікса + `/uk` (як зараз) |
| Що в адмінці, що в коді | як у SMARKET (`PLAN-MULTISITE.md` §5.0.1): ціни, контакти з графіком, соцмережі, аксесуари «в набір» — `public.sotamarket`; доставка й політики — спільні `public.common`; у `site.config.ts` — стартові значення |
| Сервер | `/root/nodeapps/SOTAMARKET`, PM2 `SOTAMARKET`, порт **3011**, 2 копії, кеш `/var/cache/nginx-sotamarket` (за зразком SMARKET; 30.10) |

**Відкриті — від власника** (у дужках — мій варіант за замовчуванням і коли потрібне):
1. **Контакти** — телефон (на сайті його немає), правильна пошта (`info@sotamarket.com.ua`?), адреса (лише «м. Львів» чи
   повна?), графік (Пн–Сб 9:00–18:00?), месенджери/соцмережі. *(До T1 — стартові значення й JSON-LD; без телефону
   «Подзвонити» в шапці не показуємо.)*
2. **Ціни конструктора й неопрінта** (`public.sotamarket.prices`) *(як у SMARKET: конструктор 289 ₴, неопрінт 259 ₴,
   перекреслені 299, аванс 50 — T1/T7)*.
3. **Аналітика й GSC** — є ресурс GA4 для sotamarket (ID `G-…`)? Ресурс у Search Console? *(Без ID — лічильника немає;
   до T8.)*
4. **Лого** — у прототипі слово «СОТАМАРКЕТ» кирилицею («СОТА» помаранчевим) + підпис «чохли з картинками». *(Claude
   малює SVG з прототипу, як для SMARKET; T1.)* Кирилицею, як у прототипі, чи латиницею «SotaMARKET», як назва в
   JSON-LD і title?
5. **Блог і відгуки** — 0 статей, 0 відгуків. *(Вимкнути обидва: `/otzyvy-klientov` і `/article` → 301 на `/chekhly`;
   для блогу потрібен новий перемикач рушія `features.blog` — загальна зміна, §10; T1.)*
6. **Банер** — хоча б один 1600×800 (≈ 2:1, головне по центру) з підписами uk/ru в адмінці «Банери» для sotamarket
   *(до T4; без нього перший екран — лише колонка)*.
7. **Вади даних** (§2) — SQL з бекапом і відкатом готує Claude (T7): `price_old` < ціни → прибрати або виправити
   (`price_old = 0`?); назви з помилками й подвійними пробілами — виправити; фото A26/A17 — перезалити в адмінці (власник).
8. **Неопрінти Sota** — набір додасте, коли буде (свої, не з FLOY). До того — лише товари й конструктор.
9. **Білий список України** на вхості *(без нього, як SMARKET; T9)*.

## 4. Дизайн — C2 «Вітрина+», «Глибокий синій»

Полотно: https://claude.ai/artifact/4wZZKeCrW5gF6WfwFK2zwV, ряд C2 (опис — `../prototypes/README.md`; артборди —
`../prototypes/sotamarket/project/C2-*.dc.html`, картинки — `.snapshots/prototypes/sotamarket/`). Полотно приватне. Редактор
полотна зберігає перемкнутий у Tweaks варіант як типовий — перед T1 звірити опубліковану версію («Глибокий синій»).

**Характер:** щільний каталог «модель → дизайн → кошик» у темно-синій оправі; помаранчевий — лише головні дії; тон «на ти».

**Палітра → токени** (`brand/theme.css`, світла тема; наявні токени рушія — у дужках, де їх нема в старій чернетці):

| Токен | Значення | Де |
|---|---|---|
| `--bg-rgb` | `236, 239, 243` (`#eceff3`) | фон сторінки |
| `--bg-card` | `#ffffff` | картки, шторки |
| `--bg-elevated` | на тон від білого, холодний (≈ `#f2f4f7`; T2) | рушій кладе поверх карток: чипи, наведення, бульбашки чату (урок SMARKET S2) |
| `--border` / `--border-light` | `#e1e6ec` / `#ccd5df` | рамки карток / кнопок-контурів |
| `--text` / `--text-soft` / `--text-muted` | `#13202d` / `#3a4856` / `#5b6977` | |
| `--accent-rgb` | `247, 147, 30` (`#f7931e`, з лого) | головні дії, лічильник кошика |
| `--on-accent` | `#13202d` | текст на помаранчевому (7,2:1) |
| `--bg-deep` | `#10233a` | шапка, перший екран, темні кнопки «В кошик» |
| `--on-deep` / `--on-deep-muted` (рушій) | `#ffffff` / `#9fb4c8` (7,4:1 на `#10233a`) | текст на темному; ще `--on-deep-soft`, `--on-deep-hover`, `--border-deep`, `--logo-on-deep` — T1 |
| `--text-on-img` (рушій) | `#ffffff` | підпис банера й крапки слайдера |
| нові бренду: `--bg-deepest`, `--bg-deep-2` | `#0b1826`, `#183553` | смужка контактів і футер; смуга брендів, панелі |
| нові бренду: `--link`, `--eyebrow` | `#2b5c88` (6,1:1 на фоні), `#9a4f00` (5,2:1) | посилання й стрілки на світлому; рубрики над заголовками |
| `--img-bg` | `#ffffff` (урок SMARKET S2: знімки на білому) | підкладка фото; тепла/сіра — лише з `mix-blend-mode: multiply` у власній картці |
| `--success` / `--danger` / `--warning` | ≥ 4,5:1 на `#eceff3` і на білому (як у SMARKET, T1) | статуси |
| `--shade-rgb`, `--tint-rgb` | `16, 35, 58`, `0, 0, 0` | тіні з синім відтінком; світла тема |

Шрифт — **Nunito** 400/600/700/800/900 (кирилиця; variable з fontsource, 4 набори з тими ж `unicode-range`, що в Inter —
як Manrope у SMARKET), ціни — `tabular-nums`. Іконки — лінія 2.

**Форма** (`PLAN-MULTISITE.md` §7.1 — відмінність від FLOY і від SMARKET; рішення — на T5, пропозиція): Sota — **м'яка**:
скруглення `--radius-sm` 10, `--radius` 16, `--radius-lg` 22 (FLOY 8/14/20, SMARKET 4/8/12); кнопки — м'які прямокутники
12 px із жирним Nunito (не пігулки, як SMARKET, і не прямокутні, як FLOY); варіанти товару — заокруглені квадрати з
помаранчевим кільцем вибраного; вкладки — сегменти на `--bg-deep`; темна плашка «N принтів» на фото; ціна — темна,
помаранчева лише зі знижкою. Чек-лист спільних екранів — §7.1 (товар, конструктор, крихти, чипи, бокове меню).

**Будова сторінок** (з прототипу):
- **Шапка** у три рівні: смужка `--bg-deepest` (адреса, графік, «Покупцям», телефон, UA/RU) → `--bg-deep`: лого +
  «Каталог» (помаранчева) + великий пошук + «Обране»/«Кошик» з підписами → смуга брендів `--bg-deep-2` «Твій телефон:».
- **Головна:** темний перший екран (ледь помітні соти) — `h1` зверху, під ним **слайдер банерів** і колонка з двох плиток:
  підбір «бренд → модель» з частими моделями й картка конструктора → популярні моделі → хіти з перемикачем тем → теми →
  смуга переваг → SEO-текст. Відгуків і блогу немає.
- **Модель:** темний заголовок (фото, `h1`, «25 дизайнів · від 259 ₴ · друкуємо одразу», кнопка конструктора) → фільтри
  збоку (теми) + сітка, перша картка — конструктор → «Показати ще» + сторінки → інші моделі серії → FAQ.
- **Мобільне меню** — каталог у дві колонки «бренди | моделі» з пошуком моделі зверху.

**Власні компоненти** (`brand/components/`, ≤ 12 перекриттів): `AppHeader`, `MobileMenu`, `AppFooter`; блоки головної
`blocks/BannerSlider` (h1 + слайдер + колонка), `blocks/CategoryGrid` (плитки моделей), `blocks/ProductsCarousel` (хіти з
темами), `blocks/FeaturesStrip`, `blocks/SeoText`; `shop/CategoryView` (темний заголовок моделі), `ProductCard`,
`ProductCardPrintcase`; допоміжні — за потреби (як `SectionHead` SMARKET). Решта (кошик, оформлення, конструктор, чат,
фільтри, сторінка товару) — рушій у токенах Sota + `brand/overrides.css`.
**Перевірити на T4:** блоків «теми» і «хіти з перемикачем тем» у головній рушія немає (`pages/index.vue`: банери, моделі,
новинки, категорії, статті, відгуки, SEO). Новий рядок даних (теми з `filters`) — поле в стані головної рушія, загальна
зміна (FLOY без запиту — за перемикачем), а не власний запит у вигляді (`CLAUDE.md` §2).

## 5. Тексти

- **Тон:** на «ти», легко (як нинішній SEO-текст головної Sota); `PLAN-MULTISITE.md` §8.
- **i18n бренду** (`brand/i18n/{uk,ru}.json`, ~200–250 ключів, за вагою): SEO-шаблони (`faq`, `modelLead`, `filterLead`,
  `neoprint`, `printcase.seo`, `pageTitle`/`metaTitle`/`metaDescription`, `productTags`) → заголовки й дії (`index`, `header`,
  `footer`, `category`, `product`, `search`, `error404`, привітання чату) → решта. Основа — старий
  `FLOY-ADMIN/storage/app/public/locales/sotamarket.json` (414 рядків; двічі «SMarket» — не переносити): формулювання, що
  вже в індексі, — як є. Що в індексі — SEO-зліпок старого сайту (T6, як `s6-old-smarket`).
- **Дані адмінки** — чернетки `NOTES/texts/sotamarket-admin/` → SQL (`build-sql.mjs` зі SMARKET): «Про нас», «Доставка й
  оплата», «Повернення» (`/povernennya` зараз 301 на `/chekhly` — статті немає), `chekhly`, **шаблон конструктора**
  `printcase-template` (без нього `/printcase/{модель}` — `noindex`), 8 шаблонів тем (скіл `filter-article`, режим A),
  `MetaTagsUtil` для sotamarket (перевірити, що шаблони свої).
- **Тест унікальності** — `scripts/uniq-check.mjs` **проти FLOY і проти SMARKET** (поріг 30 %, `PLAN-MULTISITE.md` §14).
- Скіли — `brand/skills/{filter-article,printcase-article}.md` (ключ `sotamarket`, тон, H1, свій SQL).

## 6. Дані й адмінка (FLOY-ADMIN)

- **`public.sotamarket`** — SQL за зразком `FLOY-ADMIN/NOTES/sql/settings-smarket-tree.sql` (копія гілки `public.floy` з
  позначками «Н», значення Sota); після — «Зберегти» будь-який запис «Налаштувань»; перевірка —
  `https://admin.floy.com.ua/storage/settings/sotamarket.json` — JSON, а не сторінка входу. Аксесуарів у Sota немає →
  `promo_accessories` — порожній список (перевірити, що рушій тоді ховає блок «в набір»).
- **`SiteRegistry`:** `chat_intro` — дружній помічник SotaMARKET (чохли з картинками й друк свого фото); `title` — як
  магазин називає себе в чаті. База знань чату — SQL за зразком `smarket-ai-knowledge-s7.sql` (контакти, доставка, друк).
- **Карта:** запис `sotamarket` у `SitemapGenerator` (статичні, бренди, моделі, серії, теми-групи, конструктор, товари —
  як у старій карті; статей немає), крон — після старих карт; після перемикання — прибрати старий `SitemapUtil sotamarket`
  з `Kernel.php` і `DoController.php`. nginx віддає `/sitemap.xml` і `/sitemaps/` з `storage/app/public/sitemap/sotamarket/`.
- **CORS:** `http://localhost:3011` у `config/cors.php` (вивантаження макета конструктора з dev) + `config:cache`.
- **Вади даних** — §3 п. 7.
- Деплой адмінки — власник (адмінка на сервері — не git, файли копіюванням; після зміни `config/*.php` — `config:cache`).

## 7. Адреси (301)

- **nginx:** `www.` → без www, `http` → `https` — одним 301 у шаблоні Hestia (§8).
- **Карта бренду** (`brand/site.config.ts` → `redirects`): `/about/uk` → `/uk/about`, `/dostavka/uk` → `/uk/dostavka`,
  `/article/uk` і `/article/*` → `/chekhly` (блог вимкнено, §3 п. 5), `/otzyvy-klientov` → `/chekhly`; решта — за прогоном
  інвентаря (T8).
- Решта адрес — як зараз (моделі, бренди, товари, `/uk/…`). Нові: серії, `/printcase/{модель}`, `/povernennya`, теми
  `/{модель}/filter/{тема}` — у карті рушія. Неіснуюча адреса — 404 (старий давав 301 на `/chekhly`).

## 8. Сервер

- Клон `/root/nodeapps/SOTAMARKET` (свій deploy key — як SMARKET, бо один ключ на два репозиторії GitHub не приймає),
  PM2 `SOTAMARKET`, порт 3011, 2 копії, кеш `/var/cache/nginx-sotamarket` — усе з `brand/server.env`; деплой — `bash deploy.sh`.
  Команди — як у `PLAN-SITE-SMARKET.md` §8 «Сервер: S8» із заміною `SMARKET` → `SOTAMARKET`, `smarket` → `sotamarket`.
- **Перемикання** — `PLAN-MULTISITE.md` §11 «Перемикання за зразком SMARKET»: скопіювати `SMARKET/NOTES/nginx/` у
  `NOTES/nginx/` (домен, порт 3011, зона `nginx-sotamarket`, map `$sotamarket_lang`, лог `sotamarket-access.log`), знімок
  `s9-state.sh` першим (шаблон, редирект панелі, ручні правки вхоста старого сайту), свій шаблон Hestia `sotamarket`,
  ключ кешу з роздільником `|lang=`, перевірка на локальному nginx до сервера, після — `s9-check.sh` і `url-check`.
- **Відкат** — старий `[3003] SotaMarket` і копія теки вхоста — не прибирати до кінця моніторингу.
- Пам'ять сервера мала (27.10: доступно ~3,1 ГБ, swap майже весь): новий процес ~250 МБ на 2 копії; після перемикання
  звільниться старий (~500 МБ і цикл падінь, що їсть CPU).

## 9. Етапи

Кожен етап — як відповідний S SMARKET; що там зламалось і як лікували — `PLAN-SITE-SMARKET.md` §9.

- **T0. Проєкт** — §0 крок 1. ✅ 30.10 (перший коміт і push — власник)
- **T1. Бренд.** `brand/site.config.ts` (ключ `sotamarket`, назва, домен, `settingsFallback` — контакти §3 п. 1, ціни п. 2;
  `features`: `reviews: false`, `blog: false`; вкладки новинок — без розділів аксесуарів; `redirects` §7; шрифт; лічильник),
  `theme.css` (§4), Nunito, лого SVG і фавікони/og (`gen-icons`, `gen-og`), `robots.txt`, `brand/i18n` (тексти про магазин),
  файл верифікації GSC FLOY — видалити. Загальна зміна рушія — `features.blog` (сторінки `/article*` з маршрутів, пункт меню,
  блок статей головної, секції карти — у рушії лише фронтенд), з доказом для FLOY (§10). Перевірка — «тест бренду»:
  SEO-зліпок без згадок FLOY. ◐ 30.10 — частина

  **Зроблено 30.10 (частина):**
  - `brand/site.config.ts` — `sotamarket` / SotaMARKET / `sotamarket.com.ua`; лічильника немає (§3 п. 3);
    `settingsFallback`: ціни як у SMARKET 289/299, 259/299, аванс 50 (§3 п. 2), доставка як `public.common`, контакти —
    зі старого сайту: **телефонів немає** (`phones: []` — рушій це витримує: порожній `tel:` лише в шапці рушія, яку
    замінить T3), пошта `info@sotamarket.com.ua` (виправлена описка старого футера — підтвердити, що скринька є), «м. Львів»,
    Пн–Сб 9:00–18:00; соцмереж немає; `promo_accessories: []` (блок «в набір» на товарі ховається сам — `rows.length > 1`);
    вкладка новинок одна («Усі»); `features.reviews: false`; `redirects`: `/about/uk`, `/dostavka/uk`, `/article/uk` →
    `/uk/…`, `/otzyvy-klientov` → `/chekhly`; `font.preload` — Nunito.
  - `brand/theme.css` — палітра C2 (§4), статуси як у SMARKET (≥ 4,5:1 і на `#eceff3`), нові токени бренду `--bg-deepest`,
    `--bg-deep-2`, `--link`, `--eyebrow`; форма — пропозиція 10/16/22 (рішення — T5).
  - Шрифт — Nunito variable (fontsource 5.3.0, wght 200–1000; 4 набори з `unicode-range` Inter). **Важчий за Manrope:**
    preload кирилиці й латиниці — 60 КБ (Manrope SMARKET — 39 КБ); якщо Lighthouse покаже — обрізати вісь до 400–900.
  - `brand/i18n` — title/description головної як в індексі старого сайту («Чохли для смартфонів», «【ᐉ Замовити чохли для
    телефонів!…»), `h1` — з прототипу («Чохли з картинками для твого телефона»; в індексі — «Чохли для телефонів»), «про
    нас» у футері, плитка переваги «Звіримо перед друком», доставка 1–2 дні (= `policies.shipping_days`).
  - Видалено `brand/public/googleefee091a713c6ef7.html` (верифікація GSC FLOY); файл Sota — коли власник підтвердить ресурс.
  - **Перевірки (dev 3011):** SSR — title, `h1`, JSON-LD (`SotaMARKET`, Львів, пошта Sota), `theme-color` і manifest
    `#eceff3`, preload Nunito; `/api/settings` — 502 (вузла `public.sotamarket` немає), сторінки — 200 на стартових
    значеннях; 301 — `/about/uk` → `/uk/about`, `/otzyvy-klientov` → `/chekhly`, `/article/uk` → `/uk/article`. «floy» поза
    адресами адмінки — 0 на `/`, `/uk`, моделі, конструкторі; 10 на `/about` — текст статті адмінки (копія FLOY), T6.
    Зліпок `t1a-sotamarket` (6 сторінок × 390/1440) — 0 помилок консолі, 0 гідратації.
  - **Пастка dev:** кеш обробника `/api/settings` (`.nuxt/cache/nitro/handlers/site-settings`, ключ `current` без сайту)
    тримав відповідь часу T0 (тоді ключ був `floy`), бо повтор для sotamarket падає — у JSON-LD був телефон FLOY. Прибрано
    теку кешу й `.cache/settings/floy`. На проді не трапиться (у процесу один ключ від початку); у копії — після зміни
    `key` чистити ці дві теки.
  - **Лишилось у T1:** лого SVG (§3 п. 4), `favicon.svg`, `gen-icons`, `gen-og`; `features.blog` (загальна зміна, §3 п. 5).

- **T2. Світла тема** — обхід зліпком (`style-snapshot`, 31+ сторінок × 390/1024/1440 + стани); виправлення рушія для
  світлої теми вже є (SMARKET S2) — очікувано лише токени бренду. **Крім акценту як тексту:** рушій фарбує текст
  `--accent` у 133 місцях (40 файлів: ціни, посилання, активні стани). Помаранчевий Sota на білому — 2,3:1 (червоний
  SMARKET — 5,3:1, тому там не вилізло; видно вже на знімку T1 — ціни карток). Лікування — загальний токен
  `--accent-text` (у FLOY і SMARKET = `var(--accent)`, піксель у піксель), у Sota — темний помаранчевий (≈ `--eyebrow`) або
  синій `--link` — за місцем; заміна механічна, доказ — зліпок FLOY «до/після» (§10).
- **T3. Шапка, мобільне меню, футер** C2 — логіка зі `SMARKET/brand/components/` (мегаменю, «Каталог», меню), вигляд C2.
- **T4. Головна** C2 — перший екран (h1 + слайдер + колонка «підбір моделі» і конструктор), моделі, хіти з темами, теми,
  переваги, SEO-текст (див. «Перевірити на T4», §4).
- **T5. Модель, товар, картки, пошук** — `shop/CategoryView` (темний заголовок), `ProductCard` («N принтів», «друкуємо
  одразу»), `ProductCardPrintcase`; форма й спільні екрани — `brand/overrides.css` за чек-листом `PLAN-MULTISITE.md` §7.1.
- **T6. Тексти** (§5) — i18n і тексти адмінки (SQL), тест унікальності проти FLOY і SMARKET.
- **T7. Адмінка** (§6) — `public.sotamarket`, персона й база знань чату, карта, CORS, SQL вад даних.
- **T8. Перевірки** — на ПК: прогін інвентаря (`url-check`, свій `NOTES/inventory/sotamarket-check.tsv`), старий сайт проти
  нового, унікальність, Lighthouse, наскрізне замовлення/конструктор/чат з `site = sotamarket` (за дозволом власника); на
  сервері — процес на 3011 і прогін (§8).
- **T9. Перемикання** — `NOTES/nginx/`, день X, карта в GSC, моніторинг тиждень щодня, далі щотижня місяць; прибрати
  старий процес і стару карту.

### Журнал T0 (30.10)

- Клон з `042aebc` (на 30.10 FLOY = `upstream/main`, запушений; код рушія SMARKET і FLOY однаковий — `git diff upstream/main
  HEAD` у SMARKET без `brand/` і `NOTES/` дає лише шапки `CLAUDE.md` і `README.md`), `upstream` = FLOY, `origin` = SOTAMARKET.
- `.node\` — robocopy з FLOY; `install.cmd` — без помилок, `package-lock.json` без змін.
- `brand/server.env` — `SOTAMARKET` / 3011 / 2 / `/var/cache/nginx-sotamarket`; dev стартує на 3011 без `--port`.
- `CLAUDE.md`, `README.md` — блок SotaMARKET зверху; пам'ять проєкту — додаток Б; `.snapshots/inventory/sotamarket/`,
  `.snapshots/prototypes/sotamarket/` — з FLOY.
- Нотатки трьох репозиторіїв: `NOTES/README.md` (рядок плану Sota) і `PLAN-MULTISITE.md` (стан 30.10, §0 «Зараз», §4.0
  `server.env`, §8 `brand/i18n`, §13 F, §18) — однакові у FLOY, SMARKET і SOTAMARKET; цей план — та сама версія в усіх трьох.
- **Перевірка (dev 3011, ще з брендом FLOY):** `/`, `/uk`, `/apple`, `/iphone-16e`, `/uk/iphone-16e`, `/printcase/iphone-15`,
  `/chekhly`, `/about`, пошук, кошик, `robots.txt`, `/api/settings` — 200, неіснуюча адреса — 404. Зліпок `t0-sotamarket`
  (9 сторінок × 390/1440) — 0 помилок консолі, 0 попереджень гідратації, 0 збоїв шрифтів.

## 10. Журнал змін рушія (перенести у FLOY)

Загальні зміни, зроблені в SOTAMARKET, — щоб копії не розходились. Формат: дата · файл · що · чи перенесено у FLOY (і в
SMARKET — `merge upstream/main`, власник).

| Дата | Файл | Що | Перенесено |
|---|---|---|---|
| | | | |

## 11. Критерії готовності

`PLAN-MULTISITE.md` §14 і додатково: 0 згадок «Floy», «SMARKET», «SMarket», «StekloMarket» (правильно — SotaMARKET);
унікальність — проти FLOY **і** SMARKET; `www.` і `http` — 301 одним кроком; жодного товару з крихтами в 404; вигляд
відрізняється від обох сайтів формою (§4 «Форма»).

---

## Додаток А — розділ для початку `CLAUDE.md` SOTAMARKET

Вставлено 30.10 (T0) — див. сам `CLAUDE.md`. `README.md` — так само: зверху блок SotaMARKET, далі README рушія без змін.

## Додаток Б — пам'ять нового проєкту

`C:\Users\Станислав\.claude\projects\c--Web-SERVER-domains-SOTAMARKET\memory\` (30.10, T0): `sotamarket-project.md` (що за
проєкт, зв'язок з FLOY і SMARKET, де план), `no-commit-no-stage.md`, `commands-where-to-run.md`,
`admin-category-cache-24h.md`, `admin-config-settings-autogenerated.md`, `admin-api-dev-proxy.md`, `floy-proof-via-clone.md`,
`plan-multisite-copies.md` (`PLAN-MULTISITE.md` і `NOTES/README.md` — однакові в трьох репозиторіях),
`floy-audit-2026-10-15.md`, `floy-rename-2026-10-28.md`; `MEMORY.md` — покажчик.
