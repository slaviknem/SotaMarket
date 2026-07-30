# Розгортання FLOY-NEW на сервері (VPS + HestiaCP)

Nuxt 3 SSR — потрібен **запущений Node-процес**, не статика. nginx (HestiaCP) проксіює
домен на локальний порт, де крутиться Node під керуванням pm2.

Перевірено на тестовому стенді **test.floy.com.ua** (порт 3000). Прод — за тією ж схемою,
лише інший домен/порт.

> Сервер: hostia.ua VPS, HestiaCP, користувач `wm`, IP `138.199.205.230`, **arm64**, Ubuntu 22.04.
> Node на сервері через nvm: **default = v16.20.2 (НЕ чіпати — старі сайти й pm2-демон)**,
> для floy-new — **v22.23.1**. pm2-демон один (на node 16) — **другий pm2 не ставити**.

---

## 0. Параметри розгортання

| | тест | прод (приклад) |
|---|---|---|
| домен | `test.floy.com.ua` | `floy.com.ua` |
| порт Node | `3000` | напр. `3100` (вільний; старий сайт зараз на 3001) |
| pm2-ім'я | `floy-test` | `floy-prod` |
| папка | `/root/nodeapps/FLOY-NEW` | `/root/nodeapps/FLOY-PROD` |
| `SITE_URL` | `https://test.floy.com.ua` | `https://floy.com.ua` |

Зайняті порти pm2: 3001 Floy(старий), 3002 Smarket, 3003 SotaMarket, 4000/4001 Print-Case, 9999 PL-FILTER.

---

## 1. Залити код і зібрати (під node 22)

```bash
nvm use 22
mkdir -p /root/nodeapps && cd /root/nodeapps
git clone git@github.com:slaviknem/FLOY-NEW.git FLOY-PROD     # SSH-ключ; або https + PAT
cd FLOY-PROD
npm install
SITE_URL=https://floy.com.ua npx nuxi build                  # НЕ build.cmd (Windows-обгортка)
```
Перевірка збірки: має з'явитись `.output/server/index.mjs`, у кінці `Build complete!`.

## 2. Запуск через наявний pm2 (демон node 16, додаток — node 22)

```bash
nvm use 16     # щоб pm2-команди йшли через робочий демон
cd /root/nodeapps/FLOY-PROD

PORT=3100 \
SITE_URL=https://floy.com.ua \
URL_API=https://admin.floy.com.ua/apisite/ \
URL_STORAGE=https://admin.floy.com.ua/storage/ \
pm2 start .output/server/index.mjs \
  --name floy-prod \
  --interpreter /root/.nvm/versions/node/v22.23.1/bin/node

pm2 save
curl -I http://127.0.0.1:3100        # очікуємо HTTP/1.1 200 OK + x-powered-by: Nuxt
```

## 3. nginx-проксі через шаблон HestiaCP `node`

Шаблон уже створено: `/usr/local/hestia/data/templates/web/nginx/node.tpl` + `node.stpl`
(HTTP:80 → Apache `%ip%:8080` для LE/редіректу; HTTPS:443 → `127.0.0.1:<порт>`).

**Важливо:** порт Node прописаний у шаблоні (`proxy_pass http://127.0.0.1:3000;`).
Для іншого порту шаблон треба продублювати під цей порт (напр. `node3100.stpl`)
або тимчасово правити — один шаблон = один порт. Порти слухача 80/443 хардкоджені
(змінні `%web_port%`/`%web_ssl_port%` тут = 8080/8443 бекенду Apache, НЕ фронтові!).

```bash
# домен має бути створений у HestiaCP, alias www прибрати (LE впаде на www без DNS)
v-delete-web-domain-alias wm floy.com.ua www.floy.com.ua    # якщо alias не потрібен
v-change-web-domain-proxy-tpl wm floy.com.ua node
nginx -t
```

## 4. SSL (Let's Encrypt) — обхід, бо прямий LE на кастомному шаблоні дає 404 acme

```bash
v-change-web-domain-proxy-tpl wm floy.com.ua default     # тимчасово стандартний шаблон
v-add-letsencrypt-domain wm floy.com.ua                  # випуск сертифіката (Apache віддає челендж)
v-add-web-domain-ssl-force wm floy.com.ua                # примусовий HTTPS
v-change-web-domain-proxy-tpl wm floy.com.ua node        # повернути node-шаблон
nginx -t && systemctl reload nginx
curl -I --http1.1 https://floy.com.ua                    # HTTP/1.1 200 OK + x-powered-by: Nuxt
```

## 5. Оновлення після пушу в GitHub

```bash
cd /root/nodeapps/FLOY-PROD && git pull && nvm use 22 && npm install && npx nuxi build && pm2 restart floy-prod
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

Джерела в адмінці (FLOY-ADMIN) мають бути в розмірах, під які заточений роут:

```bash
php artisan images:webp-templates --max=1100             # images/templates/*.webp -> 576x1100
php artisan images:webp-templates-thumb --size=264x504   # images/templates/thumb/*.webp
```

Прогнати після кожної партії нових шаблонів: без webp роут падає назад на оригінальний
jpg (1,7 МБ на шаблон — генерація помітно повільніша).

---

## Прод-перемикання зі старого сайту (cutover)

Старий floy.com.ua зараз на порту 3001. Щоб перевести домен на нову версію:
1. Підняти нову версію на окремому порту (3100) і перевірити локально (`curl 127.0.0.1:3100`).
2. Перевести `floy.com.ua` на шаблон `node` з потрібним портом (кроки 3–4).
3. Переконатись, що сайт працює, і лише потім зупиняти старий процес: `pm2 delete <старий-id>` + `pm2 save`.
4. Тримати старий код/процес у запасі до підтвердження стабільності.

## Чекліст безпеки/гігієни

- [ ] GitHub-токен (PAT) для clone — **відкликати** після використання; краще SSH-ключ.
- [ ] Тестовий стенд закрити від індексації (Password Protection або `noindex`).
- [ ] `SITE_URL` на кожному стенді свій (canonical/OG/sitemap).
- [ ] `pm2 save` після кожної зміни складу процесів (інакше після ребуту не підніметься).
- [ ] **Не** ставити другий pm2 і **не** міняти nvm default з v16.
