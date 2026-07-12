<template>
	<div v-if="article" class="container">
		<Breadcrumbs
			:items="[
				{ title: t('header.topbar.blog'), url: localePath('/article') },
				{ title: t('blogCategory.' + article.type), url: localePath(`/article/${article.type}`) },
				{ title: article.title },
			]"
		/>

		<div class="side-layout side-layout--strip">
			<!-- Меню категорій блогу збоку (як фільтри), на мобільному — стрічкою зверху -->
			<aside class="side-layout__aside">
				<div class="side-layout__aside-panel">
					<BlocksSideMenu :menu="blogMenu" />
				</div>
			</aside>

			<article class="side-layout__content post">
				<header class="post__header">
					<h1>{{ article.title }}</h1>
					<div class="post__meta">
						<span class="post__type">{{ t('blogCategory.' + article.type) }}</span>
						<time class="text-muted">{{ article.date }}</time>
					</div>
				</header>

				<AppImage
					v-if="article.image_file"
					:src="url.articleImg(article.image_file)"
					:alt="article.title"
					class="post__image"
					fetchpriority="high"
					loading="eager"
					preload
					:width="900"
					:height="430"
				/>

				<div class="post__content typography" v-html="article.text" />

				<!-- Коментарі (єдиний компонент відгуків) -->
				<div class="post__reviews">
					<ShopReviewsBlock
						:reviews="article.reviews || []"
						type="article"
						:target-id="article.id"
						:title="t('product.reviews')"
					/>
				</div>
			</article>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const url = useUrl()
const shopApi = useShopApi()
const config = useRuntimeConfig()
const { blogMenu } = useSiteMenus()

const alias = computed(() => String(route.params.article))

const { data: article } = await useAsyncData(
	`article-${alias.value}-${locale.value}`,
	async () => (await shopApi.getArticleByAlias(alias.value)) ?? false
)

// Статтю не знайдено — 301 на блог (як на старому сайті)
if (!article.value) {
	await navigateTo(localePath('/article'), { redirectCode: 301 })
}

usePageSeo({
	title: () => article.value?.meta_title || article.value?.title || '',
	description: () => article.value?.meta_description || '',
	image: () => (article.value?.image_file ? url.articleImg(article.value.image_file) : undefined),
})

useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'Article',
	headline: article.value?.title || '',
	image: article.value?.image_file ? [url.articleImg(article.value.image_file)] : [],
	datePublished: article.value?.date || '',
	publisher: {
		'@type': 'Organization',
		name: 'FLOY',
		logo: { '@type': 'ImageObject', url: config.public.siteUrl + '/images/logo.svg' },
	},
}))
</script>

<style scoped>
/* Layout (сайдбар + контент) — глобальні класи .side-layout у main.css */
.post {
	padding-bottom: 20px;
}

.post__header h1 {
	font-size: 28px;
}

.post__meta {
	display: flex;
	align-items: center;
	gap: 14px;
	margin-bottom: 18px;
	font-size: 13px;
}

.post__type {
	color: var(--accent);
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.post__image {
	width: 100%;
	border-radius: var(--radius-lg);
	margin-bottom: 22px;
	object-fit: cover;
}

.post__reviews {
	margin-top: 40px;
	padding-top: 24px;
	border-top: 1px solid var(--border);
}

@media (max-width: 768px) {
	.post__header h1 {
		font-size: 22px;
	}
}
</style>
