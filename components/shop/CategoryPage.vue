<template>
	<!-- v-if на корені (як у ShopProductPage): коли категорії немає, setup кидає
	     createError({ fatal: true }) і сторінку замінює error.vue — але без цієї умови
	     Vue встигав почати рендер із неініціалізованими computed'ами setup'у й сипав
	     Vue-warn про undefined-пропси (breadcrumbs, groups, selected) на кожен 404. -->
	<div v-if="category" class="container">
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
					<span v-if="displayTotal || showNeoPrints" class="cat-head__count">
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
							<!-- aria-label дублює видиму мітку: на мобільному її текст ховається, а ім'я поля має лишатись -->
							<select
								class="form-control"
								:value="options.sort"
								:aria-label="t('category.sortBy')"
								@change="changeSort"
							>
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

				<!-- /chekhly: плитки брендів з логотипами + повний каталог бренд→серії→моделі.
				     Каталог — сотні посилань: у HTML він є повністю (SSR), а гідратується лише
				     коли доходить до екрана — інакше саме він давав найдовші задачі головного потоку -->
				<template v-if="brandsLanding">
					<ShopBrandTiles :brands="brandTiles" class="cat-brand-tiles" />
					<LazyShopBrandsCatalog hydrate-on-visible :brands="brands" class="cat-brands" />
				</template>

				<!-- Сторінка бренду: усі моделі цього бренду (той самий компонент, один бренд) -->
				<LazyShopBrandsCatalog
					v-else-if="brandTree.length"
					hydrate-on-visible
					:brands="brandTree"
					single
					class="cat-brands"
				/>

				<!-- Товари (на лендінгу /chekhly — 6 у ряд) -->
				<div v-if="pending" class="products-grid" :class="{ 'products-grid--six': brandsLanding }">
					<div v-for="i in 24" :key="i" class="skeleton skeleton--card" />
				</div>

				<template v-else-if="hasItems">
					<div v-if="products.length" class="products-grid" :class="gridModifier">
						<!-- Конструктор чохлів — перший товар (як на старому сайті) -->
						<ProductCardPrintcase v-if="showPrintcaseCard" :category="category" eager />
						<!-- Перші картки — це перший екран (на телефоні два ряди по два), і LCP — будь-яка
						     з них: фото на всю площу (alphaprint) більше за сусідні. Лениве фото тут
						     чекало розкладки й затримувало LCP на ~2 с, тож перші чотири вантажимо одразу.
						     Пріоритет і preload — лише першій, щоб не ділити канал порівну -->
						<ProductCard
							v-for="(item, i) in displayItems"
							:key="item.product.id + '-' + (item.attribute?.id || 0)"
							:product="item.product"
							:attribute="item.attribute || undefined"
							:eager="i < 4"
							:priority="i === 0 && !showPrintcaseCard"
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
							<h2>{{ t('neoprint.sectionTitle', { filter: neoprintsTitle }) }}</h2>
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

				<!-- Перелінковка: усі фільтри як crawlable посилання (для індексації одно-фасетних сторінок).
				     Посилання в HTML є одразу (SSR), гідратація — коли блок доходить до екрана -->
				<LazyShopFilterLinks
					v-if="!brandsLanding && displayTree.length"
					hydrate-on-visible
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
				<div v-if="filterArticle" class="cat-desc typography" v-html="contentHtml(filterArticle)" />
				<div v-else-if="!filterAlias && category?.description" class="cat-desc typography" v-html="contentHtml(category.description)" />
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
const { buildFilterTree, findGroupAlias, isParentTheme, expandAliasForApi, filterChildIds } = useFilters()
const { title: neoPrintTitle } = useNeoPrint()

const mobileFiltersOpen = ref(false)

// Закриваємо мобільний сайдбар при переході на іншу сторінку (клік по посиланню-фільтру)
watch(() => route.path, () => { mobileFiltersOpen.value = false })

