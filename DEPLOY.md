# Розгортання FLOY-NEW на сервері (VPS + HestiaCP)

Nuxt 3 SSR — потрібен **запущений Node-процес**, не статика. nginx (HestiaCP) проксіює
домен на локальний порт, де крутиться Node під керуванням pm2.

Перевірено на тестовому стенді **test.floy.com.ua** (порт 3000). Прод іде тим самим шляхом:
той самий порт і той самий шаблон nginx, лише інший домен, папка й `SITE_URL`.

> Сервер: hostia.ua VPS, HestiaCP, користувач `wm`, IP `138.199.205.230`, **arm64**, Ubuntu 22.04.
> Node на сервері через nvm: **default = v16.20.2 (НЕ чіпати — старі сайти й pm2-демон)**,
> для floy-new — **v22.23.1**. pm2-демон один (на node 16) — **другий pm2 не ставити**.

---

## 0. Параметри розгортання

| | тест | прод |
|---|---|---|
| домен | `test.floy.com.ua` | `floy.com.ua` |
| порт Node | `3000` | `3000` (той самий; тест зупиняємо) |
| pm2-ім'я | `floy-test` | `floy-prod` |
| папка | `/root/nodeapps/FLOY-NEW` | `/root/nodeapps/FLOY-PROD` |
| `SITE_URL` | `https://test.floy.com.ua` | `https://floy.com.ua` |

Зайняті порти pm2: 3001 Floy(старий), 3002 Smarket, 3003 SotaMarket, 4000/4001 Print-Case, 9999 PL-FILTER.

**Чому прод теж на 3000, а не на окремому 3100:** порт зашитий у шаблон nginx
(`proxy_pass http://127.0.0.1:3000;`), тож будь-який інший порт вимагає дублювати шаблон —
ще одна неперевірена ланка в найризикованіший момент. Простіше зупинити тестовий стенд
(`pm2 stop floy-test`, саме stop — процес лишається в списку) і зайняти вже перевірений шлях.

**Порт старого сайту (3001) не займати.** Спокуса зрозуміла — nginx туди вже проксіює, шаблон
чіпати не треба. Але щоб зайняти 3001, старий процес доведеться спершу зупинити, і домен
почне віддавати нову версію в ту саму мить: перевірити наперед неможливо, а відкат замість
«повернути шаблон» стає «зупинити новий, підняти старий» при вже лежачому сайті.
Старий процес має дожити на 3001 недоторканим ще 2–3 дні як страхівка.

---

## 1. Зафіксувати поточний стан (щоб було куди відкатитись)

Виконати **до** будь-яких змін і зберегти вивід — з нього беруться значення для відкату:

```bash
pm2 list                                                  # імена/id процесів, хто на якому порту
pm2 describe <id-старого-floy> | grep -E 'script|exec cwd|interpreter'
grep -rn 'proxy_pass' /home/wm/conf/web/floy.com.ua/nginx.ssl.conf   # на який порт іде домен зараз
v-list-web-domain wm floy.com.ua | grep -Ei 'proxy|ssl|alias'        # шаблон, SSL, www-alias
```

Записати: **шаблон домену**, **порт у proxy_pass**, **як стартує старий процес**.

## 2. Залити код і зібрати (під node 22)

```bash
nvm use 22
mkdir -p /root/nodeapps && cd /root/nodeapps
git clone https://github.com/slaviknem/FLOY-NEW.git FLOY-PROD   # або SSH-ключ
cd FLOY-PROD
npm install
SITE_URL=https://floy.com.ua npx nuxi build                     # НЕ build.cmd (Windows-обгортка)
```
Перевірка збірки: має з'явитись `.output/server/index.mjs`, у кінці `Build complete!`.
Якщо збірка впала — далі не йти, старий сайт при цьому не зачеплений.

## 3. Звільнити порт 3000 і запустити прод

pm2-демон крутиться на node 16, сам додаток — на node 22 через `--interpreter`.

```bash
nvm use 16                       # щоб pm2-команди йшли через робочий демон
pm2 stop floy-test               # звільняємо 3000; саме stop, не delete
cd /root/nodeapps/FLOY-PROD

PORT=3000 \
SITE_URL=https://floy.com.ua \
URL_API=https://admin.floy.com.ua/apisite/ \
URL_STORAGE=https://admin.floy.com.ua/storage/ \
pm2 start .output/server/index.mjs \
  --name floy-prod \
  --interpreter /root/.nvm/versions/node/v22.23.1/bin/node

pm2 save
```

## 4. Перевірити ДО перемикання домену

Домен усе ще на старому сайті — новий стукаємо напряму в порт:

```bash
curl -I http://127.0.0.1:3000                             # 200 + x-powered-by: Nuxt

# індексація відкрита: x-robots-tag НЕ мусить бути
curl -sI http://127.0.0.1:3000/ | grep -i x-robots

# службові — навпаки, мусить бути noindex
curl -sI http://127.0.0.1:3000/shop/cart | grep -i x-robots

# canonical з правильним доменом (не test!)
curl -s http://127.0.0.1:3000/ | grep -o '<link rel="canonical"[^>]*>'

# каталог і товар живі, дані з API приходять
curl -s http://127.0.0.1:3000/iphone-17-pro-max | grep -c 'p-card'
curl -s http://127.0.0.1:3000/robots.txt | head -3

# новий проксі Укрпошти
curl -s 'http://127.0.0.1:3000/api/ukrposhta?pi=36000' | head -c 120
```

