<template>
	<div class="container">
		<Breadcrumbs :items="breadcrumbs" />

		<div class="cat-layout" :class="{ 'cat-layout--full': brandsLanding }">
			<!-- Сайдбар фільтрів (ховаємо в режимі лендінгу брендів) -->
			<div v-if="!brandsLanding" class="cat-layout__sidebar" :class="{ 'is-open': mobileFiltersOpen }">
				<div class="cat-layout__sidebar-backdrop" @click="mobileFiltersOpen = false" />
				<div class="cat-layout__sidebar-panel">
					<ShopFiltersSidebar
						:groups="displayTree"
						:selected="selectedForSidebar"
						:category-alias="categoryAlias"
						:active-alias="filterAlias"
						@toggle="toggleFilter"
						@reset="resetFilters"
					/>
				</div>
			</div>

			<!-- Контент -->
			<div class="cat-layout__content">
				<header class="cat-head">
					<h1 class="cat-head__title">{{ pageTitle }}</h1>
					<span v-if="displayTotal" class="cat-head__count">
						<template v-if="showNeoPrints">
							<template v-if="productsCount > 0">{{ productsCount }} {{ t('category.products') }} + </template>
							<a class="cat-head__count-designs" href="#cat-neoprints" @click.prevent="scrollToNeoprints">
								{{ neoprints.length }} {{ t('neoprint.countWord') }}
								<AppIcon name="chevron-down" :size="12" />
							</a>
						</template>
						<template v-else>{{ displayTotal }} {{ t('category.products') }}</template>
					</span>

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

				<!-- Короткий унікальний лід: на сторінці моделі — завжди, на фільтрі — фолбек,
				     коли у нього ще немає власної статті -->
				<p v-if="pageLead" class="filter-desc">{{ pageLead }}</p>

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

				<template v-else-if="hasItems">
					<div v-if="products.length" class="products-grid" :class="gridModifier">
						<!-- Конструктор чохлів — перший товар (як на старому сайті) -->
						<ProductCardPrintcase v-if="showPrintcaseCard" :category="category" />
						<ProductCard
							v-for="item in displayItems"
							:key="item.product.id + '-' + (item.attribute?.id || 0)"
							:product="item.product"
							:attribute="item.attribute || undefined"
						/>

						<!-- Місток у порожній «хвіст» останнього ряду: заповнює пустку і веде вниз
						     до готових дизайнів. Лише на одній сторінці (у flow це місце — контроли). -->
						<a
							v-if="showNeoPrints && lastPage <= 1"
							class="cat-bridge"
							href="#cat-neoprints"
							@click.prevent="scrollToNeoprints"
						>
							<span class="cat-bridge__inner">
								<span class="cat-bridge__title">{{ t('neoprint.bridgeTitle', { count: neoprints.length }) }}</span>
								<span class="cat-bridge__note">{{ t('neoprint.bridgeNote') }}</span>
								<AppIcon name="arrow-down" :size="34" class="cat-bridge__arrow" />
							</span>
						</a>

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

					<!-- Готові дизайни теми: друкуємо будь-який принт із бібліотеки на цю модель.
					     Товару в БД немає — картка веде на /neoprint/{модель}/{дизайн}. -->
					<section v-if="showNeoPrints" id="cat-neoprints" class="cat-neoprints">
						<div class="section-title">
							<h2>{{ t('neoprint.sectionTitle', { filter: filterPage.title }) }}</h2>
						</div>

						<p class="cat-neoprints__note text-muted">
							{{ t('neoprint.sectionNote', { model: names.short_, count: neoprints.length }) }}
						</p>

						<div class="products-grid products-grid--left">
							<NeoPrintCard
								v-for="np in visibleNeoprints"
								:key="np.id"
								:neoprint="np"
								:category="category"
							/>
						</div>

						<div v-if="hasMoreNeoprints" class="cat-neoprints__more">
							<button class="btn btn-outline" @click="showMoreNeoprints">
								{{ t('neoprint.showMore') }}
							</button>
						</div>
					</section>
				</template>

				<div v-else class="cat-empty">
					<p><b>{{ t('category.noMatchingProducts') }}</b></p>
					<p class="text-muted">{{ t('category.tryResettingFilters') }}</p>
					<button class="btn btn-outline" @click="resetFilters">{{ t('filters.rezetFilters') }}</button>
				</div>

				<!-- Перелінковка: усі фільтри як crawlable посилання (для індексації одно-фасетних сторінок) -->
				<ShopFilterLinks
					v-if="!brandsLanding && displayTree.length"
					:groups="displayTree"
					:category-alias="categoryAlias"
					:active-alias="filterAlias"
				/>

				<!-- FAQ + таблиця цін (як на старому сайті): унікальний SSR-контент з реальних
				     даних сторінки + FAQPage JSON-LD. Лише 1-ша сторінка моделі/фільтра. -->
				<template v-if="showSeoBlocks">
					<ShopFilterFaq
						v-if="filterAlias"
						:category="category"
						:category-alias="categoryAlias"
						:filter-page="filterPage"
						:items="pageItems"
						:total="total"
					/>
					<ShopCategoryFaq v-else :category="category" :products="products" />
					<ShopPriceTable :title="pricesTitle" :rows="priceRows" />
				</template>

				<!-- Відгуки: на сторінці моделі — відгуки моделі + усіх її товарів;
				     на сторінці фільтра — відгуки товарів, що підпадають під фільтр (агрегує бекенд). -->
				<ShopReviewsBlock
					v-if="showReviews"
					:reviews="reviewsList"
					type="category"
					:target-id="category.id"
					:title="t('reviews.aboutTitle', { title: names.short_ })"
					class="cat-reviews"
				/>

				<!-- SEO-стаття низом: на сторінці фільтра — стаття фільтра (специфічна або шаблон
				     фільтра з підставленою моделлю); на сторінці моделі/категорії — стаття моделі.
				     Повну статтю моделі на сторінках фільтрів не дублюємо (там стаття фільтра або лід вище). -->
				<div v-if="filterArticle" class="cat-desc typography" v-html="filterArticle" />
				<div v-else-if="!filterAlias && category?.description" class="cat-desc typography" v-html="category.description" />
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
const { buildFilterTree, findGroupAlias, isParentTheme, expandAliasForApi, filterChildIds } = useFilters()
const { title: neoPrintTitle } = useNeoPrint()

