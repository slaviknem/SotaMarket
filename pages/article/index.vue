<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('header.topbar.blog') }]" />

		<h1>{{ t('pageTitle.blog') }}</h1>

		<!-- Категорії блогу -->
		<BlocksBlogTypesNav class="blog-nav" />

		<BlocksPostsGrid :title="''" :posts="posts" class="blog-grid" />
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const shopApi = useShopApi()

const { data: posts } = await useAsyncData('articles-all-' + locale.value, () =>
	shopApi.getArticles('all')
)

usePageSeo({
	title: () => t('metaTitle.blog'),
	description: () => t('metaDescription.blog'),
})
</script>

<style scoped>
.blog-nav {
	margin: 4px 0 8px;
}

.blog-grid :deep(.section-title) {
	display: none;
}
</style>
