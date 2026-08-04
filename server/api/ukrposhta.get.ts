// Проксі до класифікатора адрес Укрпошти.
//
// Навіщо проксі: класифікатор віддає 403 на будь-який запит із заголовком Origin
// (і на preflight OPTIONS теж), а Access-Control-Allow-Origin у відповіді немає —
// тобто з браузера fetch туди неможливий у принципі. Із сервера той самий URL
// відповідає 200, бо Origin ми не надсилаємо.
//
// Кеш у пам'яті: довідник відділень майже статичний, а один індекс перепитують
// підряд (правка цифри в полі → повторний запит).

const UP_API = 'https://www.ukrposhta.ua/address-classifier/get_postoffices_by_postindex'

// Індексів у країні ~30 тис., реально запитують кілька сотень — тримаємо стелю, щоб
// пам'ять процесу не росла необмежено, і чистимо найстаріші записи.
const CACHE_TTL = 24 * 60 * 60 * 1000
const CACHE_MAX = 500

const cache = new Map<string, { xml: string; at: number }>()

export default defineEventHandler(async (event) => {
	const index = String(getQuery(event).pi || '')

	// Формат індексу перевіряємо тут, а не тільки на клієнті: роут публічний
	if (!/^\d{5}$/.test(index)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid post index' })
	}

	const hit = cache.get(index)
	if (hit && Date.now() - hit.at < CACHE_TTL) {
		setHeader(event, 'content-type', 'text/xml; charset=utf-8')
		return hit.xml
	}

	let xml: string
	try {
		xml = await $fetch<string>(UP_API, {
			params: { pi: index },
			responseType: 'text',
			timeout: 8000,
		})
	} catch {
		// Класифікатор недоступний — віддаємо порожню відповідь замість 500:
		// на клієнті це дасть той самий шлях, що й «індекс не знайдено» (ручний ввід адреси)
		setHeader(event, 'content-type', 'text/xml; charset=utf-8')
		return '<Entries/>'
	}

	if (cache.size >= CACHE_MAX) {
		const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
		if (oldest) cache.delete(oldest[0])
	}
	cache.set(index, { xml, at: Date.now() })

	setHeader(event, 'content-type', 'text/xml; charset=utf-8')
	setHeader(event, 'cache-control', 'public, max-age=86400')
	return xml
})
