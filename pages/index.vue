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

useJsonLd(() => [
	{
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		url: config.public.siteUrl,
		name: 'FLOY — Чохли та захисне скло для телефону',
		potentialAction: {
			'@type': 'SearchAction',
			target: `${config.public.siteUrl}/search?q={search_term_string}`,
			'query-input': 'required name=search_term_string',
		},
	},
	{
		'@context': 'https://schema.org',
		'@type': 'Organization',
		url: config.public.siteUrl,
		name: 'FLOY',
		address: config.public.address,
		contactPoint: {
			'@type': 'ContactPoint',
			telephone: config.public.phone,
			contactType: 'customer service',
			areaServed: 'UA',
			availableLanguage: 'Ukrainian',
		},
		logo: config.public.siteUrl + '/images/logo.svg',
	},
])
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
