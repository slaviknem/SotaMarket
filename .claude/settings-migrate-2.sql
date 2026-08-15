-- =====================================================================
-- FLOY — налаштування в одному місці. ЧАСТИНА 2 з 2.
--
-- Передумова: виконані частини 1 і 1b.
--
-- НЕ ВИКОНУВАТИ ОКРЕМО. Цей скрипт прибирає ключі, які читає чинний код,
-- тож виконується РАЗОМ із правками коду (список у кінці файлу):
--
--   1. викотити правки коду в FLOY-ADMIN
--   2. виконати цей SQL
--   3. перегенерувати конфіг: зберегти будь-яке налаштування в адмінці
--      або php artisan tinker → (new App\Actions\SettingAction)->save_settings();
--
-- Якщо виконати ДО правок коду — форма замовлення в адмінці впаде
-- (OrderItems.vue:119 звертається до settings.delivery без перевірки),
-- а доставка порахується як 0.
--
-- Схема таблиці не змінюється: жодного ALTER/CREATE/DROP.
-- =====================================================================

START TRANSACTION;

SET @info    := (SELECT id FROM settings WHERE name = 'info'   AND parent_id IS NULL LIMIT 1);
SET @public  := (SELECT id FROM settings WHERE name = 'public' AND parent_id IS NULL LIMIT 1);
SET @common  := (SELECT id FROM settings WHERE name = 'common' AND parent_id = @public LIMIT 1);

-- ---------------------------------------------------------------------
-- 1. Доставка переїжджає під public.common РАЗОМ З ДІТЬМИ
--    (ukrpochta, n_pochta, samovuvoz, free_delivery_from — одна зміна parent_id).
--    Було: settings.delivery → стало: settings.public.common.delivery
--    Значення не чіпаються: НП 80/20, УП 60/15, безкоштовно від 1000.
-- ---------------------------------------------------------------------
SET @delivery := (SELECT id FROM settings WHERE name = 'delivery' AND parent_id IS NULL LIMIT 1);
UPDATE settings SET parent_id = @common, updated_at = NOW() WHERE id = @delivery;

-- ---------------------------------------------------------------------
-- 2. Прибираємо тимчасові дублі з частини 1 — тепер їх заміняють
--    public.common.prices і public.floy.contacts
-- ---------------------------------------------------------------------

-- neoprint (корінь) — діти видаляються каскадом за FK
DELETE FROM settings WHERE name = 'neoprint' AND parent_id IS NULL;

-- info.phones / info.addresses — переїхали в public.floy.contacts
DELETE FROM settings WHERE parent_id = @info AND name IN ('phones', 'addresses');

COMMIT;

-- ---------------------------------------------------------------------
-- ПЕРЕВІРКА: має лишитись рівно одне джерело
-- ---------------------------------------------------------------------
-- SELECT id, name, parent_id FROM settings
-- WHERE name IN ('delivery','neoprint','phones','addresses','prices');

-- =====================================================================
-- ПРАВКИ КОДУ — FLOY-ADMIN (виконати ДО цього SQL)
--
--  1. app/Actions/OrderAction.php:758
--     - $delivery_settings = config('settings.delivery');
--     + $delivery_settings = config('settings.public.common.delivery');
--
--  2. app/Actions/NeoPrint/NeoPrintProduct.php:47-48
--     Ціна тепер своя на кожен сайт, а сайт тут відомий: $attribute->site
--     (той самий патерн фолбеку, що вже є в siteUrl()).
--     - 'price'     => config('settings.neoprint.price'),
--     - 'price_old' => config('settings.neoprint.price_old'),
--     + 'price'     => self::price($attribute->site, 'neoprint'),
--     + 'price_old' => self::price($attribute->site, 'neoprint_old'),
--     і новий метод поряд із siteUrl():
--       private static function price(?string $site, string $key): ?int
--       {
--           $site = $site ?: 'floy';
--           return config("settings.public.{$site}.prices.{$key}")
--               ?: config("settings.public.floy.prices.{$key}");
--       }
--
--  3. app/Actions/NeoPrint/NeoPrintProduct.php:91
--     - config('settings.neoprint.url_storage')
--     + config('settings.public.common.url_storage')
--
--  4. resources/js/mixins/appMixin.js:11
--     - value: settings.delivery,
--     + value: settings.public.common.delivery,
--
--  5. resources/js/mixins/appMixin.js:25-26
--     - value: settings.info,
--     + value: { ...settings.info, ...settings.public.floy.contacts },
--     і в resources/js/components/App/SidebarRight/TabShparhalka.vue:13-14
--     myInfo.addresses → myInfo.address
--     (після правки JS потрібен npm run build адмінки)
--
--  6. Прибрати згенерований конфіг з git — інакше найближчий деплой
--     відкотить усе, що менеджер правив через адмінку (у репо зараз
--     Нова Пошта 60/25 замість 80/20 і старі токени Пром):
--        git rm --cached config/settings.php
--        echo "/config/settings.php" >> .gitignore
--     Замість файлу в git — artisan-команда settings:build у деплої.
--
--  7. З config/settings.php прибрати дописані руками блоки
--     'neoprint' та 'sites.*.url' — вони тепер приїжджають з БД.
-- =====================================================================
