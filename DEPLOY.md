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
Усе це описано в `ecosystem.config.cjs`, тому команда одна й без прапорців:

```bash
nvm use 16                       # щоб pm2-команди йшли через робочий демон
pm2 stop floy-test               # звільняємо 3000; саме stop, не delete
cd /root/nodeapps/FLOY-PROD
pm2 start ecosystem.config.cjs
pm2 save
```

⚠️ **Не запускати руками без `--interpreter` і не додавати `-i N`.** Без прапорця
PM2 бере node свого демона (16.20.2), а в cluster-режимі він ігнорує прапорець
узагалі. У node 16 немає глобальних `fetch`/`Headers`, тож Nuxt 3 піднімається
мертвим: головна без товарів, усі сторінки моделей — 404 «Category not found».
19.09.2026 це коштувало доби. Кілька копій — через `FLOY_WORKERS` у
`ecosystem.config.cjs` (форкає `cluster.mjs`, а не PM2).

Перевірка, що піднялось під тим node:

```bash
readlink -f /proc/$(pgrep -f "FLOY-PROD/(cluster\.mjs|\.output/server/index\.mjs)" | head -1)/exe
```

Має бути `/root/.nvm/versions/node/v22.23.1/bin/node`. Саме `readlink /proc/<pid>/exe` —
реальний бінарник процесу; `ps -o args=` тут бреше: PM2 у fork-режимі показує
команду як `node <скрипт>` навіть із правильним інтерпретатором.

`SITE_URL`, `URL_API`, `URL_STORAGE` в оточенні процесу не потрібні: `nuxt.config`
читає їх під час **збірки** і зашиває в `.output`. У рантаймі зібране перекривають
лише змінні виду `NUXT_PUBLIC_URL_API`.

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
cd /root/nodeapps/FLOY-PROD && git pull && nvm use 22 && npm install && \
  cp -rp .output/public/_nuxt /tmp/_nuxt-prev 2>/dev/null; \
  npx nuxi build && \
  cp -rpn /tmp/_nuxt-prev/. .output/public/_nuxt/ 2>/dev/null; \
  find .output/public/_nuxt -type f -mtime +14 -delete; \
  nvm use 16 && pm2 restart floy-prod
