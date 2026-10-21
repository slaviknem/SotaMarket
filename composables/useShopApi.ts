// Клієнт до бекенда admin.floy.com.ua (apisite)
// Всі методи дзеркалять старий src/api/shop.ts, але на $fetch (SSR-friendly)

import type { OcBlock } from '~/composables/useOrderConfirm'
import type { IThemeDesign } from '~/composables/useThemeDesigns'

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

// Опитувальник підтвердження замовлення на сторінці «Дякуємо» (apisite/orders/confirm,
// OrderConfirm::forOrder в адмінці). Питання, кроки, суми й стан оплати рахує бекенд —
// сайт лише малює. Формат блока — OcBlock
export interface IOrderConfirmItem {
	id: number // позиція замовлення (color:{id} у ключі блока боків)
	title: string
	image: string | null // повна адреса мініатюри
	qty: number
	price: number // сума рядка зі знижкою товару
	model: string | null // повна назва моделі; null — аксесуар або модель не визначилась
	model_id: number | null // model:{id} у group блоків моделі
}

export interface IOrderConfirm {
	found: true
	order: {
		id: number
		// Статус ще new / messaged / not_call / waiting / drop_first. Інакше — зведення лише для читання
		editable: boolean
		items: IOrderConfirmItem[]
		dispatch: string // «Завтра» / «Сьогодні або Завтра» / «в Понеділок - Вівторок» — з великої, усередині речення (DispatchTerm)
		phone: string // 10 цифр
		// bad — номер майже напевно неправильний (поле правки відкрите одразу),
		// soft — невідомий префікс оператора (лише ввічливе прохання перевірити)
		phone_check: 'ok' | 'soft' | 'bad'
		discount: number // знижка на замовлення, 0 — немає
		price: number // за товари, вже зі знижкою — те, що йде в ТТН
		cod: boolean // накладений платіж (і ще не оплачено онлайн повністю)
		due: number // «при отриманні ≈»: товари мінус аванс плюс доставка, округлено вгору до 5
		// Чого бракує, щоб відправити (спосіб доставки, відділення, індекс) — готовий
		// текст; null — усе є. Немає ключа — адмінка ще старша за цю перевірку
		delivery_missing?: string | null
		// Що не так з отримувачем (немає прізвища або воно латиницею) — готовий текст; null — усе гаразд
		recipient_missing?: string | null
	}
	pay: {
		// Чи пропонувати онлайн-оплату взагалі. Чи є на чому друкувати (а отже, чи брати гроші),
		// уточнює orders/print_check уже на клієнті — useOrderPay
		online: boolean
		// Спосіб оплати обрано (кошик); швидке замовлення його не питає. Немає ключа — адмінка старша
		chosen?: boolean
		prepay: number // аванс за індивідуальний друк, який чекаємо; 0 — не потрібен
		prepay_paid: number // аванс, який уже отримано
		paid: boolean // оплачено онлайн повністю
		full: number // скільки візьме кнопка «за товар»
		cod_fee: number // комісія накладеного, яку клієнт економить, сплативши зараз
		post_free: boolean // доставка безкоштовна — сплативши за товар, на пошті не платять нічого
	}
	blocks: OcBlock[]
	// Екранів більше за ліміт — кроків немає, лише зведення: звіряє менеджер
	too_many: boolean
	// Що клієнт уже відповів (null — ще нічого). Ключа немає зовсім — адмінка ще без
	// збереження відповідей, тоді й сайт нічого не шле
	saved?: IOrderConfirmSaved | null
}

// Відповіді опитувальника — те, що сайт шле після кожної зміни (apisite POST orders/confirm,
// ConfirmAnswers в адмінці). Весь стан щоразу, а не зміну: кожен запит самодостатній.
// Тексти питань і відповідей для менеджера бекенд бере зі своїх блоків — шлемо лише коди
export interface IOrderConfirmAnswers {
	answers: Record<string, { v: string; text?: string }> // ключ блока → варіант (text — «інша модель» своїми словами)
	phone: string | null // номер, виправлений клієнтом; null — не правив
	comment: string
	address: string // куди відправити — своїми словами, коли бракує даних доставки
	recipient: string // ПІБ отримувача кирилицею — коли його немає або він латиницею
	no_call: boolean
	dispatch?: string // коли відправимо — рівно той текст, що бачить клієнт (адмінка показує його менеджеру)
}

