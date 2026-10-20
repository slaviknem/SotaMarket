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
	const { t } = useI18n()

	// Само-посилальний canonical. Для сторінок пагінації зберігаємо ?page=N —
	// інакше сторінки 2+ виглядали б дублями 1-ї і товари з них випадали б з індексу.
	const canonical = computed(() => {
		const page = Number(route.query.page) || 1
		const path = toValue(opts.path) || route.path
		return config.public.siteUrl + path + (page > 1 ? `?page=${page}` : '')
	})

	useHead(() => {
		const page = Number(route.query.page) || 1
		const baseTitle = toValue(opts.title)
		const baseDescription = toValue(opts.description) || ''
		const noindex = toValue(opts.noindex)

		// Сторінки 2+ канонічні самі на себе, тож їхні сніпети конкурують із 1-ю за той самий
		// запит — а title/description у них були байт-в-байт однакові. Номер сторінки в обох
		// полях знімає дубль і одразу показує в видачі, що це продовження списку.
		const pageSuffix = page > 1 ? t('other.pageN', { page }) : ''
		const title = pageSuffix ? `${baseTitle} — ${pageSuffix}` : baseTitle
		const description =
			pageSuffix && baseDescription ? `${pageSuffix}. ${baseDescription}` : baseDescription

		// Прев'ю для соцмереж і месенджерів. Без фолбеку посилання на головну, категорію
		// чи фільтр летіли в Viber/Telegram/Facebook голим текстом без картинки.
		const image = toValue(opts.image) || `${config.public.siteUrl}/images/og-default.jpg`

		return {
			title,
			meta: [
				{ name: 'description', content: description },
				...(noindex ? [{ name: 'robots', content: 'noindex, follow' }] : []),
				// Open Graph
				{ property: 'og:type', content: toValue(opts.ogType) || 'website' },
				{ property: 'og:site_name', content: config.public.siteName as string },
				{ property: 'og:title', content: title },
				{ property: 'og:description', content: description },
				{ property: 'og:url', content: canonical.value },
				{ property: 'og:image', content: image },
				// Twitter
				{ name: 'twitter:card', content: 'summary_large_image' },
			],
			link: [{ rel: 'canonical', href: canonical.value }],
		}
	})
}

// BreadcrumbList — структура каталогу для пошуковиків і AI. Магазин завжди перша крихта,
// далі — те, що сторінка показує візуально (Breadcrumbs), тож розмітка й видимий шлях
// ніколи не розходяться. Останню крихту лишаємо без `item`: це поточна сторінка.
export function useBreadcrumbsJsonLd(
	crumbs: MaybeRefOrGetter<{ title: string; url?: string }[]>
) {
	const config = useRuntimeConfig()
	const localePath = useLocalePath()

	useJsonLd(() => {
		const list = [
			{ title: config.public.siteName as string, url: localePath('/') },
			...toValue(crumbs),
		]

		return {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: list.map((crumb, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: crumb.title,
				...(crumb.url
					? { item: crumb.url.startsWith('http') ? crumb.url : config.public.siteUrl + crumb.url }
					: {}),
			})),
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

// Глобальні політики магазину — повернення й доставка. Самі вузли оголошені в app.vue
// на OnlineStore (на кожній сторінці), а Offer посилається на них лише через @id —
// так радить Google, і умови не дублюються в кожному варіанті товару.
export const returnPolicyId = (siteUrl: string) => ({ '@id': siteUrl + '/#return-policy' })
export const shippingServiceId = (siteUrl: string) => ({ '@id': siteUrl + '/#shipping' })

// Продавець і його умови для кожного Offer.
// priceValidUntil/validFrom навмисно не ставимо: Google читає їх як терміни акції,
// а в нас звичайна ціна без дати закінчення.
export function offerShop(siteUrl: string) {
	return {
		seller: orgId(siteUrl),
		hasMerchantReturnPolicy: returnPolicyId(siteUrl),
		shippingDetails: { '@type': 'OfferShippingDetails', hasShippingService: shippingServiceId(siteUrl) },
	}
}
