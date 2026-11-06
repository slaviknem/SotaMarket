# nginx sotamarket.com.ua — файли для сервера (T9)

Копія рецепта SMARKET (`../../../SMARKET/NOTES/nginx/`, перемкнено 27.10, ключ кешу з роздільником — 28.10) із заміною
домену (`sotamarket.com.ua`), порту (**3011**), процесу (`SOTAMARKET`), зони кешу (`sotamarket_cache`,
`/var/cache/nginx-sotamarket`), змінної мови (`$sotamarket_lang`), логу й теки карти. Тіло шаблону Hestia — рядок у рядок
`smarket` (і `floy` FLOY-ADMIN, 28.10), крім порту.

Файли не входять у збірку й локально не застосовуються. На сервер вони приходять разом із репозиторієм
(`git -C /root/nodeapps/SOTAMARKET pull` — процес не чіпає, він працює з `.output`), звідти їх копіюють на
місце. Порядок дій — `NOTES/plans/PLAN-SITE-SOTAMARKET.md` §8, «Сервер: T9».

**Шлях тут = шлях на сервері**, як у `FLOY-ADMIN/NOTES/nginx/`:
`etc/nginx/conf.d/sotamarket-cache.conf` → `/etc/nginx/conf.d/sotamarket-cache.conf`,
`home/wm/conf/web/sotamarket.com.ua/nginx.ssl.conf_log` → `/home/wm/conf/web/sotamarket.com.ua/nginx.ssl.conf_log`.

Спільне з FLOY, що вже є на сервері й тут не дублюється: формат логу `floy_log` (`conf.d/floy-log.conf`), зони
лімітів (`conf.d/floy-limits.conf`), білий список `$floy_deny` (`conf.d/floy-allow.conf`, списки в `/etc/nginx/geo/`).
Як воно влаштоване — `FLOY-ADMIN/NOTES/SERVER.md`.

| Файл (тут і на сервері) | Що | Стан |
|---|---|---|
| `/etc/nginx/conf.d/sotamarket-cache.conf` | зона `sotamarket_cache` (`/var/cache/nginx-sotamarket`, доба, 1 ГБ) і `$sotamarket_lang` — мова з cookie для ключа кешу замість `Vary: Cookie`, лише для сторінок (`/img/`, `/_ipx/`, `/_nuxt/`, `/api/`… — спільні) | ☐ T9 |
| `/usr/local/hestia/data/templates/web/nginx/sotamarket.tpl`, `.stpl` | шаблон Hestia — копія `smarket`: порт 3011, www і http → `https://sotamarket.com.ua` одним кроком, Let's Encrypt на :80 напряму | ☐ T9 |
| `…/sotamarket.com.ua/nginx.ssl.conf_cache` | кеш сторінок, як у FLOY і SMARKET: зона `sotamarket_cache`, ключ `"…$request_uri\|lang=$sotamarket_lang"` (роздільник обов'язковий — `PLAN-MULTISITE.md` §11 п. 3), `proxy_ignore_headers Cache-Control Expires Vary` | ☐ T9 |
| `…/sotamarket.com.ua/nginx.ssl.conf_sitemap` | `/sitemap.xml` і `/sitemaps/` з теки адмінки `storage/app/public/sitemap/sotamarket/` | ☐ T9 |
| `…/sotamarket.com.ua/nginx.ssl.conf_log` | access-лог `/var/log/nginx/sotamarket-access.log` (формат `floy_log`) | ☐ T9 |
| `…/sotamarket.com.ua/nginx.ssl.conf_limits` | стеля з'єднань і гальмо на `/img/`, `/_ipx/` (зони FLOY) | ☐ T9 |
| `…/sotamarket.com.ua/OFF/nginx.ssl.conf_allow` | білий список України, як у FLOY — **вимкнено** (рішення власника 30.10, план §3); увімкнути — копія з `OFF/` у теку вхоста | — |

Доповнення кладуться **після** зміни шаблону, а редирект панелі (якщо є) прибирається **до** — порядок і відкат у плані.

⚠️ Як і у FLOY: **суфікс `.off` файл не вимикає** — `include …/nginx.ssl.conf_*` ловить і `nginx.ssl.conf_allow.off`.
Вимикати — перенесенням у `/home/wm/conf/web/sotamarket.com.ua/OFF/`. Згенеровані панеллю `nginx.conf`,
`nginx.ssl.conf` руками не правити — затре. Змінити вхост — правка шаблону тут → копія в
`/usr/local/hestia/data/templates/web/nginx/` → `v-rebuild-web-domain wm sotamarket.com.ua`.

## Скрипти

| Скрипт | Де | Що |
|---|---|---|
| `t9-state.sh` | сервер | знімок перед перемиканням: домен у Hestia, шаблони, конфіги вхостів (і steklomarket — зразок), сертифікат, зони кешу, процеси (і старий `[3003] SotaMarket`), карта, логи старого сайту. Лише читає |
| `t9-check.sh` | ПК (Git Bash) або сервер | ззовні: 301 з www і http одним кроком, рушій, 301-карта бренду, robots з Node, карта, кеш (HIT з `_ga`, 302 мови не в спільний кеш), сертифікат. Вміст сторінок — `scripts/url-check.mjs` |
| `sotamarket-health.sh` | сервер | моніторинг після перемикання: копії й пам'ять, коди, кеш, 404/5xx, Googlebot — з access-логу |
