#!/bin/bash
# ============================================================================
# T8 SotaMARKET — підняти процес SOTAMARKET на 3011 і прогнати адреси (сервер).
# Те саме, що команди плану §8 «Сервер: T8», одним запуском: MobaXterm рве
# багаторядкові вставки, а по одній — 30 команд.
#
# Запуск (сервер, bash) — після клону (план §8), одним рядком:
#   bash /root/nodeapps/SOTAMARKET/NOTES/nginx/t8-server.sh 2>&1 | tee /root/t8-server.txt
#
# Старий сайт не чіпає: nginx на 3011 ще не дивиться. Можна запускати повторно (обірвався
# зв'язок, щось виправили): процес, що вже є в PM2, перезапускається, а не дублюється.
# Збірка впала або порт зайнятий чужим процесом — зупиняється, далі нічого не робить.
#
# Результат — три файли в /root/: t8-server.txt (усе з екрана), sotamarket-check.txt
# (прогін адрес), t9-state.txt (знімок для T9, лише читає).
# ============================================================================

DIR=/root/nodeapps/SOTAMARKET
NODE22=/root/.nvm/versions/node/v22.23.1/bin/node
GA4=G-9VLQ4DJWCN
N=0
sec() { echo; echo "=============== $* ==============="; }
ok() { echo "✓ $*"; }
bad() { echo "✗ $*"; N=$((N + 1)); }
stop() { echo; echo "✗✗ СТОП: $* — далі не йду, старий сайт не зачеплено. Надішліть /root/t8-server.txt у чат."; exit 1; }
rss() { ps -o pid,rss,args -p "$(pgrep -d, -f "$DIR/cluster.mjs")" 2>/dev/null; }

cd "$DIR" || stop "немає теки $DIR — спершу клон (план §8)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] || stop "немає $NVM_DIR/nvm.sh"
. "$NVM_DIR/nvm.sh"

sec "Код і профіль — $(date '+%d.%m.%Y %H:%M')"
git log --oneline -1
grep -E "^(APP|PORT|WORKERS)=" brand/server.env
. brand/server.env
[ "$APP" = SOTAMARKET ] && [ "$PORT" = 3011 ] && [ "$WORKERS" = 2 ] && ok "профіль SOTAMARKET / 3011 / 2" || stop "профіль не той: $APP / $PORT / $WORKERS"

nvm use 16 >/dev/null
if pm2 jlist 2>/dev/null | grep -q '"name":"SOTAMARKET"'; then
	FIRST=0
	ok "SOTAMARKET уже є в PM2 — повторний запуск, буде restart"
else
	FIRST=1
	if ss -lntp | grep -qE ':3011\b'; then
		ss -lntp | grep -E ':3011\b'
		stop "порт 3011 зайнятий чужим процесом"
	fi
	ok "порт 3011 вільний"
fi
free -m

sec "Збірка (npm install ~1 хв, nuxi build 1–3 хв)"
nvm use 22
npm install || stop "npm install впав"
npx nuxi build || stop "збірка впала"
[ -f .output/server/index.mjs ] || stop "немає .output/server/index.mjs після збірки"
ok "збірка є"

sec "Запуск"
nvm use 16
if [ "$FIRST" = 1 ]; then pm2 start ecosystem.config.cjs; else pm2 restart SOTAMARKET; fi
pm2 save
for i in $(seq 1 30); do
	curl -sf -o /dev/null --max-time 5 "http://127.0.0.1:3011/robots.txt" && break
	sleep 1
done

sec "Перевірки процесу"
c=$(pgrep -f "$DIR/cluster.mjs" | wc -l)
[ "$c" = 3 ] && ok "процесів 3 (головний + 2 копії)" || bad "процесів $c (чекали 3)"
exe=$(readlink -f /proc/$(pgrep -f "$DIR/cluster\.mjs" | head -1)/exe 2>/dev/null)
[ "$exe" = "$NODE22" ] && ok "node — $exe" || bad "node — ${exe:-не знайдено} (чекали $NODE22)"
pm2 logs SOTAMARKET --lines 5 --nostream
c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "http://127.0.0.1:3011/api/settings?t=$RANDOM")
[ "$c" = 200 ] && ok "/api/settings — 200" || bad "/api/settings — $c (чекали 200; 500 — node 16)"
html=$(curl -s --max-time 30 -H "Host: sotamarket.com.ua" http://127.0.0.1:3011/)
c=$(echo "$html" | grep -c "$GA4")
[ "$c" -ge 1 ] && ok "GA4 $GA4 у HTML" || bad "GA4 $GA4 у HTML немає"
can=$(echo "$html" | grep -oE '<link[^>]*rel="canonical"[^>]*>' | head -1)
echo "$can" | grep -q 'href="https://sotamarket.com.ua/"' && ok "canonical — https://sotamarket.com.ua/" || bad "canonical: ${can:-немає}"
echo "--- пам'ять копій ДО прогону (rss, КБ)"
rss

sec "Прогін адрес (574 + проби, по одній; ~5–10 хв, прогрес — кожні 200)"
nvm use 22 >/dev/null
node scripts/url-check.mjs http://127.0.0.1:3011 NOTES/inventory/sotamarket-check.tsv --probes --host=sotamarket.com.ua --parallel=1 --out=t8-server 2>&1 | tee /root/sotamarket-check.txt | grep --line-buffered -E "^Прогін|^  [0-9]+/|^Готово|^Проблеми"
echo "--- пам'ять копій ПІСЛЯ прогону (rss, КБ)"
rss

sec "Знімок для T9"
bash "$DIR/NOTES/nginx/t9-state.sh" > /root/t9-state.txt 2>&1
ok "/root/t9-state.txt — $(wc -l < /root/t9-state.txt) рядків"

echo
echo "Перевірок процесу не пройшло: $N. Прогін — рядок «Проблеми» вище (повністю — /root/sotamarket-check.txt)."
echo "Забрати SFTP-панеллю: /root/t8-server.txt, /root/sotamarket-check.txt, /root/t9-state.txt"
