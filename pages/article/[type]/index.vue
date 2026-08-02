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
		<BlocksSideMenu :menu="blogMenu" variant="strip" class="blog-nav" />

		<BlocksPostsGrid :title="''" :posts="posts" class="blog-grid" />
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const shopApi = useShopApi()
const { blogMenu } = useSiteMenus()

const type = computed(() => String(route.params.type))

// Сторінка є лише у категорій блогу. Раніше сюди проходив будь-який рядок (і службові типи,
// і випадкове сміття) — віддавалось 200 з сирим типом у <h1>, тобто індексований дубль ні про що.
if (!BLOG_TYPES.includes(type.value)) {
	throw createError({ statusCode: 404, statusMessage: 'Blog category not found', fatal: true })
}

const typeTitle = computed(() => t('blogCategory.' + type.value))

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
