<template>
	<div class="container">
		<Breadcrumbs :items="breadcrumbs" />

		<div class="cat-layout" :class="{ 'cat-layout--full': brandsLanding }">
			<!-- Сайдбар фільтрів (ховаємо в режимі лендінгу брендів) -->
			<div v-if="!brandsLanding" class="cat-layout__sidebar" :class="{ 'is-open': mobileFiltersOpen }">
				<div class="cat-layout__sidebar-backdrop" @click="mobileFiltersOpen = false" />
				<div class="cat-layout__sidebar-panel">
					<ShopFiltersSidebar
						:filters="filtersTree || []"
						:selected="selectedFilters"
						@toggle="toggleFilter"
						@reset="resetFilters"
					/>
				</div>
			</div>

			<!-- Контент -->
			<div class="cat-layout__content">
				<header class="cat-head">
					<h1 class="cat-head__title">{{ pageTitle }}</h1>
					<span v-if="total" class="cat-head__count">{{ total }} {{ t('category.products') }}</span>

					<div class="cat-head__controls">
						<button v-if="!brandsLanding" class="cat-head__filters-btn" @click="mobileFiltersOpen = true">
							<AppIcon name="filter" :size="15" />
							{{ t('filters.filters') }}
						</button>

						<label class="cat-head__sort">
							<span class="cat-head__sort-label text-muted">{{ t('category.sortBy') }}:</span>
							<select class="form-control" :value="options.sort" @change="changeSort">
								<option value="default">—</option>
								<option value="price-asc">{{ t('category.sortPrice1') }}</option>
								<option value="price-desc">{{ t('category.sortPrice9') }}</option>
							</select>
						</label>
					</div>
				</header>

				<!-- Опис фільтра (на сторінці фільтра) -->
				<div v-if="filterPage?.description" class="filter-desc typography" v-html="filterPage.description" />

				<!-- /chekhly: плитки брендів з логотипами + повний каталог бренд→серії→моделі -->
				<template v-if="brandsLanding">
					<ShopBrandTiles :brands="brandTiles" class="cat-brand-tiles" />
					<ShopBrandsCatalog :brands="brands" class="cat-brands" />
				</template>

				<!-- Сторінка бренду: усі моделі цього бренду (той самий компонент, один бренд) -->
				<ShopBrandsCatalog v-else-if="brandTree.length" :brands="brandTree" single class="cat-brands" />

				<!-- Товари (на лендінгу /chekhly — 6 у ряд) -->
				<div v-if="pending" class="products-grid" :class="{ 'products-grid--six': brandsLanding }">
					<div v-for="i in 24" :key="i" class="skeleton" style="aspect-ratio: 0.62" />
				</div>

				<template v-else-if="products.length">
					<div class="products-grid" :class="gridModifier">
						<!-- Конструктор чохлів — перший товар (як на старому сайті) -->
						<ProductCardPrintcase v-if="showPrintcaseCard" :category="category" />
						<ProductCard v-for="p in displayProducts" :key="p.id" :product="p" />

						<!-- Кнопка «Показати ще» + авто-підвантаження + пагінація -->
						<ShopCatControls
							v-if="lastPage > 1"
							v-model:auto-on="autoOn"
							:current-page="currentPage"
							:total-pages="lastPage"
							:has-more-pages="hasMorePages"
							:show-button="showButton"
							:is-loading-more="isLoadingMore"
							:loaded="loadedPages"
							:to="pageLink"
							@load-more="loadMore"
						/>
					</div>

					<!-- Тригер авто-підвантаження по скролу -->
					<div ref="scrollSentinel" class="cat-sentinel" aria-hidden="true" />
				</template>

				<div v-else class="cat-empty">
					<p><b>{{ t('category.noMatchingProducts') }}</b></p>
					<p class="text-muted">{{ t('category.tryResettingFilters') }}</p>
					<button class="btn btn-outline" @click="resetFilters">{{ t('filters.rezetFilters') }}</button>
				</div>

				<!-- SEO-опис категорії -->
				<div v-if="category?.description" class="cat-desc typography" v-html="category.description" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	categoryAlias: string
	filterAlias?: string
	// Режим лендінгу брендів (сторінка /chekhly): без фільтрів, з блоками брендів
	brandsLanding?: boolean
}>()

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const url = useUrl()
const localePath = useLocalePath()
const shopApi = useShopApi()
const config = useRuntimeConfig()

const mobileFiltersOpen = ref(false)

// ---------- Параметри з URL ----------
const options = computed(() => ({
	page: Number(route.query.page) || 1,
	limit: Number(route.query.limit) || 24,
	sort: String(route.query.sort || 'default'),
}))

