-- =====================================================================
-- FLOY — налаштування в одному місці. ЧАСТИНА 1 з 2.
--
-- Ця частина БЕЗПЕЧНА САМА ПО СОБІ: після неї адмінка й сайт працюють
-- рівно так само, як зараз. Тільки додавання нових вузлів — жодного
-- ключа, який читає чинний код, не переміщено й не видалено.
--
-- Більше того, вона ЗАКРИВАЄ наявну міну: зараз ключі neoprint.*,
-- sites.floy.url, info.phones/addresses/others живуть ТІЛЬКИ у
-- config/settings.php (дописані руками) і зникають при першій же
-- перегенерації — тобто при першому збереженні будь-якого налаштування
-- в адмінці. Після цієї частини вони є в БД і не зникнуть.
--
-- Схема таблиці НЕ змінюється: жодного ALTER/CREATE/DROP.
--
-- ПІСЛЯ ВИКОНАННЯ треба перегенерувати config/settings.php — сирий SQL
-- цього не робить. Або зберегти будь-яке налаштування в адмінці, або:
--   php artisan tinker → (new App\Actions\SettingAction)->save_settings();
--
-- ЧАСТИНА 2 (settings-migrate-2.sql) — переїзд delivery і прибирання
-- тимчасових дублів — виконується РАЗОМ із правками коду.
-- =====================================================================

START TRANSACTION;

-- ---------------------------------------------------------------------
-- 0. Гігієна: сміття від тестів JSON-редактора у count_in_page (#1).
--    Значення param_number = 50 не чіпається.
-- ---------------------------------------------------------------------
UPDATE settings
SET param_string = NULL, param_json = NULL
WHERE name = 'count_in_page' AND parent_id IS NULL;

SET @api   := (SELECT id FROM settings WHERE name = 'api'   AND parent_id IS NULL LIMIT 1);
SET @info  := (SELECT id FROM settings WHERE name = 'info'  AND parent_id IS NULL LIMIT 1);
SET @sites := (SELECT id FROM settings WHERE name = 'sites' AND parent_id IS NULL LIMIT 1);
SET @floy  := (SELECT id FROM settings WHERE name = 'floy'  AND parent_id = @sites LIMIT 1);
SET @np    := (SELECT id FROM settings WHERE name = 'nova_poshta' AND parent_id = @api LIMIT 1);

-- ---------------------------------------------------------------------
-- 1. ПОРЯТУНОК ключів, що є лише у файлі. Значення — ті самі, що зараз
--    у config/settings.php, тож поведінка не змінюється ні на крок.
-- ---------------------------------------------------------------------

-- 1.1 sites.floy.url — NeoPrintProduct:81 (без нього биті посилання в позиціях)
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_string, publish, parent_id)
VALUES (NOW(), NOW(), '', 'url', 'URL сайту', '', 'string', 'settings', 1, 'https://floy.com.ua', 1, @floy);

-- 1.2 nova_poshta.warehouses_local_bd — NovaPochtaUtil:135,167
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_bool, publish, parent_id)
VALUES (NOW(), NOW(), '', 'warehouses_local_bd', 'Відділення з локальної БД', '', 'bool', 'settings', 1, 1, 1, @np);

-- 1.3 info.others — шаблони відповідей у панелі «Шпаргалка»
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_json, publish, parent_id)
VALUES (NOW(), NOW(), '', 'others', 'Шаблони відповідей', '', 'json', 'settings', 1,
'[{"title":"Повернення","text":"Немченко Станіслав, 0669273407, м. Полтава, 23 від-ня (Нова Пошта), без накладеного платежу, доставка за ? рахунок"},{"title":"Оплата пройшла","text":"Дякуємо, оплата пройшла! Відправили замовлення на друк, через 2-3 дні чохол буде відправлено і Вам прийде смс з номером посилки. Гарного дня!"}]',
1, @info);

