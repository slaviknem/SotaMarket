<template>
	<div>
		<BlocksBannerSlider :banners="banners" />

		<BlocksFeaturesStrip />

		<BlocksCategoryGrid :title="t('index.popularModels')" :categories="popularModels" variant="models" />

		<BlocksProductsCarousel
			:title="t('index.latestProducts')"
			:initial-products="latestProducts"
			:tabs="productTabs"
			:limit="10"
		/>

		<BlocksCategoryGrid :title="t('index.popularCategory')" :categories="popularCategories" variant="categories" />

		<BlocksPostsGrid :title="t('index.lastBlog')" :posts="posts" />

		<BlocksReviewsStrip :title="t('index.lastReviews')" :reviews="latestReviews" />

		<!-- SEO-текст -->
		<section class="block">
			<div class="container">
				<h1 class="seo-title">{{ t('pageTitle.index') }}</h1>
				<div v-if="article?.text" class="typography seo-text" v-html="contentHtml(article.text)" />
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const shopApi = useShopApi()
const config = useRuntimeConfig()
const localePath = useLocalePath()
const url = useUrl()

const productTabs = computed(() => [
	{ name: t('product.type.all'), categoryAlias: 'all' },
	{ name: t('product.type.case'), categoryAlias: 'chekhly' },
	{ name: t('product.type.glass'), categoryAlias: 'plenki' },
	{ name: t('product.type.accessories'), categoryAlias: 'accessories' },
])

// Дані головної (SSR, паралельно)
const [{ data: banners }, { data: popularModels }, { data: latestProducts }, { data: popularCategories }, { data: posts }, { data: latestReviews }, { data: article }] =
	await Promise.all([
		useAsyncData('home-banners-' + locale.value, () => shopApi.getBanners()),
		useAsyncData('home-models-' + locale.value, () => shopApi.getPopularCategory({ type: 'model', limit: 8 })),
		useAsyncData('home-latest-' + locale.value, () => shopApi.getLatestProducts({ category: 'all', limit: 10 })),
		useAsyncData('home-cats-' + locale.value, () => shopApi.getPopularCategory({ type: 'category', limit: 6 })),
		useAsyncData('home-posts-' + locale.value, () => shopApi.getLatestArticles({ type: 'all', limit: 3 })),
		useAsyncData('home-reviews-' + locale.value, () => shopApi.getLatestReviews(10, 4)),
		useAsyncData('home-article-' + locale.value, async () => (await shopApi.getArticleByAlias('index')) ?? false),
	])

// SEO
usePageSeo({
	title: () => t('metaTitle.index'),
	description: () => t('metaDescription.index'),
})

// WebSite + OnlineStore (магазин як сутність) реєструються глобально в app.vue —
// вони потрібні на кожній сторінці, а не лише тут. Головній лишається CollectionPage:
// це вхідна точка каталогу, звідси пошуковики й AI бачать його розділи.
useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'CollectionPage',
	name: t('metaTitle.index'),
	description: t('metaDescription.index'),
	url: config.public.siteUrl + localePath('/'),
	isPartOf: { '@id': config.public.siteUrl + '/#website' },
	about: orgId(config.public.siteUrl as string),
	// Розділи каталогу — короткий, стабільний зріз (популярні моделі + категорії)
	mainEntity: {
		'@type': 'ItemList',
		itemListElement: [...(popularModels.value || []), ...(popularCategories.value || [])]
			.slice(0, 14)
			.map((c: any, i: number) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: c.title_full || c.title,
				url: config.public.siteUrl + url.category(c.alias),
			})),
	},
}))
</script>

<style scoped>
.seo-title {
	font-size: 22px;
	margin-bottom: 16px;
}

.seo-text {
	font-size: 14px;
	color: var(--text-muted);
}

.seo-text :deep(h2),
.seo-text :deep(h3) {
	font-size: 17px;
}
</style>
