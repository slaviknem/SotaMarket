#!/bin/bash
# ============================================================================
# Здоров'я sotamarket.com.ua після перемикання на рушій (T9) — ЗВІТ, нічого не змінює.
# Щодня тиждень, далі щотижня місяць; разом із зовнішнім NOTES/nginx/t9-check.sh.
# Копія SMARKET/NOTES/nginx/smarket-health.sh: процес SOTAMARKET (3011), старий — [3003] SotaMarket.
#
# Запуск (сервер, bash):
#   bash /root/nodeapps/SOTAMARKET/NOTES/nginx/sotamarket-health.sh
#
# Читає access-лог з nginx.ssl.conf_log (формат floy_log: час, адреса, код, cache=,
# rt=, ut=, "запит", "User-Agent" — $3 код, $4 кеш, $6 час Node, $8 шлях).
# Зразок і пороги — FLOY-ADMIN/NOTES/tools/floy-health.sh.
# ============================================================================

L=/var/log/nginx/sotamarket-access.log
T=/tmp/sotamarket-health.slice
DIR=/root/nodeapps/SOTAMARKET

echo "=============== МАШИНА — $(date '+%d.%m.%Y %H:%M') ==============="
echo -n "навантаження:"; uptime | sed 's/.*average//'
free -m | head -2
df -h / | tail -1

echo
echo "=============== NODE (SOTAMARKET, порт 3011) ==============="
echo -n "процесів cluster.mjs (головний + 2 копії = 3): "; pgrep -f "$DIR/cluster.mjs" | wc -l
ps -o pid,rss,etime,args -p "$(pgrep -d, -f "$DIR/cluster.mjs")" 2>/dev/null
echo -n "черга accept: "; ss -lntp 2>/dev/null | grep ':3011\b' | awk '{print $2}'
curl -m 20 -so /dev/null -w "/api/settings повз nginx: %{http_code} за %{time_total}s (500 = node 16)\n" "http://127.0.0.1:3011/api/settings?t=$RANDOM"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 16 >/dev/null
pm2 describe SOTAMARKET 2>/dev/null | grep -E "status|restarts|uptime"
echo -n "помилок у лозі за сьогодні: "; grep -c "^$(date +%Y-%m-%d)" /root/.pm2/logs/SOTAMARKET-error.log 2>/dev/null || echo 0
echo -n "старий сайт [3003] (відкат) слухає: "; ss -lntp 2>/dev/null | grep -q ':3003\b' && echo так || echo НІ
echo -n "кеш nginx: "; du -sh /var/cache/nginx-sotamarket 2>/dev/null | cut -f1
git -C "$DIR" log --oneline -1

echo
echo "=============== ТРАФІК ==============="
if [ ! -r "$L" ]; then
	echo "access-лог недоступний ($L) — nginx.ssl.conf_log у теці вхоста?"
	exit 0
fi
tail -20000 "$L" > "$T"
echo "вікно: $(head -1 "$T" | cut -d' ' -f1) — $(tail -1 "$T" | cut -d' ' -f1), запитів $(wc -l < "$T")"

echo "--- коди"
awk '{print $3}' "$T" | sort | uniq -c | sort -rn | head -8
echo "--- кеш (HTML і API; статика — «-»)"
awk '{print $4}' "$T" | sort | uniq -c | sort -rn
echo -n "--- Node довше 3 с: "
awk '{gsub("ut=","",$6); if ($6+0 > 3) c++} END {print c+0}' "$T"
echo "--- Googlebot: коди"
grep -i googlebot "$T" | awk '{print $3}' | sort | uniq -c | sort -rn
echo "--- топ-15 адрес з 404 (старі адреси без 301? биті посилання?)"
awk '$3==404 {print $8}' "$T" | sort | uniq -c | sort -rn | head -15
echo "--- 5xx (має бути порожньо; 503 — збій apisite)"
awk '$3 ~ /^5/ {print $3, $8}' "$T" | sort | uniq -c | sort -rn | head -10
echo "--- хто ловить 429 (мають бути боти, не люди)"
awk '$3==429 {print $2}' "$T" | sort | uniq -c | sort -rn | head -5
rm -f "$T"

echo
echo "=============== ЯК ЧИТАТИ ==============="
cat <<'HINT'
процесів           3 — норма; 1 — копії не піднялись (pm2 logs SOTAMARKET)
rss копій          ~100–300 МБ; росте з кожним днем — витік, сказати в чаті
/api/settings      200 — fetch живий; 500 — процес на node 16 (DEPLOY.md)
коди               301 — www/http і старі адреси (норма); 404 — дивитись топ нижче;
                   5xx — біда; 403 — білий список (якщо ввімкнено); 429 — ліміти
кеш                HIT більше за MISS — ходять люди; MISS у рази більше — обхід ботами
Node довше 3 с     одиниці — норма (бренди без кешу ~2–3 с); сотні — черга до Node
404 топ            стара адреса з трафіком — додати 301 у brand/site.config.ts (redirects)
HINT
