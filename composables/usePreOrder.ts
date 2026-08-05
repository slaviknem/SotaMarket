// Передзамовлення — єдиний сценарій для товару, готового дизайну (NeoPrint) і конструктора.
//
// Товару зараз немає (модель у статусі pre_order або порожній залишок), тож у кошик він не
// потрапляє: беремо телефон у модалці — так само, як у швидкому замовленні, — і одразу
// відправляємо замовлення з type=pre_order. Позначка типу і є відмінністю від швидкого.
//
// Модалка одна на застосунок (ShopPreOrder монтується в app.vue), бо викликають її і
// сторінка товару, і кожна картка сітки, і конструктор — звідси глобальний стан.

export interface PreOrderItem {
	product_id: number
	title: string
	attribute_id: number
	count: number
	price: number
	discount: number
	image_file: string | null
	category_id?: number
	printcase?: string // оригінал макета для друку (конструктор, NeoPrint)
}

export interface PreOrderRequest {
	price: number
	// Позицію збираємо в момент відправки: конструктор спершу має відрендерити й вивантажити
	// макет, а робити це до того, як людина ввела телефон, — марна робота
	buildItem: () => PreOrderItem | Promise<PreOrderItem>
}

export function usePreOrder() {
	// Заявку ставить лише клієнт (обробник кліку), тож у SSR-payload вона завжди null
	const request = useState<PreOrderRequest | null>('preOrderRequest', () => null)
	const open = useState('preOrderOpen', () => false)

	return {
		request,
		open,
		openPreOrder(req: PreOrderRequest) {
			request.value = req
			open.value = true
		},
		closePreOrder: () => (open.value = false),
	}
}
