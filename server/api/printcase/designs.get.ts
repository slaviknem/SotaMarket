// Добірка готових дизайнів для сторінки конструктора: /api/printcase/designs?lang=uk
//
// Дизайн не залежить від моделі (модель дає лише маску), тож ця добірка ОДНАКОВА для всіх
// /printcase/{модель}. Повний список адмінки — 741 запис і ~370 КБ; тягнути його на кожен
// SSR-рендер сторінки моделі не можна, тому тут він згортається до кількох десятків
// коротких об'єктів і лежить у кеші Nitro.
//
// Теми перемежовуються по колу — щоб добірка показувала різні теми, а не 24 принти
// одного бренду поспіль (та сама логіка, що в interleave() з composables/useNeoPrint).

interface RawNeoPrint {
	id: number
	alias: string
	title: string
	filter_id: number
	type: string
}

const LIMIT = 24

// Година: дизайни додають в адмінці пачками, добірка не мусить оновлюватись миттєво
const TTL = 60 * 60

export default defineCachedEventHandler(
	async (event) => {
		const config = useRuntimeConfig()
		const lang = String(getQuery(event).lang || 'ru')

		const all = await $fetch<RawNeoPrint[]>(config.public.urlApi + 'attributes/neo_prints', {
			params: { lang, site: config.public.site },
		})

		// Порожню відповідь НЕ віддаємо: інакше одна невдача адмінки лягла б у кеш на годину
		// і всі сторінки конструктора лишились би без дизайнів. Помилку кеш не зберігає,
		// а сторінка переживає її мовчки (там .catch(() => [])).
		if (!Array.isArray(all) || !all.length) {
			throw createError({ statusCode: 502, statusMessage: 'neo_prints unavailable' })
		}

		// Групуємо по темі, далі беремо по одному з кожної теми по колу
		const byTheme = new Map<number, RawNeoPrint[]>()
		for (const np of all) {
			const list = byTheme.get(np.filter_id)
			if (list) list.push(np)
			else byTheme.set(np.filter_id, [np])
		}

		const themes = [...byTheme.values()]
		const longest = Math.max(0, ...themes.map((l) => l.length))
		const mixed: RawNeoPrint[] = []

		for (let i = 0; i < longest && mixed.length < LIMIT; i++) {
			for (const theme of themes) {
				if (i < theme.length) mixed.push(theme[i])
				if (mixed.length >= LIMIT) break
			}
		}

		// Лише те, що малює картка дизайну — решта полів лягла б у SSR-payload дарма
		return mixed.map((n) => ({ id: n.id, alias: n.alias, title: n.title, filter_id: n.filter_id }))
	},
	{
		name: 'printcase-designs',
		maxAge: TTL,
		getKey: (event) => String(getQuery(event).lang || 'ru'),
	}
)
