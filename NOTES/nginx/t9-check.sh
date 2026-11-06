#!/bin/bash
# ============================================================================
# T9 SotaMARKET — перевірка sotamarket.com.ua ЗЗОВНІ, через nginx: одразу після
# перемикання й щодня тиждень моніторингу. Нічого не змінює.
#
# Запуск — ПК (Git Bash, C:\Web-SERVER\domains\SOTAMARKET) або сервер:
#   bash NOTES/nginx/t9-check.sh [https://sotamarket.com.ua]
# Копія SMARKET/NOTES/nginx/s9-check.sh (27–28.10) з адресами Sota; годиться й для
# steklomarket.com.ua і floy.com.ua (той самий рушій і рецепт вхоста) — 301 за картою бренду
# перевіряється лише там, де вона є.
#
# Шар nginx, якого не бачить scripts/url-check.mjs: 301 одним кроком з www і http,
# сторінки — від рушія, robots.txt — з Node, карта — з теки адмінки, кеш (HIT і з `_ga`,
# 302 на обрану мову не дістається іншим), сертифікат. Вміст сторінок (коди, canonical,
# товари) — url-check зі списком NOTES/inventory/sotamarket-check.tsv.
# Наприкінці — «Проблем: N»; код виходу 1, якщо N > 0.
# ============================================================================

SITE=${1:-https://sotamarket.com.ua}
HOST=${SITE#https://}
N=0
ok() { echo "✓ $*"; }
bad() { echo "✗ $*"; N=$((N + 1)); }

# Заголовки без тіла й без переходу за редиректом; hdr — значення одного заголовка
head_of() { curl -s -o /dev/null -D - --max-time 30 "$@" | tr -d '\r'; }
hdr() { grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
code_of() { echo "$1" | head -1 | awk '{print $2}'; }
cache_of() { echo "$1" | grep -iE '^x-[a-z-]*cache:' | head -1 | awk '{print $2}'; }

# 301 одним кроком: $1 — звідки, $2 — куди (Location рушія відносний — доповнюємо доменом)
redir() {
	local h code loc
	h=$(head_of "$1"); code=$(code_of "$h"); loc=$(echo "$h" | hdr location)
	[ "${loc#/}" != "$loc" ] && loc="$SITE$loc"
	if [ "$code" = 301 ] && [ "$loc" = "$2" ]; then ok "$1 → 301 $2"; else bad "$1 → $code $loc (чекали 301 $2)"; fi
}
code_is() {
	local c; c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$1")
	if [ "$c" = "$2" ]; then ok "$1 — $c"; else bad "$1 — $c (чекали $2)"; fi
}

echo "=============== $SITE — $(date '+%d.%m.%Y %H:%M') ==============="

echo "--- 301: www → без www, http → https, одним кроком"
P="/iphone-17-pro?t9=1"
redir "http://$HOST$P" "$SITE$P"
redir "http://www.$HOST$P" "$SITE$P"
redir "https://www.$HOST$P" "$SITE$P"
redir "https://www.$HOST/uk/iphone-17-pro" "$SITE/uk/iphone-17-pro"
redir "https://www.$HOST/" "$SITE/"
# Старі адреси з 301-карти бренду (brand/site.config.ts → redirects); у FLOY карти немає
case "$HOST" in
	sotamarket.com.ua)
		redir "$SITE/otzyvy-klientov" "$SITE/chekhly"
		redir "$SITE/about/uk" "$SITE/uk/about" ;;
	steklomarket.com.ua) redir "$SITE/power-bank" "$SITE/zaryadnye-ustroystva" ;;
	*) echo "— 301 за картою бренду: пропущено ($HOST)" ;;
esac

echo "--- головна — рушій, індексується"
h=$(head_of "$SITE/")
if [ "$(code_of "$h")" = 200 ] && echo "$h" | grep -qi '^x-powered-by: Nuxt'; then ok "головна — 200, рушій"; else bad "головна — $(code_of "$h"), x-powered-by: $(echo "$h" | hdr x-powered-by)"; fi
if echo "$h" | grep -qi '^x-robots-tag'; then bad "головна — x-robots-tag: $(echo "$h" | hdr x-robots-tag) (індексацію закрито!)"; else ok "головна — без x-robots-tag"; fi
can=$(curl -s --max-time 30 "$SITE/" | grep -oE '<link[^>]*rel="canonical"[^>]*>' | head -1)
if echo "$can" | grep -q "href=\"$SITE/\""; then ok "canonical головної — $SITE/"; else bad "canonical головної: ${can:-немає}"; fi
if head_of "$SITE/shop/cart" | grep -qi '^x-robots-tag: noindex'; then ok "/shop/cart — noindex"; else bad "/shop/cart — без noindex"; fi
code_is "$SITE/api/settings?t=$RANDOM" 200
code_is "$SITE/neisnuyucha-storinka-t9" 404

