// Стан сторінки категорії (модель, бренд, серія, розділ аксесуарів, фільтр, лендінг /chekhly) —
// місток між логікою й виглядом.
//
// Логіка — components/shop/CategoryPage.vue (дані, 404/301, фільтри, підвантаження, SEO і JSON-LD) —
// одна на всі сайти. Вигляд — components/shop/CategoryView.vue: бренд перекриває його своїм
// (brand/components/shop/CategoryView.vue) і бере ті самі поля звідси — «дизайн окремо, логіка спільна».
// Новий рядок на сторінці, якому потрібні дані, — нове поле тут (і в provide CategoryPage), а не
// власний запит у вигляді.
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { IFilterNode } from '~/composables/useFilters'
import type { ICatNames } from '~/composables/useCatNames'
import type { INeoPrint } from '~/composables/useShopApi'
import type { IThemeDesign } from '~/composables/useThemeDesigns'

type Get<T> = Readonly<Ref<T>> | ComputedRef<T>

export interface ICategoryCard {
	product: any
	attribute: any | null
}

export interface ICategoryPageState {
	// Пропси сторінки
	categoryAlias: Get<string>
	filterAlias: Get<string | undefined>
	brandsLanding: Get<boolean | undefined>

	// Категорія, фільтр сторінки, назви, заголовок і лід
	category: Get<any>
	filterPage: Get<any>
	names: Get<ICatNames>
	pageTitle: Get<string>
	pageLead: Get<string>
	breadcrumbs: Get<{ title: string; url?: string }[]>
	/** Найнижча ціна серед товарів сторінки (0 — цін немає) */
	minPrice: Get<number>

	// Фільтри
	displayTree: Get<IFilterNode[]>
	selectedForSidebar: Get<Record<string, string[]>>
	mobileFiltersOpen: Ref<boolean>
	toggleFilter: (payload: { group: string; alias: string }) => void
	resetFilters: () => void

	// Сортування й розмір сторінки (page, limit, sort з URL)
	options: Get<{ page: number; limit: number; sort: string }>
	changeSort: (e: Event) => void

	// Лічильник у заголовку
	total: Get<number>
	displayTotal: Get<number>
	productsCount: Get<number>

	// Лендінг брендів /chekhly і сторінка бренду
	brandTiles: Get<any[]>
	brands: Get<any[]>
	brandTree: Get<any[]>

	// Сітка
	pending: Get<boolean>
	hasItems: Get<boolean>
	products: Get<any[]>
	displayItems: Get<ICategoryCard[]>
	gridModifier: Get<string>
	showPrintcaseCard: Get<boolean>
	designsMode: Get<boolean>
	designsTotal: Get<number>
	displayDesigns: Get<IThemeDesign[]>

	// Сторінки, «Показати ще», авто-підвантаження
	currentPage: Get<number>
	lastPage: Get<number>
	hasMorePages: Get<boolean>
	showButton: Get<boolean>
	isLoadingMore: Get<boolean>
	loadedPages: Get<number[]>
	autoOn: Ref<boolean>
	scrollSentinel: Ref<HTMLElement | null>
	pageLink: (page: number) => any
	loadMore: () => Promise<void>

	// Готові дизайни теми під товарами
	showNeoPrints: Get<boolean>
	neoprints: Get<INeoPrint[]>
	neoprintsTitle: Get<string>
	visibleNeoprints: Get<INeoPrint[]>
	hasMoreNeoprints: Get<boolean>
	showMoreNeoprints: () => void
	scrollToNeoprints: () => void

	// SEO-блоки низом: FAQ, таблиця цін, відгуки, стаття
	showSeoBlocks: Get<boolean>
	showDesignsSeo: Get<boolean>
	pageItems: Get<ICategoryCard[]>
	pricesTitle: Get<string>
	priceRows: Get<{ id: any; title: string; to: any; price: number }[]>
	showReviews: Get<boolean>
	reviewsList: Get<any[]>
	filterArticle: Get<string>
}

const KEY: InjectionKey<ICategoryPageState> = Symbol('category-page')

export function provideCategoryPage(state: ICategoryPageState) {
	provide(KEY, state)
}

export function useCategoryPage(): ICategoryPageState {
	const state = inject(KEY)
	if (!state) throw new Error('useCategoryPage(): вигляд сторінки категорії поза ShopCategoryPage')
	return state
}
