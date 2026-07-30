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

export function useNeoPrint() {
	const { t } = useI18n()
	const url = useUrl()
	const cart = useCart()
	const config = useRuntimeConfig()
	const { openCart } = useCartDrawer()

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

	return { price, priceOld, title, description, addToCart }
}
