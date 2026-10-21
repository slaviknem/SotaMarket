// Готові дизайни (NeoPrint) сайту — повний список з адмінки, перемежований за темами, у кеші Nitro.
//
// Дизайн не залежить від моделі (модель дає лише маску), тож список однаковий для всіх моделей.
// Повний список адмінки — сотні записів (у floy 741 запис, ~370 КБ): тягнути його на кожен
// SSR-рендер не можна. Тут він тягнеться раз на годину на мову, згортається до коротких об'єктів
// (рівно те, що малює картка) і перемежовується по колу за темами — щоб будь-яка сторінка списку
// показувала різні теми, а не десятки принтів одного бренду поспіль (та сама логіка, що
// interleave() у composables/useNeoPrint).
//
// Споживачі: добірка конструктора (/api/printcase/designs) і сітка дизайнів моделі без товарів
// (/api/neoprints — сторінками).

import type { H3Event } from 'h3'

export interface SiteDesign {
	id: number
	alias: string
	title: string
	filter_id: number
}

// Година: дизайни додають в адмінці пачками, список не мусить оновлюватись миттєво
const TTL = 60 * 60

// Лише свої мови: lang іде в ключ кешу, і довільне значення плодило б записи кешу
// та щоразу новий запит повного списку до адмінки
export const designsLang = (event: H3Event): 'uk' | 'ru' => (getQuery(event).lang === 'uk' ? 'uk' : 'ru')

export const siteDesigns = defineCachedFunction(
	async (lang: 'uk' | 'ru'): Promise<SiteDesign[]> => {
		const config = useRuntimeConfig()

		const all = await $fetch<(SiteDesign & { type: string })[]>(config.public.urlApi + 'attributes/neo_prints', {
			params: { lang, site: config.public.site },
		})
		if (!Array.isArray(all)) return []

		// Групуємо по темі, далі беремо по одному з кожної теми по колу (interleave() з
		// composables/useNeoPrint тут недоступний — це код застосунку, не сервера)
		const byTheme = new Map<number, SiteDesign[]>()
		for (const np of all) {
			const item = { id: np.id, alias: np.alias, title: np.title, filter_id: np.filter_id }
			const list = byTheme.get(np.filter_id)
			if (list) list.push(item)
			else byTheme.set(np.filter_id, [item])
		}

		const themes = [...byTheme.values()]
		const longest = Math.max(0, ...themes.map((l) => l.length))
		const mixed: SiteDesign[] = []
		for (let i = 0; i < longest; i++) {
			for (const theme of themes) if (i < theme.length) mixed.push(theme[i])
		}
		return mixed
	},
	{
		name: 'site-designs',
		maxAge: TTL,
		getKey: (lang: string) => lang,
		// Порожній список НЕ кешуємо: інакше одна невдала відповідь адмінки лягла б у кеш на годину
		// і всі сторінки лишились би без дизайнів. Сайт, у якого дизайнів ще немає, просто щоразу
		// питає адмінку (там список теж у кеші)
		validate: (entry) => Array.isArray(entry.value) && entry.value.length > 0,
	}
)