```
(`npm install` можна пропустити, якщо залежності не мінялись.)

### Чому тут копіювання `_nuxt`, а не просто `nuxi build`

`nuxi build` **чистить `.output`**, тобто старі чанки зникають із сервера в ту саму секунду.
А в браузерів, які в цей момент мають сторінку відкритою (або відновлюють вкладку минулого
сеансу — мобільні це роблять постійно), у розмітці записані саме старі імена. Наступне
довантаження шматка коду отримує 404, і сторінка лишається напівживою: сама працює,
а частина функцій мовчки ні — так, наприклад, у конструкторі зникала маска чохла.

Тому:

- **`cp -rp` до збірки + `cp -rpn` після** — старі чанки повертаються поруч із новими
  (`-n` = не чіпати нові, імена з хешем ніколи не конфліктують, `-p` зберігає дати);
- **`find -mtime +14 -delete`** — інакше `_nuxt` ріс би з кожною викладкою назавжди;
  два тижні старих чанків покривають будь-яку живу вкладку;
- документ (HTML) віддається з `Cache-Control: no-cache` (`server/middleware/no-cache-html.ts`),
  тож наступне відкриття сторінки завжди приносить свіжу розмітку з новими іменами;
- якщо шматок коду все ж не завантажився, `plugins/chunk-reload.client.ts` перезавантажує
  сторінку один раз — далі вона приїжджає новою.

Перевірити після викладки, що заголовки на місці:

```bash
curl -sI https://floy.com.ua/printcase | grep -i cache-control     # має бути no-cache
curl -sI https://floy.com.ua/_nuxt/<будь-який-чанк>.js | grep -i cache-control  # immutable
```

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

## Як воно працює на сервері: процеси, копії, кеш

### Дерево процесів

PM2 бачить **один** застосунок `floy-prod`. Копії форкає `cluster.mjs` уже всередині,
тому в `pm2 list` завжди один рядок — це норма, а не «кластер не піднявся»:

```
PID      PPID     RSS
2251287  1486     57 МБ    node cluster.mjs      ← головний, батько — демон PM2
2251305  2251287  269 МБ   node cluster.mjs      ← копія 1
2251306  2251287  271 МБ   node cluster.mjs      ← копія 2
2251307  2251287  289 МБ   node cluster.mjs      ← копія 3
2251308  2251287  268 МБ   node cluster.mjs      ← копія 4
```

Разом ~1.15 ГБ проти ~300-400 МБ в одного процесу. Стовпчик `mem` у `pm2 list`
показує лише головний процес (57 МБ) — пам'ять копій туди не входить.

### Чому копії робить не PM2

Демон PM2 на цьому сервері крутиться під **node 16.20.2** (його default у nvm —
міняти не можна, на ньому живуть старі сайти). У cluster-режимі PM2 **ігнорує
`--interpreter`**: копії народжуються через `cluster.fork()` від демона й
успадковують його node. А в node 16 немає глобальних `fetch`/`Headers`, тож у
Nuxt 3 падає кожен `$fetch` із `TypeError: Headers is not a constructor`.

Як це виглядає, якщо колись повториться: головна віддає 200 і ~80 КБ, але **без
товарів**; усі сторінки моделей — 404 «Category not found»; неопринти — 404
«Design not found»; `/api/settings` — 500. Запитів в адмінку при цьому немає
жодного, бо вони не виходять із процесу. 19.09.2026 це коштувало доби пошуків.

Тому: `pm2 start ecosystem.config.cjs` (там `exec_mode: 'fork'` + `interpreter`),
а розмноження — усередині `cluster.mjs`. **Ніколи не `pm2 start … -i N`.**

### Змінити кількість копій

`FLOY_WORKERS` в `ecosystem.config.cjs`. Правити **тільки в репозиторії**: зміна
файлу руками на сервері обірве `git pull` усередині `deploy.sh`.

```bash
# у репозиторії: правка FLOY_WORKERS → commit → push, далі на сервері:
cd /root/nodeapps/FLOY-PROD
git pull
ls -l ecosystem.config.cjs cluster.mjs     # ОБОВ'ЯЗКОВО перед delete, див. нижче
pm2 delete floy-prod
pm2 start ecosystem.config.cjs
pm2 save
find /var/cache/nginx-floy -type f -delete
```

`pm2 restart` тут не підходить: PM2 тримає env у своєму дампі й нового значення
`FLOY_WORKERS` не побачить. `FLOY_WORKERS=1` — безпечний відкат до одного процесу
(після білого списку ботів один процес віддавав сторінку за 0.034 с).

⚠️ **`ls` перед `pm2 delete` — не формальність.** 19.09 перемикали до того, як
коміт доїхав на сервер: `delete` відпрацював, `start` сказав «File not found»,
а `pm2 save` зафіксував список уже без floy-prod. Сайт ліг на кілька хвилин.
Якщо файлу немає — піднімати старим способом:

```bash
PORT=3000 pm2 start .output/server/index.mjs --name floy-prod --interpreter /root/.nvm/versions/node/v22.23.1/bin/node
```

### Перевірка після підйому

```bash
pgrep -f "FLOY-PROD/cluster.mjs" | wc -l                    # 5 = головний + 4 копії
pm2 logs floy-prod --lines 5 --nostream                     # [cluster] node v22.23.1, копій: 4
readlink -f /proc/$(pgrep -f "FLOY-PROD/cluster\.mjs" | head -1)/exe   # шлях до node 22
curl -s -o /dev/null -w "%{http_code}\n" "https://floy.com.ua/api/settings?t=1"
curl -s "https://floy.com.ua/uk?t=1" | grep -c 'грн'
```

⚠️ **Дивитись на вміст, а не лише на коди.** Під node 16 сайт віддавав 200 на
головній і «швидкі» 0.10 с — сторінки були порожні. Останній рядок саме про це:
товарів має бути багато, а сторінка моделі — важити сотні кілобайт.

⚠️ `ps -o args=` для перевірки інтерпретатора **не годиться**: PM2 у fork-режимі
показує `node <скрипт>` навіть із правильним `--interpreter`. Тільки `readlink
/proc/<pid>/exe` — це реальний бінарник процесу.

### Що `cluster.mjs` робить сам

* не стартує під node < 18 — краще гучна відмова, ніж добу віддавати 404 у Google;
* піднімає копію заново, якщо вона впала;
* здається після 10 невдалих стартів поспіль (копія прожила < 5 с) і виходить —
  далі перезапуском керує PM2 зі своїм backoff, без нескінченного циклу форків;
* розводить `SIGINT`/`SIGTERM` по копіях, інакше вони лишаються сиротами й тримають порт.

⚠️ **`max_memory_restart` тепер майже нічого не стереже:** PM2 бачить лише головний
процес, а він завжди крихітний (~57 МБ). Потік пам'яті в котрійсь копії ніхто не
зловить. Якщо знадобиться — стежити за RSS копій усередині `cluster.mjs`.

### Логи

`/root/.pm2/logs/floy-prod-{out,error}.log`, з мітками часу (`time: true`).
Рядки без мітки — з часів до `ecosystem.config.cjs`, тобто старі.

```bash
pm2 logs floy-prod --lines 50 --nostream
pm2 flush floy-prod            # обнулити, щоб старе не плуталось у розборі
```

19.09 у `/root/.pm2/logs/` лежало 18 ГБ (14 ГБ — один Print-Case FRONT), диск був
на 93%. Дивитись туди при кожному «щось дивне з сервером».

### Кеш nginx

```bash
find /var/cache/nginx-floy -type f -delete
```

Саме `find`, а не `rm -rf /var/cache/nginx-floy/*`: той спотикається об
«Directory not empty», бо nginx пише в кеш просто під час чистки. Кеш живе добу,
тож зламана сторінка, закешована з кодом 200, віддаватиметься ще 24 години після
лікування — чистити після кожного підйому.

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