const mobileFiltersOpen = ref(false)

// Закриваємо мобільний сайдбар при переході на іншу сторінку (клік по посиланню-фільтру)
watch(() => route.path, () => { mobileFiltersOpen.value = false })

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

// Стеля кількості дизайнів для теми-батька — щоб SSR-payload не роздувався.
// Понад це — користувач іде глибше в конкретну підтему (у кожної свій повний список).
const NEOPRINT_MAX = 240

// Перемежовуємо списки дизайнів підтем по колу — щоб перша сторінка показувала різні
// бренди (BMW, Mercedes…), а не 24 однакових поспіль.
function interleave<T>(lists: T[][]): T[] {
	const out: T[] = []
	const longest = Math.max(0, ...lists.map((l) => l.length))
	for (let i = 0; i < longest; i++) {
		for (const list of lists) if (i < list.length) out.push(list[i])
	}
	return out
}

// Дані фільтра потрібні тільки на сторінках /filter/ (гілка стабільна для роута).
// Разом із фільтром тягнемо готові дизайни (NeoPrint) його теми — віртуальні товари,
// яких немає в products: принт із бібліотеки, надрукований на чохлі цієї моделі.
let filterPage = ref<any>(false)
if (props.filterAlias) {
	const { data } = await useAsyncData('cat-filter-page-' + keySuffix.value, async () => {
		const filter = await shopApi.getFilterByAlias(props.categoryAlias, props.filterAlias!)
		if (!filter) return false

		// Дизайни живуть на темах і лише там, де модель підтримує друк (є маска).
		// Тема-батько (напр. «Машини») власних дизайнів не має — збираємо їх з усіх підтем
		// (BMW, Mercedes…), перемежовуючи, щоб перша сторінка показувала різні бренди.
		let neoprints: INeoPrint[] = []
		if (category.value?.printcase) {
			const childIds = filterChildIds(filtersTree.value || [], props.filterAlias!)
			if (childIds.length) {
				const batches = await Promise.all(childIds.map((cid) => shopApi.getNeoPrints(cid)))
				neoprints = interleave(batches).slice(0, NEOPRINT_MAX)
			} else if (filter.type === 'theme') {
				neoprints = await shopApi.getNeoPrints(filter.id)
			}
		}

		return { ...filter, neoprints }
	})
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

// Три форми назви (повна / кирилиця / без бренду) — розподіл по блоках описаний у composable
const names = useCatNames(category)
const catName = computed(() => names.value.full)
const catAlt = computed(() => names.value.alt)

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
		title: catName.value,
		url: props.categoryAlias,
		image_file: category.value?.image_file,
		children: series,
	}]
})