echo "--- robots.txt і карта"
h=$(head_of "$SITE/robots.txt")
if echo "$h" | grep -qi '^x-frame-options'; then ok "robots.txt — з Node"; else bad "robots.txt — не з Node (немає x-frame-options): location nginx чи старий сайт"; fi
if curl -s --max-time 30 "$SITE/robots.txt" | grep -q "^Sitemap: $SITE/sitemap.xml"; then ok "robots.txt — Sitemap: $SITE/sitemap.xml"; else bad "robots.txt — немає рядка Sitemap: $SITE/sitemap.xml"; fi
if curl -s --max-time 30 "$SITE/sitemap.xml" | grep -q "<loc>$SITE/sitemaps/sitemap-1.xml</loc>"; then ok "sitemap.xml — індекс карти з адмінки ($SITE/sitemaps/…)"; else bad "sitemap.xml — не індекс карти з адмінки (nginx.ssl.conf_sitemap?)"; fi
c=$(curl -s -I -o /dev/null -w '%{http_code} %{content_type}' --max-time 30 "$SITE/sitemaps/sitemap-1.xml")
if [ "${c%% *}" = 200 ]; then ok "sitemaps/sitemap-1.xml — $c"; else bad "sitemaps/sitemap-1.xml — $c"; fi

echo "--- кеш nginx"
U="$SITE/iphone-17-pro?t9=$RANDOM$RANDOM"
c1=$(cache_of "$(head_of "$U")"); c2=$(cache_of "$(head_of "$U")")
if [ "$c1" = MISS ] && [ "$c2" = HIT ]; then ok "повтор тієї ж адреси — $c1 → $c2"; else bad "кеш: перший запит ${c1:-без заголовка}, повтор ${c2:-без заголовка} (чекали MISS → HIT)"; fi
c3=$(cache_of "$(head_of -H 'Cookie: _ga=GA1.1.123.456' "$U")")
if [ "$c3" = HIT ]; then ok "з cookie _ga — HIT (Vary: Cookie не дробить кеш)"; else bad "з cookie _ga — ${c3:-без заголовка} (чекали HIT)"; fi
h=$(head_of -H 'Cookie: floy_lang=uk' "$U")
if [ "$(code_of "$h")" = 302 ]; then ok "з floy_lang=uk — 302 $(echo "$h" | hdr location)"; else bad "з floy_lang=uk — $(code_of "$h") (чекали 302 на /uk)"; fi
h=$(head_of "$U"); c=$(code_of "$h")
if [ "$c" = 200 ]; then ok "без cookie після цього — 200 (302 мови в спільний кеш не потрапив)"
elif [ "$c" = 302 ]; then bad "без cookie — 302 $(echo "$h" | hdr location): 302 мови потрапив у спільний кеш!"
else bad "без cookie — $c (чекали 200)"; fi
# Колізія ключа (28.10): «адреса» + uk не мусить дорівнювати «адресі…uk» без мови — інакше «/» з
# cookie uk кладе 302 у запис /uk, і всі без cookie ловлять на /uk вічний редирект. Адреса випадкова —
# справжні записи кешу не зачіпає.
h=$(head_of "${U}uk"); c=$(code_of "$h")
if [ "$c" = 200 ]; then ok "«…uk» без cookie — 200 (мова в ключі кешу через роздільник)"
else bad "«…uk» без cookie — $c $(echo "$h" | hdr location): ключ кешу склеює адресу й мову (потрібен |lang=)"; fi

echo "--- бренд (перший запит адмінка рахує ~2 с, далі — кеш)"
for i in 1 2; do
	# Кирилиця — поза curl -w: у Git Bash вона там ламається
	echo "/huawei: $(curl -s -o /dev/null -w '%{http_code}, %{time_total}' --max-time 30 "$SITE/huawei") с"
done

echo "--- сертифікат"
end=$(echo | openssl s_client -connect "$HOST:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$end" ]; then
	days=$(( ($(date -d "$end" +%s) - $(date +%s)) / 86400 ))
	if [ "$days" -gt 20 ]; then ok "сертифікат — ще $days дн."; else bad "сертифікат — лишилось $days дн. (Let's Encrypt не поновився?)"; fi
else
	bad "сертифікат не прочитано"
fi

echo
echo "Проблем: $N"
[ "$N" = 0 ]
