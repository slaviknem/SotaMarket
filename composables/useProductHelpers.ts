// Хелпери для роботи з товаром: зображення за атрибутом, назва атрибута тощо
// (дзеркалять старий plugins/helper.ts)

// Перше зображення товару для конкретного атрибута (кольору/принта)
export function getImageByAttribute(product: any, attributeId?: number | null): string | null {
	if (!product?.images?.length) return null

	if (attributeId) {
		const img = product.images.find((i: any) => i.attribute_id === attributeId)
		if (img) return img.image_file
	}

	return product.images[0].image_file
}

// Принт/дизайн (показуємо картинкою) чи колір (кружечок) — єдина логіка для картки,
// сторінки товару і галереї
const PRINT_TYPES = ['alpha_print', 'alpha_print_gen', 'neo_print', 'alpha_vdmt']

export function isPrintAttribute(attr: any): boolean {
	if (!attr || attr.type === 'color') return false
	return PRINT_TYPES.includes(attr.type) || !!attr.image_file
}

// Товар-alphaprint: фото зібране на бекенді (ImageH::composeAlphaprint) — чохол по центру
// квадратного полотна, з боків ~27% порожнього білого, згори/знизу ~5%. Тому такій картці
// віддаємо всю площу кадру (.p-card__img-link--fill), а от різати такі фото не можна:
// у частини шаблонів (напр. vprint_glaza-v-cvetah) чохол доходить до самого низу полотна.
export function isAlphaprint(product: any): boolean {
	return product?.group === 'alphaprint'
}

// Атрибут за alias
export function getAttributeByAlias(attributes: any[] | undefined, alias: string) {
	return attributes?.find((a) => a.alias === alias) ?? null
}

// Сортування атрибутів: спочатку в наявності
export function sortedAttributes(attributes: any[] | undefined): any[] {
	if (!attributes?.length) return []
	return [...attributes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// Розгортання списку товарів у картки «товар + атрибут» (як на старому сайті):
// кожен атрибут будь-якого типу (колір/принт/дизайн) — окрема картка зі своїм фото,
// назвою «Товар (Атрибут)» і URL /attr/{alias}.
// Товар без атрибутів лишається однією карткою (attribute: null).
export function expandProductsByAttributes(products: any[]): { product: any; attribute: any | null }[] {
	const items: { product: any; attribute: any | null }[] = []
	for (const product of products) {
		const attrs = sortedAttributes(product.attributes)
		if (attrs.length) for (const attribute of attrs) items.push({ product, attribute })
		else items.push({ product, attribute: null })
	}
	return items
}

// ---------- Наявність: ЄДИНА логіка для картки, товару, дизайнів і конструктора ----------
//
// Три стани замість «є/немає» (дзеркалять старий services/stock.ts: 1 / 0 / -1):
//   in        — можна класти в кошик одразу;
//   pre_order — товару зараз немає, але його зроблять: замість кошика — передзамовлення
//               (модалка ShopPreOrder, замовлення type=pre_order);
//   out       — немає й не буде: купівля недоступна.
export type StockState = 'in' | 'pre_order' | 'out'

// Статус друку МОДЕЛІ з адмінки (enum categories.alphaprint_available):
//   available / available_not — друкуємо одразу; pre_order — лише передзамовлення;
//   not_available — модель знята. Невідомий/порожній статус → null (вирішує загальна логіка).
export function modelPrintState(cat: any): StockState | null {
	const status = String(cat?.alphaprint_available || cat?.brend?.alphaprint_available || '')
		.trim()
		.toLowerCase()
		.replace(/[-\s]+/g, '_')

	if (status === 'available' || status === 'available_not') return 'in'
	if (status === 'pre_order') return 'pre_order'
	if (status === 'not_available') return 'out'
	return null
}

// Усе, що ДРУКУЄТЬСЯ під модель (alphaprint-товари, готові дизайни NeoPrint, конструктор),
// живе за статусом самої моделі, а не за складом: чохол виготовляють під замовлення.
export function printStockState(cat: any): StockState {
	return modelPrintState(cat) ?? 'in'
}

// Реальний залишок атрибута в таблиці стоків (AttributeResource.available)
const hasStock = (attr: any) => !!attr?.available

// Наявність конкретного атрибута (кольору/принта)
export function attrStockState(product: any, attr: any): StockState {
	// Живий залишок на складі — купуємо одразу, хай яким буде статус моделі
	if (hasStock(attr)) return 'in'
	if (isAlphaprint(product)) return printStockState(product?.categories?.[0])
	return product?.always_available ? 'in' : 'pre_order'
}

// Наявність товару (опційно — з урахуванням обраного атрибута)
export function productStockState(product: any, selectedAttr?: any | null): StockState {
	if (selectedAttr) return attrStockState(product, selectedAttr)

	if (isAlphaprint(product)) {
		const state = printStockState(product?.categories?.[0])
		// Хоч один принт лежить на складі — товар купують одразу (саме цим варіантом)
		if (state !== 'in' && product?.attributes?.some(hasStock)) return 'in'
		return state
	}

	if (product?.always_available) return 'in'
	return product?.available ? 'in' : 'pre_order'
}

// Коротка перевірка для місць, де важливий лише факт «можна покласти в кошик»
export const isAttrInStock = (product: any, attr: any) => attrStockState(product, attr) === 'in'

// Модифікатор картки за станом наявності: приглушене превʼю (стилі — .p-card--* у main.css).
// Спільний для картки товару і картки готового дизайну.
export function stockCardClass(state: StockState): string {
	if (state === 'pre_order') return 'p-card--pre-order'
	if (state === 'out') return 'p-card--out'
	return ''
}

// Наявність для schema.org: PreOrder — окремий стан, і пошуковики його розуміють,
// тож видима кнопка «Передзамовлення» і розмітка ніколи не розходяться
export function stockAvailability(state: StockState): string {
	if (state === 'in') return 'https://schema.org/InStock'
	if (state === 'pre_order') return 'https://schema.org/PreOrder'
	return 'https://schema.org/OutOfStock'
}

// Знижка у відсотках
export function discountPercent(price?: number | null, priceOld?: number | null): number {
	if (!price || !priceOld || priceOld <= price) return 0
	return Math.round(((priceOld - price) / priceOld) * 100)
}
