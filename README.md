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
| `/printcase?model=...` | Конструктор чохлів |

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

Деплой на хостинг: потрібен **Node 18+ (краще 20/22)**. Залити проєкт (без `node_modules`, `.nuxt`, `.output`, `.node`),
виконати `npm install && npm run build`, запускати `node .output/server/index.mjs` через pm2:

```js
// ecosystem.config.js (приклад для pm2)
module.exports = {
	apps: [{
		name: 'floy-new',
		script: '.output/server/index.mjs',
		env: { PORT: 3000, NITRO_HOST: '127.0.0.1' },
	}],
}
```

Nginx проксіює домен на цей порт — так само, як зараз проксіюється старий Nuxt 2.

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
