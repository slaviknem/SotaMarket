// NeoPrint — готовий дизайн для друку на чохлі.
//
// Це не товар у БД, а атрибут (type=neo_print), прив'язаний до фільтра-теми (BMW, Аніме…).
// «Товар» народжується на перетині дизайну і моделі: шаблон принта + маска моделі.
// Бекенд робить цю композицію картинкою лише для alphaprint-товарів; для дизайнів
// ми збираємо її самі — у верстці через CSS (NeoPrintImage), одним файлом — через
// Nitro-роут /img/neoprint/… (og:image, JSON-LD, прев'ю в кошику).

// Текст-шаблон дизайну містить плейсхолдери моделі — ті самі, що підставляє бекенд
// при генерації alphaprint-товарів (App\Actions\Generate\AlphaPrint).
export function fillModelPlaceholders(text: string | null | undefined, category: any): string {
	if (!text) return ''

	// #model# — повна назва («iPhone 11»); #model_uk#/#model_ru# — локалізована («Еппл 11»);
	// API категорії віддає лише одне локалізоване поле (title_rus) — за поточною локаллю.
	const full = category?.title_full || category?.title || ''
	const localized = category?.title_rus || full

	return text
		.replace(/#model#/g, full)
		.replace(/#model_uk#/g, localized)
		.replace(/#model_ru#/g, localized)
		.replace(/#brend#/g, category?.brend?.title || '')
}

// Перемежовуємо кілька списків по колу — щоб добірка показувала різні теми/бренди,
// а не всі дизайни одного бренду поспіль. Спільне для сторінки фільтра, дизайну і конструктора.
export function interleave<T>(lists: T[][]): T[] {
	const out: T[] = []
	const longest = Math.max(0, ...lists.map((l) => l.length))
	for (let i = 0; i < longest; i++) {
		for (const list of lists) if (i < list.length) out.push(list[i])
	}
	return out
}

export function useNeoPrint() {
	const { t } = useI18n()
	const url = useUrl()
	const cart = useCart()
	const config = useRuntimeConfig()
	const { openCart } = useCartDrawer()
	const { openPreOrder } = usePreOrder()

	const price = computed(() => config.public.neoprintPrice as number)
	const priceOld = computed(() => config.public.neoprintPriceOld as number)

	// Назва варіанта: «Чохол для iPhone 11 з картинкою «BMW Performance стиль»»
	const title = (np: { title: string }, category: any) =>
		t('neoprint.title', {
			model: category?.title_full || category?.title || '',
			print: np.title,
		})

	// Опис зі шаблона дизайну з підставленою моделлю
	const description = (np: any, category: any, locale: string) =>
		fillModelPlaceholders(locale === 'ru' ? np?.description_ru : np?.description_uk, category)

	// У кошик: віртуальний товар (product_id = 0), але з реальним attribute_id дизайну —
	// так замовлення прив'язується до конкретного принта в БД адмінки.
	// printcase — оригінальний jpg повного шаблона (1100×2100), саме він іде у друк.
	function addToCart(np: { id: number; alias: string | number; title: string }, category: any) {
		cart.add({
			product: {
				id: 0,
				alias: String(np.id),
				alias_cat: `neoprint/${category.alias}`,
				title: title(np, category),
				price: price.value,
				price_old: priceOld.value,
			},
			attribute: np.id,
			image: url.neoprintImage(category.alias, np.alias),
			printcase: url.neoprintTemplateSource(np.alias),
			categoryId: category.id,
		})

		openCart()
	}

	// Дизайн друкують під конкретну модель, тож наявність тут — статус самої моделі
	// (categories.alphaprint_available), а не склад: власного залишку в дизайна немає
	const stock = (category: any) => printStockState(category)

	// Модель у передзамовленні: у кошик не кладемо, а оформлюємо замовлення type=pre_order
	// з тим самим макетом, що пішов би у друк
	function preOrder(np: { id: number; alias: string | number; title: string }, category: any) {
		openPreOrder({
			price: price.value,
			buildItem: () => ({
				product_id: 0,
				title: title(np, category),
				attribute_id: np.id,
				count: 1,
				price: price.value,
				discount: 0,
				image_file: url.absolute(url.neoprintImage(category.alias, np.alias)),
				printcase: url.neoprintTemplateSource(np.alias),
				category_id: category.id,
			}),
		})
	}

	// Одна дія для картки й сторінки дизайну: кошик або передзамовлення — за станом моделі
	function buy(np: { id: number; alias: string | number; title: string }, category: any) {
		const state = stock(category)
		if (state === 'out') return // модель знято з друку — замовляти нічого
		if (state === 'pre_order') preOrder(np, category)
		else addToCart(np, category)
	}

	return { price, priceOld, title, description, stock, addToCart, preOrder, buy }
}