// ---------- Параметри з URL ----------
// ?limit лишився зі старого сайту й ішов в API як є: `?limit=1000` змушував бекенд віддавати
// тисячу товарів (секунди), а SSR — рендерити тисячу карток. Будь-хто міг так класти воркери
const LIMIT_MAX = 48
const DEFAULT_LIMIT = 24

const options = computed(() => {
	const limit = Number(route.query.limit)
	return {
		page: Number(route.query.page) || 1,
		limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, LIMIT_MAX) : DEFAULT_LIMIT,
		sort: String(route.query.sort || 'default'),
	}
})

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
const [{ data: category, error: categoryError }, { data: filtersTree }, { data: brandsData }, { data: brandTilesData }] = await Promise.all([
	useAsyncData('cat-' + keySuffix.value, async () => (await shopApi.getCategoryByAlias(props.categoryAlias)) ?? false),
	useAsyncData('cat-filters-' + keySuffix.value, async () => (props.brandsLanding ? [] : shopApi.getFilters(props.categoryAlias))),
	// Повний каталог брендів (бренд → серії → моделі) — лише для лендінгу /chekhly.
	// У payload — тільки назви й адреси (menuBrands): решта полів меню каталогу не потрібна
	useAsyncData('brands-catalog-' + keySuffix.value, async () => {
		if (!props.brandsLanding) return []
		const menu = await shopApi.getMenu(100)
		const list = menuBrands(menu?.brends)
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

// Дані фільтра потрібні тільки на сторінках /filter/ (гілка стабільна для роута).
// Разом із фільтром тягнемо готові дизайни (NeoPrint) його теми — віртуальні товари,
// яких немає в products: принт із бібліотеки, надрукований на чохлі цієї моделі.
let filterPage = ref<any>(false)
let filterError = ref<any>(null)
if (props.filterAlias) {
	const { data, error } = await useAsyncData('cat-filter-page-' + keySuffix.value, async () => {
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
	filterError = error
}

// API не відповів — 503, а не 404: сторінка жива, недоступні саме дані.
// 404 тут Google читає як «сторінки більше немає» — див. throwIfApiDown.
throwIfApiDown(categoryError.value, 'Category')

// Категорію не знайдено — 404
if (!category.value) {
	throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}

// Те саме для фільтра, і тут ціна помилки ще вища: нижче стоїть ПОСТІЙНИЙ 301,
// тобто одна аварія API навчила б Google, що сторінки фільтрів більше не існує.
throwIfApiDown(filterError.value, 'Filter')

// Сторінка фільтра: фільтр не знайдено — редірект на категорію
if (props.filterAlias && !filterPage.value) {
	await navigateTo(url.category(props.categoryAlias), { redirectCode: 301 })
} else if (!props.brandsLanding) {
	// Адреса — рівно та, що в БД. Пошук в API не зважає на регістр, тож /IPHONE-17-PRO-MAX
	// і /…/filter/ANIME віддавали повну сторінку з ВЛАСНИМ canonical — дублі в індексі.
	// Легітимні alias із великими літерами (zte-blade-a53-Pro, Gucci) збігаються точно й не
	// чіпаються. Лендінг /chekhly має окрему сторінку — його не перенаправляємо
	const isAlias = (v: unknown): v is string => typeof v === 'string' && v !== ''
	const dbCategory = category.value.alias
	const dbFilter = props.filterAlias ? filterPage.value?.alias : undefined

	const wrongCategory = isAlias(dbCategory) && dbCategory !== props.categoryAlias
	const wrongFilter = isAlias(dbFilter) && dbFilter !== props.filterAlias

	if (isAlias(dbCategory) && (wrongCategory || wrongFilter)) {
		await navigateTo(
			{ path: url.category(dbCategory, isAlias(dbFilter) ? dbFilter : props.filterAlias), query: route.query },
			{ redirectCode: 301 }
		)
	}
}

// Три форми назви (повна / кирилиця / без бренду) — розподіл по блоках описаний у composable
const names = useCatNames(category)
const catName = computed(() => names.value.full)
const catAlt = computed(() => names.value.alt)

// Сторінка бренду: тягнемо його серії+моделі для блоку каталогу зверху (як на /chekhly, але один бренд)
let brandSeriesData = ref<any[]>([])
if (!props.brandsLanding && !props.filterAlias && category.value && category.value.type === 'brend') {
	const { data } = await useAsyncData('brand-series-' + keySuffix.value, async () =>
		menuSeries(await shopApi.getMenuBrend(props.categoryAlias))
	)
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

// Тематичні фільтри (Аніме, Авто, Брендові…) — це теми ПРИНТІВ на чохлах: доречні на
// моделях/брендах/серіях. У розділах аксесуарів (type=category: павербанки, навушники…)
// вони нелогічні — API віддає їх лише тому, що count включає готові дизайни.
const hideThemes = computed(() => category.value?.type === 'category')

// Дерево фільтрів для сайдбара (синтетичні групи Категорія/Форм-фактор/Матеріал + теми).
// Тема поточної сторінки /filter/ лишається навіть у розділі — інакше на ній зникає і
// підсвітка «ви тут», і навігація по її підтемах.
const displayTree = computed(() => {
	const tree = buildFilterTree(filtersTree.value || [])
	if (!hideThemes.value) return tree

	const active = props.filterAlias
	return tree.filter(
		(g) =>
			g.type !== 'theme' ||
			(!!active && (g.alias === active || !!g.items?.some((i) => i.alias === active)))
	)
})

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

// Сторінка за межами списку (?page=999) віддавала 200 з порожньою сіткою й власним canonical —
// soft-404, який Google індексує як окрему порожню сторінку. Лише коли API відповів (є meta):
// збій API тут не повинен ставати 404
{
	const apiLastPage = Number(productsData.value?.meta?.last_page)
	if (apiLastPage > 0 && options.value.page > apiLastPage) {
		throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
	}
}

const products = computed(() => productsData.value?.data || [])
const total = computed(() => productsData.value?.meta?.total || 0)
const currentPage = computed(() => productsData.value?.meta?.current_page || 1)
const lastPage = computed(() => productsData.value?.meta?.last_page || 1)

// Картка конструктора: тільки для моделей з увімкненим printcase, на першій сторінці
// і не на сторінці фільтра. Модель, зняту з друку (not_available), у конструктор не ведемо —
// там нічого замовити (на pre_order лишаємо: чохол зроблять під передзамовлення).
const showPrintcaseCard = computed(
	() =>
		category.value?.type === 'model' &&
		!!category.value?.printcase &&
		printStockState(category.value) !== 'out' &&
		currentPage.value === 1 &&
		!props.filterAlias
)

// ---------- Готові дизайни (NeoPrint) ----------
// Дизайни показуємо для тем, відмічених у сайдбарі, — і для теми сторінки /filter/, і для
// галочок ?filter_*. Галочка не змінює роут, тож SSR-фетч filterPage про неї не знає:
// такі теми довантажуємо окремим watch-запитом.
const selectedThemes = computed(() => selectedThemeNodes(filtersTree.value || [], selectedForSidebar.value))
const themesKey = computed(() => selectedThemes.value.map((n) => n.id).join(','))

// Сама лише тема сторінки /filter/ — її дизайни вже прийшли разом із filterPage,
// повторний запит не потрібен
const fromSelectedThemes = computed(() => {
	const themes = selectedThemes.value
	return themes.length > 0 && !(themes.length === 1 && themes[0].alias === props.filterAlias)
})

const { data: selectedThemeNeoprints } = await useAsyncData(
	'cat-theme-neoprints-' + keySuffix.value,
	async () => {
		if (!fromSelectedThemes.value || !category.value?.printcase) return []
		const batches = await Promise.all(selectedThemes.value.map((n) => shopApi.getNeoPrints(n.id!)))
		return interleave(batches).slice(0, NEOPRINT_MAX)
	},
	{ watch: [themesKey] }
)

const neoprints = computed<INeoPrint[]>(() =>
	fromSelectedThemes.value ? selectedThemeNeoprints.value || [] : filterPage.value?.neoprints || []
)

// Назва теми (чи перелік тем) у заголовку секції — рівно ті, чиї дизайни показуємо
const neoprintsTitle = computed(() =>
	fromSelectedThemes.value
		? selectedThemes.value.map((n) => n.title).join(', ')
		: filterPage.value?.title || ''
)

// Окремою секцією під товарами і лише на 1-й сторінці — інакше той самий перелік
// дублювався б на пагінації. Комбінації ?filter_* канонікалізуються на базову категорію,
// тож окремим дублем в індексі вони не стають.
const showNeoPrints = computed(() => neoprints.value.length > 0 && currentPage.value === 1)

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
// Скидаємо показ при зміні набору тем (перехід на іншу тему або нова галочка)
watch([() => props.filterAlias, themesKey], () => { neoprintsShown.value = NEOPRINT_STEP })

// Лічильник у шапці. meta.total рахує ТОВАРИ (1), а в сітці кожен атрибут — окрема картка
// (5) плюс дизайни (20). Бекенд у count фільтра рахує рівно те, що ми показуємо
// (варіанти + дизайни = 26) — і це ж число стоїть у сайдбарі. Тому беремо його і на
// сторінці /filter/, і коли тема вибрана однією галочкою. Для комбінацій кількох фільтрів
// count не підходить (він не враховує сусідні фільтри) — там лишається meta.total.
const filterCount = computed(() => {
	// Сторінка /filter/ без галочок — count самого фільтра (він знає і про тему-батька)
	if (!hasFilterQuery.value) return props.filterAlias ? Number(filterPage.value?.count) || 0 : 0

	// Відмічена рівно одна тема і більше нічого — беремо її count прямо з сайдбара
	const checked = Object.values(selectedForSidebar.value).flat()
	return checked.length === 1 && selectedThemes.value.length === 1
		? Number(selectedThemes.value[0].count) || 0
		: 0
})

const displayTotal = computed(() => filterCount.value || total.value)

// Скільки з лічильника — реальні варіанти товарів (решта — готові дизайни).
// Для count фільтра сума лишається тією ж (те саме число, що й у сайдбарі), а meta.total
// дизайнів узагалі не рахує — там віднімати нічого.
const productsCount = computed(() =>
	filterCount.value ? Math.max(0, filterCount.value - neoprints.value.length) : total.value
)

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

// Прев'ю для соцмереж: перша картка сітки — те саме, що людина бачить, відкривши сторінку.
// Дизайн теми беремо, коли товарів немає (сторінка теми з одними готовими принтами).
// Фолбек на брендований og-default робить usePageSeo.
//
// productSeoImage одразу віддає абсолютну адресу, а neoprintImage — шлях на нашому домені,
// тож абсолютним його робимо лише в другому випадку.
const shareImage = computed(() => {
	const first = products.value[0]
	if (first) return url.productSeoImage(getImageByAttribute(first, 0) ?? first.image_file, 'og', first)

	const np = neoprints.value[0]
	return np ? url.absolute(url.neoprintImage(props.categoryAlias, np.alias)) : undefined
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
	image: () => shareImage.value,
	// Мультивибір-комбінації (?filter_*) не індексуємо окремо — canonical веде на базову
	// категорію. Саме canonical, БЕЗ noindex: пара «noindex + canonical на іншу адресу»
	// небезпечна — Google може перенести noindex на канонічну сторінку і викинути з
	// індексу саму категорію.
})

// Друга назва списку кирилицею («Чохли для Айфон 17») — підказка пошуковикам/AI, що
// сторінка відповідає й на транслітерований запит. Лише там, де форми реально різні.
const listAltName = computed(() =>
	catAlt.value && !props.filterAlias ? { alternateName: t('pageTitle.model', { title_full: catAlt.value }) } : {}
)

// Позиції списку для JSON-LD — дзеркало видимої сітки: на сторінці фільтра це картки-варіанти
// з URL /attr/, далі — готові дизайни. Стеля 24 = рівно одна сторінка видачі.
//
// Лише назва + URL, без Product: товарні сніпети Google дає тільки сторінкам ОДНОГО товару
// (ціна, наявність, рейтинг — у розмітці самих карток), а повні Product у списках плодили
// в Search Console тисячі «товарів» без опису й бренду.
//
// URL будуємо через url.product/url.neoprint: вони проходять через localePath, тож на /uk
// список веде на укр-версії, у згоді з canonical і hreflang тієї ж сторінки.
const LIST_MAX = 24

const listedItems = computed<{ name: string; url: string }[]>(() => {
	const cards: { product: any; attribute: any | null }[] = splitByAttributes.value
		? expandProductsByAttributes(products.value)
		: products.value.map((p: any) => ({ product: p, attribute: null }))

	const fromProducts = cards.slice(0, LIST_MAX).map(({ product: p, attribute: a }) => ({
		name: a ? `${p.title} (${a.title})` : p.title,
		url: url.absolute(url.product(p, a?.alias)),
	}))

	// Скільки дизайнів ще влізе у стелю списку — решту навіть не обходимо
	const neoprintsRoom = Math.max(0, LIST_MAX - fromProducts.length)

	const fromNeoprints = showNeoPrints.value
		? neoprints.value.slice(0, neoprintsRoom).map((np: INeoPrint) => ({
				name: neoPrintTitle(np, category.value),
				url: url.absolute(url.neoprint(props.categoryAlias, np.id)),
			}))
		: []

	return [...fromProducts, ...fromNeoprints]
})

useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'ItemList',
	name: pageTitle.value,
	...listAltName.value,
	numberOfItems: listedItems.value.length,
	itemListElement: listedItems.value.map((it, i: number) => ({
		'@type': 'ListItem',
		position: (currentPage.value - 1) * options.value.limit + i + 1,
		...it,
	})),
}))

// JSON-LD: хлібні крихти (Категорія → Фільтр) для розуміння структури пошуковиками/AI
useBreadcrumbsJsonLd(breadcrumbs)

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

	/* Контроли — окремим рядком на всю ширину. Grid з рівних колонок замість flex:
	   minmax(0, 1fr) не залежить від вмісту (іконка + «Фільтри» проти вузького селекта),
	   тож половини завжди однакові. grid-auto-flow: column — щоб на лендінгу брендів,
	   де кнопки фільтрів немає, селект зайняв усю ширину без дірки. */
	.cat-head__controls {
		flex-basis: 100%;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		margin-left: 0;
		margin-top: 2px;
		gap: 14px; /* той самий gap, що й у .products-grid (на телефоні — 10px, нижче) */
	}

	.cat-head__filters-btn,
	.cat-head__sort {
		min-width: 0;
		height: 40px;
	}

	.cat-head__filters-btn {
		padding: 0 12px;
	}

	.cat-head__sort select {
		width: 100%;
		height: 40px;
		padding: 0 30px 0 12px;
	}

	/* Текст «Сортувати за:» прибираємо — лишається лише селект на всю свою половину */
	.cat-head__sort-label {
		display: none;
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

/* З цієї ж межі .products-grid стає 2 колонки з gap 10px — контроли мають
   лягати рівно на ті самі колонки, тож gap беремо той самий. */
@media (max-width: 760px) {
	.cat-head__controls {
		gap: 10px;
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

	/* Ширини контролів вирівняні вище (≤1023px), тут лише дрібніший текст */
	.cat-head__filters-btn,
	.cat-head__sort select {
		font-size: 13px;
	}
}
</style>