// Вибрані фільтри з query: filter_{group}=a,b
const selectedFilters = computed<Record<string, string[]>>(() => {
	const result: Record<string, string[]> = {}
	for (const key in route.query) {
		const m = key.match(/^filter_([-_A-Za-z0-9]+)$/)
		if (m && typeof route.query[key] === 'string') {
			result[m[1]] = (route.query[key] as string).split(',').filter(Boolean)
		}
	}
	return result
})

// ---------- Дані (SSR) ----------
const keySuffix = computed(() => `${props.categoryAlias}-${props.filterAlias || ''}-${locale.value}`)

// null загортаємо у false, щоб useAsyncData не дублював запити на клієнті.
// Бренди тягнемо лише в режимі лендінгу, фільтри — лише поза ним (порожні fetcher'и не б'ють API).
const [{ data: category }, { data: filtersTree }, { data: brandsData }, { data: brandTilesData }] = await Promise.all([
	useAsyncData('cat-' + keySuffix.value, async () => (await shopApi.getCategoryByAlias(props.categoryAlias)) ?? false),
	useAsyncData('cat-filters-' + keySuffix.value, async () => (props.brandsLanding ? [] : shopApi.getFilters(props.categoryAlias))),
	// Повний каталог брендів (бренд → серії → моделі) — лише для лендінгу /chekhly
	useAsyncData('brands-catalog-' + keySuffix.value, async () => {
		if (!props.brandsLanding) return []
		const menu = await shopApi.getMenu(100)
		const list = [...(menu?.brends || [])]
		if (list.length && !list[list.length - 1].children?.length) list.pop() // прибираємо хвостовий «ВСІ»
		return list
	}),
	// Плитки брендів з логотипами — лише для лендінгу /chekhly
	useAsyncData('brand-tiles-' + keySuffix.value, async () =>
		props.brandsLanding ? shopApi.getPopularCategory({ type: 'brend', limit: 50 }) : []
	),
])

const brandTiles = computed(() => brandTilesData.value || [])

// Логотипи брендів (alias → image_file) з плиток — щоб показати їх у блоках каталогу
const brandLogos = computed<Record<string, string>>(() =>
	Object.fromEntries(brandTiles.value.map((b: any) => [b.alias, b.image_file]))
)

// Каталог брендів /chekhly з підставленими логотипами
const brands = computed(() =>
	(brandsData.value || []).map((b: any) => ({ ...b, image_file: brandLogos.value[b.url] }))
)

// Дані фільтра потрібні тільки на сторінках /filter/ (гілка стабільна для роута)
let filterPage = ref<any>(false)
if (props.filterAlias) {
	const { data } = await useAsyncData(
		'cat-filter-page-' + keySuffix.value,
		async () => (await shopApi.getFilterByAlias(props.categoryAlias, props.filterAlias!)) ?? false
	)
	filterPage = data
}

// Категорію не знайдено — 404
if (!category.value) {
	throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}

// Сторінка фільтра: фільтр не знайдено — редірект на категорію
if (props.filterAlias && !filterPage.value) {
	await navigateTo(url.category(props.categoryAlias), { redirectCode: 301 })
}

// Сторінка бренду: тягнемо його серії+моделі для блоку каталогу зверху (як на /chekhly, але один бренд)
let brandSeriesData = ref<any[]>([])
if (!props.brandsLanding && !props.filterAlias && category.value && category.value.type === 'brend') {
	const { data } = await useAsyncData('brand-series-' + keySuffix.value, () => shopApi.getMenuBrend(props.categoryAlias))
	brandSeriesData = data
}

// Загортаємо серії у форму одного «бренду» для ShopBrandsCatalog
const brandTree = computed(() => {
	const series = brandSeriesData.value
	if (!series?.length) return []
	return [{
		title: category.value?.title_full || category.value?.title,
		url: props.categoryAlias,
		image_file: category.value?.image_file,
		children: series,
	}]
})

// Група (батьківський alias) для фільтра зі сторінки /filter/
const filterParentAlias = computed(() => {
	if (!props.filterAlias || !filtersTree.value) return null
	for (const group of filtersTree.value) {
		if (group.items?.some((i: any) => i.alias === props.filterAlias)) return group.alias
	}
	return null
})

// Фільтри для API: query-фільтри + фільтр сторінки
const apiFilters = computed<Record<string, string>>(() => {
	const result: Record<string, string> = {}

	for (const [group, aliases] of Object.entries(selectedFilters.value) as [string, string[]][]) {
		result[group] = aliases.join(',')
	}

	if (props.filterAlias) {
		const parent = filterParentAlias.value
		if (parent) {
			const existing = result[parent] ? result[parent].split(',') : []
			if (!existing.includes(props.filterAlias)) existing.push(props.filterAlias)
			result[parent] = existing.join(',')
		} else {
			result._page_filter = props.filterAlias
		}
	}

	result.category = props.categoryAlias
	return result
})

