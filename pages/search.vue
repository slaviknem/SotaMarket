<template>
	<div class="container search-page">
		<Breadcrumbs :items="[{ title: t('header.topbar.search') }]" />

		<header class="search-page__head">
			<h1 class="search-page__title">{{ t('search.resultsFor', { query: q }) }}</h1>
			<span v-if="total" class="search-page__count">{{ total }} {{ t('category.products') }}</span>
		</header>

		<!-- Розпізнані моделі: звузити широкий запит до своєї моделі одним кліком -->
		<section v-if="models.length" class="search-page__models">
			<h2 class="search-page__subtitle">{{ t('search.models') }}</h2>

			<!-- Та сама картка, що в блоці «Популярні моделі» на головній (.cat-card у main.css) -->
			<div class="cat-grid cat-grid--models">
				<NuxtLink v-for="m in models" :key="m.alias" :to="url.category(m.alias)" class="cat-card">
					<div class="cat-card__img" :class="{ 'cat-card__img--empty': !m.image }">
						<AppImage
							v-if="m.image"
							:src="url.categoryImg(m.image)"
							:alt="m.title"
							:width="64"
							:height="64"
						/>
						<AppIcon v-else name="phone" :size="24" />
					</div>
					<div class="cat-card__info">
						<div class="cat-card__title">{{ m.title }}</div>
						<div v-if="m.products_count" class="cat-card__count">
							{{ m.products_count }} {{ t('category.products') }}
						</div>
					</div>
				</NuxtLink>
			</div>
		</section>

		<div v-if="pending" class="products-grid products-grid--six">
			<div v-for="i in 18" :key="i" class="skeleton" style="aspect-ratio: 0.62" />
		</div>

		<template v-else-if="items.length">
			<!-- Уточнюємо, чиї це товари: у сітці — товари РОЗПІЗНАНОЇ моделі,
			     а плиток вище може бути кілька -->
			<h2 v-if="models.length" class="search-page__subtitle">
				{{ t('search.productsFor', { model: models[0].title }) }}
			</h2>

			<div class="products-grid products-grid--six">
				<ProductCard
					v-for="item in items"
					:key="item.product.id + '-' + (item.attribute?.id || 0)"
					:product="item.product"
					:attribute="item.attribute || undefined"
				/>
			</div>

			<AppPagination :current="page" :total-pages="lastPage" :to="pageLink" />
		</template>

		<div v-else class="search-page__empty">
			<AppIcon name="search" :size="30" />
			<p>{{ t('search.nothingFound', { query: q }) }}</p>
			<span class="text-muted">{{ t('search.nothingHint') }}</span>
			<NuxtLink :to="localePath('/chekhly')" class="btn btn-primary">{{ t('other.catalog') }}</NuxtLink>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const url = useUrl()
const shopApi = useShopApi()

const q = computed(() => String(route.query.q || '').trim())
const page = computed(() => Math.max(parseInt(String(route.query.page || '1')) || 1, 1))

const { data, pending } = await useAsyncData(
	() => `search-${q.value}-${page.value}-${locale.value}`,
	// .catch — щоб недоступний бекенд давав «нічого не знайдено», а не 500 на SSR
	() =>
		q.value.length >= 2
			? shopApi.searchPage(q.value, { page: page.value, limit: 30 }).catch(() => null)
			: Promise.resolve(null),
	{ watch: [q, page], default: () => null }
)

const products = computed(() => data.value?.data ?? [])
const items = computed(() => expandProductsByAttributes(products.value))
const total = computed(() => data.value?.meta?.total ?? 0)
const lastPage = computed(() => data.value?.meta?.last_page ?? 1)
const models = computed(() => data.value?.search?.models ?? [])

const pageLink = (p: number) =>
	localePath(`/search?q=${encodeURIComponent(q.value)}${p > 1 ? `&page=${p}` : ''}`)

// Сторінки внутрішнього пошуку не індексуємо — це нескінченний простір URL.
// SEO-трафік ловлять справжні сторінки моделей і фільтрів.
usePageSeo({
	title: () => t('search.resultsFor', { query: q.value }),
	noindex: true,
})
</script>

<style scoped>
.search-page {
	padding-bottom: 40px;
}

.search-page__head {
	display: flex;
	align-items: baseline;
	gap: 12px;
	flex-wrap: wrap;
	margin: 6px 0 18px;
}

.search-page__title {
	margin: 0;
	font-size: 24px;
}

.search-page__count {
	color: var(--text-muted);
	font-size: 14px;
}

.search-page__subtitle {
	margin: 0 0 12px;
	font-size: 13px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-muted);
}

.search-page__models {
	margin-bottom: 26px;
}

/* .pagination власних відступів не має — задаємо тут */
.search-page :deep(.pagination) {
	margin-top: 28px;
}

.search-page__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 60px 20px;
	text-align: center;
}

.search-page__empty svg {
	color: var(--text-muted);
}

.search-page__empty p {
	margin: 0;
	font-size: 17px;
	font-weight: 600;
}

.search-page__empty .btn {
	margin-top: 8px;
}
</style>
