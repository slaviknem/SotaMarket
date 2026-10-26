// Логіка картки товару в сітках: фото, назва й посилання (картка-варіант — /attr/{alias}), знижка,
// кольори, наявність, купівля (кошик або передзамовлення), обране й порівняння.
// Вигляд — components/ProductCard.vue; бренд перекриває його своїм (brand/components/ProductCard.vue)
// і бере ту саму логіку звідси — «дизайн окремо, логіка спільна».

// attribute — режим картки-варіанта (сторінки фільтрів): назва з кольором, фото
// і посилання ведуть на сторінку атрибута /attr/{alias}
export interface IProductCardProps {
	product: any
	attribute?: any
}

export function useProductCard(props: IProductCardProps) {
	const { t } = useI18n()
	const url = useUrl()
	const cart = useCart()
	const { openCart } = useCartDrawer()
	const { openPreOrder } = usePreOrder()
	const wishlist = useWishlist()
	const compare = useCompare()

	// images[] є у відповідях API; для збережених карток (wishlist/compare) — image_file
	const imageFile = computed(
		() =>
			getImageByAttribute(props.product, props.attribute?.id ?? props.product.attribute_id) ??
			props.product.image_file
	)

	// Альфапринт — кадр на льоту 300×300 (як thumb адмінки); файл сховища лишається запасним
	const cardImage = computed(() => url.productThumbImage(imageFile.value, props.product))

	const cardTitle = computed(() =>
		props.attribute ? `${props.product.title} (${props.attribute.title})` : props.product.title
	)

	const cardLink = computed(() => url.product(props.product, props.attribute?.alias))

	const discount = computed(() => discountPercent(props.product.price, props.product.price_old))

	const colorAttributes = computed(() =>
		props.attribute
			? []
			: sortedAttributes(props.product.attributes).filter((a: any) => a.type === 'color' || a.type === 'print')
	)

	// Наявність картки: у режимі варіанта — за його атрибутом, інакше за товаром загалом
	// (альфапринт на моделі pre_order лишається купівельним, якщо хоч один принт є на складі)
	const stock = computed(() => productStockState(props.product, props.attribute || null))

	// Атрибут, який купують із картки: у режимі варіанта — його власний, інакше перший у наявності
	const buyAttribute = computed(() => {
		const attrs = sortedAttributes(props.product.attributes)
		return props.attribute || attrs.find((a: any) => isAttrInStock(props.product, a)) || attrs[0] || null
	})

	const buyTitle = computed(() =>
		stock.value === 'in'
			? t('product.inCart')
			: stock.value === 'pre_order'
				? t('quick.quickPreOrder')
				: t('product.notStock')
	)

	function buy() {
		if (stock.value === 'out') return
		stock.value === 'in' ? addToCart() : preOrder()
	}

	function addToCart() {
		const p = props.product
		const attributeId = buyAttribute.value?.id || 0

		cart.add({
			product: p,
			attribute: attributeId,
			image: getImageByAttribute(p, attributeId),
			attribTitle: buyAttribute.value?.title || '',
			categoryId: p.categories?.[0]?.id,
		})

		// Замість тосту — відкриваємо слайдер-кошик зі складом замовлення
		openCart()
	}

	// Товару зараз немає: замість кошика — модалка передзамовлення (замовлення type=pre_order)
	function preOrder() {
		const p = props.product
		openPreOrder({
			price: p.price,
			buildItem: () => ({
				product_id: p.id,
				title: cardTitle.value,
				attribute_id: buyAttribute.value?.id || 0,
				count: 1,
				price: p.price,
				discount: 0,
				image_file: url.orderImage(imageFile.value),
				category_id: p.categories?.[0]?.id,
			}),
		})
	}

	const toggleWishlist = () => wishlist.toggle(props.product)
	const toggleCompare = () => compare.toggle(props.product)

	return {
		wishlist,
		compare,
		cardImage,
		cardTitle,
		cardLink,
		discount,
		colorAttributes,
		stock,
		buyTitle,
		buy,
		toggleWishlist,
		toggleCompare,
	}
}
