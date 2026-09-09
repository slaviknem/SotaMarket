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

// Відповідь розумного пошуку (випадайка)
export interface ISearchSuggest {
	query: string
	normalized: string
	exact: boolean // розпізнано рівно одну модель → Enter веде одразу на неї
	exact_alias: string | null // alias саме тієї моделі (у models першою може бути картка бренду)
	models: {
		id: number
		alias: string
		title: string
		type: 'model' | 'brend' | 'serie' | 'category'
		image?: string | null
		products_count: number
		// matched — тип чохла, що збігся із запитом («айфон 17 BMW» → чип BMW); показуємо першим і підсвіченим
		case_types: { alias: string; title: string; count: number; matched?: boolean }[]
	}[]
	filters: { id: number; alias: string; title: string; model?: string | null }[]
	articles: { alias: string; title: string; type: string }[]
	products: {
		id: number
		alias: string
		alias_cat: string
		title: string
		price: number
		price_old: number
		image?: string | null
		available: boolean
		attribute_id?: number | null
	}[]
	total: number | null
}

// Відповідь пошуку по моделях (вибір моделі в конструкторі чохлів):
// той самий рушій, що й у випадайці, але у видачі лише моделі
export interface ISearchModels {
	query: string
	normalized: string // як бекенд зрозумів запит: «самсунг а54» → «samsung a54»
	models: {
		id: number
		alias: string
		title: string // повна назва: «Samsung Galaxy A54»
		type: string
		image?: string | null
		products_count: number
	}[]
}

// Відстеження замовлення: одне поле — номер замовлення / телефон / ТТН
export interface ITrackOrder {
	found: boolean
	order_number?: number
	status_code?: string // alias статусу (перекладаємо через i18n)
	status?: string // людська назва з бекенда — фолбек
	created?: string
	items_count?: number
	has_track?: boolean
	track?: string
	tracking_url?: string // сторінка відстеження на сайті перевізника
}

// Готовий дизайн для друку (атрибут type=neo_print), прив'язаний до фільтра-теми
export interface INeoPrint {
	id: number
	alias: string
	title: string
	filter_id: number
	type: string
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

		// Пошук: випадайка (моделі + типи чохлів + товари + статті).
		// signal — щоб скасувати запит, коли користувач набрав далі
		searchSuggest: (query: string, limit = 8, signal?: AbortSignal) =>
			$fetch<ISearchSuggest>(config.public.urlApi + 'search/suggest', {
				params: { ...baseParams(), q: query, limit },
				signal,
			}),

		// Пошук лише по моделях (конструктор чохлів): та сама логіка розпізнавання,
		// що й у випадайці — кирилиця, транслітерація, друкарські помилки, розкладка
		searchModels: (query: string, limit = 20, signal?: AbortSignal) =>
			$fetch<ISearchModels>(config.public.urlApi + 'search/models', {
				params: { ...baseParams(), q: query, limit },
				signal,
			}),

		// Пошук: сторінка всіх результатів (формат як у products + блок search)
		searchPage: (query: string, opts: IListOptions = {}) =>
			api<{ data: any[]; meta: any; search: any }>('search', { q: query, ...opts }),

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

		// Готові дизайни (NeoPrint) теми: віртуальні товари — принт із бібліотеки на будь-яку модель.
		// Без filter_id віддає всі дизайни сайту. Відповідь — плоский масив (не {data}).
		getNeoPrints: async (filterId?: number | string) => {
			const res = await api<INeoPrint[]>('attributes/neo_prints', filterId ? { filter_id: filterId } : {})
			return Array.isArray(res) ? res : []
		},

		// Один дизайн за alias (alias == id). Цей ендпоінт віддає сиру модель Attribute —
		// без локалізованого title, який є в списку neo_prints. Доводимо до того ж вигляду.
		getNeoPrint: async (alias: string | number) => {
			const res = await $fetch<any>(`${config.public.urlApi}attributes/neo_print/${alias}`).catch(() => null)
			if (!res?.id) return null

			return { ...res, title: (locale.value === 'ru' ? res.title_ru : res.title_uk) || '' }
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

		// Відстеження замовлення (номер замовлення / телефон / ТТН)
		trackOrder: (q: string) => api<ITrackOrder>('orders/track', { q }),

		// Посилання на оплату MonoPay
		genMonopayLink: (orderId: string | number) =>
			api<{ success: boolean; payment_link?: string }>('orders/gen_monopay_link', {
				order_id: orderId,
			}),

		// Чи можна платити онлайн: у замовленні є друк, а заготовок під нього в постачальників немає.
		// status: ok | split | none | unknown | null (друку в замовленні немає).
		// Перевірка ходить до постачальників, тому приймає власний ліміт часу
		printCheck: (orderId: string | number, timeoutMs = 15000) =>
			$fetch<{ payable: boolean; status: string | null }>(config.public.urlApi + 'orders/print_check', {
				params: { ...baseParams(), order_id: orderId },
				signal: AbortSignal.timeout(timeoutMs),
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
