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

		<BlocksPostsGrid :title="''" :posts="posts" />
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const shopApi = useShopApi()
const url = useUrl()
const config = useRuntimeConfig()
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
	image: () => (posts.value?.[0] ? url.articleImg(posts.value[0].image_file) : undefined),
})

useBreadcrumbsJsonLd(() => [
	{ title: t('header.topbar.blog'), url: localePath('/article') },
	{ title: typeTitle.value },
])

// Blog цієї категорії + її публікації (той самий підхід, що й на /article)
useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'Blog',
	name: typeTitle.value,
	description: t('metaDescription.blog'),
	inLanguage: locale.value,
	publisher: orgId(config.public.siteUrl as string),
	blogPost: (posts.value || []).slice(0, 24).map((p: any) => ({
		'@type': 'BlogPosting',
		headline: p.title,
		url: url.absolute(url.blogPost(p)),
		image: url.articleImg(p.image_file),
		...(p.date ? { datePublished: p.date } : {}),
	})),
}))
</script>

<style scoped>
.blog-nav {
	margin: 4px 0 8px;
}
</style>
