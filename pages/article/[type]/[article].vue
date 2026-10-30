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
						<time class="text-muted" :datetime="reviewIsoDate(article.date)">{{ article.date }}</time>
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

				<div class="post__content typography" v-html="contentHtml(article.text)" />

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

const { data: article, error } = await useAsyncData(
	`article-${alias.value}-${locale.value}`,
	async () => (await shopApi.getArticleByAlias(alias.value)) ?? false
)

// API не відповів — 503, а не 301 нижче (див. throwIfApiDown у useShopApi)
throwIfApiDown(error.value, 'Article')

// Статтю не знайдено — 301 на блог (як на старому сайті)
if (!article.value) {
	await navigateTo(localePath('/article'), { redirectCode: 301 })
}

usePageSeo({
	title: () => article.value?.meta_title || article.value?.title || '',
	description: () => article.value?.meta_description || '',
	image: () =>
		article.value?.image_file ? url.articleImgSource(article.value.image_file) : undefined,
	ogType: 'article',
})

useJsonLd(() => {
	const a = article.value
	if (!a) return {}

	// API віддає дату як «11.07.2026» — для schema.org потрібен ISO, інакше Google
	// відкидає поле і разом з ним усю розмітку статті. Це updated_at, тож він і в
	// dateModified, і (за відсутністю кращого) в datePublished.
	const iso = reviewIsoDate(a.date)
	const pageUrl = config.public.siteUrl + url.blogPost({ type: a.type, alias: a.alias })
	// Автор і видавець — сам магазин: посилаємось на його вузол (@id з app.vue), але
	// name/logo дублюємо явно, бо Google вимагає їх безпосередньо в полі
	const publisher = {
		'@type': 'Organization',
		...orgId(config.public.siteUrl as string),
		name: config.public.siteName,
		logo: { '@type': 'ImageObject', url: config.public.siteUrl + '/images/logo.svg' },
	}

	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: a.title || '',
		description: a.meta_description || '',
		image: a.image_file ? [url.articleImgSource(a.image_file)] : [],
		...(iso ? { datePublished: iso, dateModified: iso } : {}),
		inLanguage: locale.value,
		mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
		url: pageUrl,
		author: publisher,
		publisher,
	}
})

// Шлях Блог → Категорія → Стаття: те саме, що у видимих крихтах вище
useBreadcrumbsJsonLd(() => {
	const a = article.value
	if (!a) return []

	return [
		{ title: t('header.topbar.blog'), url: localePath('/article') },
		{ title: t('blogCategory.' + a.type), url: localePath(`/article/${a.type}`) },
		{ title: a.title },
	]
})
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
	color: var(--accent-text);
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
