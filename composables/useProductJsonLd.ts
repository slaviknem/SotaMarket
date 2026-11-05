// Schema.org для сторінки товару — головне джерело розуміння товару для пошуковиків і AI.
//
// Три форми розмітки (як Google рекомендує для товарів з варіантами):
//  • товар без атрибутів      → Product
//  • сторінка товару          → ProductGroup + hasVariant: кожен принт/колір — окремий Product
//                               зі своїм URL, фото, sku та наявністю
//  • сторінка варіанта /attr/ → Product цього варіанта + inProductGroupWithID (звʼязок із групою)
// Плюс BreadcrumbList (структура каталогу).

export function useProductJsonLd(opts: {
	product: Ref<any>
	attributes: ComputedRef<any[]>
	selectedAttribute: ComputedRef<any>
	// URL показує конкретний варіант: сторінка /attr/… або вибір принта на сторінці товару
	isVariantPage: ComputedRef<boolean>
	pageTitle: ComputedRef<string>
	// Той самий опис, що в meta description: у частини товарів немає description_short,
	// а ProductGroup без опису Google позначає як неповний
	description: ComputedRef<string>
	images: ComputedRef<string[]>
	variantImages: ComputedRef<string[]>
	breadcrumbs: ComputedRef<{ title: string; url?: string }[]>
}) {
	const config = useRuntimeConfig()
	const url = useUrl()
	const { variantTitle, variantLead } = useProductNaming(opts.product)

	// Абсолютний URL товару (з мовним префіксом), опційно — конкретного варіанта
	const linkTo = (attr?: any) => url.absolute(url.product(opts.product.value, attr?.alias))

	// Продавець, повернення й доставка — посилання через @id на вузли магазину в app.vue
	const offerFor = (attr: any | null, offerUrl: string) => ({
		'@type': 'Offer',
		url: offerUrl,
		priceCurrency: 'UAH',
		price: opts.product.value?.price,
		itemCondition: 'https://schema.org/NewCondition',
		availability: stockAvailability(productStockState(opts.product.value, attr)),
		...offerShop(config.public.siteUrl as string),
	})

	// Вісь, якою відрізняються варіанти. Google вимагає КОЖНУ властивість із variesBy у КОЖНОГО
	// варіанта (інакше критична помилка «Отсутствует поле pattern/color» і товар випадає з
	// видачі), тож вісь у групи одна: є хоч один принт → pattern, інакше color.
	const groupAxis = computed(() => (opts.attributes.value.some(isPrintAttribute) ? 'pattern' : 'color'))

	// Однотонний варіант у групі принтів — теж «візерунок» (його колір), а color лишаємо
	// додатковою властивістю. Без назви — alias: порожнє значення Google теж рахує відсутнім.
	const variesByProp = (attr: any) => {
		const name = attr.title || attr.alias
		return { [groupAxis.value]: name, ...(isPrintAttribute(attr) ? {} : { color: name }) }
	}

	useJsonLd(() => {
		const product = opts.product.value
		if (!product) return []

		const attrs = opts.attributes.value
		const attr = opts.selectedAttribute.value
		const groupId = String(product.id)

		// Група має сенс лише коли є з чого вибирати: один атрибут — це просто товар
		const hasVariants = attrs.length > 1

		// Модель телефону — це сумісність, а не бренд: «brand: Apple» на чохлі Nova вводив в
		// оману і Google, і AI. Для чохлів і скла під модель бренд — магазин (власний друк або
		// товар без бренду), а модель іде в isAccessoryOrSparePartFor — як на сторінках неопрінтів
		const model = product.categories?.[0]
		const forModel = model?.type === 'model'

		const base = {
			'@context': 'https://schema.org',
			description: opts.description.value,
			brand: {
				'@type': 'Brand',
				name: (!forModel && model?.brend_name) || config.public.siteName,
			},
			...(forModel && (model.name_full || model.name)
				? {
						isAccessoryOrSparePartFor: {
							'@type': 'Product',
							name: model.name_full || model.name,
							...(model.brend_name ? { brand: { '@type': 'Brand', name: model.brend_name } } : {}),
						},
					}
				: {}),
			// Відгуки + зведений рейтинг (лише з реальних даних і лише з увімкненим розділом відгуків — інакше
			// їх не видно на сторінці, а розмітка має збігатися з видимим)
			...(useFeatures().reviews ? reviewsJsonLd(product.reviews) : {}),
		}

		// Сторінка конкретного принта/кольору
		if (opts.isVariantPage.value && attr) {
			return {
				...base,
				// Опис — власний лід варіанта, а не спільний description_short товару
				description: variantLead(attr),
				'@type': 'Product',
				name: opts.pageTitle.value,
				url: linkTo(attr),
				image: opts.variantImages.value,
				sku: `${groupId}-${attr.id}`,
				...(hasVariants ? { inProductGroupWithID: groupId } : {}),
				...variesByProp(attr),
				offers: offerFor(attr, linkTo(attr)),
			}
		}

		// Товар з варіантами: група + повний перелік варіантів (у кожного свій URL — це вони
		// й потрапляють у видачу як окремі сторінки принтів)
		if (hasVariants) {
			return {
				...base,
				'@type': 'ProductGroup',
				name: product.title,
				url: linkTo(),
				image: opts.images.value,
				productGroupID: groupId,
				variesBy: [`https://schema.org/${groupAxis.value}`],
				hasVariant: attrs.map((a: any) => ({
					'@type': 'Product',
					name: variantTitle(a),
					sku: `${groupId}-${a.id}`,
					url: linkTo(a),
					image: url.productSeoImage(getImageByAttribute(product, a.id), 's600', product),
					...variesByProp(a),
					offers: offerFor(a, linkTo(a)),
				})),
				// Ціна однакова для всіх варіантів, а товар купують і з цієї сторінки
				offers: offerFor(attr, linkTo()),
			}
		}

		// Товар без вибору: без атрибутів або з єдиним (його колір/принт лишаємо як властивість)
		return {
			...base,
			'@type': 'Product',
			name: product.title,
			url: linkTo(),
			image: opts.images.value,
			sku: groupId,
			...(attr ? variesByProp(attr) : {}),
			offers: offerFor(attr ?? null, linkTo()),
		}
	})

	// Хлібні крихти (Бренд → Модель → Товар) — структура каталогу для пошуковиків і AI
	useBreadcrumbsJsonLd(opts.breadcrumbs)
}