// Збережений стан — з нього опитувальник продовжує там, де клієнт зупинився
export interface IOrderConfirmSaved extends IOrderConfirmAnswers {
	done: boolean // уже натискав «Все вірно, підтверджую»
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

// ---------- Обрізання відповідей API ----------
// apisite віддає моделі адмінки цілком: закупівельну ціну, коди й посилання постачальників,
// номер стелажа, дати кожного фото, повні SEO-описи категорій у плитках. Усе це потрапляло
// в SSR-payload — а він лежить у HTML відкритим текстом і займав 50–60% ваги сторінки.
// Прибираємо до того, як дані підуть у useAsyncData.

// Службові поля адмінки, яких сайт ніде не показує
const INTERNAL_PRODUCT = ['price_zakup', 'itsell_id', 'itsell_url']
const INTERNAL_CATEGORY = [
	'itsell_ids',
	'itsell_parse',
	'vdmt_url',
	'vdmt_id',
	'caseshop_id',
	'caseshop_brend_id',
	'endorphone_id',
	'rack_num',
	'prom_export',
]

// Чого не показує картка товару в списку (опис, характеристики, фільтри, відгуки —
// усе це сторінка товару бере з власного запиту)
const CARD_HEAVY = ['description', 'characteristics', 'linked_text', 'filters', 'reviews', 'video']

function omit<T>(obj: T, keys: string[]): T {
	if (!obj || typeof obj !== 'object') return obj
	const out: any = { ...obj }
	for (const key of keys) delete out[key]
	return out
}

const cleanCategory = (cat: any) => {
	const out: any = omit(cat, INTERNAL_CATEGORY)
	if (out?.brend && typeof out.brend === 'object') out.brend = omit(out.brend, INTERNAL_CATEGORY)
	return out
}

// Товар без службових полів. Фото — лише те, що читають галерея й картка
// (без дат, прапорців обробки і посилань на сайт постачальника)
function cleanProduct(p: any) {
	if (!p || typeof p !== 'object') return p
	const out: any = omit(p, INTERNAL_PRODUCT)
	if (Array.isArray(p.images)) {
		out.images = p.images.map(({ id, attribute_id, image_file }: any) => ({ id, attribute_id, image_file }))
	}
	if (Array.isArray(p.attributes)) out.attributes = p.attributes.map((a: any) => omit(a, ['vdmt_kod']))
	if (Array.isArray(p.categories)) out.categories = p.categories.map(cleanCategory)
	return out
}

// Картка у списку. Фото — по одному на атрибут: getImageByAttribute бере саме перше фото
// атрибута (або images[0]), а API віддає всі — у товару з 19 кольорами їх було 83.
// Порядок не міняємо, тож images[0] і перше фото кожного атрибута лишаються тими самими
function cardProduct(p: any) {
	const out: any = omit(cleanProduct(p), CARD_HEAVY)
	if (Array.isArray(out?.images)) {
		const seen = new Set<number>()
		out.images = out.images
			.filter((img: any) => {
				const key = img.attribute_id ?? 0
				if (seen.has(key)) return false
				seen.add(key)
				return true
			})
			.map(({ attribute_id, image_file }: any) => ({ attribute_id, image_file }))
	}
	return out
}

const cardList = (list: any) => (Array.isArray(list) ? list.map(cardProduct) : list)

// Плитка моделі/категорії/бренда: рівно те, що малюють CategoryGrid, BrandTiles і пошук.
// Повний SEO-опис категорії (6–13 КБ на кожну) у плитці не показується
const categoryTile = ({ id, alias, type, title, title_full, title_rus, image_file, products_count }: any) => ({
	id,
	alias,
	type,
	title,
	title_full,
	title_rus,
	image_file,
	products_count,
})

// Назва серії без службового хвоста « - Serie» з адмінки (мегаменю, мобільне меню, каталог
// брендів, вибір моделі в конструкторі)
export const serieTitle = (title: string) => title.replace(' - Serie', '')

// Серії бренду з моделями — лише назви й адреси (каталог брендів, мегаменю)
export const menuSeries = (series: any) =>
	Array.isArray(series)
		? series.map((s: any) => ({
				title: s.title,
				url: s.url,
				children: (s.children || []).map((m: any) => ({ title: m.title, url: m.url })),
			}))
		: []

// Бренди → серії → моделі для каталогу брендів (/chekhly): без id, типів і дублювання бренду в кожній моделі
export const menuBrands = (brands: any) =>
	Array.isArray(brands)
		? brands.map((b: any) => ({ title: b.title, url: b.url, children: menuSeries(b.children) }))
		: []

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
			// На сервері запит до API, що завис, тримав би SSR-воркер без кінця (а за ним і чергу
			// nginx). 15 с — із запасом над найдовшим реальним запитом; збій далі стає 503
			// через throwIfApiDown. На клієнті не обмежуємо (там є фонові запити з очікуванням)
			...(import.meta.server ? { timeout: 15000 } : {}),
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

