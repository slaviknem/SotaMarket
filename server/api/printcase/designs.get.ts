// Добірка готових дизайнів для сторінки конструктора: /api/printcase/designs?lang=uk
//
// Дизайн не залежить від моделі (модель дає лише маску), тож ця добірка ОДНАКОВА для всіх
// /printcase/{модель}: перші LIMIT зі списку дизайнів сайту (server/utils/siteDesigns.ts —
// там же кеш і перемежування тем по колу).

const LIMIT = 24

// Година: дизайни додають в адмінці пачками, добірка не мусить оновлюватись миттєво
const TTL = 60 * 60

export default defineCachedEventHandler(
	async (event) => {
		const list = await siteDesigns(designsLang(event))

		// Порожню відповідь НЕ віддаємо: інакше вона лягла б у кеш цього обробника на годину
		// і всі сторінки конструктора лишились би без дизайнів. Помилку кеш не зберігає,
		// а сторінка переживає її мовчки (там .catch(() => [])).
		if (!list.length) {
			throw createError({ statusCode: 502, statusMessage: 'neo_prints unavailable' })
		}

		return list.slice(0, LIMIT)
	},
	{
		name: 'printcase-designs',
		maxAge: TTL,
		getKey: designsLang,
	}
)
