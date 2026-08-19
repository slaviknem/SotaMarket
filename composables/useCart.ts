// Кошик — стан + localStorage персистенція (плагін persist.client.ts)

export interface CartProduct {
	id: number
	alias: string
	alias_cat: string
	title: string
	image: string | null
	price: number
	price_old?: number | null
	attrib_title?: string
}

export interface CartItem {
	id: number
	product: CartProduct
	attribute: number
	price: number
	quantity: number
	discount: number
	total: number
	printcase?: any
	// Папка збереженого макета ({id}_{token}): посилання з кошика веде одразу на його правку
	printcaseDir?: string
	category_id?: number
}

export interface CartState {
	lastItemId: number
	items: CartItem[]
	discount: number
}

// Перевізники, доступні на сайті (порядок = порядок кнопок у формі кошика).
// Тарифи тут не тримаємо — вони в налаштуваннях адмінки; це лише перелік і ключі назв.
export const DELIVERY_METHODS = [
	{ key: 'n_pochta', title: 'titleNovaPochta' },
	{ key: 'ukrpochta', title: 'titleUkrPochta' },
]

// Ключ тарифу: адресна доставка НП дорожча за точку видачі, тож має власний тариф
// (n_pochta_kur). У DELIVERY_METHODS його немає навмисно — інакше він потрапив би
// в розрахунок «від», де показуємо найдешевшого перевізника.
export const deliveryTariffKey = (method?: string, courier?: boolean) =>
	method === 'n_pochta' && courier ? 'n_pochta_kur' : method

export function useCartState() {
	return useState<CartState>('cart', () => ({
		lastItemId: 0,
		items: [],
		discount: 0,
	}))
}

export function useCart() {
	const state = useCartState()

	const quantity = computed(() => state.value.items.reduce((q, i) => q + i.quantity, 0))
	const subtotal = computed(() => state.value.items.reduce((s, i) => s + i.total, 0))
	const total = computed(() => subtotal.value - state.value.discount)

	// Вартість доставки рахуємо ТАК САМО, як адмінка при створенні замовлення
	// (OrderAction::calculateDeliveryCost) — з тих самих налаштувань, щоб підсумок у кошику
	// не розійшовся з рахунком у замовленні.
	const { delivery } = useSiteSettings()

	// Поріг безкоштовної доставки адмінка звіряє з suma_order, а це сума ДО знижки —
	// саме її ми й відправляємо в замовленні (див. sendOrder на сторінці кошика).
	const freeDelivery = computed(() => subtotal.value >= delivery.value.free_delivery_from)

	// Тариф перевізника: обраного, а поки не обрано — найдешевшого з доступних,
	// бо в підсумку тоді стоїть «від».
	const tariffFor = (method?: string): DeliveryTariff => {
		const table = delivery.value as unknown as Record<string, DeliveryTariff>
		if (method && table[method]) return table[method]

		const available = DELIVERY_METHODS.map((m) => table[m.key]).filter(Boolean)
		return available.reduce((min, t) => (t.delivery < min.delivery ? t : min), available[0])
	}

	// Адресна доставка коштує майже вдвічі більше за відділення, тож поріг безкоштовної
	// на неї не поширюється — кур'єр завжди платний (так само рахує адмінка).
	const isFreeFor = (method?: string) => freeDelivery.value && method !== 'n_pochta_kur'

	// Понад поріг адмінка обнуляє всю доставку разом із комісією за накладений платіж —
	// повторюємо це, а не тільки саму доставку.
	const shippingFor = (method?: string) => {
		const tariff = tariffFor(method)
		return isFreeFor(method)
			? { delivery: 0, nalogka: 0 }
			: { delivery: tariff.delivery, nalogka: tariff.nal_plateg }
	}

	const shipping = computed(() => shippingFor())

	// Комісія за накладений платіж є лише при оплаті під час отримання —
	// для перед-/онлайн-оплати її не має бути в підсумку.
	const codFee = (payment = 'nal_plateg', method?: string) =>
		payment === 'nal_plateg' ? shippingFor(method).nalogka : 0
	// Орієнтовний підсумок із доставкою (показуємо з «≈»)
	const grandTotalFor = (payment = 'nal_plateg', method?: string) =>
		total.value + shippingFor(method).delivery + codFee(payment, method)
	const grandTotal = computed(() => grandTotalFor())

	function add(payload: {
		product: any
		attribute?: number
		quantity?: number
		image?: string | null
		attribTitle?: string
		printcase?: any
		printcaseDir?: string
		categoryId?: number
	}) {
		const { product, attribute = 0, quantity: qty = 1 } = payload
		const discount = product.discount || 0

		const existing = state.value.items.find(
			(i) => i.product.id === product.id && i.attribute === attribute
		)

		if (existing) {
			existing.quantity += qty
			existing.total = (existing.price - existing.discount) * existing.quantity
		} else {
			state.value.items.push({
				id: ++state.value.lastItemId,
				product: {
					id: product.id,
					alias: product.alias,
					alias_cat: product.alias_cat,
					title: product.title,
					image: payload.image ?? product.image_file ?? null,
					price: product.price,
					price_old: product.price_old,
					attrib_title: payload.attribTitle || '',
				},
				attribute,
				price: product.price,
				quantity: qty,
				discount,
				total: (product.price - discount) * qty,
				printcase: payload.printcase,
				printcaseDir: payload.printcaseDir,
				category_id: payload.categoryId ?? product.categories?.[0]?.id,
			})
		}
	}

	function remove(itemId: number) {
		state.value.items = state.value.items.filter((i) => i.id !== itemId)
		if (!state.value.items.length) state.value.discount = 0
	}

	function removeAll() {
		state.value.items = []
		state.value.discount = 0
	}

	function updateQuantity(itemId: number, value: number) {
		const item = state.value.items.find((i) => i.id === itemId)
		if (!item || value < 1) return
		item.quantity = value
		item.total = (item.price - item.discount) * item.quantity
	}

	function setDiscount(discount: number) {
		state.value.discount = discount
	}

	return { state, quantity, subtotal, total, grandTotal, grandTotalFor, codFee, shipping, shippingFor, freeDelivery, isFreeFor, add, remove, removeAll, updateQuantity, setDiscount }
}

// Слайдер-кошик (mini-cart): глобальний стан відкриття.
// Відкривається при додаванні товару або кліку по іконці — показує склад кошика без оформлення.
// justAdded=true → заголовок «Товар додано»; false → нейтральний «Кошик» (перегляд із шапки).
export function useCartDrawer() {
	const open = useState('cartDrawerOpen', () => false)
	const justAdded = useState('cartDrawerAdded', () => true)
	return {
		open,
		justAdded,
		openCart: (added = true) => {
			justAdded.value = added
			open.value = true
		},
		closeCart: () => (open.value = false),
	}
}