		// Популярні категорії / моделі (плитки — без описів)
		getPopularCategory: async (opts: { type: string; limit: number }) => {
			const res = await api<{ data: any[] }>(`categories/popular/${opts.type}/${opts.limit}`)
			return (res?.data ?? []).map(categoryTile)
		},

		// Категорія за alias
		getCategoryByAlias: async (alias: string) => {
			const res = await api<{ data: any }>(`categories/category/${alias}`)
			return res?.data ? cleanCategory(res.data) : null
		},

		// Список товарів (пагінація + фільтри + сортування)
		getProductsList: (options: IListOptions = {}, filters: IFilterValues = {}) => {
			const params: Record<string, any> = { filters: '' }

			for (const key in filters) {
				if (key === 'category') params.category = filters[key]
				else params.filters += filters[key] + ';' // групи фільтрів розділяються ';'
			}

			return api<{ data: any[]; meta: any; links: any }>('products', { ...options, ...params }).then((res) =>
				res ? { ...res, data: cardList(res.data) } : res
			)
		},

		// Товар за alias
		getProductByAlias: async (alias: string) => {
			const res = await api<{ data: any }>(`products/product/${alias}`)
			return res?.data ? cleanProduct(res.data) : null
		},

		// Супутні товари
		getRelatedProducts: async (alias: string) => {
			const res = await api<{ data: any[] }>(`products/relateds/${alias}`)
			return cardList(res?.data ?? [])
		},

