// Збирає SQL для адмінки з чернеток цієї теки (T6, PLAN-SITE-SOTAMARKET.md §9).
// Запуск (ПК, з кореня SOTAMARKET, портативний Node з .node/):
//   node NOTES/texts/sotamarket-admin/build-sql.mjs
// Результат — FLOY-ADMIN/NOTES/sql/sotamarket-texts-t6.sql. Тексти правити тут (*.html, meta.json) або у файлі
// тем скіла filter-article і перезбирати — SQL руками не редагувати.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const OUT = join(DIR, '../../../../FLOY-ADMIN/NOTES/sql/sotamarket-texts-t6.sql')
const SITE = 'sotamarket'
const BAK = '_bak_t6_20261104'

// Межі колонок `articles` (міграція create_articles_table)
const LIMITS = { title_uk: 100, title_ru: 100, meta_description_uk: 250, meta_description_ru: 250 }

const meta = JSON.parse(readFileSync(join(DIR, 'meta.json'), 'utf8'))
const html = (alias, lang) => readFileSync(join(DIR, `${alias}.${lang}.html`), 'utf8').trim()

// Рядок для MySQL: лапка подвоюється — так працює за будь-якого SQL_MODE. Зворотної скісної в текстах
// бути не повинно (її значення залежить від NO_BACKSLASH_ESCAPES) — краще впасти, ніж зіпсувати текст
const q = (s) => {
	if (String(s).includes('\\')) throw new Error(`зворотна скісна в тексті: ${String(s).slice(0, 60)}`)
	return `'${String(s).replace(/'/g, "''")}'`
}

for (const [alias, m] of Object.entries(meta))
	for (const [col, max] of Object.entries(LIMITS))
		if ((m[col] || '').length > max) throw new Error(`${alias}.${col}: ${m[col].length} > ${max} символів`)

const fields = (alias) => {
	const m = meta[alias]
	return {
		title_uk: m.title_uk,
		title_ru: m.title_ru,
		meta_title_uk: m.meta_title_uk,
		meta_title_ru: m.meta_title_ru,
		meta_description_uk: m.meta_description_uk,
		meta_description_ru: m.meta_description_ru,
		text_uk: html(alias, 'uk'),
		text_ru: html(alias, 'ru'),
	}
}

// Стаття є — UPDATE, немає — INSERT (povernennya, printcase-template у sotamarket ще не заведені);
// повторний запуск нічого не дублює
const upsert = (alias) => {
	const f = fields(alias)
	const set = Object.entries(f).map(([k, v]) => `\t${k} = ${q(v)}`)
	const cols = ['site', 'alias', 'type', ...Object.keys(f), 'publish', 'created_at', 'updated_at']
	const vals = [q(SITE), q(alias), q(meta[alias].type || 'main'), ...Object.values(f).map(q), '1', 'NOW()', 'NOW()']
	const where = `site = '${SITE}' AND alias = '${alias}'`
	return [
		`UPDATE articles SET\n${set.join(',\n')},\n\tpublish = 1,\n\tupdated_at = NOW()\nWHERE ${where};`,
		`INSERT INTO articles (${cols.join(', ')})\nSELECT ${vals.join(',\n\t')}\nFROM DUAL\nWHERE NOT EXISTS (SELECT 1 FROM articles WHERE ${where});`,
	].join('\n')
}

// Заміна в текстових колонках статей сайту (REPLACE чутливий до регістру)
const COLS = ['title_uk', 'title_ru', 'meta_title_uk', 'meta_title_ru', 'meta_description_uk', 'meta_description_ru', 'text_uk', 'text_ru']
const replace = (from, to) =>
	`UPDATE articles SET\n${COLS.map((c) => `\t${c} = REPLACE(${c}, ${q(from)}, ${q(to)})`).join(',\n')}\nWHERE site = '${SITE}';`

// Мета моделей sotamarket — шаблон MetaTagsUtil ('sotamarket') з кириличною назвою САЙТУ (categories_text, її ж
// віддає apisite як title_rus); порожня — повна назва. Переписуємо лише те, що згенероване шаблоном (свій чи FLOY)
// або порожнє: ручні правки в адмінці лишаються
const CYR = (lang) => `COALESCE(NULLIF(TRIM(ct.title_${lang}), ''), c.title_full)`
const GENERATED = `(ct.meta_title_uk = '' OR ct.meta_title_uk LIKE 'Чохли для % ➤ Купити чохол з малюнком на%' OR ct.meta_title_uk LIKE '➤%')
	AND (ct.meta_title_ru = '' OR ct.meta_title_ru LIKE 'Чехлы для % ➤ Купить чехол с картинкой на%' OR ct.meta_title_ru LIKE '➤%')`
const CT_MODELS = `ct.site = '${SITE}' AND c.type = 'model' AND ${GENERATED}`

