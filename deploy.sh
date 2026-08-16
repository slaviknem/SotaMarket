#!/usr/bin/env bash
#
# Викладка сайту на сервері (Linux).  Запуск із каталогу проєкту:
#
#   bash deploy.sh              # прод   (pm2-процес floy-prod)
#   bash deploy.sh floy-test    # тестовий стенд
#
# Головне, чого не робить звичайний `nuxi build`: він ЧИСТИТЬ .output, тобто чанки
# попередньої збірки зникають із сервера миттєво. У браузерів, які тримають сторінку
# відкритою (мобільні відновлюють вкладки минулих сеансів постійно), у розмітці записані
# саме старі імена — і дозавантаження шматка коду отримує 404, а сторінка лишається
# напівживою. Тому тут старі чанки повертаються поруч із новими, а протухлі прибираються.
#
# Деталі — у DEPLOY.md, розділ «Оновлення після пушу в GitHub».

set -e

APP="${1:-floy-prod}"
KEEP_DAYS=14
PREV="/tmp/_nuxt-prev-${APP}"

cd "$(dirname "$(readlink -f "$0")")"
echo "→ каталог: $(pwd), pm2-процес: ${APP}"

# nvm — це shell-функція, у скрипті її треба підключити руками
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

git pull

nvm use 22
npm install

# Знімок чанків поточної збірки (-p зберігає дати — за ними працює чистка нижче)
rm -rf "$PREV"
cp -rp .output/public/_nuxt "$PREV" 2>/dev/null || echo "→ попередньої збірки немає, пропускаю"

npx nuxi build

# Повертаємо старі чанки поруч із новими: -n не чіпає щойно зібране, а імена з хешем
# вмісту ніколи не конфліктують
cp -rpn "$PREV/." .output/public/_nuxt/ 2>/dev/null || true
find .output/public/_nuxt -type f -mtime "+${KEEP_DAYS}" -delete
rm -rf "$PREV"

# pm2-демон крутиться на node 16 — команди до нього йдуть саме звідти
nvm use 16
pm2 restart "$APP"

echo "→ готово. Перевірка заголовків:"
curl -sI https://floy.com.ua/printcase | grep -i cache-control || true
