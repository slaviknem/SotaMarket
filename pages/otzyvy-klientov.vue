<template>
	<div v-if="article" class="container">
		<Breadcrumbs :items="[{ title: article.title }]" />

		<article class="info-page">
			<h1>{{ article.title }}</h1>
			<div v-if="article.text" class="typography" v-html="article.text" />

			<!-- Віджет відгуків Elfsight (як на старому сайті) -->
			<ClientOnly>
				<div class="elfsight-app-5ff3437e-c2a1-42cb-a6cc-b6957280109d" data-elfsight-app-lazy />
			</ClientOnly>

			<!-- Відгуки з API + форма -->
			<section class="reviews-section">
				<h2>{{ t('reviews.newReview') }}</h2>
				<ShopReviewsBlock :reviews="article.reviews || []" :article-id="article.id" />
			</section>
		</article>
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const shopApi = useShopApi()

const { data: article } = await useAsyncData(
	'info-otzyvy-' + locale.value,
	async () => (await shopApi.getArticleByAlias('otzyvy-klientov')) ?? false
)

if (!article.value) {
	throw createError({ statusCode: 404, fatal: true })
}

usePageSeo({
	title: () => article.value?.meta_title || article.value?.title || '',
	description: () => article.value?.meta_description || '',
})

// Скрипт віджета Elfsight
useHead({
	script: [{ src: 'https://static.elfsight.com/platform/platform.js', async: true, tagPosition: 'bodyClose' }],
})
</script>

<style scoped>
.info-page {
	max-width: 920px;
	margin: 0 auto;
	padding-bottom: 50px;
}

.reviews-section {
	margin-top: 36px;
	padding-top: 24px;
	border-top: 1px solid var(--border);
}

.reviews-section h2 {
	font-size: 20px;
}
</style>
