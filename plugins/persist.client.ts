// Персистенція кошика / wishlist / compare у localStorage (тільки клієнт)

export default defineNuxtPlugin((nuxtApp) => {
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

	// Відновлюємо стан лише ПІСЛЯ гідрації (hookOnce — щоб не повторювалось на переходах).
	// Якщо підставити збережений кошик до першого клієнтського рендера, він розійдеться
	// з SSR-розміткою (сервер про localStorage не знає) → Vue warn «Hydration node mismatch»:
	// лічильник у шапці, активні сердечка/порівняння на картках тощо.
	nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
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
})
