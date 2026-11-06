#!/bin/bash
# ============================================================================
# T9 SotaMARKET — знімок сервера перед перемиканням sotamarket.com.ua на рушій.
# НІЧОГО НЕ ЗМІНЮЄ, лише читає. Можна запускати скільки завгодно разів.
#
# Запуск (сервер, bash) — файл приходить разом із репозиторієм:
#   git -C /root/nodeapps/SOTAMARKET pull
#   bash /root/nodeapps/SOTAMARKET/NOTES/nginx/t9-state.sh > /root/t9-state.txt 2>&1
# /root/t9-state.txt забрати SFTP-панеллю MobaXterm і надіслати в чат.
#
# `git pull` без збірки процесу не чіпає: SOTAMARKET працює з .output, а pull
# приносить лише нотатки. Ключі й паролі сюди не потрапляють: з web.conf — лише
# потрібні поля, з теки ssl/ — тільки імена файлів і публічний сертифікат (дати, імена).
#
# Зразок — SMARKET/NOTES/nginx/s9-state.sh (27.10). Тут ще: вхост steklomarket.com.ua уже
# на рушії (шаблон smarket — зразок для sotamarket), стан старого процесу [3003] SotaMarket
# (цикл падінь, план §2) і сертифікат (чи є в ньому www).
# ============================================================================

D=sotamarket.com.ua
M=steklomarket.com.ua
F=floy.com.ua
C=/home/wm/conf/web
T=/usr/local/hestia/data/templates/web/nginx
W=/usr/local/hestia/data/users/wm/web.conf
S=/home/wm/web/admin.floy.com.ua/public_html/storage/app/public/sitemap/sotamarket
OLD=/home/wm/web/$D/public_html

sec() { echo; echo "=============== $* ==============="; }
show() { for f in "$@"; do [ -f "$f" ] || continue; echo "----- $f"; cat "$f"; echo; done; }
# Поля домену з web.conf Hestia (без FTP_MD5 і STATS_CRYPT)
fields() {
	for k in ALIAS TPL PROXY SSL SSL_FORCE SSL_HSTS LETSENCRYPT REDIRECT REDIRECT_CODE BACKEND SUSPENDED; do
		grep "DOMAIN='$1'" "$W" | grep -o " $k='[^']*'"
	done
}

sec "Дата, nginx, git"
date
nginx -v 2>&1
git -C /root/nodeapps/SOTAMARKET log --oneline -1

sec "Hestia: sotamarket.com.ua"
fields $D
sec "Hestia: steklomarket.com.ua (зразок — уже на рушії)"
fields $M
sec "Hestia: floy.com.ua"
fields $F

sec "Файли вхостів"
ls -la $C/$D/ $C/$M/
ls -la $C/$D/ssl/ 2>&1

sec "sotamarket: згенеровані конфіги й доповнення"
show $C/$D/nginx.conf $C/$D/nginx.ssl.conf $C/$D/nginx.forcessl.conf $C/$D/nginx.hsts.conf
for f in $C/$D/nginx.conf_* $C/$D/nginx.ssl.conf_*; do show "$f"; done
ls -la $C/$D/OFF/ 2>/dev/null

sec "sotamarket: сертифікат (публічна частина)"
for c in $C/$D/ssl/$D.crt $C/$D/ssl/$D.pem; do
	[ -f "$c" ] || continue
	echo "----- $c"
	openssl x509 -in "$c" -noout -subject -enddate 2>&1
	openssl x509 -in "$c" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1
	break
done

sec "steklomarket: згенерований https-вхост (має збігатися з шаблоном smarket)"
show $C/$M/nginx.ssl.conf
ls $C/$M/OFF/ 2>/dev/null