// Дерево фільтрів для сайдбара (синтетичні групи Категорія/Форм-фактор/Матеріал + теми)
const displayTree = computed(() => buildFilterTree(filtersTree.value || []))

// Вибрані фільтри для сайдбара: query-вибір + активний фільтр сторінки (крім теми-батька,
// у якої немає власного пункту — її підсвічуємо через activeAlias у заголовку).
const selectedForSidebar = computed<Record<string, string[]>>(() => {
	const base: Record<string, string[]> = {}
	for (const k in selectedFilters.value) base[k] = [...selectedFilters.value[k]]

	if (props.filterAlias && !isParentTheme(filtersTree.value || [], props.filterAlias)) {
		const g = findGroupAlias(filtersTree.value || [], props.filterAlias)
		const arr = base[g] || (base[g] = [])
		if (!arr.includes(props.filterAlias)) arr.push(props.filterAlias)
	}
	return base
})

// Фільтри для API: query-фільтри + фільтр сторінки.
// Тема-батько розкривається в перелік дітей (агрегація товарів усіх підкатегорій).
const apiFilters = computed<Record<string, string>>(() => {
	const result: Record<string, string> = {}

	for (const [group, aliases] of Object.entries(selectedFilters.value) as [string, string[]][]) {
		result[group] = aliases.join(',')
	}

	if (props.filterAlias) {
		const { groupKey, value } = expandAliasForApi(filtersTree.value || [], props.filterAlias)
		const existing = result[groupKey] ? result[groupKey].split(',') : []
		for (const v of value.split(',')) if (!existing.includes(v)) existing.push(v)
		result[groupKey] = existing.join(',')
	}

	result.category = props.categoryAlias
	return result
})

// Наявність мультивибору в URL (?filter_*) — такі комбінації не індексуємо (canonical → база)
const hasFilterQuery = computed(() =>
	Object.keys(route.query).some((k) => k.startsWith('filter_'))
)

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

// ---------- Готові дизайни (NeoPrint) ----------
const neoprints = computed<INeoPrint[]>(() => filterPage.value?.neoprints || [])

// Окремою секцією під товарами і лише на «чистій» 1-й сторінці теми — інакше той самий
// перелік дублювався б на пагінації та на комбінаціях ?filter_*
const showNeoPrints = computed(
	() => neoprints.value.length > 0 && currentPage.value === 1 && !hasFilterQuery.value
)

// Дизайни: до 48 показуємо всі одразу (як на листкових темах, напр. BMW). Більше — теми-батьки
// з підтемами — вантажимо порціями по 24 («показати ще»), щоб не роздувати SSR-HTML.
const NEOPRINT_STEP = 24
const NEOPRINT_ALL_UP_TO = 48
const neoprintsShown = ref(NEOPRINT_STEP)
const paginateNeoprints = computed(() => neoprints.value.length > NEOPRINT_ALL_UP_TO)
const visibleNeoprints = computed(() =>
	paginateNeoprints.value ? neoprints.value.slice(0, neoprintsShown.value) : neoprints.value
)
const hasMoreNeoprints = computed(() => paginateNeoprints.value && neoprintsShown.value < neoprints.value.length)
function showMoreNeoprints() {
	neoprintsShown.value = Math.min(neoprintsShown.value + NEOPRINT_STEP, neoprints.value.length)
}
// Скидаємо показ при переході на іншу тему
watch(() => props.filterAlias, () => { neoprintsShown.value = NEOPRINT_STEP })

