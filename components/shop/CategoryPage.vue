<template>
	<!-- v-if (як у ShopProductPage): коли категорії немає, setup кидає createError({ fatal: true })
	     і сторінку замінює error.vue — але без цієї умови Vue встигав почати рендер із
	     неініціалізованими computed'ами setup'у й сипав Vue-warn про undefined-пропси
	     (breadcrumbs, groups, selected) на кожен 404.
	     Тут лише логіка сторінки; вигляд — ShopCategoryView (бренд може перекрити його своїм),
	     дані й дії він бере з useCategoryPage() — provide в кінці setup -->
	<ShopCategoryView v-if="category" />
</template>

<script setup lang="ts">
import type { IThemeDesign } from '~/composables/useThemeDesigns'
import type { IMenuSeries } from '~/composables/useCategoryPage'

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
const { title: neoPrintTitle, price: neoPrintPrice } = useNeoPrint()

// «Тип чохла» (Фірмові / З принтом) — якщо сайт його вмикає, і не на сторінці теми /filter/: теми — це
// принти, фірмових серед них немає
const withCaseFilter = useFeatures().caseFilter && !props.filterAlias

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
	useAsyncData('cat-filters-' + keySuffix.value, async () =>
		props.brandsLanding ? [] : shopApi.getFilters(props.categoryAlias, withCaseFilter)
	),
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

		// Дизайни живуть на темах і лише на моделях, на які друкуємо (canPrintOn: не бренд,
		// не павербанк). Тема-батько (напр. «Машини») власних дизайнів не має — збираємо їх з усіх
		// підтем (BMW, Mercedes…), перемежовуючи, щоб перша сторінка показувала різні бренди.
		let neoprints: INeoPrint[] = []
		if (canPrintOn(category.value)) {
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

// Інші моделі серії (features.seriesModels): серія моделі з меню її бренду. Запит іде паралельно з
// товарами (чекаємо його після них); сайт без перемикача його не робить і ключа в payload не має.
// Модель поза серіями (або збій меню) — блоку просто немає
const modelSeriesRequest =
	useFeatures().seriesModels && !props.filterAlias && category.value.type === 'model' && category.value.brend?.alias
		? useAsyncData('model-series-' + keySuffix.value, async () => {
				const series = menuSeries(await shopApi.getMenuBrend(category.value.brend.alias).catch(() => null))
				return series.find((s) => s.children.some((m: any) => m.url === props.categoryAlias)) ?? false
			})
		: null

const { data: productsData, pending: productsPending, error: productsError } = await useAsyncData(
	'cat-products-' + keySuffix.value,
	() => shopApi.getProductsList(options.value, apiFilters.value),
	{ watch: [() => route.query] }
)

// Товари не віддались — 503, а не модель без товарів: таку сторінку nginx тримав би в кеші добу, а Google
// запам'ятав би порожньою (див. throwIfApiDown). Лише перше завантаження — збій при зміні фільтра чи
// сторінки на клієнті лишає показане
throwIfApiDown(productsError.value, 'Products')

const products = computed(() => productsData.value?.data || [])
const total = computed(() => productsData.value?.meta?.total || 0)

const modelSeriesData = modelSeriesRequest ? (await modelSeriesRequest).data : ref(false)
const modelSeries = computed<IMenuSeries | null>(() => modelSeriesData.value || null)

// ---------- Режим «дизайни»: модель без товарів ----------
// Модель, на яку друкуємо, але товарів у неї немає (нова модель; на сайті лише з дизайнами —
// завжди): замість порожнього стану — усі готові дизайни сайту з такою самою пагінацією ?page=N,
// як у товарів. Лише сторінка самої моделі: на /filter/ і з ?filter_* дизайни теми показує секція
// нижче. Модель, зняту з друку (not_available), не показуємо — там нічого замовити.
// Лише коли API товарів відповів (є meta): збій не повинен підміняти товари дизайнами
const designsMode = computed(
	() =>
		canPrintOn(category.value) &&
		printStockState(category.value) !== 'out' &&
		!props.filterAlias &&
		!hasFilterQuery.value &&
		!!productsData.value?.meta &&
		total.value === 0
)

const { data: designsData, pending: designsPending, error: designsError } = await useAsyncData(
	'cat-designs-' + keySuffix.value,
	async () => (designsMode.value ? await shopApi.getDesignsPage(options.value.page, options.value.limit) : false),
	{ watch: [() => route.query] }
)

// Список дизайнів не віддався — 503, а не порожня модель (див. throwIfApiDown)
throwIfApiDown(designsError.value, 'Designs')

const designs = computed<IThemeDesign[]>(() => (designsMode.value && designsData.value ? designsData.value.data : []))
const designsTotal = computed(() => (designsMode.value && designsData.value ? designsData.value.meta.total : 0))

const pending = computed(() => productsPending.value || designsPending.value)

// Пагінація — того списку, що на сторінці (товари або дизайни)
const listMeta = computed(() => (designsMode.value ? designsData.value?.meta : productsData.value?.meta))

// Сторінка за межами списку (?page=999) віддавала 200 з порожньою сіткою й власним canonical —
// soft-404, який Google індексує як окрему порожню сторінку. Лише коли API відповів (є meta):
// збій API тут не повинен ставати 404
{
	const apiLastPage = Number(listMeta.value?.last_page)
	if (apiLastPage > 0 && options.value.page > apiLastPage) {
		throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
	}
}

const currentPage = computed(() => listMeta.value?.current_page || 1)
const lastPage = computed(() => listMeta.value?.last_page || 1)

// Сторінка фільтра без жодного товару й дизайну — порожня сторінка 200 (soft-404). Такими
// стали теми на брендах і розділах аксесуарів, коли дизайни почали показуватись лише на
// моделях (canPrintOn) — а Google їх уже знає. Ведемо на саму категорію. Лише 1-ша сторінка
// без ?filter_* і лише коли API товарів відповів (є meta): збій не повинен ставати постійним 301
if (
	props.filterAlias &&
	filterPage.value &&
	!hasFilterQuery.value &&
	options.value.page === 1 &&
	productsData.value?.meta &&
	total.value === 0 &&
	!filterPage.value.neoprints?.length
) {
	await navigateTo(url.category(props.categoryAlias), { redirectCode: 301 })
}

// Картка конструктора: тільки для моделей, на які друкуємо, на першій сторінці і не на сторінці
// фільтра. Модель, зняту з друку (not_available), у конструктор не ведемо — там нічого
// замовити (на pre_order лишаємо: чохол зроблять під передзамовлення).
const showPrintcaseCard = computed(
	() =>
		canPrintOn(category.value) &&
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
		if (!fromSelectedThemes.value || !canPrintOn(category.value)) return []
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
const hasItems = computed(() => products.value.length > 0 || showNeoPrints.value || designs.value.length > 0)

// SEO-блоки FAQ/цін: модельні сторінки та сторінки /filter/, лише 1-ша сторінка і без
// мультивибору ?filter_* — інакше той самий текст дублювався б на URL пагінації/комбінацій
const showSeoBlocks = computed(
	() =>
		category.value?.type === 'model' &&
		!hasFilterQuery.value &&
		currentPage.value === 1 &&
		products.value.length > 0
)

// Модель без товарів (режим «дизайни»): на 1-й сторінці — лід і таблиця цін із дизайнів.
// FAQ моделі будується з товарів (матеріали, діапазон цін) — тут його немає
const showDesignsSeo = computed(() => designsMode.value && currentPage.value === 1 && designs.value.length > 0)

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
// (довгохвостові анкори), на сторінці моделі — топ-10 товарів, у моделі без товарів — дизайни
const priceRows = computed(() => {
	if (designsMode.value) {
		return designs.value.slice(0, 10).map((np) => ({
			id: np.id,
			title: neoPrintTitle(np, category.value),
			to: url.neoprint(props.categoryAlias, np.id),
			price: neoPrintPrice.value,
		}))
	}
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
// Список — той, що на сторінці: товари або (модель без товарів) дизайни
const listItems = computed<any[]>(() => (designsMode.value ? designs.value : products.value))

const { items: displayList, isLoadingMore, autoOn, hasMorePages, loadedPages, showButton, loadMore, scrollSentinel } =
	useLoadMore({
		baseItems: listItems,
		currentPage,
		lastPage,
		fetchPage: (page: number) =>
			designsMode.value
				? shopApi.getDesignsPage(page, options.value.limit).then((r) => r?.data || [])
				: shopApi.getProductsList({ ...options.value, page }, apiFilters.value).then((r) => r?.data || []),
		autoBatches: 1,
	})

const displayProducts = computed(() => (designsMode.value ? [] : displayList.value))
const displayDesigns = computed(() => (designsMode.value ? displayList.value : []))

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
	// Модель без товарів — лід про готові дизайни (кількість і ціна друку)
	if (designsMode.value) {
		return designsTotal.value
			? t('modelLead.designs', {
					model: catName.value,
					count: designsTotal.value,
					price: formatPrice(neoPrintPrice.value),
				})
			: ''
	}
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
const pageLead = computed(() =>
	props.filterAlias ? filterLead.value : showSeoBlocks.value || showDesignsSeo.value ? modelLeadText.value : ''
)

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

	const np = neoprints.value[0] ?? designs.value[0]
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
	//
	// Модель без товарів, сторінки 2+: список дизайнів на всіх таких моделях той самий, різниться
	// лише назва моделі — сотні майже однакових сторінок. Індексуємо 1-шу, решту — noindex, follow:
	// посилання на дизайни бот обходить, а canonical тут свій (?page=N), тож пастки вище немає
	noindex: () => designsMode.value && currentPage.value > 1,
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
	// У моделі без товарів (режим «дизайни») список — лише дизайни сторінки
	const cards: { product: any; attribute: any | null }[] = designsMode.value
		? []
		: splitByAttributes.value
			? expandProductsByAttributes(products.value)
			: products.value.map((p: any) => ({ product: p, attribute: null }))

	const fromProducts = cards.slice(0, LIST_MAX).map(({ product: p, attribute: a }) => ({
		name: a ? `${p.title} (${a.title})` : p.title,
		url: url.absolute(url.product(p, a?.alias)),
	}))

	// Скільки дизайнів ще влізе у стелю списку — решту навіть не обходимо
	const neoprintsRoom = Math.max(0, LIST_MAX - fromProducts.length)

	// Дизайни теми (секція під товарами) або, у моделі без товарів, дизайни поточної сторінки
	const shownDesigns: IThemeDesign[] = showNeoPrints.value ? neoprints.value : designs.value

	const fromNeoprints = shownDesigns.slice(0, neoprintsRoom).map((np) => ({
		name: neoPrintTitle(np, category.value),
		url: url.absolute(url.neoprint(props.categoryAlias, np.id)),
	}))

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

// ---------- Стан для вигляду (ShopCategoryView або його версія в бренді) ----------
const { categoryAlias, filterAlias, brandsLanding } = toRefs(props)

provideCategoryPage({
	categoryAlias, filterAlias, brandsLanding, category, filterPage, names, pageTitle, pageLead, breadcrumbs, minPrice,
	displayTree, selectedForSidebar, mobileFiltersOpen, toggleFilter, resetFilters, options, changeSort,
	total, displayTotal, productsCount, brandTiles, brands, brandTree, modelSeries,
	pending, hasItems, products, displayItems, gridModifier, showPrintcaseCard, designsMode, designsTotal, displayDesigns,
	currentPage, lastPage, hasMorePages, showButton, isLoadingMore, loadedPages, autoOn, scrollSentinel, pageLink, loadMore,
	showNeoPrints, neoprints, neoprintsTitle, visibleNeoprints, hasMoreNeoprints, showMoreNeoprints, scrollToNeoprints,
	showSeoBlocks, showDesignsSeo, pageItems, pricesTitle, priceRows, showReviews, reviewsList, filterArticle,
})
</script>