-- 1.4 ТИМЧАСОВІ дублі — щоб чинний код не помітив жодної різниці.
--     Частина 2 їх видаляє, коли код перейде на нові вузли.
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_json, publish, parent_id) VALUES
(NOW(), NOW(), '', 'phones', 'Телефони (тимчасово)', 'ДУБЛЬ public.floy.contacts.phones — видаляється в частині 2', 'json', 'settings', 1,
'[{"operator":"vodafone","phone":"099-072-14-12"},{"operator":"kievstar","phone":"098-072-14-12"},{"operator":"life","phone":"093-072-14-12"}]', 1, @info);

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_string, publish, parent_id) VALUES
(NOW(), NOW(), '', 'addresses', 'Адреса (тимчасово)', 'ДУБЛЬ public.floy.contacts.address — видаляється в частині 2', 'string', 'settings', 1,
'м. Полтава, вул. Соборності 29А - ТЦ Злато Місто', 1, @info);

-- neoprint.* у старому місці — рівно те, що зараз дописане у файлі руками.
-- Без цього вузла перегенерація вб є ціну неопрінта (це вже так, незалежно від міграції).
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, publish, parent_id)
VALUES (NOW(), NOW(), '', 'neoprint', 'НЕОПРІНТ (тимчасово)', 'ДУБЛЬ public.common.prices — видаляється в частині 2', '', 'settings', 2, 1, NULL);
SET @neo := LAST_INSERT_ID();

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_number, param_string, publish, parent_id) VALUES
(NOW(), NOW(), '', 'price',       'Ціна',       '', 'number', 'settings', 1, 259,  NULL, 1, @neo),
(NOW(), NOW(), '', 'price_old',   'Стара ціна', '', 'number', 'settings', 1, 299,  NULL, 1, @neo),
(NOW(), NOW(), '', 'url_storage', 'URL сховища','', 'string', 'settings', 1, NULL, 'https://admin.floy.com.ua/storage/', 1, @neo);

-- ---------------------------------------------------------------------
-- 2. НОВИЙ КОРІНЬ `public` — усе, що віддається сайтам.
--    Правило одне: секрети (api.*) сюди не кладемо НІКОЛИ.
--    Експорт на сайт = merge(public.common, public.<site>).
--    Поки що цих вузлів не читає ніхто — з являються «про запас».
-- ---------------------------------------------------------------------

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, publish, parent_id)
VALUES (NOW(), NOW(), '', 'public', 'ПУБЛІЧНІ (для сайтів)',
'Віддається сайтам як є. Секрети та токени сюди класти НЕ можна.', '', 'settings', 2, 1, NULL);
SET @public := LAST_INSERT_ID();

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, publish, parent_id)
VALUES (NOW(), NOW(), '', 'common', 'Спільне для всіх сайтів',
'Перекривається однойменними вузлами конкретного сайту.', '', 'settings', 2, 1, @public);
SET @common := LAST_INSERT_ID();

-- 2.1 Сховище адмінки — звідки беруться оригінали шаблонів (NeoPrintProduct:91).
--     Одне на всі сайти, тому саме в common.
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_string, publish, parent_id)
VALUES (NOW(), NOW(), '', 'url_storage', 'URL сховища адмінки', '', 'string', 'settings', 1, 'https://admin.floy.com.ua/storage/', 1, @common);

-- ---------------------------------------------------------------------
-- 3. public.floy — те, що зараз захардкожене в nuxt.config.ts.
--    Новий сайт = копія цього блоку: public.smarket, public.sotamarket…
-- ---------------------------------------------------------------------

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, publish, parent_id)
VALUES (NOW(), NOW(), '', 'floy', 'FLOY.com.ua', 'Налаштування сайту floy.com.ua', '', 'settings', 2, 1, @public);
SET @pfloy := LAST_INSERT_ID();

