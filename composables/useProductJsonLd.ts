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
	images: ComputedRef<string[]>
	variantImages: ComputedRef<string[]>
	breadcrumbs: ComputedRef<{ title: string; url?: string }[]>
}) {
	const config = useRuntimeConfig()
	const localePath = useLocalePath()
	const url = useUrl()
	const { variantTitle, variantLead } = useProductNaming(opts.product)

	// Абсолютний URL товару (з мовним префіксом), опційно — конкретного варіанта
	const linkTo = (attr?: any) => url.absolute(url.product(opts.product.value, attr?.alias))

	// priceValidUntil і seller — вимоги товарних сніпетів: без дати Google вважає ціну
	// протермінованою і ховає її, а seller через @id зшиває пропозицію з магазином
	// (його контакти й політика повернення оголошені один раз у app.vue).
	const offerFor = (attr: any | null, offerUrl: string) => ({
		'@type': 'Offer',
		url: offerUrl,
		priceCurrency: 'UAH',
		price: opts.product.value?.price,
		priceValidUntil: priceValidUntil(),
		itemCondition: 'https://schema.org/NewCondition',
		availability: isProductInStock(opts.product.value, attr)
			? 'https://schema.org/InStock'
			: 'https://schema.org/OutOfStock',
		seller: orgId(config.public.siteUrl as string),
	})

	// Ознака, якою відрізняються варіанти: принт (pattern) чи колір (color)
	const variesByProp = (attr: any) =>
		isPrintAttribute(attr) ? { pattern: attr.title } : { color: attr.title }

	useJsonLd(() => {
		const product = opts.product.value
		if (!product) return []

		const attrs = opts.attributes.value
		const attr = opts.selectedAttribute.value
		const groupId = String(product.id)

		// Група має сенс лише коли є з чого вибирати: один атрибут — це просто товар
		const hasVariants = attrs.length > 1

		const base = {
			'@context': 'https://schema.org',
			description: product.description_short || '',
			brand: {
				'@type': 'Brand',
				name: product.categories?.[0]?.brend_name || config.public.siteName,
			},
			// Відгуки + зведений рейтинг (лише з реальних даних)
			...reviewsJsonLd(product.reviews),
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
				variesBy: [
					...(attrs.some(isPrintAttribute) ? ['https://schema.org/pattern'] : []),
					...(attrs.some((a: any) => !isPrintAttribute(a)) ? ['https://schema.org/color'] : []),
				],
				hasVariant: attrs.map((a: any) => ({
					'@type': 'Product',
					name: variantTitle(a),
					sku: `${groupId}-${a.id}`,
					url: linkTo(a),
					image: url.productBig(getImageByAttribute(product, a.id)),
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
	useJsonLd(() => {
		const crumbs = [{ title: config.public.siteName, url: localePath('/') }, ...opts.breadcrumbs.value]

		return {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: crumbs.map((crumb, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: crumb.title,
				...(crumb.url ? { item: url.absolute(crumb.url) } : {}),
			})),
		}
	})
}
