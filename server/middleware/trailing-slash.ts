// 301 з адреси зі скісною рискою в кінці на адресу без неї.
//
// vue-router нестрого порівнює шляхи, тож `/iphone-17-pro-max/` віддавав повноцінні 200 із
// самопосилальним canonical — тобто той самий товар мав дві канонічні адреси. Зовнішні
// посилання зі скісною (стара розсилка, чужий каталог) створювали дубль у видачі.
//
// Регістр НЕ нормалізуємо: в базі є легітимні alias із великими літерами
// (модель `zte-blade-a53-Pro`, атрибут `Blue2`), і lowercase-редирект поламав би їх.

export default defineEventHandler((event) => {
	const url = event.node.req.url || ''
	if (!url.startsWith('/')) return

	const [path, query] = url.split('?')

	// Корінь і мовний корінь чіпати нема чого, статику й API — теж
	if (path === '/' || !path.endsWith('/')) return
	if (/^\/(?:_nuxt|_ipx|api|img|fonts|images)\//.test(path)) return

	const clean = path.replace(/\/+$/, '')
	if (!clean) return

	return sendRedirect(event, clean + (query ? `?${query}` : ''), 301)
})
