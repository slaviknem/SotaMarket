// Хелпери відгуків: середній рейтинг, кількість, поля JSON-LD (schema.org Review/AggregateRating).
// Використовуються у ShopReviewsBlock та на сторінках (товар, категорія, головна).

export function reviewsStats(reviews: any[] | null | undefined) {
	const list = reviews || []
	const rated = list.filter((r: any) => Number(r.rating) > 0)
	const avg = rated.length
		? Math.round((rated.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / rated.length) * 10) / 10
		: 0

	return { count: list.length, ratedCount: rated.length, avg }
}

// «11.07.2026» (формат API) → «2026-07-11» (ISO для datePublished)
export function reviewIsoDate(date?: string) {
	const m = String(date || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
	return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined
}

// aggregateRating з готових агрегатів (список товарів: API віддає rating + reviews_count
// підзапитом, без завантаження самих відгуків) — для ItemList на категоріях і фільтрах
export function ratingJsonLd(value?: number | null, count?: number | null) {
	const avg = Number(value) || 0
	const n = Number(count) || 0
	if (!avg || !n) return {}

	return { aggregateRating: { '@type': 'AggregateRating', ratingValue: avg, bestRating: 5, reviewCount: n } }
}

// Поля review + aggregateRating для JSON-LD (Product) — додаються лише коли є дані.
// У `review` беремо ТІЛЬКИ оцінені відгуки: Google вимагає reviewRating у кожному
// вкладеному Review, і відгук без оцінки завалює перевірку всього блоку.
export function reviewsJsonLd(reviews: any[] | null | undefined, max = 5) {
	const list = reviews || []
	const rated = list.filter((r: any) => Number(r.rating) > 0)
	const { ratedCount, avg } = reviewsStats(list)

	return {
		...ratingJsonLd(avg, ratedCount),
		...(rated.length
			? {
					review: rated.slice(0, max).map((r: any) => ({
						'@type': 'Review',
						author: { '@type': 'Person', name: r.author },
						reviewBody: r.text,
						...(reviewIsoDate(r.date) ? { datePublished: reviewIsoDate(r.date) } : {}),
						reviewRating: { '@type': 'Rating', ratingValue: Number(r.rating), bestRating: 5 },
					})),
			  }
			: {}),
	}
}
