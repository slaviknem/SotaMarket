<template>
	<div class="container">
		<Breadcrumbs
			:items="[
				{ title: t('header.topbar.blog'), url: localePath('/article') },
				{ title: typeTitle },
			]"
		/>

		<h1>{{ typeTitle }}</h1>

		<!-- Категорії блогу — як на головній сторінці блогу -->
		<BlocksBlogTypesNav :active-type="type" class="blog-nav" />

		<BlocksPostsGrid :title="''" :posts="posts" class="blog-grid" />
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const shopApi = useShopApi()

const type = computed(() => String(route.params.type))

const knownTypes = ['new', 'akcii', 'review', 'info']
const typeTitle = computed(() =>
	knownTypes.includes(type.value) ? t('blogCategory.' + type.value) : type.value
)

const { data: posts } = await useAsyncData(`articles-${type.value}-${locale.value}`, () =>
	shopApi.getArticles(type.value)
)

usePageSeo({
	title: () => `${typeTitle.value} — ${t('metaTitle.blog')}`,
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