// Лічильник у шапці. На сторінці фільтра meta.total рахує ТОВАРИ (1), а в сітці кожен
// атрибут — окрема картка (5) плюс дизайни (41). Бекенд у count фільтра рахує рівно те,
// що ми показуємо (варіанти + дизайни = 46) — і це ж число стоїть у сайдбарі.
// Для комбінацій ?filter_* count не підходить: він не враховує додаткові фільтри.
const displayTotal = computed(() =>
	props.filterAlias && !hasFilterQuery.value && filterPage.value?.count
		? filterPage.value.count
		: total.value
)

// Скільки з displayTotal — реальні варіанти товарів (решта — готові дизайни).
// Сума лишається = count фільтра (те саме число, що й у сайдбарі).
const productsCount = computed(() => Math.max(0, displayTotal.value - neoprints.value.length))

// Порожньо — лише коли немає ні товарів, ні дизайнів
const hasItems = computed(() => products.value.length > 0 || showNeoPrints.value)

// SEO-блоки FAQ/цін: модельні сторінки та сторінки /filter/, лише 1-ша сторінка і без
// мультивибору ?filter_* — інакше той самий текст дублювався б на URL пагінації/комбінацій
const showSeoBlocks = computed(
	() =>
		category.value?.type === 'model' &&
		!hasFilterQuery.value &&
		currentPage.value === 1 &&
		products.value.length > 0
)

// Відгуки: сторінки моделі та її фільтрів (відгуки прив'язані до категорії).
// Лише 1-ша сторінка без ?filter_* — щоб той самий текст не дублювався на URL пагінації/комбінацій.
const showReviews = computed(
	() =>
		!props.brandsLanding &&
		(category.value?.type === 'model' || !!props.filterAlias) &&
		!hasFilterQuery.value &&
		currentPage.value === 1
)

// Джерело відгуків: сторінка фільтра — відгуки товарів фільтра, інакше — відгуки моделі (+ її товарів)
const reviewsList = computed(() =>
	props.filterAlias ? filterPage.value?.reviews || [] : category.value?.reviews || []
)

// Розгорнуті картки «товар + атрибут» 1-ї сторінки — для FAQ/таблиці цін сторінки фільтра
// (стабільні дані: не залежать від «Показати ще»)
const pageItems = computed<{ product: any; attribute: any | null }[]>(() =>
	props.filterAlias ? expandProductsByAttributes(products.value) : []
)

// Заголовок таблиці цін: модель / фільтр / тема-принт
const pricesTitle = computed(() => {
	const params = {
		filter: filterPage.value?.title,
		category_title: catName.value,
	}
	if (!props.filterAlias) return t('faq.prices.title', params)
	return t(filterPage.value?.type === 'theme' ? 'faq.prices.titleTheme' : 'faq.prices.titleFilter', params)
})

// Рядки таблиці цін: на сторінці фільтра — варіанти «Товар (Атрибут)» з URL /attr/
// (довгохвостові анкори), на сторінці моделі — топ-10 товарів
const priceRows = computed(() => {
	if (props.filterAlias) {
		return pageItems.value
			.filter(({ product }) => product.price)
			.slice(0, 10)
			.map(({ product, attribute }) => ({
				id: `${product.id}-${attribute?.id || 0}`,
				title: attribute ? `${product.title} (${attribute.title})` : product.title,
				to: url.product(product, attribute?.alias),
				price: product.price,
			}))
	}
	return products.value
		.filter((p: any) => p.price)
		.slice(0, 10)
		.map((p: any) => ({ id: p.id, title: p.title, to: url.product(p), price: p.price }))
})

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

// Активний фільтр (/filter/ або вибір у сайдбарі ?filter_*): розбиваємо товар на окрему
// картку під кожен атрибут — колір/принт/дизайн (як на старому сайті). Кожна картка має
// власний URL /attr/{alias}, назву «Товар (Атрибут)» і фото варіанта — пошуковики
// індексують довгохвостові запити («чохол книжка … чорний») через унікальні анкори.
const splitByAttributes = computed(() => !!props.filterAlias || hasFilterQuery.value)

const displayItems = computed<{ product: any; attribute: any | null }[]>(() =>
	splitByAttributes.value
		? expandProductsByAttributes(displayProducts.value)
		: displayProducts.value.map((p: any) => ({ product: p, attribute: null }))
)

