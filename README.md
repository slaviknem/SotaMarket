# FLOY — новий фронтенд (Nuxt 3)

Повна заміна старого сайту floy.com.ua (Nuxt 2) на **Nuxt 3 + Vue 3** з SSR.
Використовує **той самий бекенд** `https://admin.floy.com.ua/apisite/` — нічого в адмінці міняти не треба.
Всі URL збережені 1-в-1 зі старим сайтом, тому заміна безболісна для SEO.

## Технології

- **Nuxt 3.21** (Vue 3.5, SSR) — повна серверна генерація для індексації
- **@nuxtjs/i18n** — `/` = ru, `/uk/...` = українська (як на старому сайті), hreflang автоматично
- **Swiper 11** — слайдер банерів
- Без Bootstrap — власна легка дизайн-система (чорний + оранжевий), CSS-змінні в `assets/css/main.css`

## Структура URL (ідентична старому сайту)

| URL | Сторінка |
|---|---|
| `/` , `/uk` | Головна |
| `/{category}` | Категорія (бренд/серія/модель) з фільтрами |
| `/{category}/filter/{filter}` | Сторінка фільтра (SEO) |
| `/{category}/{product}` | Товар |
| `/{category}/{product}/attr/{attribute}` | Товар з вибраним атрибутом (SEO) |
| `/chekhly` + `/chekhly/filter/...` | Всі чохли |
| `/article`, `/article/{type}`, `/article/{type}/{alias}` | Блог |
| `/shop/cart`, `/shop/cart/success` | Кошик / успішне замовлення (+ MonoPay) |
| `/shop/wishlist`, `/shop/compare`, `/shop/track-order` | Обране / порівняння / трекінг |
| `/about`, `/dostavka`, `/povernennya`, `/otzyvy-klientov` | Інфо-сторінки (контент з API) |
| `/printcase` | Конструктор чохлів (хаб) |
| `/printcase/{model}` | Конструктор під модель — індексована сторінка (`?model=` 301-иться сюди) |

Параметри листингу теж збережені: `?page=2&limit=12&sort=price-asc&filter_{group}=a,b`.

## Запуск (розробка)

На цій машині системний Node — v16, тому в `.node/` лежить портативний Node 22
(не чіпає інші проєкти на сервері):

```powershell
$env:Path = "C:\Web-SERVER\domains\FLOY-NEW\.node\node-v22.14.0-win-x64;" + $env:Path
cd C:\Web-SERVER\domains\FLOY-NEW
npm install        # один раз
npx nuxt dev       # http://localhost:3000
```

## Продакшн

```powershell
npx nuxt build
$env:PORT = "3000"
node .output\server\index.mjs
```

Потрібен **Node 18+** (на проді v22.23.1): у node 16 немає глобальних `fetch`/`Headers`,
і Nuxt 3 піднімається мертвим — 200 без товарів і 404 на всіх сторінках моделей.

Запуск на сервері описано у **`ecosystem.config.cjs`** (у корені репозиторію), одна команда:

```bash
cd /root/nodeapps/FLOY-PROD
pm2 start ecosystem.config.cjs
pm2 save
```

Копії (за замовчуванням 4, змінна `FLOY_WORKERS` у тому ж файлі) форкає **`cluster.mjs`**,
а не PM2: у cluster-режимі PM2 ігнорує `--interpreter` і копії дістаються від його демона
на node 16. Тому в `pm2 list` завжди один рядок — це норма.

Nginx проксіює домен на порт 3000 — так само, як проксіювався старий Nuxt 2.

**Деталі експлуатації — `DEPLOY.md`, розділ «Як воно працює на сервері»:** дерево процесів,
зміна кількості копій, перевірки після підйому, логи, кеш nginx, відкат.

## Налаштування (.env)

```
URL_API='https://admin.floy.com.ua/apisite/'
URL_STORAGE='https://admin.floy.com.ua/storage/'
SITE_URL='https://floy.com.ua'
```

Для локального бекенда — розкоментувати localhost-рядки.

## SEO (вбудовано)

- SSR усіх сторінок, meta title/description з API (категорії, фільтри, статті)
- `hreflang` ru/uk/x-default + `canonical` на кожній сторінці
- JSON-LD: WebSite + Organization (головна), Product + Offer + Review (товар), ItemList (категорія), Article (блог), BreadcrumbList (мікродані в крихтах)
- Open Graph + Twitter Card
- `robots.txt` в `public/` (як на старому сайті)
- **Sitemap**: генерує адмінка (`SitemapUtil.php`) і пише файли у статичну папку фронтенда.
  Для нового сайту в `SitemapUtil` треба змінити `$pathSuffix` з `/public_html/src/static/` на
  `/public_html/public/` (папка `public/` — аналог `static/` в Nuxt 3).

## Що де лежить

- `composables/useShopApi.ts` — всі виклики до apisite (дзеркало старого `api/shop.ts`)
- `composables/useCart.ts`, `useLists.ts` — кошик / wishlist / compare (localStorage)
- `composables/useNovaPochta.ts` — пошук міст і відділень НП
- `composables/useSeo.ts` — canonical / OG / JSON-LD хелпери
- `components/shop/CategoryPage.vue` — спільна логіка категорії та сторінки фільтра
- `components/shop/ProductPage.vue` — товар (+ attr-сторінки)
- `i18n/locales/ru.json`, `uk.json` — переклади (перенесені зі старого сайту + нові ключі)
- `FLOY-ADMIN/` — копія бекенда для довідки (не частина фронтенда)
