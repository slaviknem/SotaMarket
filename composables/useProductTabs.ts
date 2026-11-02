// Вкладки каруселі товарів головної — логіка; вигляд — blocks/ProductsCarousel рушія або бренду
// (brand/components/blocks/ProductsCarousel.vue), обидва беруть її звідси.
// Вкладка — розділ новинок (products/latest/{categoryAlias}) або, з полем theme, товари моделі
// categoryAlias з темою (products з фільтром; theme.value — аліаси підтем, порожній — уся модель)
export interface ProductTab {
	name: string
	categoryAlias: string
	/** Назва моделі — для підпису посилання «Усі дизайни … для {модель}» у вигляді */
	categoryTitle?: string
	theme?: { alias: string; value: string }
}

// Ключ вкладки: у вкладок-тем модель спільна, тож лише за categoryAlias їх не розрізнити
export const tabKey = (tab: ProductTab) => (tab.theme ? `${tab.categoryAlias}:${tab.theme.alias}` : tab.categoryAlias)

export function useProductTabs(props: { initialProducts: any[] | null; tabs?: ProductTab[]; limit?: number }) {
	const shopApi = useShopApi()

	const firstKey = () => (props.tabs?.[0] ? tabKey(props.tabs[0]) : 'all')
	const activeTab = ref(firstKey())
	const products = ref<any[]>(props.initialProducts || [])
	const loading = ref(false)

	watch(
		() => props.initialProducts,
		(v) => {
			if (v && activeTab.value === firstKey()) products.value = v
		}
	)

	async function changeTab(tab: ProductTab) {
		const key = tabKey(tab)
		if (key === activeTab.value) return
		activeTab.value = key
		loading.value = true
		const limit = props.limit || 10
		let list: any[] = []
		try {
			list = tab.theme
				? (await shopApi.getProductsList({ limit }, { category: tab.categoryAlias, ...(tab.theme.value ? { theme: tab.theme.value } : {}) }))
						?.data || []
				: await shopApi.getLatestProducts({ category: tab.categoryAlias, limit })
		} catch {
			list = []
		}
		// Поки йшов запит, могли перемкнути на іншу вкладку — її відповідь не перебиваємо
		if (activeTab.value !== key) return
		products.value = list
		loading.value = false
	}

	return { activeTab, products, loading, changeTab }
}