// Лендінг — 6 у ряд; багатосторінкова — flow (товари зліва + блок контролів у вільний простір
// справа від останнього товару); одна сторінка (контролів нема) — вирівнюємо неповний хвіст зліва.
const gridModifier = computed(() =>
	props.brandsLanding
		? 'products-grid--six'
		: lastPage.value > 1
			? 'products-grid--flow'
			: 'products-grid--left'
)

// Посилання на сторінку для пагінації (дзеркалить updateQuery: page=1 прибираємо)
function pageLink(page: number) {
	const query: Record<string, any> = { ...route.query }
	if (page > 1) query.page = String(page)
	else delete query.page
	return { path: route.path, query }
}

// ---------- Заголовки та SEO ----------
// Унікальний H1/title сторінки фільтра за типом (тема → «Чохли з тематикою…», інші → «{filter} на {cat}»)
const filterHeading = computed(() => {
	if (!filterPage.value) return ''
	const key = filterPage.value.type === 'theme' ? 'pageTitle.filters.theme' : 'pageTitle.filters.main'
	return t(key, { filter: filterPage.value.title, category: catName.value })
})

// H1 категорії без фільтра — шаблон за типом сутності (як на старому сайті):
// модель → «Чохли для iPhone 17», бренд → «Чохли для телефонів Apple та … на Айфон»,
// решта (розділ, серія, техніка) → власна назва. Назву, що вже містить «чохли»
// (розділ /chekhly, категорії аксесуарів), у шаблон не загортаємо — щоб не дублювати слово.
const catHeading = computed(() => {
	const name = catName.value
	if (!name || /чохл|чехл/i.test(name)) return name

	const type = category.value?.type
	if (type === 'model') return t('pageTitle.model', { title_full: name })

	if (type === 'brend') {
		// Кирилична назва бренду («Айфон») — другий ключ у заголовку; якщо її немає,
		// падаємо на коротку форму, щоб не отримати «Samsung … на Samsung».
		const alt = category.value?.title_rus
		return alt && alt !== name
			? t('pageTitle.brend', { title_full: name, title_rus: alt })
			: t('pageTitle.model', { title_full: name })
	}

	return name
})

const pageTitle = computed(() => (filterPage.value ? filterHeading.value : catHeading.value))

// Стаття сторінки фільтра. Бекенд уже віддає «специфічна (filters_expands) ⟶ інакше
// шаблон фільтра (filters)» одним полем description — тут лише підставляємо модель
// (#model#/#model_uk#/#model_ru#/#brend#), як у готових дизайнах (fillModelPlaceholders).
const filterArticle = computed(() =>
	props.filterAlias ? fillModelPlaceholders(filterPage.value?.description, category.value) : ''
)

// Короткий унікальний текст сторінки фільтра (модель + фільтр + кількість). Plain-text:
// завжди йде у meta description, а як видимий лід — лише коли у фільтра ще немає власної статті.
const filterLeadText = computed(() =>
	props.filterAlias
		? t(filterPage.value?.type === 'theme' ? 'filterLead.theme' : 'filterLead.main', {
				filter: filterPage.value?.title,
				category_title: catName.value,
				count: displayTotal.value,
			})
		: ''
)

// Видимий лід — лише як фолбек, коли повної статті фільтра немає (щоб не дублювати статтю моделі)
const filterLead = computed(() => (filterArticle.value ? '' : filterLeadText.value))

// Мінімальна ціна серед завантажених товарів — «ціни від» у ліді (той самий підхід,
// що й у діапазоні цін FAQ: рахуємо з даних сторінки, без зайвих запитів)
const minPrice = computed(() => {
	const prices = products.value.map((p: any) => p.price).filter(Boolean)
	return prices.length ? Math.min(...prices) : 0
})

// Лід сторінки моделі: коротке SSR-речення з живими даними (кількість, ціна від) і
// кириличною назвою — унікальний текст для кожної моделі + фолбек meta description,
// коли опис у адмінці не заповнений.
const modelLeadText = computed(() => {
	// Без цін фраза «ціни від» була б порожньою — тоді ліду просто немає
	if (category.value?.type !== 'model' || props.filterAlias || !minPrice.value) return ''
	return t(catAlt.value ? 'modelLead.alt' : 'modelLead.main', {
		model: catName.value,
		model_alt: catAlt.value,
		count: displayTotal.value,
		price: formatPrice(minPrice.value),
	})
})

