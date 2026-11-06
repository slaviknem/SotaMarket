#!/bin/bash
# ============================================================================
# T9 SotaMARKET — ПЕРЕМИКАННЯ sotamarket.com.ua на рушій (сервер, root). ЗМІНЮЄ nginx.
#
# Запуск (сервер, bash) — одним рядком:
#   git -C /root/nodeapps/SOTAMARKET pull && bash /root/nodeapps/SOTAMARKET/NOTES/nginx/t9-switch.sh 2>&1 | tee /root/t9-switch.txt
# Перемкнено 06.11; старий сайт прибрано (t9-cleanup.sh) — відкату на нього вже немає.
#
# Порядок — як SMARKET 27.10 (PLAN-SITE-SMARKET.md §8 «Сервер: S9», крок 2), за знімком t9-state 06.11:
#   0) перевірки: процес SOTAMARKET на 3011 живий, домен ще на шаблоні default;
#   1) копія теки вхоста (там ручна правка nginx.ssl.conf 15.08 — proxy_pass 3003: шаблон default
#      її не повертає, лише копія);
#   2) зона кешу (conf.d), тека кешу, шаблон Hestia sotamarket → nginx -t → reload (ззовні нічого не
#      змінюється: зона без вжитку, шаблон ні на якому домені);
#   3) домен → шаблон sotamarket (редиректу панелі на домені немає — прибирати нічого);
#   4) доповнення вхоста (кеш, карта, лог, ліміти) — ПІСЛЯ шаблону: інакше старий сайт устиг би
#      лягти в новий кеш → nginx -t → reload.
# Будь-яка помилка — зупинка з поясненням; до кроку 3 сайт ззовні не змінюється.
# Перевірки ззовні після — Claude з ПК (t9-check.sh, url-check): curl до свого домену з самого сервера
# 27.10 повертав порожньо.
# ============================================================================

D=sotamarket.com.ua
U=wm
C=/home/$U/conf/web/$D
T=/usr/local/hestia/data/templates/web/nginx
R=/root/nodeapps/SOTAMARKET/NOTES/nginx
B=/root/t9-backup-sotamarket
W=/usr/local/hestia/data/users/$U/web.conf
export HESTIA="${HESTIA:-/usr/local/hestia}"
export PATH="$PATH:$HESTIA/bin"

ok() { echo "✓ $*"; }
stop() { echo; echo "✗✗ СТОП: $*"; echo "Надішліть /root/t9-switch.txt у чат."; exit 1; }
sec() { echo; echo "=============== $* ==============="; }
proxy_tpl() { grep "DOMAIN='$D'" "$W" | grep -o " PROXY='[^']*'" | cut -d"'" -f2; }

sec "0. Перевірки — $(date '+%d.%m.%Y %H:%M:%S')"
git -C /root/nodeapps/SOTAMARKET log --oneline -1
c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "http://127.0.0.1:3011/api/settings?t=$RANDOM")
[ "$c" = 200 ] && ok "SOTAMARKET на 3011 — /api/settings 200" || stop "SOTAMARKET на 3011 не відповідає ($c) — перемикати нема на що"
P=$(proxy_tpl)
echo "шаблон домену зараз: '$P'"
case "$P" in
	default) ok "домен на старому шаблоні — перемикаємо" ;;
	sotamarket) echo "→ домен уже на sotamarket (повторний запуск) — кроки 1–2 пропускаю, доповнення оновлю" ;;
	*) stop "несподіваний шаблон '$P' (чекали default) — нічого не змінено" ;;
esac
command -v v-change-web-domain-proxy-tpl >/dev/null || stop "немає v-change-web-domain-proxy-tpl у PATH ($HESTIA/bin)"
for f in etc/nginx/conf.d/sotamarket-cache.conf usr/local/hestia/data/templates/web/nginx/sotamarket.tpl usr/local/hestia/data/templates/web/nginx/sotamarket.stpl \
	home/wm/conf/web/$D/nginx.ssl.conf_cache home/wm/conf/web/$D/nginx.ssl.conf_sitemap home/wm/conf/web/$D/nginx.ssl.conf_log home/wm/conf/web/$D/nginx.ssl.conf_limits; do
	[ -f "$R/$f" ] || stop "у репозиторії немає $f (git pull?)"