const { data: productsData, pending } = await useAsyncData(
	'cat-products-' + keySuffix.value,
	() => shopApi.getProductsList(options.value, apiFilters.value),
	{ watch: [() => route.query] }
)

const products = computed(() => productsData.value?.data || [])
const total = computed(() => productsData.value?.meta?.total || 0)
const currentPage = computed(() => productsData.value?.meta?.current_page || 1)
const lastPage = computed(() => productsData.value?.meta?.last_page || 1)

// Картка конструктора: тільки для моделей з увімкненим printcase,
// на першій сторінці і не на сторінці фільтра
const showPrintcaseCard = computed(
	() =>
		category.value?.type === 'model' &&
		!!category.value?.printcase &&
		currentPage.value === 1 &&
		!props.filterAlias
)

// ---------- Підвантаження «Показати ще» / авто по скролу (логіка — у composable) ----------
// 1 партія авто по скролу (плавний старт) → далі кнопка/ползунок. Кожна партія = одна сторінка (24).
const { items: displayProducts, isLoadingMore, autoOn, hasMorePages, loadedPages, showButton, loadMore, scrollSentinel } =
	useLoadMore({
		baseItems: products,
		currentPage,
		lastPage,
		fetchPage: (page: number) =>
			shopApi.getProductsList({ ...options.value, page }, apiFilters.value).then((r) => r?.data || []),
		autoBatches: 1,
	})

// Лендінг — 6 у ряд; багатосторінкова — flow (товари зліва + блок контролів у вільний простір
// справа від останнього товару); одна сторінка (контролів нема) — центруємо неповний хвіст.
const gridModifier = computed(() =>
	props.brandsLanding
		? 'products-grid--six'
		: lastPage.value > 1
			? 'products-grid--flow'
			: 'products-grid--center'
)

// Посилання на сторінку для пагінації (дзеркалить updateQuery: page=1 прибираємо)
function pageLink(page: number) {
	const query: Record<string, any> = { ...route.query }
	if (page > 1) query.page = String(page)
	else delete query.page
	return { path: route.path, query }
}

// ---------- Заголовки та SEO ----------
const pageTitle = computed(() => {
	if (filterPage.value) {
		return `${filterPage.value.title} — ${category.value?.title_rus || category.value?.title_full || ''}`
	}
	return category.value?.title_rus || category.value?.title_full || category.value?.title || ''
})

const breadcrumbs = computed(() => {
	const crumbs: { title: string; url?: string }[] = []

	if (category.value?.brend && category.value.brend.alias !== props.categoryAlias) {
		crumbs.push({ title: category.value.brend.title, url: url.category(category.value.brend.alias) })
	}

	crumbs.push({
		title: category.value?.title_full || category.value?.title || '',
		url: props.filterAlias ? url.category(props.categoryAlias) : undefined,
	})

	if (filterPage.value) {
		crumbs.push({ title: filterPage.value.title })
	}

	return crumbs
})

usePageSeo({
	title: () =>
		filterPage.value
			? `${filterPage.value.title} ${category.value?.title_full || ''} — FLOY`
			: category.value?.meta_title || pageTitle.value,
	description: () =>
		filterPage.value
			? `${filterPage.value.title} ${category.value?.title_full || ''}. ${t('metaDescription.index')}`
			: category.value?.meta_description || '',
})

// JSON-LD: список товарів
useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'ItemList',
	name: pageTitle.value,
	numberOfItems: total.value,
	itemListElement: products.value.slice(0, 24).map((p: any, i: number) => ({
		'@type': 'ListItem',
		position: (currentPage.value - 1) * options.value.limit + i + 1,
		url: config.public.siteUrl + `/${p.alias_cat}/${p.alias}`,
	})),
}))

// Облік візитів
onMounted(() => {
	if (category.value?.id) shopApi.addVisit(category.value.id, 0, 0, filterPage.value?.id || 0)
})

// ---------- Дії ----------
function updateQuery(patch: Record<string, any>) {
	const query: Record<string, any> = { ...route.query, ...patch }

	// Прибираємо дефолтні значення з URL
	for (const key of Object.keys(query)) {
		if (query[key] === undefined || query[key] === null || query[key] === '') delete query[key]
	}
	if (query.page === 1 || query.page === '1') delete query.page
	if (query.sort === 'default') delete query.sort

	router.push({ path: route.path, query })
}

function toggleFilter({ group, alias }: { group: string; alias: string }) {
	const current: string[] = selectedFilters.value[group] || []
	const next = current.includes(alias)
		? current.filter((a: string) => a !== alias)
		: [...current, alias]

	updateQuery({ ['filter_' + group]: next.length ? next.join(',') : undefined, page: undefined })
	mobileFiltersOpen.value = false
}

