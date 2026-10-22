# Інвентар Print-Case (`printcase`, print-case.com.ua)

> Знято 21.10.2026: `node scripts/site-inventory.mjs printcase --check` (як повторити — `README.md`).
> Повні списки з новою адресою для кожної — `.snapshots/inventory/printcase/urls.tsv` (5-та колонка).
> **Бракує GSC і логів nginx** (`README.md`, «Від власника»).

## 1. Sitemap

Згенеровано **31.03.2025 і відтоді не оновлювався**. Індекс невалідний: три `<url>` (головна, `/brands`,
`/theme`) лежать прямо в `<sitemapindex>`. 2 167 адрес повторюються. Мова — лише ru.

| Тип | Адрес | Нова адреса (§4.5) |
|---|---:|---|
| принт на моделі `/{бренд}/{модель}-{принт}` | 231 539 | `/neoprint/{модель}/{id}` — id з мапи імпорту «alias шаблону → id» |
| принт на моделі без сторінки моделі в sitemap | 2 236 | те саме; модель — з повного переліку `mysql_PC` |
| тема на моделі `/{бренд}/cases/{модель}/theme/{тема}` | 33 852 | `/{модель}/filter/{тема}` |
| модель `/{бренд}/cases/{модель}` | 372 | `/{модель}` (режим «дизайни», §6.2) |
| тема `/theme/{тема}` | 91 | `/chekhly/filter/{тема}` (§6.3) |
| бренд `/{бренд}` | 14 | `/{бренд}` — той самий alias |
| головна, `/brands`, `/theme` | 3 | `/`, `/chekhly`, `/chekhly` |
| **разом** | **268 107** | |

- **Принти:** 2 048 різних шаблонів, у середньому 622 на модель. Без сторінки моделі в sitemap — три Nokia під
  `microsoft` (`nokia-5-3`, `nokia-3-4`, `nokia-3-2018`, по 617 принтів) і поодинокі ZTE; модель для них
  знаходиться лише за повним переліком моделей PC (імпорт).
- **Теми:** кожна з 372 моделей має **всі 91 тему** (372 × 91 = 33 852) — однаковий текст теми на 372 сторінках.
  Alias тем — з підкресленням (`fc_barcelona`, `futbolnye_kluby`); при імпорті зберігаємо як є.
- **Перший сегмент `/…/cases/` — не лише бренд:** `seriya-tecno` (11 моделей), `seriya-e` (9),
  `samsung-galaxy-s21-plus` (2). Правило 301 бренд ігнорує — бере лише модель.
- **30 alias моделей PC немає серед моделей FLOY** (старі): `microsoft-lumia-950(-xl)`, `nokia-2/6/8`,
  `samsung-galaxy-j1-2016`, `samsung-galaxy-j5-2016`, `samsung-j250-j2-2018`, `samsung-galaxy-a50s`,
  `xiaomi-mi-max(-2)`, `xiaomi-redmi-note-5a-high-edition`, `pro6`, `u10`, `meizu-16/m5/m5-note/m6/m6-note/m15/m15-lite/u30/pro-7`,
  `zte-blade-a610`, `zte-blade-v7-lite`, `zte-axon-7`, `zte-z17-mini`, `zte-nubia-z18-mini`, `oneplus-five`,
  `poco_m4_pro`. Для них 301 — на бренд (або на модель FLOY з іншим alias, якщо знайдеться) — вирішити в плані сайту.
- **Бренди:** 4 з 14 немає у FLOY — `doogee` (на живому сайті 500), `lg`, `asus`, `leagoo`. Натомість сайт
  посилається на бренди, яких немає в sitemap: `ulefone`, `tcl`, `blackview`, `umidigi`, `hmd` (200).

## 2. Живий сайт (21.10)

- `/uk` — **500**; неіснуюча адреса — **500** (не 404); нова модель (`/apple/cases/iphone-17-pro`) — 500;
  `/doogee` — 500. Усе це на рушії стане 404 / 301.
- `/o-nas`, `/dostavka-oplata`, `/faq`, `/oformit-zakaz`, `/cart/` — 200 (не в sitemap) → `/about`, `/dostavka`,
  FAQ (§16 п. 4), `/shop/cart`.
- `www.` і `http://` — 301 на `https://print-case.com.ua/` (правильно).
- robots.txt: `Disallow` для `/cart/` і шести адрес моделей/серій (`/apple/seriya/iphone-7-7s-plus` тощо —
  такі адреси зараз 404). На рушій не переносимо.
- Зразки всіх типів — 200 (50 з першого разу), крім `/doogee`.

## 3. Висновки для імпорту й карти 301

1. Правила §4.5 покривають 99,2 % адрес; решта — 2 236 принтів трьох Nokia (модель з повного переліку PC).
2. Імпорт має писати не лише «alias шаблону → id неопрінта», а й **«alias моделі PC → alias моделі рушія»**
   для 30 старих моделей (або 301 на бренд).
3. 2 048 шаблонів PC — звірити з 741 неопрінтом FLOY (§6.4: спільні дизайни на двох сайтах — дубль).
4. На сторінки «модель × принт» (231 тис.) у sitemap рушія не йдемо (§6.4) — 301 є, нових адрес у карті немає.

## 4. Зразки (по 3; повні — `samples.txt`)

```
/apple/iphone-5-5s-logotip_barseloni              → /neoprint/iphone-5-5s/{id}
/xiaomi/xiaomi-redmi-note-7-pro-akkerman_levi     → /neoprint/xiaomi-redmi-note-7-pro/{id}
/huawei/cases/huawei-p-smart-plus/theme/futbolnye_kluby → /huawei-p-smart-plus/filter/futbolnye_kluby
/samsung/cases/samsung-galaxy-a3-2016             → /samsung-galaxy-a3-2016
/theme/fc_bayern                                  → /chekhly/filter/fc_bayern
/microsoft/nokia-5-3-bmw_e30                      → модель лише з переліку PC
```
