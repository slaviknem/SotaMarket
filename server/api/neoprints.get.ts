// Готові дизайни сайту сторінками: /api/neoprints?lang=uk&page=2&limit=24
//
// Сітка дизайнів на сторінці моделі без товарів (CategoryPage, «режим дизайни»): справжня
// пагінація ?page=N у SSR, як у товарів. Відповідь — у формі списку товарів apisite
// ({ data, meta }), тож сторінка веде обидва списки однаково.
// Сам список і його кеш — server/utils/siteDesigns.ts; тут лише зріз сторінки.

// Стеля сторінки — як у товарів (LIMIT_MAX у CategoryPage): довільний ?limit не має
// змушувати сервер рендерити сотні карток
const LIMIT_MAX = 48
const LIMIT_DEFAULT = 24

const positiveInt = (v: unknown) => {
	const n = Number(v)
	return Number.isInteger(n) && n > 0 ? n : 0
}

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const limit = Math.min(positiveInt(query.limit) || LIMIT_DEFAULT, LIMIT_MAX)
	const page = positiveInt(query.page) || 1

	const list = await siteDesigns(designsLang(event))
	const lastPage = Math.max(1, Math.ceil(list.length / limit))

	return {
		data: list.slice((page - 1) * limit, page * limit),
		meta: { total: list.length, per_page: limit, current_page: page, last_page: lastPage },
	}
})
