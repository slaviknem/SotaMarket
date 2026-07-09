// SEO-хелпери: canonical, meta, Open Graph, JSON-LD

export function usePageSeo(opts: {
	title: MaybeRefOrGetter<string>
	description?: MaybeRefOrGetter<string>
	image?: MaybeRefOrGetter<string | undefined>
	noindex?: MaybeRefOrGetter<boolean>
}) {
	const route = useRoute()
	const config = useRuntimeConfig()

	// Само-посилальний canonical. Для сторінок пагінації зберігаємо ?page=N —
	// інакше сторінки 2+ виглядали б дублями 1-ї і товари з них випадали б з індексу.
	const canonical = computed(() => {
		const page = Number(route.query.page) || 1
		return config.public.siteUrl + route.path + (page > 1 ? `?page=${page}` : '')
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
				{ property: 'og:type', content: 'website' },
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

// JSON-LD мікророзмітка
export function useJsonLd(data: MaybeRefOrGetter<object | object[]>) {
	useHead(() => ({
		script: [
			{
				type: 'application/ld+json',
				innerHTML: JSON.stringify(toValue(data)),
			},
		],
	}))
}