Якщо `canonical` показує `test.floy.com.ua` — збірка пішла зі старим `SITE_URL`:
перезібрати з правильним і `pm2 restart floy-prod`.

## 5. Перемкнути домен

SSL для `floy.com.ua` **уже випущений і працює** (старий сайт віддає https), тож
Let's Encrypt **не торкаємось** — жодних `v-add-letsencrypt-domain`, інакше можна
зламати робочий сертифікат. Шаблон `node` пропускає acme через Apache на :80,
тож автопродовження далі працює само.

```bash
v-change-web-domain-proxy-tpl wm floy.com.ua node
nginx -t && systemctl reload nginx

curl -I --http1.1 https://floy.com.ua                     # 200 + x-powered-by: Nuxt
curl -sI https://floy.com.ua/ | grep -i x-robots          # порожньо = індексується
```

Якщо в домену є **alias www** і він у DNS — перевірити і його: `curl -I https://www.floy.com.ua`.

## 6. Відкат (якщо щось не так)

Старий процес живий на 3001, тому відкат — це одна команда з поверненням шаблону,
який записали в кроці 1:

```bash
v-change-web-domain-proxy-tpl wm floy.com.ua <шаблон-із-кроку-1>
nginx -t && systemctl reload nginx
curl -I https://floy.com.ua                               # знову старий сайт
```

Старий процес **не видаляти 2–3 дні** після запуску. Аж потім:
`pm2 delete <старий-id> && pm2 save`.

## 7. Оновлення після пушу в GitHub

```bash
cd /root/nodeapps/FLOY-PROD && git pull && nvm use 22 && npm install && npx nuxi build && nvm use 16 && pm2 restart floy-prod
```
(`npm install` можна пропустити, якщо залежності не мінялись.)

---

## 6. Зображення неопрінтів (кеш композицій)

Чохли для сторінок дизайну й карток збирає Nitro-роут `/img/neoprint/…` (шаблон принта +
маска моделі) і кладе у `.cache/neoprint` — по одному файлу на «модель + дизайн + кадр»
(7–45 КБ). Кеш переживає рестарт, запис протухає через 30 днів, тож заміна шаблона в адмінці
підхоплюється сама.

```bash
du -sh .cache/neoprint                                   # скільки вже займає
find .cache/neoprint -type f -atime +60 -delete          # прибрати не запитуване 2 місяці
rm -rf .cache/neoprint                                   # повний скид (перезбереться на льоту)
```

Джерела в адмінці (FLOY-ADMIN) мають бути в розмірах, під які заточений роут — 576×1100
(кадри вище 504: og, card2x, hero2x) і 264×504 (card, hero). Нові шаблони отримують обидва
webp одразу при завантаженні в адмінці (`ImageH::makeTemplateWebp`), тож команди нижче —
це БЕКФІЛ старих і перегенерація після зміни розмірів кадрів:

```bash
php artisan images:webp-templates --dry-run              # спершу подивитись
php artisan images:webp-templates                        # images/templates/*.webp -> 576x1100
php artisan images:webp-templates-thumb                  # images/templates/thumb/*.webp -> 264x504
```

Потрібні розміри вже стоять дефолтами — прапорці не потрібні. Без webp роут падає назад на
оригінальний jpg (1,7 МБ на шаблон — генерація помітно повільніша).

Міняються `PRESETS` у роуті — перерахувати обидва розміри (найбільший кадр диктує висоту
великої копії, `THUMB_MAX_HEIGHT` — висоту прев'ю) і поправити `ImageH::makeTemplateWebp`
разом із дефолтами команд.

---

## Що зробити після запуску (не в коді)

- [ ] **Google Search Console**: додати ресурс `floy.com.ua`, підтвердити власність
      (простіше DNS-записом, ніж meta-теґом), надіслати sitemap, коли він з'явиться.
- [ ] **Аналітика**: на сайті немає ні GA4/GTM, ні Meta Pixel — без них не буде даних про
      продажі й не з чим порівняти «до/після» переїзду. Ставити одразу, а не «потім».
- [ ] **`APP_DEBUG=false`** в `.env` адмінки (`admin.floy.com.ua`): зараз будь-яка 500-ка
      віддає повний стек Laravel зі шляхами `/home/wm/web/...`.
- [ ] Тестовий стенд, коли знадобиться, підняти на іншому порту (не 3000) і закрити від
      індексації — його `SITE_URL` мусить лишитись `https://test.floy.com.ua`.
- [ ] Перші дні тримати око на `pm2 logs floy-prod --lines 100` і `pm2 describe floy-prod`
      (перезапуски, пам'ять).

## Чекліст безпеки/гігієни

- [ ] GitHub-токен (PAT) для clone — **відкликати** після використання; краще SSH-ключ.
- [ ] Тестовий стенд закрити від індексації (Password Protection або `noindex`).
- [ ] `SITE_URL` на кожному стенді свій (canonical/OG/sitemap).
- [ ] `pm2 save` після кожної зміни складу процесів (інакше після ребуту не підніметься).
- [ ] **Не** ставити другий pm2 і **не** міняти nvm default з v16.
- [ ] Let's Encrypt для `floy.com.ua` **не перевипускати** — сертифікат уже робочий.
