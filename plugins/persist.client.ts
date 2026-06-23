// Персистенція кошика / wishlist / compare у localStorage (тільки клієнт)

export default defineNuxtPlugin(() => {
	const cart = useCartState()
	const { items: wishlist } = useWishlist()
	const { items: compare } = useCompare()

	const load = (key: string) => {
		try {
			const raw = localStorage.getItem(key)
			return raw ? JSON.parse(raw) : null
		} catch {
			return null
		}
	}

	const savedCart = load('floy_cart')
	if (savedCart?.items) cart.value = savedCart

	const savedWishlist = load('floy_wishlist')
	if (Array.isArray(savedWishlist)) wishlist.value = savedWishlist

	const savedCompare = load('floy_compare')
	if (Array.isArray(savedCompare)) compare.value = savedCompare

	watch(cart, (v) => localStorage.setItem('floy_cart', JSON.stringify(v)), { deep: true })
	watch(wishlist, (v) => localStorage.setItem('floy_wishlist', JSON.stringify(v)), { deep: true })
	watch(compare, (v) => localStorage.setItem('floy_compare', JSON.stringify(v)), { deep: true })
})