done
ok "файли репозиторію на місці"

if [ "$P" = default ]; then
	sec "1. Копія старого вхоста → $B"
	if [ -e "$B" ]; then
		ok "копія вже є (з першого запуску) — не перезаписую: $(ls "$B" | tr '\n' ' ')"
	else
		cp -a "$C" "$B" || stop "не вдалось скопіювати $C"
		ok "скопійовано: $(ls "$B" | tr '\n' ' ')"
	fi
	grep -q "proxy_pass http://127.0.0.1:3003" "$B/nginx.ssl.conf" && ok "у копії — proxy_pass 3003 (старий сайт)" || stop "у копії $B/nginx.ssl.conf немає proxy_pass 3003 — відкат з неї не поверне старий сайт"

	sec "2. Зона кешу, тека, шаблон Hestia (ззовні нічого не змінюється)"
	cp "$R/etc/nginx/conf.d/sotamarket-cache.conf" /etc/nginx/conf.d/ || stop "conf.d"
	mkdir -p /var/cache/nginx-sotamarket && chown www-data:www-data /var/cache/nginx-sotamarket || stop "тека кешу"
	cp "$R"/usr/local/hestia/data/templates/web/nginx/sotamarket.* "$T/" || stop "шаблон"
	if nginx -t; then
		systemctl reload nginx && ok "nginx -t і reload — чисто"
	else
		rm -f /etc/nginx/conf.d/sotamarket-cache.conf
		stop "nginx -t не пройшов — зону кешу прибрано, сайт не змінено"
	fi

	sec "3. Домен → шаблон sotamarket (з цієї миті — рушій)"
	v-change-web-domain-proxy-tpl $U $D sotamarket || stop "v-change-web-domain-proxy-tpl впав — перевірте шаблон: v-list-web-domain $U $D"
	P=$(proxy_tpl)
	[ "$P" = sotamarket ] && ok "шаблон домену — sotamarket" || stop "шаблон домену '$P' (чекали sotamarket)"
	grep -q "proxy_pass http://127.0.0.1:3011" "$C/nginx.ssl.conf" && ok "nginx.ssl.conf — proxy_pass 3011" || stop "у згенерованому nginx.ssl.conf немає proxy_pass 3011"
fi

sec "4. Доповнення вхоста: кеш, карта, лог, ліміти"
cp "$R"/home/wm/conf/web/$D/nginx.ssl.conf_* "$C/" || stop "копія доповнень"
if nginx -t; then
	systemctl reload nginx && ok "nginx -t і reload — чисто"
else
	mkdir -p "$C/OFF-t9"
	for f in cache sitemap log limits; do mv -f "$C/nginx.ssl.conf_$f" "$C/OFF-t9/" 2>/dev/null; done
	nginx -t && systemctl reload nginx
	stop "доповнення не пройшли nginx -t — перенесено в $C/OFF-t9/; сайт на рушії без кешу й карти (робочий)"
fi

sec "Стан"
ls "$C/"
[ -e "$C/nginx.ssl.conf_allow" ] && echo "⚠ є nginx.ssl.conf_allow (білий список) — його тут не мало бути: rm і nginx -t && systemctl reload nginx"
ls -ld /var/cache/nginx-sotamarket
IP=$(grep "DOMAIN='$D'" "$W" | grep -o " IP='[^']*'" | cut -d"'" -f2)
for u in / /iphone-17-pro; do
	echo "з сервера $u: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$D:443:${IP:-127.0.0.1}" "https://$D$u" 2>/dev/null) (порожньо чи 000 — не біда, перевіряє Claude з ПК)"
done
echo
echo "✓✓ Перемкнено. Напишіть у чат «перемкнув» — Claude прогонить t9-check.sh і url-check ззовні."