function resetFilters() {
	const query: Record<string, any> = {}
	for (const key in route.query) {
		if (!key.startsWith('filter_') && key !== 'page') query[key] = route.query[key]
	}
	if (props.filterAlias) {
		// На сторінці фільтра скидання веде на категорію
		router.push({ path: localePath(`/${props.categoryAlias}`), query })
	} else {
		router.push({ path: route.path, query })
	}
}

function changeSort(e: Event) {
	updateQuery({ sort: (e.target as HTMLSelectElement).value, page: undefined })
}
</script>

<style scoped>
.cat-layout {
	display: grid;
	grid-template-columns: 270px 1fr;
	gap: 22px;
	align-items: start;
	padding-bottom: 30px;
}

/* Режим лендінгу брендів — без сайдбара, контент на всю ширину */
.cat-layout--full {
	grid-template-columns: 1fr;
}

/* Плитки брендів + каталог брендів — відступи до блоку товарів нижче */
.cat-brand-tiles {
	margin-bottom: 24px;
}

.cat-brands {
	margin-bottom: 34px;
}

/* Колонка сайдбара тягнеться на висоту ряду — інакше sticky-панелі немає куди рухатись */
.cat-layout__sidebar {
	align-self: stretch;
}

/* Sticky-обгортка: фіксує картку фільтрів майже на верху вікна (5px «повітря» зверху).
   Шапка сайту при прокрутці не лишається прибитою (її sticky обмежений власним контейнером),
   тож відступ під неї не потрібен. Висоту й скрол тримає сама картка (.filters). */
.cat-layout__sidebar-panel {
	position: sticky;
	top: 5px;
}

.cat-head {
	display: flex;
	align-items: center;
	gap: 14px;
	flex-wrap: wrap;
	margin-bottom: 18px;
}

.cat-head__title {
	margin: 0;
	font-size: 24px;
	font-weight: 800;
	letter-spacing: -0.02em;
}

.cat-head__count {
	font-size: 13px;
	color: var(--text-muted);
}

.filter-desc {
	margin: 10px 0;
	font-size: 14px;
}

/* Контроли шапки (сортування + кнопка фільтрів). Десктоп: праворуч біля заголовка. */
.cat-head__controls {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-left: auto;
}

.cat-head__filters-btn {
	display: none; /* десктоп: фільтри живуть у сайдбарі */
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 9px 16px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	font-size: 13.5px;
	font-weight: 600;
}

.cat-head__sort {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13.5px;
}

.cat-head__sort select {
	width: auto;
	padding: 8px 34px 8px 12px;
	font-size: 13.5px;
}

.cat-sentinel {
	height: 1px;
}

.cat-empty {
	padding: 50px 20px;
	text-align: center;
}

.cat-desc {
	margin-top: 34px;
	padding-top: 22px;
	border-top: 1px solid var(--border);
	font-size: 14px;
}

.cat-layout__sidebar-backdrop {
	display: none;
}

@media (max-width: 1023px) {
	.cat-layout {
		grid-template-columns: 1fr;
	}

	.cat-head__filters-btn {
		display: inline-flex;
	}

	.cat-layout__sidebar {
		position: fixed;
		inset: 0;
		z-index: 1000;
		visibility: hidden;
		pointer-events: none;
	}

	.cat-layout__sidebar.is-open {
		visibility: visible;
		pointer-events: auto;
	}

	.cat-layout__sidebar-backdrop {
		display: block;
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.cat-layout__sidebar.is-open .cat-layout__sidebar-backdrop {
		opacity: 1;
	}

	.cat-layout__sidebar-panel {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		width: min(330px, 86vw);
		max-height: none;
		background: var(--bg-card);
		transform: translateX(-100%);
		transition: transform 0.22s ease;
		border-radius: 0;
	}

	.cat-layout__sidebar.is-open .cat-layout__sidebar-panel {
		transform: translateX(0);
	}
}

/* Компактна шапка категорії на телефонах */
@media (max-width: 640px) {
	.cat-head {
		gap: 8px;
		margin-bottom: 14px;
	}

	.cat-head__title {
		font-size: 19px;
	}

	/* Контроли — окремим рядком на всю ширину; фільтри + сортування порівну, без дірок */
	.cat-head__controls {
		flex-basis: 100%;
		margin-left: 0;
		gap: 8px;
		margin-top: 2px;
	}

	.cat-head__filters-btn,
	.cat-head__sort {
		flex: 1;
	}

	.cat-head__filters-btn {
		padding: 9px 12px;
		font-size: 13px;
	}

	.cat-head__sort select {
		width: 100%;
		padding: 9px 30px 9px 12px;
		font-size: 13px;
	}

	/* Текст «Сортировать по:» на телефоні прибираємо — лишається лише селект */
	.cat-head__sort-label {
		display: none;
	}
}
</style>