-- Ціни — окремими числовими полями (у формі це input number, а не JSON-редактор).
-- Свої на кожен сайт: друк на floy і на майбутніх сайтах може коштувати по-різному.
-- Одне джерело і для сайту, і для NeoPrintProduct в адмінці.
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, publish, parent_id)
VALUES (NOW(), NOW(), '', 'prices', 'ЦІНИ', 'Ціни цього сайту. Чохли без товару в БД: позиція народжується з моделі та принта.', '', 'settings', 2, 1, @pfloy);
SET @prices := LAST_INSERT_ID();

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_number, publish, parent_id) VALUES
(NOW(), NOW(), '', 'printcase',     'Конструктор — ціна',       'Індивідуальний друк (конструктор чохлів)',         'number', 'settings', 1, 289, 1, @prices),
(NOW(), NOW(), '', 'printcase_old', 'Конструктор — стара ціна', 'Показується закресленою',                          'number', 'settings', 1, 299, 1, @prices),
(NOW(), NOW(), '', 'neoprint',      'Готовий дизайн — ціна',    'NeoPrint: і на сайті, і при додаванні менеджером',  'number', 'settings', 1, 259, 1, @prices),
(NOW(), NOW(), '', 'neoprint_old',  'Готовий дизайн — стара',   'Показується закресленою',                          'number', 'settings', 1, 299, 1, @prices);

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, publish, parent_id)
VALUES (NOW(), NOW(), '', 'contacts', 'Контакти', 'Одне джерело: шапка/футер/schema.org сайту + панель Шпаргалка в адмінці.', '', 'settings', 2, 1, @pfloy);
SET @contacts := LAST_INSERT_ID();

-- Формат об єктами {operator, phone} — так його вже читає Шпаргалка;
-- сайту потрібні лише .phone, це один map у композаблі.
INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_json, publish, parent_id)
VALUES (NOW(), NOW(), '', 'phones', 'Телефони', 'Перший у списку — основний (шапка сайту).', 'json', 'settings', 1,
'[{"operator":"vodafone","phone":"099 072 14 12"},{"operator":"kievstar","phone":"098 072 14 12"},{"operator":"life","phone":"093 072 14 12"}]',
1, @contacts);

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_string, publish, parent_id) VALUES
(NOW(), NOW(), '', 'email',          'E-mail',          '',                               'string', 'settings', 1, 'info@floy.com.ua', 1, @contacts),
-- УВАГА, розбіжність: у адмінці адреса «вул. Соборності 29А - ТЦ Злато Місто»,
-- на сайті — «проспект Віталія Грицаєнка, 15А». Взято сайтову як актуальнішу.
-- Якщо правильна інша — виправити тут і в двох полях нижче.
(NOW(), NOW(), '', 'address',        'Адреса',          'Повний рядок для футера',        'string', 'settings', 1, 'м. Полтава, проспект Віталія Грицаєнка, 15А', 1, @contacts),
(NOW(), NOW(), '', 'address_city',   'Місто',           'Для PostalAddress у schema.org', 'string', 'settings', 1, 'Полтава', 1, @contacts),
(NOW(), NOW(), '', 'address_street', 'Вулиця, будинок', 'Для PostalAddress у schema.org', 'string', 'settings', 1, 'проспект Віталія Грицаєнка, 15А', 1, @contacts);

INSERT INTO settings (created_at, updated_at, site, name, title, comment, type, save_store, hard, param_json, publish, parent_id)
VALUES (NOW(), NOW(), '', 'social', 'Соцмережі та месенджери', 'Іконки у футері + sameAs у schema.org. Порожнє значення = не показувати.', 'json', 'settings', 1,
'{"instagram":"https://www.instagram.com/floy.com.ua/","facebook":"https://www.facebook.com/floy.com.ua","youtube":"https://www.youtube.com/channel/UCmxlccT0fGh6hF79LSKYIPQ","telegram":"https://t.me/floyshop","viber":"viber://chat?number=%2B380990721412","whatsapp":"https://wa.me/380990721412"}',
1, @pfloy);

COMMIT;

-- ---------------------------------------------------------------------
-- ПЕРЕВІРКА
-- ---------------------------------------------------------------------
-- SELECT p.name AS root, c.name AS lvl2, g.name AS lvl3,
--        COALESCE(g.param_number, g.param_string, g.param_json,
--                 c.param_number, c.param_string, c.param_json) AS val
-- FROM settings p
-- LEFT JOIN settings c ON c.parent_id = p.id
-- LEFT JOIN settings g ON g.parent_id = c.id
-- WHERE p.name IN ('public', 'neoprint', 'info');
