# Інвентар адрес старих сайтів (етап A, `PLAN-MULTISITE.md` §0)

Що є на старому сайті і що з кожним типом адрес станеться на рушії. По файлу на сайт:

| Файл | Сайт | Адрес у sitemap |
|---|---|---|
| `sotamarket.md` | sotamarket.com.ua (пілот) | 46 264 |
| `smarket.md` | steklomarket.com.ua | 394 996 |
| `printcase.md` | print-case.com.ua | 268 107 |

Знято 21.10.2026. **Чого ще бракує — даних від власника** (нижче): без них не видно, які адреси
справді приносять трафік і що вже в індексі поза sitemap (теми, серії, адреси з помилками).

## Як повторити (ПК, PowerShell, `C:\Web-SERVER\domains\FLOY`)

```powershell
$env:PATH = "C:\Web-SERVER\domains\FLOY\.node\node-v22.14.0-win-x64;$env:PATH"
node scripts/site-inventory.mjs sotamarket --check     # smarket | printcase | floy (звірка)
node scripts/site-inventory.mjs smarket --check --fresh   # --fresh — качати sitemap заново
```

Результат — `.snapshots/inventory/<ключ>/` (не в git): `urls.tsv` (усі адреси з типом, мовою, lastmod і
новою адресою для Print-Case), `summary.md` (таблиця для цих файлів), `summary.json`, `samples.txt`
(до 25 адрес на тип — для прогону через стенд перед перемиканням), `parts/` (кеш частин sitemap).
Класифікатор звірено на FLOY: 49 036 адрес, тем на моделях 21 397 — як у `PLAN-MULTISITE.md` §6.5.

`--check` ходить на живий сайт **по одному запиту з паузою**: старі сайти віддають 502 вже на двох
паралельних (Sota — і на послідовних). 5xx перепитується; «502→200» у зведенні — вдалося з другого разу.

## Прогін адрес через рушій (перед перемиканням, `PLAN-MULTISITE.md` §12 п. 2, §14 п. 1)

`scripts/url-check.mjs` — ті самі адреси з `urls.tsv` на новому сайті: ланцюг 301, кінцевий код, canonical,
noindex, кількість `h1`, картки товарів на моделях, згадки «floy»; з `--compare` — title, `h1` і description
тих самих адрес на старому сайті. Вибірка стала (той самий набір щоразу). Зразки команд (ПК, PowerShell, тека
проєкту сайту; Node 22 — у PATH, як вище):

```powershell
# dev; моделі, бренди, розділи, статті — усі, товари — вибіркою; проби — 301-карта бренду й службові адреси
node scripts/url-check.mjs http://localhost:3010 .snapshots/inventory/smarket/urls.tsv --probes `
  --sample='*:all,product@model:600,product@category:300' --slice=0:1000 --out=dev-1
node scripts/url-check.mjs report dev-1 dev-2          # зведення кількох частин
# title / h1 / description проти старого сайту — по 15 адрес кожного типу
node scripts/url-check.mjs http://localhost:3010 .snapshots/inventory/smarket/urls.tsv --sample='*:15' `
  --compare=https://www.steklomarket.com.ua --out=compare
```

**Dev падає по пам'яті** (воркер Nitro, «JS heap out of memory») після ~1–2 тис. сторінок — тому `--slice` частинами
й перезапуск dev між ними (`touch nuxt.config.ts`). На сервері (збірка) — одним прогоном за списком із git
(`<ключ>-check.tsv` у цій теці — робить `--save-list`; у SMARKET — 520 адрес), з `--host=<домен>`: так запит
іде, як від nginx.

## Від власника

**1. Google Search Console** — для кожного з трьох ресурсів (steklomarket.com.ua, sotamarket.com.ua,
print-case.com.ua): «Ефективність → Результати пошуку», період 6 місяців (або 3), вкладка «Сторінки» →
«Експортувати» → CSV; «Індексування → Сторінки» — експорт зведення і списки «Сторінку проіндексовано» та
«Виявлено, але не проіндексовано» (скільки дає GSC). Файли — у `.snapshots/inventory/<ключ>/gsc/`. Або дати
доступ до ресурсів (і сказати, на який акаунт).

**2. Логи nginx** — сервер, bash по SSH. Спершу подивитись, де лежать логи й у якому форматі:

```bash
ls -la /var/log/nginx/domains/ | grep -E 'sotamarket|steklomarket|print-case'
head -c 600 /var/log/nginx/domains/sotamarket.com.ua.log; echo
```

Якщо рядок має вигляд `IP - - [дата] "GET /адреса HTTP/1.1" 200 1234 "реферер" "агент"` — зібрати топи
(запити Googlebot за адресою й кодом, входи з пошуку Google, розподіл кодів, скільки днів у логах):

```bash
mkdir -p /root/inventory && cd /var/log/nginx/domains
for d in sotamarket.com.ua steklomarket.com.ua print-case.com.ua; do
  zcat -f $d.log* 2>/dev/null | awk -F'"' -v out=/root/inventory/$d '
    { split($2, r, " "); split($3, s, " "); p = r[2]; c = s[1]; day[substr($1, index($1, "[") + 1, 11)] = 1
      if ($6 ~ /Googlebot/) { bot[c "\t" p]++; code[c]++ }
      else if ($4 ~ /^https?:\/\/(www\.)?google\./) land[p]++ }
    END {
      n = 0; for (k in day) n++; print "днів у логах:", n > (out "-codes.txt")
      for (k in code) print "googlebot", k, code[k] > (out "-codes.txt")
      cmd = "sort -rn | head -300 > " out "-googlebot.txt"; for (k in bot) print bot[k] "\t" k | cmd; close(cmd)
      cmd = "sort -rn | head -300 > " out "-google-landing.txt"; for (k in land) print land[k] "\t" k | cmd; close(cmd)
    }'
done
wc -l /root/inventory/*
```

Формат інший — надіслати вивід `head` з першого кроку, команду підлаштую. Файли з `/root/inventory/`
перенести на ПК (WinSCP або `scp`) у `.snapshots/inventory/logs/`.
