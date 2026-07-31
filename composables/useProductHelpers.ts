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

// Назва атрибута за id
export function getAttributeTitle(attributes: any[] | undefined, attributeId?: number): string {
	if (!attributes?.length || !attributeId) return ''
	const attr = attributes.find((a) => a.id === attributeId)
	return attr?.title || ''
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

// ---------- Наявність: ЄДИНА логіка для картки і сторінки товару ----------

// Чи в наявності конкретний атрибут:
// товар «завжди в наявності» → так; інакше — за реальним залишком атрибута.
export function isAttrInStock(product: any, attr: any): boolean {
	return !!product?.always_available || !!attr?.available
}

// Чи в наявності товар (опційно — з урахуванням обраного атрибута).
export function isProductInStock(product: any, selectedAttr?: any | null): boolean {
	if (product?.always_available) return true
	if (selectedAttr) return !!selectedAttr.available
	return !!product?.available
}

// Знижка у відсотках
export function discountPercent(price?: number | null, priceOld?: number | null): number {
	if (!price || !priceOld || priceOld <= price) return 0
	return Math.round(((priceOld - price) / priceOld) * 100)
}
