-- =====================================================================
-- FLOY — налаштування в одному місці. ЧАСТИНА 1b (доповнення до 1).
--
-- Ціни конструктора та готових дизайнів переїжджають зі «спільного»
-- у вузол конкретного сайту: public.common.prices → public.floy.prices.
-- На різних сайтах друк може коштувати по-різному.
--
-- БЕЗПЕЧНО ВИКОНУВАТИ ОКРЕМО: вузол prices створений частиною 1 і його
-- поки не читає ніхто — ні адмінка, ні сайт (обидва досі беруть ціни зі
-- старих місць). Схема таблиці не змінюється.
--
-- Якщо частина 1 виконувалась уже в новій редакції (prices одразу під
-- floy) — скрипт просто нічого не знайде і не зробить. Це нормально.
--
-- Після виконання: перегенерувати config/settings.php (зберегти будь-яке
-- налаштування в адмінці) або лишити на потім — ключ поки неробочий.
-- =====================================================================

START TRANSACTION;

SET @public := (SELECT id FROM settings WHERE name = 'public' AND parent_id IS NULL LIMIT 1);
SET @common := (SELECT id FROM settings WHERE name = 'common' AND parent_id = @public LIMIT 1);
SET @pfloy  := (SELECT id FROM settings WHERE name = 'floy'   AND parent_id = @public LIMIT 1);
SET @prices := (SELECT id FROM settings WHERE name = 'prices' AND parent_id = @common LIMIT 1);

-- Переїжджає весь вузол разом із дітьми (printcase, printcase_old, neoprint, neoprint_old)
UPDATE settings
SET parent_id  = @pfloy,
    comment    = 'Ціни цього сайту. Чохли без товару в БД: позиція народжується з моделі та принта.',
    updated_at = NOW()
WHERE id = @prices;

-- url_storage лишається в common: це сховище самої адмінки, воно одне на всі сайти.

COMMIT;

-- ---------------------------------------------------------------------
-- ПЕРЕВІРКА: prices має бути під floy, а не під common
-- ---------------------------------------------------------------------
-- SELECT s.id, s.name, p.name AS parent, s.param_number
-- FROM settings s LEFT JOIN settings p ON p.id = s.parent_id
-- WHERE s.name IN ('prices','printcase','printcase_old','neoprint','neoprint_old')
--   AND s.parent_id IS NOT NULL;
