// Wishlist та Compare — прості списки товарів з персистенцією

export function useWishlist() {
	const items = useState<any[]>('wishlist', () => [])

	function toggle(product: any) {
		const idx = items.value.findIndex((p) => p.id === product.id)
		if (idx >= 0) items.value.splice(idx, 1)
		else items.value.push(productCard(product))
	}

	function remove(id: number) {
		items.value = items.value.filter((p) => p.id !== id)
	}

	const has = (id: number) => items.value.some((p) => p.id === id)

	return { items, toggle, remove, has }
}

export function useCompare() {
	const items = useState<any[]>('compare', () => [])

	function toggle(product: any) {
		const idx = items.value.findIndex((p) => p.id === product.id)
		if (idx >= 0) items.value.splice(idx, 1)
		else items.value.push(productCard(product))
	}

	function remove(id: number) {
		items.value = items.value.filter((p) => p.id !== id)
	}

	const has = (id: number) => items.value.some((p) => p.id === id)

	return { items, toggle, remove, has }
}

// Зберігаємо тільки потрібні поля (щоб не роздувати localStorage)
function productCard(p: any) {
	return {
		id: p.id,
		alias: p.alias,
		alias_cat: p.alias_cat,
		title: p.title,
		price: p.price,
		price_old: p.price_old,
		image_file: p.image_file,
		available: p.available,
		description_short: p.description_short,
	}
}

// Нотифікації
export interface AppNotification {
	id: number
	type: 'success' | 'error' | 'info'
	text: string
}

let noteId = 0

export function useNotify() {
	const notes = useState<AppNotification[]>('notifications', () => [])

	function notify(type: AppNotification['type'], text: string) {
		const id = ++noteId
		notes.value.push({ id, type, text })
		if (import.meta.client) {
			setTimeout(() => {
				notes.value = notes.value.filter((n) => n.id !== id)
			}, 3500)
		}
	}

	return { notes, notify }
}
