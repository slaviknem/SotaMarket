<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('header.topbar.blog') }]" />

		<h1>{{ t('pageTitle.blog') }}</h1>

		<!-- Категорії блогу -->
		<BlocksSideMenu :menu="blogMenu" variant="strip" class="blog-nav" />

		<BlocksPostsGrid :title="''" :posts="posts" class="blog-grid" />
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const shopApi = useShopApi()
const url = useUrl()
const config = useRuntimeConfig()
const { blogMenu } = useSiteMenus()

const { data: posts } = await useAsyncData('articles-all-' + locale.value, () =>
	shopApi.getArticles('all')
)

usePageSeo({
	title: () => t('metaTitle.blog'),
	description: () => t('metaDescription.blog'),
	// Прев'ю — картинка свіжої статті (як на першій картці сітки)
	image: () => (posts.value?.[0] ? url.articleImg(posts.value[0].image_file) : undefined),
})

useBreadcrumbsJsonLd(() => [{ title: t('header.topbar.blog') }])

// Blog + перелік публікацій: пошуковики й AI бачать, що це розділ з матеріалами,
// і одразу отримують назви й адреси статей, не обходячи сітку карток
useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'Blog',
	name: t('pageTitle.blog'),
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

.blog-grid :deep(.section-title) {
	display: none;
}
</style>
