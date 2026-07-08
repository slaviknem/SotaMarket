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
	category_id?: number
}

export interface CartState {
	lastItemId: number
	items: CartItem[]
	discount: number
}

// Приблизна вартість доставки — показуємо орієнтовно в кошику.
// Точну вартість визначає перевізник (Нова Пошта) при отриманні (накладений платіж).
// Локальна константа (не export) — щоб не плодити глобальний авто-імпорт; назовні віддаємо через cart.shipping.
const SHIPPING = { delivery: 60, nalogka: 20 }

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
	// Орієнтовний підсумок із доставкою (показуємо з «≈»)
	const grandTotal = computed(() => total.value + SHIPPING.delivery + SHIPPING.nalogka)

	function add(payload: {
		product: any
		attribute?: number
		quantity?: number
		image?: string | null
		attribTitle?: string
		printcase?: any
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

	return { state, quantity, subtotal, total, grandTotal, shipping: SHIPPING, add, remove, removeAll, updateQuantity, setDiscount }
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
