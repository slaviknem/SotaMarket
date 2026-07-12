// Клієнт до бекенда admin.floy.com.ua (apisite)
// Всі методи дзеркалять старий src/api/shop.ts, але на $fetch (SSR-friendly)

export interface IListOptions {
	page?: number
	limit?: number
	sort?: string
}

export interface IFilterValues {
	[filterAlias: string]: string
}

export function useShopApi() {
	const config = useRuntimeConfig()
	const { locale } = useI18n()

	const baseParams = () => ({
		lang: locale.value,
		site: config.public.site,
	})

	const api = <T = any>(path: string, params: Record<string, any> = {}) =>
		$fetch<T>(config.public.urlApi + path, {
			params: { ...baseParams(), ...params },
		})

	// Деякі ендпоінти (меню) віддають JSON-рядок з text/html — парсимо самі
	const parseJson = (res: any) => {
		if (typeof res !== 'string') return res
		try {
			return JSON.parse(res)
		} catch {
			return null
		}
	}

	return {
		// Меню (бренди → серії → моделі + категорії)
		getMenu: async (brendLimit = 10) => parseJson(await api(`categories/menu/${brendLimit}`)),

		// Всі бренди (для мегаменю "ВСІ")
		getMenuBrends: async () => parseJson(await api(`categories/menu_brends`)),

		// Серії та моделі бренда
		getMenuBrend: async (alias: string) => parseJson(await api(`categories/menu_brend/${alias}`)),

		// Банери
		getBanners: async () => {
			const res = await api<{ data: any[] }>('banners')
			return res?.data ?? []
		},

		// Популярні категорії / моделі
		getPopularCategory: async (opts: { type: string; limit: number }) => {
			const res = await api<{ data: any[] }>(`categories/popular/${opts.type}/${opts.limit}`)
			return res?.data ?? []
		},

		// Категорія за alias
		getCategoryByAlias: async (alias: string) => {
			const res = await api<{ data: any }>(`categories/category/${alias}`)
			return res?.data ?? null
		},

		// Список товарів (пагінація + фільтри + сортування)
		getProductsList: (options: IListOptions = {}, filters: IFilterValues = {}) => {
			const params: Record<string, any> = { filters: '' }

			for (const key in filters) {
				if (key === 'category') params.category = filters[key]
				else params.filters += filters[key] + ';' // групи фільтрів розділяються ';'
			}

			return api<{ data: any[]; meta: any; links: any }>('products', { ...options, ...params })
		},

		// Товар за alias
		getProductByAlias: async (alias: string) => {
			const res = await api<{ data: any }>(`products/product/${alias}`)
			return res?.data ?? null
		},

		// Супутні товари
		getRelatedProducts: async (alias: string) => {
			const res = await api<{ data: any[] }>(`products/relateds/${alias}`)
			return res?.data ?? []
		},

		// Нові товари (type: all | chekhly | plenki | accessories)
		getLatestProducts: async (opts: { category: string; limit: number }) => {
			const res = await api<{ data: any[] }>(`products/latest/${opts.category}/${opts.limit}`)
			return res?.data ?? []
		},

		// Пошук
		getSuggestions: async (query: string) => {
			const res = await api<{ data: any[] }>(`products/search/${encodeURIComponent(query)}`)
			return res?.data ?? []
		},

		// Фільтри категорії (дерево)
		getFilters: async (categoryAlias: string) => {
			const res = await api<{ data: any[] }>(`filters/${categoryAlias}`)
			return res?.data ?? []
		},

		// Один фільтр (для сторінки фільтра з описом)
		getFilterByAlias: async (categoryAlias: string, filterAlias: string) => {
			const res = await api<{ data: any }>(`filters/filter/${categoryAlias}/${filterAlias}`)
			return res?.data ?? null
		},

		// Статті
		getArticles: async (type: string) => {
			const res = await api<{ data: any[] }>(`articles/${type}`)
			return res?.data ?? []
		},

		getLatestArticles: async (opts: { type: string; limit: number }) => {
			const res = await api<{ data: any[] }>(`articles/latest/${opts.type}/${opts.limit}`)
			return res?.data ?? []
		},

		getArticleByAlias: async (alias: string) => {
			const res = await api<{ data: any }>(`articles/article/${alias}`)
			return res?.data ?? null
		},

		// Замовлення
		sendOrder: async (order: Record<string, any>) => {
			const res = await api<{ data: any }>('orders/send', { order: JSON.stringify(order) })
			return res?.data ?? null
		},

		// Посилання на оплату MonoPay
		genMonopayLink: (orderId: string | number) =>
			api<{ success: boolean; payment_link?: string }>('orders/gen_monopay_link', {
				order_id: orderId,
			}),

		// Останні опубліковані відгуки (головна, сторінка відгуків).
		// minRating > 0 — лише відгуки з оцінкою не нижче вказаної (напр. 4 = тільки 4-5 зірок)
		getLatestReviews: async (limit = 8, minRating = 0) => {
			const res = await api<{ data: any[] }>(`reviews/latest/${limit}${minRating ? '/' + minRating : ''}`)
			return res?.data ?? []
		},

		// Відгук
		sendReview: (review: Record<string, any>) =>
			$fetch(config.public.urlApi + 'reviews/send', {
				params: { review: JSON.stringify(review) },
			}),

		// Облік візитів
		addVisit: (categoryId: number, productId = 0, attributeId = 0, filterId = 0) => {
			if (!import.meta.client) return
			return api('visits/add_visit', {
				category_id: categoryId,
				product_id: productId,
				attribute_id: attributeId,
				filter_id: filterId,
				url: window.location.href,
			}).catch(() => {})
		},
	}
}