// Шаблони тем — готові UPDATE зі скіла (там і правляться); шапку файла з порядком дій не беремо
const THEMES = join(DIR, '../../../.claude/skills/filter-article/data/articles-filters-sotamarket.sql')
const themes = readFileSync(THEMES, 'utf8').replace(/^[\s\S]*?(?=\n-- -{20,}\n-- [a-z])/, '').trim()
if (themes.includes('\\')) throw new Error('зворотна скісна в шаблонах тем')
if ((themes.match(/^UPDATE `filters`/gm) || []).length !== 8) throw new Error('у шаблонах тем не 8 UPDATE')

const sql = `-- T6 SotaMARKET (PLAN-SITE-SOTAMARKET.md §9): тексти адмінки для sotamarket — статті, мета моделей, шаблони тем.
-- ЗГЕНЕРОВАНО з SOTAMARKET/NOTES/texts/sotamarket-admin/ (build-sql.mjs) — правити там і перезбирати.
-- Що й навіщо — README.md у тій же теці. Лише site = 'sotamarket': FLOY і SMARKET не зачіпає.
-- Після виконання: адмінка → «Очистити кеш» (/do/clear_cache) — статті, категорії й фільтри apisite кешуються.
-- Повторний запуск безпечний: UPDATE ставить ті самі значення, INSERT — лише якщо статті немає.
-- Прод — MariaDB 10.6: лише LIKE / REPLACE / COALESCE, без REGEXP_LIKE.

SET NAMES utf8mb4;

-- Бекап до змін — лише при першому запуску (знімок має лишитися станом «до»: інакше відкат вважав би нові статті
-- старими). LIKE + INSERT, а не CREATE … AS SELECT: так працює й на сервері з GTID. Відкат — у кінці файла
CREATE TABLE IF NOT EXISTS articles${BAK} LIKE articles;
INSERT INTO articles${BAK} SELECT * FROM articles
WHERE site = '${SITE}' AND NOT EXISTS (SELECT 1 FROM articles${BAK} LIMIT 1);
CREATE TABLE IF NOT EXISTS filters${BAK} LIKE filters;
INSERT INTO filters${BAK} SELECT * FROM filters
WHERE site = '${SITE}' AND NOT EXISTS (SELECT 1 FROM filters${BAK} LIMIT 1);
CREATE TABLE IF NOT EXISTS categories_text${BAK} LIKE categories_text;
INSERT INTO categories_text${BAK} SELECT ct.* FROM categories_text ct JOIN categories c ON c.id = ct.category_id
WHERE ${CT_MODELS} AND NOT EXISTS (SELECT 1 FROM categories_text${BAK} LIMIT 1);

-- 0. Що зараз (до змін): about і dostavka — копії FLOY («Floy», самовивіз у Полтаві), povernennya і printcase-template
--    немає, printcase ru — українською, chekhly — про шкіряні й протиударні чохли, яких у Sota немає
SELECT id, alias, type, title_uk, title_ru, meta_title_ru, publish, LENGTH(text_uk) AS len_uk
FROM articles WHERE site = '${SITE}' AND alias IN ('about', 'dostavka', 'povernennya', 'chekhly', 'printcase-template', 'printcase', 'index');
--    і скільки моделей з обрізаною мета («… з малюнком на» без назви в кінці) — після п. 5 має бути 0
SELECT COUNT(*) AS models_cut_meta FROM categories_text ct JOIN categories c ON c.id = ct.category_id
WHERE ct.site = '${SITE}' AND c.type = 'model' AND (ct.meta_title_uk LIKE '% на' OR ct.meta_title_ru LIKE '% на');

-- 1. «Про магазин» (/about) — замість копії FLOY: чохли з картинками, як працюємо, чат, графік, м. Львів
${upsert('about')}

-- 2. «Оплата та доставка» (/dostavka) — тарифи з public.common: НП 80, кур'єр 140, Укрпошта 60, безкоштовно від 1000
--    (кур'єра поріг не покриває, як і в кошику); без самовивозу в Полтаві
${upsert('dostavka')}

-- 3. «Повернення» (/povernennya) — пункт меню є, а статті не було: сторінка віддавала 404
${upsert('povernennya')}

-- 4. Розділ «Чохли» (/chekhly): h1 і крихта «Чохли з картинками для смартфонів», title як в індексі старого сайту
--    («Чохли для телефонів»), свій опис і SEO-текст — лише чохли з картинками (без шкіряних і протиударних)
${upsert('chekhly')}

-- 4а. Шаблон статті конструктора (/printcase/{модель}): без нього всі сторінки конструктора Sota — noindex
--     (сторінка індексується лише зі статтею). Плейсхолдери #model#, #model_uk#, #model_ru# підставляє сайт
${upsert('printcase-template')}

-- 4б. Хаб конструктора (/printcase): ru-версія була українською (title, опис, текст) — тепер російською; uk — той
--     самий текст, що в індексі, без червоного інлайн-кольору й «?» на місці емодзі, з реальними розділами бібліотеки
${upsert('printcase')}

-- 4в. Текст головної (index) — той, що в індексі, з мінімальними правками: прибрано те, чого в Sota немає (Soft Touch,
--     протиударні, MagSafe, еко- й «інтерактивні» чохли, захист від води), «SotaMarket» → «SotaMARKET», описка в
--     ru-назві «телелефонов», «Готово за 2-3 дні» → «друкуємо одразу після підтвердження», кнопка — «Своє фото»
${upsert('index')}

-- 4г. Назва магазину в решті статей sotamarket (якщо є) — SotaMARKET
${replace('SotaMarket', 'SotaMARKET')}

-- 5. Мета моделей sotamarket (title й опис для пошуку): шаблон той самий, що в індексі, але кирилична назва — з тексту
--    сайту, а не з categories. Було: нові моделі — «… Купити чохол з малюнком на» (назви немає), старі —
--    «на Епл 15», «на Самсунґ Гелексі Е55»; стане «на Айфон 15», «на Самсунг Галаксі А55». Код адмінки —
--    MetaTagsUtil — виправлено тим самим чином, тож нові моделі одразу отримають правильну мету
UPDATE categories_text ct JOIN categories c ON c.id = ct.category_id SET
	ct.meta_title_uk = CONCAT('Чохли для ', c.title_full, ' ➤ Купити чохол з малюнком на ', ${CYR('uk')}),
	ct.meta_title_ru = CONCAT('Чехлы для ', c.title_full, ' ➤ Купить чехол с картинкой на ', ${CYR('ru')}),
	ct.meta_description_uk = CONCAT('Купити ➤ чохли з малюнком для ', c.title_full, ' ➤ Великий асортимент ✅ чохлів на ', ${CYR('uk')}, ' за хорошою ціною 🚚 Доставка по всій Україні'),
	ct.meta_description_ru = CONCAT('Купить ➤ чехлы с картинкой для ', c.title_full, ' ➤ Большой ассортимент ✅ чехлов на ', ${CYR('ru')}, ' по хорошей цене 🚚 Доставка по всей Украине')
WHERE ${CT_MODELS};

-- 6. Шаблони 8 тем-фільтрів sotamarket (описи були порожні — на сторінках тем видно лише авто-лід).
--    Джерело — .claude/skills/filter-article/data/articles-filters-sotamarket.sql (скіл filter-article), вставлено як є
${themes}

-- 7. Перевірка: має бути 0, 0, 0 / 7 статей / 0 / 8
SELECT
	SUM(CONCAT_WS(' ', text_uk, text_ru) LIKE '%Floy%') AS floy_in_texts,
	SUM(INSTR(CAST(CONCAT_WS(' ', title_uk, title_ru, text_uk, text_ru) AS BINARY), 'SotaMarket') > 0) AS sotamarket_mixed,
	SUM(CONCAT_WS(' ', text_uk, text_ru) LIKE '%Полтав%') AS poltava
FROM articles WHERE site = '${SITE}';
SELECT COUNT(*) AS articles_t6 FROM articles
WHERE site = '${SITE}' AND publish = 1 AND alias IN ('about', 'dostavka', 'povernennya', 'chekhly', 'printcase-template', 'printcase', 'index');
SELECT COUNT(*) AS models_cut_meta FROM categories_text ct JOIN categories c ON c.id = ct.category_id
WHERE ct.site = '${SITE}' AND c.type = 'model' AND (ct.meta_title_uk LIKE '% на' OR ct.meta_title_ru LIKE '% на');
SELECT COUNT(*) AS themes_filled FROM filters
WHERE site = '${SITE}' AND parent_id IS NULL AND type = 'theme' AND publish = 1
	AND description_uk LIKE '%#model#%' AND description_ru LIKE '%#model#%';

-- ВІДКАТ (лише якщо щось пішло не так): усе — зі знімків до змін, нові статті sotamarket — видалити.
-- UPDATE articles a JOIN articles${BAK} b ON b.id = a.id SET a.title_uk = b.title_uk,
--   a.title_ru = b.title_ru, a.meta_title_uk = b.meta_title_uk, a.meta_title_ru = b.meta_title_ru,
--   a.meta_description_uk = b.meta_description_uk, a.meta_description_ru = b.meta_description_ru,
--   a.text_uk = b.text_uk, a.text_ru = b.text_ru, a.publish = b.publish;
-- DELETE a FROM articles a LEFT JOIN articles${BAK} b ON b.id = a.id WHERE a.site = '${SITE}' AND b.id IS NULL;
-- UPDATE filters f JOIN filters${BAK} b ON b.id = f.id SET f.description_uk = b.description_uk, f.description_ru = b.description_ru;
-- UPDATE categories_text t JOIN categories_text${BAK} b ON b.id = t.id SET t.meta_title_uk = b.meta_title_uk,
--   t.meta_title_ru = b.meta_title_ru, t.meta_description_uk = b.meta_description_uk, t.meta_description_ru = b.meta_description_ru;
-- Коли все перевірено, знімки можна прибрати:
-- DROP TABLE articles${BAK}, filters${BAK}, categories_text${BAK};
`

writeFileSync(OUT, sql)
console.log('✓', OUT, `(${Math.round(sql.length / 1024)} КБ)`)
