#!/bin/bash
# ============================================================================
# T9 SotaMARKET — ПРИБРАТИ старий сайт після перемикання (сервер, root). Рішення власника 06.11:
# «назад повертатися не буде — все прибираємо». Після цього відкату на старий Nuxt 2 НЕМАЄ.
#
# Запуск (сервер, bash) — одним рядком:
#   git -C /root/nodeapps/SOTAMARKET pull && bash /root/nodeapps/SOTAMARKET/NOTES/nginx/t9-cleanup.sh 2>&1 | tee /root/t9-cleanup.txt
#
# Що робить:
#   0) перевірки: домен на шаблоні sotamarket, рушій на 3011 відповідає — інакше стоп, нічого не чіпає;
#   1) PM2: pm2 delete "[3003] SotaMarket" (старий Nuxt 2, цикл перезапусків) і pm2 save; його логи PM2;
#   2) код старого сайту: архів без node_modules/.nuxt/карти → /root/sotamarket-old-site.tar.gz (кілька МБ — на
#      випадок, якщо знадобиться старий текст чи картинка), далі вміст public_html — геть; сама тека лишається
#      (це docroot домену в Hestia);
#   3) копія старого вхоста /root/t9-backup-sotamarket — геть (відкату вже немає);
#   4) старий SitemapUtil в адмінці: файл класу видаляється, лише якщо крон і /do/generate_sitemap його вже не
#      кличуть (нові Kernel.php і DoController.php викладено) — інакше пропуск із поясненням.
# Повторний запуск безпечний (що вже прибрано — пропускає).
# ============================================================================

D=sotamarket.com.ua
OLD=/home/wm/web/$D/public_html
A=/home/wm/web/admin.floy.com.ua/public_html
B=/root/t9-backup-sotamarket
W=/usr/local/hestia/data/users/wm/web.conf
ARC=/root/sotamarket-old-site.tar.gz

ok() { echo "✓ $*"; }
skip() { echo "— $*"; }
stop() { echo; echo "✗✗ СТОП: $* — нічого не прибрано далі. Надішліть /root/t9-cleanup.txt у чат."; exit 1; }
sec() { echo; echo "=============== $* ==============="; }

sec "0. Перевірки — $(date '+%d.%m.%Y %H:%M:%S')"
P=$(grep "DOMAIN='$D'" "$W" | grep -o " PROXY='[^']*'" | cut -d"'" -f2)
[ "$P" = sotamarket ] && ok "домен на шаблоні sotamarket (рушій)" || stop "домен на шаблоні '$P', не sotamarket — спершу t9-switch.sh"
c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "http://127.0.0.1:3011/api/settings?t=$RANDOM")
[ "$c" = 200 ] && ok "рушій на 3011 — /api/settings 200" || stop "рушій на 3011 не відповідає ($c)"
grep -q "proxy_pass http://127.0.0.1:3011" /home/wm/conf/web/$D/nginx.ssl.conf && ok "вхост — proxy_pass 3011" || stop "у вхості немає proxy_pass 3011"

sec "1. PM2: старий [3003] SotaMarket"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 16 >/dev/null
if pm2 jlist 2>/dev/null | grep -q '"name":"\[3003\] SotaMarket"'; then
	pm2 delete "[3003] SotaMarket" && pm2 save && ok "процес видалено, список PM2 збережено"
else
	skip "процесу [3003] SotaMarket у PM2 вже немає"
fi
ss -lntp | grep -qE ':3003\b' && echo "⚠ порт 3003 досі слухає хтось: $(ss -lntp | grep -E ':3003\b')" || ok "порт 3003 вільний"
L=$(ls /root/.pm2/logs/-3003--SotaMarket-* 2>/dev/null)
if [ -n "$L" ]; then
	echo "логи PM2 старого процесу: $(du -ch $L | tail -1 | cut -f1)"
	rm -f $L && ok "логи видалено"
else
	skip "логів PM2 старого процесу немає"
fi
pm2 list --no-color 2>/dev/null | grep -E "SOTAMARKET|SotaMarket"

sec "2. Код старого сайту ($OLD)"
if [ -d "$OLD" ] && [ -n "$(ls -A "$OLD" 2>/dev/null)" ]; then
	echo "зараз: $(du -sh "$OLD" 2>/dev/null | cut -f1)"
	if [ ! -s "$ARC" ]; then
		tar -czf "$ARC" -C "$OLD" --exclude=./node_modules --exclude=./.nuxt --exclude=./src/static/sitemaps --exclude=./src/static/sitemap.xml . \
			|| stop "архів не зібрався — старий код не чіпаю"
	fi
	ok "архів $ARC — $(du -h "$ARC" | cut -f1)"
	find "$OLD" -mindepth 1 -delete && ok "вміст public_html видалено (тека лишилась — docroot домену)"
else
	skip "public_html уже порожній"
fi
ls -la "$OLD" 2>/dev/null | head -4

sec "3. Копія старого вхоста"
if [ -d "$B" ]; then rm -rf "$B" && ok "$B видалено"; else skip "$B немає"; fi
ls /home/wm/conf/web/$D/

sec "4. Старий SitemapUtil в адмінці"
F=$A/app/Actions/Utilities/SitemapUtil.php
if [ ! -f "$F" ]; then
	skip "файлу класу вже немає"
# Шукаємо ВИКЛИК класу (Utilities\SitemapUtil), а не слово: у нових файлах воно є в коментарях
# («старий SitemapUtil прибрано…») — 06.11 перша версія скрипта через це пропустила крок
elif grep -qF 'Utilities\SitemapUtil' "$A/app/Console/Kernel.php" "$A/app/Http/Controllers/DO/DoController.php"; then
	skip "Kernel.php / DoController.php на сервері ще кличуть SitemapUtil — спершу викласти нові файли FLOY-ADMIN (план §8 «Сервер: T9» п. 5), потім цей скрипт ще раз"
else
	rm -f "$F" && ok "SitemapUtil.php видалено (його вже ніхто не кличе)"
fi
grep -rlnF 'Utilities\SitemapUtil' "$A/app" "$A/routes" 2>/dev/null | head -5

sec "Підсумок"
free -m | head -2
df -h / | tail -1
crontab -l 2>/dev/null | grep -i sota && echo "⚠ у crontab root є рядок про Sota — подивитись" || ok "у crontab root про старий Sota нічого"
echo
echo "✓✓ Прибрано. Напишіть у чат «прибрав»."