// Видимий лід сторінки: фільтр → лід фільтра, модель → лід моделі (там само, де решта
// SEO-блоків: 1-ша сторінка без ?filter_*, щоб не дублювати текст на пагінації)
const pageLead = computed(() => (props.filterAlias ? filterLead.value : showSeoBlocks.value ? modelLeadText.value : ''))

const breadcrumbs = computed(() => {
	const crumbs: { title: string; url?: string }[] = []

	// Бренд уже окремою крихтою — модель поруч даємо без нього («Samsung / Galaxy S25 Ultra»,
	// а не «Samsung / Samsung Galaxy S25 Ultra»)
	const hasBrandCrumb = !!category.value?.brend && category.value.brend.alias !== props.categoryAlias
	if (hasBrandCrumb) {
		crumbs.push({ title: category.value.brend.title, url: url.category(category.value.brend.alias) })
	}

	crumbs.push({
		title: hasBrandCrumb ? names.value.short_ : catName.value,
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
			? filterHeading.value
			: category.value?.meta_title || pageTitle.value,
	description: () =>
		filterPage.value
			? filterLeadText.value
			: category.value?.meta_description || modelLeadText.value,
	// Мультивибір-комбінації (?filter_*) не індексуємо — canonical веде на базову категорію
	noindex: () => hasFilterQuery.value,
})

// Готові дизайни для ItemList — перші 48 (стабільно для SSR; далі — «показати ще» на клієнті)
const neoPrintListItems = computed(() =>
	showNeoPrints.value
		? neoprints.value.slice(0, 48).map((np: INeoPrint) => ({
				name: neoPrintTitle(np, category.value),
				url: url.absolute(url.neoprint(props.categoryAlias, np.id)),
			}))
		: []
)

// Друга назва списку кирилицею («Чохли для Айфон 17») — підказка пошуковикам/AI, що
// сторінка відповідає й на транслітерований запит. Лише там, де форми реально різні.
const listAltName = computed(() =>
	catAlt.value && !props.filterAlias ? { alternateName: t('pageTitle.model', { title_full: catAlt.value }) } : {}
)

// JSON-LD: список товарів. На сторінці фільтра — картки-варіанти з URL /attr/
// (дзеркалить видимий список); позиції — у межах поточної сторінки.
useJsonLd(() => {
	if (splitByAttributes.value) {
		const items = expandProductsByAttributes(products.value)
		const listed = [
			...items.slice(0, 48).map(({ product: p, attribute: a }) => ({
				name: a ? `${p.title} (${a.title})` : p.title,
				url: config.public.siteUrl + `/${p.alias_cat}/${p.alias}` + (a ? `/attr/${a.alias}` : ''),
			})),
			...neoPrintListItems.value,
		]

		return {
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: pageTitle.value,
			numberOfItems: listed.length,
			itemListElement: listed.map((item, i: number) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: item.name,
				url: item.url,
			})),
		}
	}

	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: pageTitle.value,
		...listAltName.value,
		numberOfItems: total.value,
		itemListElement: products.value.slice(0, 24).map((p: any, i: number) => ({
			'@type': 'ListItem',
			position: (currentPage.value - 1) * options.value.limit + i + 1,
			name: p.title,
			url: config.public.siteUrl + `/${p.alias_cat}/${p.alias}`,
		})),
	}
})

// JSON-LD: хлібні крихти (Категорія → Фільтр) для розуміння структури пошуковиками/AI
useJsonLd(() => {
	const crumbs = [{ title: 'FLOY', url: '/' }, ...breadcrumbs.value]
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((c, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.title,
			...(c.url ? { item: config.public.siteUrl + c.url } : {}),
		})),
	}
})

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

