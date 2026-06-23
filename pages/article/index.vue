<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('header.topbar.blog') }]" />

		<h1>{{ t('pageTitle.blog') }}</h1>

		<!-- Категорії блогу -->
		<div class="blog-types">
			<NuxtLink
				v-for="type in types"
				:key="type"
				:to="localePath(`/article/${type}`)"
				class="blog-type"
			>
				{{ t('blogCategory.' + type) }}
			</NuxtLink>
		</div>

		<BlocksPostsGrid :title="''" :posts="posts" class="blog-grid" />
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const shopApi = useShopApi()

const types = ['new', 'akcii', 'review', 'info']

const { data: posts } = await useAsyncData('articles-all-' + locale.value, () =>
	shopApi.getArticles('all')
)

usePageSeo({
	title: () => t('metaTitle.blog'),
	description: () => t('metaDescription.blog'),
})
</script>

<style scoped>
.blog-types {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	margin: 4px 0 8px;
}

.blog-type {
	padding: 8px 18px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-pill);
	font-size: 13.5px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.15s;
}

.blog-type:hover,
.blog-type.router-link-active {
	border-color: var(--accent);
	color: var(--accent);
}

.blog-grid :deep(.section-title) {
	display: none;
}
</style>
