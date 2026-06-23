// SEO-хелпери: canonical, meta, Open Graph, JSON-LD

export function usePageSeo(opts: {
	title: MaybeRefOrGetter<string>
	description?: MaybeRefOrGetter<string>
	image?: MaybeRefOrGetter<string | undefined>
	noindex?: boolean
}) {
	const route = useRoute()
	const config = useRuntimeConfig()

	const canonical = computed(() => config.public.siteUrl + route.path)

	useHead(() => {
		const title = toValue(opts.title)
		const description = toValue(opts.description) || ''
		const image = toValue(opts.image)

		return {
			title,
			meta: [
				{ name: 'description', content: description },
				...(opts.noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
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
