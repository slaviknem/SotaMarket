<template>
	<div v-if="article" class="container">
		<Breadcrumbs
			:items="[
				{ title: t('header.topbar.blog'), url: localePath('/article') },
				{ title: t('blogCategory.' + article.type), url: localePath(`/article/${article.type}`) },
				{ title: article.title },
			]"
		/>

		<div class="article-layout">
			<!-- Меню категорій блогу збоку (як фільтри) -->
			<aside class="article-layout__sidebar">
				<div class="article-layout__sidebar-panel">
					<BlocksBlogTypesNav vertical :active-type="article.type" />
				</div>
			</aside>

			<article class="post">
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

				<!-- Коментарі -->
				<section class="post__reviews">
					<h2>{{ t('product.reviews') }}</h2>
					<ShopReviewsBlock :reviews="article.reviews || []" :article-id="article.id" />
				</section>
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
/* Сайдбар з меню категорій зліва + стаття справа — разом на всю ширину */
.article-layout {
	display: grid;
	grid-template-columns: 250px 1fr;
	gap: 22px;
	align-items: start;
	padding-bottom: 30px;
}

/* Колонка тягнеться на висоту ряду — інакше sticky-панелі немає куди рухатись */
.article-layout__sidebar {
	align-self: stretch;
}

/* Sticky-панель меню під прибитою шапкою (як у сайдбарі фільтрів категорії) */
.article-layout__sidebar-panel {
	position: sticky;
	top: calc(var(--header-stuck-h) + 5px);
}

.post {
	min-width: 0;
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

.post__reviews h2 {
	font-size: 20px;
	margin-bottom: 16px;
}

/* Планшет/мобайл — меню зверху стрічкою, стаття під ним на всю ширину */
@media (max-width: 1023px) {
	.article-layout {
		grid-template-columns: 1fr;
		gap: 14px;
	}

	.article-layout__sidebar-panel {
		position: static;
	}
}

@media (max-width: 768px) {
	.post__header h1 {
		font-size: 22px;
	}
}
</style>
