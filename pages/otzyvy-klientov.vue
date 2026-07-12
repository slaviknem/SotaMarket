<template>
	<div v-if="article" class="container">
		<Breadcrumbs :items="[{ title: article.title }]" />

		<div class="side-layout">
			<!-- Меню інфо-сторінок зліва (на мобільному ховається — є в шапці) -->
			<aside class="side-layout__aside">
				<div class="side-layout__aside-panel">
					<BlocksSideMenu :menu="infoMenu" />
				</div>
			</aside>

			<article class="side-layout__content info-page">
				<h1>{{ article.title }}</h1>
				<div v-if="article.text" class="typography" v-html="article.text" />

				<!-- Останні відгуки з усього сайту (лише з зірочками 4-5) + форма.
				     Нові відгуки прив'язуються до цієї сторінки (стаття). -->
				<div class="reviews-section">
					<ShopReviewsBlock
						:reviews="latestReviews || []"
						type="article"
						:target-id="article.id"
						:title="t('reviews.title')"
					/>
				</div>

				<!-- Віджет відгуків Google/Elfsight (як на старому сайті) -->
				<ClientOnly>
					<div class="elfsight-app-5ff3437e-c2a1-42cb-a6cc-b6957280109d" data-elfsight-app-lazy />
				</ClientOnly>
			</article>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const shopApi = useShopApi()
const { infoMenu } = useSiteMenus()

const [{ data: article }, { data: latestReviews }] = await Promise.all([
	useAsyncData(
		'info-otzyvy-' + locale.value,
		async () => (await shopApi.getArticleByAlias('otzyvy-klientov')) ?? false
	),
	// Останні відгуки з усього сайту — лише з оцінкою 4-5 зірок
	useAsyncData('otzyvy-latest-' + locale.value, () => shopApi.getLatestReviews(50, 4)),
])

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
	padding-bottom: 30px;
}

.reviews-section {
	margin: 24px 0 36px;
}
</style>
