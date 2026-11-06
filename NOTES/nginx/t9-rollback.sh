#!/bin/bash
# ============================================================================
# T9 SotaMARKET — ВІДКАТ sotamarket.com.ua на старий сайт (Nuxt 2, [3003] SotaMarket). ЗМІНЮЄ nginx.
#
# Запуск (сервер, bash) — одним рядком, ~1 хв:
#   bash /root/nodeapps/SOTAMARKET/NOTES/nginx/t9-rollback.sh 2>&1 | tee /root/t9-rollback.txt
#
# Порядок — як SMARKET (PLAN-SITE-SMARKET.md §8 «Сервер: S9», крок 3), навпаки до t9-switch.sh:
#   1) шаблон домену → default (панель перебудує nginx.conf і nginx.ssl.conf з default — на Apache);
#   2) кеш і карту рушія — в OFF/ (старий сайт не повинен лягти в кеш рушія, карту він віддає сам);
#      лог і ліміти лишаються — старому сайту не шкодять;
#   3) ОСТАННІМ — ручний nginx.ssl.conf старого сайту з копії /root/t9-backup-sotamarket
#      (proxy_pass 127.0.0.1:3003): крок 1 його затирає.
# Процес [3003] SotaMarket не зупиняємо до кінця моніторингу — саме він і є відкатом.
# ============================================================================

D=sotamarket.com.ua
U=wm
C=/home/$U/conf/web/$D
B=/root/t9-backup-sotamarket
export HESTIA="${HESTIA:-/usr/local/hestia}"
export PATH="$PATH:$HESTIA/bin"

stop() { echo; echo "✗✗ СТОП: $*"; echo "Надішліть /root/t9-rollback.txt у чат."; exit 1; }

[ -f "$B/nginx.ssl.conf" ] || stop "немає копії $B/nginx.ssl.conf — без неї старий сайт не повернути"
grep -q "proxy_pass http://127.0.0.1:3003" "$B/nginx.ssl.conf" || stop "у копії немає proxy_pass 3003"
curl -s -o /dev/null --max-time 20 http://127.0.0.1:3003/ || echo "⚠ старий процес на 3003 зараз не відповідає (цикл перезапусків?) — відкат усе одно роблю"

echo "=== 1. шаблон → default"
v-change-web-domain-proxy-tpl $U $D default || stop "v-change-web-domain-proxy-tpl впав"
echo "=== 2. кеш і карта рушія → OFF/"
mkdir -p "$C/OFF"
for f in cache sitemap; do [ -f "$C/nginx.ssl.conf_$f" ] && mv -f "$C/nginx.ssl.conf_$f" "$C/OFF/"; done
echo "=== 3. ручний nginx.ssl.conf старого сайту"
cp "$B/nginx.ssl.conf" "$C/nginx.ssl.conf" || stop "не скопіював nginx.ssl.conf"
nginx -t && systemctl reload nginx || stop "nginx -t не пройшов"
ls "$C/"
echo
echo "✓✓ Відкат зроблено: sotamarket.com.ua → старий сайт (3003). Напишіть у чат «відкотив»."
echo "Перебудова домену панеллю (v-rebuild-web-domain) знову затре ручний nginx.ssl.conf — тоді цей скрипт ще раз."
