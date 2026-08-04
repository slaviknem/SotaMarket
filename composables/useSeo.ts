// SEO-хелпери: canonical, meta, Open Graph, JSON-LD

export function usePageSeo(opts: {
	title: MaybeRefOrGetter<string>
	description?: MaybeRefOrGetter<string>
	image?: MaybeRefOrGetter<string | undefined>
	noindex?: MaybeRefOrGetter<boolean>
	// Явний шлях сторінки. Потрібен там, де URL змінюється без навігації роутера
	// (сторінка товару переписує його на /attr/… при виборі принта) — інакше route.path відстає
	path?: MaybeRefOrGetter<string>
	// og:type — 'product' для сторінок товару/дизайну/конструктора, 'article' для блогу.
	// Соцмережі та AI-парсери за ним розрізняють тип сутності ще до розбору JSON-LD.
	ogType?: MaybeRefOrGetter<string>
}) {
	const route = useRoute()
	const config = useRuntimeConfig()

	// Само-посилальний canonical. Для сторінок пагінації зберігаємо ?page=N —
	// інакше сторінки 2+ виглядали б дублями 1-ї і товари з них випадали б з індексу.
	const canonical = computed(() => {
		const page = Number(route.query.page) || 1
		const path = toValue(opts.path) || route.path
		return config.public.siteUrl + path + (page > 1 ? `?page=${page}` : '')
	})

	useHead(() => {
		const title = toValue(opts.title)
		const description = toValue(opts.description) || ''
		const image = toValue(opts.image)
		const noindex = toValue(opts.noindex)

		return {
			title,
			meta: [
				{ name: 'description', content: description },
				...(noindex ? [{ name: 'robots', content: 'noindex, follow' }] : []),
				// Open Graph
				{ property: 'og:type', content: toValue(opts.ogType) || 'website' },
				{ property: 'og:site_name', content: 'FLOY' },
				{ property: 'og:title', content: title },
				{ property: 'og:description', content: description },
				{ property: 'og:url', content: canonical.value },
				...(image ? [{ property: 'og:image', content: image }] : []),
				// Twitter
				{ name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
			],
			link: [{ rel: 'canonical', href: canonical.value }],
		}
	})
}

// JSON-LD мікророзмітка.
// Кутову дужку екрануємо в юнікод-послідовність: вміст приходить із БД (назви, описи,
// тексти відгуків), і один закривальний тег скрипта всередині рядка розірвав би блок
// і поламав розмітку всієї сторінки. Для JSON це рівнозначний запис.
export function useJsonLd(data: MaybeRefOrGetter<object | object[]>) {
	useHead(() => ({
		script: [
			{
				type: 'application/ld+json',
				innerHTML: JSON.stringify(toValue(data)).replace(/</g, '\\u003c'),
			},
		],
	}))
}

// Ідентифікатор магазину як сутності: вузол Organization живе в app.vue (на кожній сторінці),
// а Offer/Product посилаються на нього через @id — без дублювання даних у кожному блоці.
export function orgId(siteUrl: string) {
	return { '@id': siteUrl + '/#organization' }
}

// priceValidUntil для Offer: без дати в майбутньому Google вважає пропозицію
// протермінованою і ховає ціну зі сніпета. Рік уперед у мілісекундах — так дата
// завжди валідна (на відміну від «+1 до року», що дає 29 лютого в невисокосному).
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

export function priceValidUntil() {
	return new Date(Date.now() + YEAR_MS).toISOString().slice(0, 10)
}