		// Нові товари (type: all | chekhly | plenki | accessories)
		getLatestProducts: async (opts: { category: string; limit: number }) => {
			const res = await api<{ data: any[] }>(`products/latest/${opts.category}/${opts.limit}`)
			return cardList(res?.data ?? [])
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
			api<{ data: any[]; meta: any; search: any }>('search', { q: query, ...opts }).then((res) =>
				res ? { ...res, data: cardList(res.data) } : res
			),

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

		// Усі дизайни сайту сторінками — сітка моделі без товарів (CategoryPage). Не apisite, а свій
		// маршрут рушія: повний список адмінки кешує й перемежовує за темами Nitro
		// (server/utils/siteDesigns.ts). Форма відповіді — як у списку товарів ({ data, meta })
		getDesignsPage: (page: number, limit: number) =>
			$fetch<{ data: IThemeDesign[]; meta: { total: number; current_page: number; last_page: number } }>(
				'/api/neoprints',
				{ params: { lang: locale.value, page, limit } }
			),

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

		// Посилання на оплату MonoPay.
		// full=1 — «сплатити всю суму» замість авансу. Суму не передаємо НІКОЛИ: це лише
		// перемикач, скільки саме брати — вирішує бекенд за самим замовленням
		genMonopayLink: (orderId: string | number, full = false) =>
			api<{ success: boolean; payment_link?: string }>('orders/gen_monopay_link', {
				order_id: orderId,
				...(full ? { full: 1 } : {}),
			}),

		// Чи можна платити онлайн: у замовленні є друк, а заготовок під нього в постачальників немає.
		// status: ok | split | none | unknown | null (друку в замовленні немає).
		// Суми авансу бекенд теж віддає, але їх сайт бере з опитувальника (getOrderConfirm).
		// Перевірка ходить до постачальників, тому приймає власний ліміт часу
		printCheck: (orderId: string | number, timeoutMs = 15000) =>
			$fetch<{ payable: boolean; status: string | null }>(config.public.urlApi + 'orders/print_check', {
				params: { ...baseParams(), order_id: orderId },
				signal: AbortSignal.timeout(timeoutMs),
			}),

		// Опитувальник підтвердження за номером і токеном. Чужий токен чи немає замовлення —
		// бекенд віддає 404, тут це null (сторінка «Дякуємо» покаже просту подяку). Не той
		// формат (адмінку з цим ендпоінтом ще не розкотили, редирект на HTML) — теж null
		// wait — дочекатися перевірки постачальників (кольори боків чохла): секунди, лише у фоні
		getOrderConfirm: (orderId: string | number, token: string, wait = false) =>
			api<IOrderConfirm>('orders/confirm', { order_id: orderId, t: token, ...(wait ? { wait: 1 } : {}) })
				.then((res) => (res?.found === true && res.order && Array.isArray(res.blocks) ? res : null))
				.catch((e) => {
					if ((e?.statusCode ?? e?.status) === 404) return null
					throw e
				}),

		// Зберегти відповіді опитувальника. final — натиснуто «Все вірно, підтверджую».
		// FormData, а не JSON: «простий» CORS-запит без preflight (orders/* у cors.php адмінки немає).
		// saved: false — бекенд прийняв, але не зберігає (немає колонки або замовлення вже в роботі)
		saveOrderConfirm: (orderId: string | number, token: string, state: IOrderConfirmAnswers, final = false) => {
			const fd = new FormData()
			fd.append('order_id', String(orderId))
			fd.append('t', token)
			fd.append('answers', JSON.stringify(state.answers))
			fd.append('phone', state.phone ?? '')
			fd.append('comment', state.comment)
			fd.append('address', state.address)
			fd.append('recipient', state.recipient)
			fd.append('no_call', state.no_call ? '1' : '0')
			if (state.dispatch) fd.append('dispatch', state.dispatch)
			if (final) fd.append('final', '1')
			return $fetch<{ saved: boolean }>(config.public.urlApi + 'orders/confirm', {
				method: 'POST',
				params: baseParams(),
				body: fd,
			})
		},

		// Останні опубліковані відгуки (головна, сторінка відгуків).
		// minRating > 0 — лише відгуки з оцінкою не нижче вказаної (напр. 4 = тільки 4-5 зірок)
		getLatestReviews: async (limit = 8, minRating = 0) => {
			const res = await api<{ data: any[] }>(`reviews/latest/${limit}${minRating ? '/' + minRating : ''}`)
			return res?.data ?? []
		},

		// Відгуки про конструктор чохлів. Без alias — усі (хаб /printcase збирає відгуки
		// всіх моделей), з alias — лише відгуки цієї моделі. Мова не фільтрується:
		// укр- і рос-версії сторінки показують один спільний список.
		getPrintcaseReviews: async (categoryAlias?: string) => {
			const res = await api<{ data: any[] }>(`reviews/printcase${categoryAlias ? '/' + categoryAlias : ''}`)
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

// «API не відповів» ≠ «сутності немає». Виклик ставиться ПЕРЕД перевіркою на 404
// у сторінках, які без даних показати нічого не можуть.
//
// Навіщо. 19.09.2026 фронт піднявся під node 16 (у ньому немає глобальних
// fetch/Headers), кожен $fetch падав ще до виходу в мережу — і всі сторінки
// моделей віддавали 404 «Category not found». Google за годину отримав 28 тис.
// 404 за живі сторінки: для нього це «сторінки більше немає», тобто виліт із
// індексу, тоді як 503 означає «зайди пізніше». Плюс 404 не кешується nginx,
// тож кожен бот бив прямо в Node і аварія сама себе підсилювала.
// Розбір — NOTES/plans/PLAN-FLOY-CATEGORY-404.md в адмінці.
//
// Порожня відповідь від ЖИВОГО API сюди не потрапляє: apisite на неіснуючий alias
// віддає 200 і null (CategoryController::getCategoryByAlias), тобто помилки немає
// і 404 на місці виклику лишається чинним.
export function throwIfApiDown(error: unknown, what: string): void {
	if (!error) return

	// Якщо колись API почне відповідати 404 замість null — це теж «немає», не аварія
	const status = (error as { statusCode?: number; status?: number })?.statusCode ?? (error as { status?: number })?.status
	if (status === 404) return

	throw createError({
		statusCode: 503,
		statusMessage: `${what} API unavailable`,
		fatal: true,
		cause: error,
	})
}