sec "Шаблони nginx Hestia"
ls -la $T/
show $T/smarket.tpl $T/smarket.stpl
P=$(grep "DOMAIN='$D'" "$W" | grep -o " PROXY='[^']*'" | cut -d"'" -f2)
echo "шаблон sotamarket: '$P'"
[ -n "$P" ] && [ "$P" != smarket ] && show "$T/$P.tpl" "$T/$P.stpl"
echo "--- домени на кожному шаблоні"
grep -o "DOMAIN='[^']*'.* PROXY='[^']*'" "$W" | sed -E "s/DOMAIN='([^']*)'.* PROXY='([^']*)'/\2\t\1/" | sort

sec "nginx.conf: proxy_* на рівні http"
# proxy_ignore_headers, proxy_cache_key тощо в шаблоні ЗАМІНЮЮТЬ ці, а не доповнюють
grep -nE "proxy_|charset|map |include" /etc/nginx/nginx.conf

sec "conf.d і зони кешу"
ls -la /etc/nginx/conf.d/
show /etc/nginx/conf.d/smarket-cache.conf
grep -rn "proxy_cache_path" /etc/nginx/ 2>/dev/null
echo "--- змінні sotamarket_ (мають бути вільні)"
grep -rn "sotamarket_" /etc/nginx/ 2>/dev/null || echo "немає"
ls -ld /var/cache/nginx-floy /var/cache/nginx-smarket /var/cache/nginx-sotamarket 2>&1
ps -o user= -C nginx | sort | uniq -c

sec "Карта sotamarket в адмінці"
ls -la $S/ 2>&1 | head
ls -la $S/sitemaps/ 2>&1 | head
echo "--- стара карта (тека старого сайту)"
ls -la $OLD/static/sitemaps $OLD/src/static/sitemaps 2>/dev/null | head -8
ls -la $OLD/static/sitemap.xml $OLD/src/static/sitemap.xml 2>/dev/null

sec "Процеси й порти"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 16 >/dev/null
pm2 jlist 2>/dev/null | jq -r '.[] | "\(.pm_id)\t\(.name)\t\(.pm2_env.status)\t↺\(.pm2_env.restart_time)\t\(.pm2_env.pm_cwd)"' 2>/dev/null || pm2 list --no-color
ss -lntp | grep -E ':(3003|3011)\b'
curl -s -o /dev/null -w "3011 robots.txt: %{http_code}\n" --max-time 10 http://127.0.0.1:3011/robots.txt
curl -s -o /dev/null -w "3003 /: %{http_code} за %{time_total}s\n" --max-time 20 http://127.0.0.1:3003/
echo "--- старий процес [3003] SotaMarket"
pm2 describe "[3003] SotaMarket" 2>/dev/null | grep -iE "status|restarts|uptime|node.js version|max memory|created at|exec mode|script path"
grep -E "\[3003\]" /root/.pm2/pm2.log 2>/dev/null | tail -3

sec "Пам'ять і диск"
free -m
df -h / /var/cache

sec "Логи старого сайту"
ls -la /var/log/nginx/domains/ /var/log/apache2/domains/ 2>/dev/null | grep -i sotamarket
for L in /var/log/nginx/domains/$D.log /var/log/apache2/domains/$D.log; do
	[ -s "$L" ] || continue
	echo "----- $L: $(wc -l < "$L") рядків, з $(head -1 "$L" | cut -d' ' -f4) по $(tail -1 "$L" | cut -d' ' -f4)"
	tail -200000 "$L" > /tmp/t9-old.log
	echo "--- коди"
	awk '{print $9}' /tmp/t9-old.log | sort | uniq -c | sort -rn | head -8
	echo "--- топ-25 адрес (200)"
	awk '$9==200 {print $7}' /tmp/t9-old.log | sort | uniq -c | sort -rn | head -25
	echo "--- топ-25 адрес Googlebot"
	grep -i googlebot /tmp/t9-old.log | awk '{print $9, $7}' | sort | uniq -c | sort -rn | head -25
	rm -f /tmp/t9-old.log
done

echo
echo "=============== кінець ==============="