// Плавний скрол до секції готових дизайнів (клік по «+N дизайнів» у лічильнику шапки)
function scrollToNeoprints() {
	document.getElementById('cat-neoprints')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

/* Sticky-обгортка фіксує картку фільтрів під прибитою шапкою (висота шапки + 5px «повітря»).
   Висоту й скрол тримає сама картка (.filters). */
.cat-layout__sidebar-panel {
	position: sticky;
	top: calc(var(--header-stuck-h) + 5px);
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

/* Сигнал у шапці: «+N готових дизайнів» — акцентний клікабельний якір до секції нижче */
.cat-head__count-designs {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	margin-left: 4px;
	color: var(--accent);
	font-weight: 700;
}

.cat-head__count-designs:hover {
	text-decoration: underline;
}

.filter-desc {
	margin: 10px 0;
	font-size: 14px;
}

/* На телефоні лід не має відсувати товари: дрібніший шрифт і стеля у 2 рядки.
   12px — нижня межа читабельності (менше Lighthouse рахує помилкою мобільної зручності).
   Ховати лід не можна — індексація mobile-first, текст потрібен у мобільному HTML;
   тут він обрізаний лише візуально, у розмітці лишається повністю. */
@media (max-width: 640px) {
	.filter-desc {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin: 2px 0 10px;
		font-size: 12px;
		line-height: 1.4;
		color: var(--text-muted);
	}
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

/* Секція готових дизайнів — впритул під товарами (безшовне продовження сітки),
   а не окремий блок із великим відступом. scroll-margin — щоб липка шапка не
   перекривала заголовок при переході по якорю з лічильника шапки. */
.cat-neoprints {
	margin-top: 14px;
	scroll-margin-top: calc(var(--header-stuck-h) + 12px);
}

.cat-neoprints__note {
	margin: -6px 0 16px;
	font-size: 13.5px;
}

.cat-neoprints__more {
	margin-top: 20px;
	text-align: center;
}

/* Місток у «хвіст» ряду товарів: акцентна панель, що доростає рівно на ширину
   порожнечі (flex-grow), заповнює пустку і веде до секції готових дизайнів нижче.
   flex-basis дзеркалить ширину картки товару (4/3/2 колонки, gap 14/14/10). */
.cat-bridge {
	flex: 1 0 calc((100% - 3 * 14px) / 4);
	width: auto;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	overflow: hidden;
	padding: 22px 20px;
	border: 1px dashed var(--accent);
	border-radius: var(--radius);
	background: var(--accent-soft);
	color: var(--accent);
	transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.cat-bridge:hover {
	background: var(--accent);
	color: var(--on-accent);
	transform: translateY(-2px);
}

.cat-bridge__inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	max-width: 240px;
}

.cat-bridge__title {
	font-size: 16px;
	font-weight: 800;
	line-height: 1.25;
}

/* Менший інфо-рядок під заголовком (приглушений відтінок поточного кольору) */
.cat-bridge__note {
	font-size: 12.5px;
	line-height: 1.35;
	opacity: 0.7;
}

/* Велика стрілка-заклик униз — плавний «дихаючий» стрибок */
.cat-bridge__arrow {
	margin-top: 4px;
	animation: cat-bridge-bounce 1.4s ease-in-out infinite;
}

@keyframes cat-bridge-bounce {
	0%, 100% { transform: translateY(0); opacity: 0.55; }
	50% { transform: translateY(6px); opacity: 1; }
}

@media (max-width: 1180px) {
	.cat-bridge { flex-basis: calc((100% - 2 * 14px) / 3); }
}

@media (max-width: 760px) {
	.cat-bridge { flex-basis: calc((100% - 10px) / 2); }
}

@media (prefers-reduced-motion: reduce) {
	.cat-bridge__arrow {
		animation: none;
	}
}

.cat-empty {
	padding: 50px 20px;
	text-align: center;
}

.cat-reviews {
	margin-top: 34px;
	padding-top: 22px;
	border-top: 1px solid var(--border);
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

	/* Фільтри + сортування — рівно по половині ширини (basis 0, без впливу вмісту) */
	.cat-head__filters-btn,
	.cat-head__sort {
		flex: 1 1 0;
		min-width: 0;
		box-sizing: border-box;
		height: 40px;
	}

	.cat-head__filters-btn {
		padding: 0 12px;
		font-size: 13px;
	}

	.cat-head__sort select {
		width: 100%;
		height: 40px;
		padding: 0 30px 0 12px;
		font-size: 13px;
	}

	/* Текст «Сортировать по:» на телефоні прибираємо — лишається лише селект */
	.cat-head__sort-label {
		display: none;
	}
}
</style>
