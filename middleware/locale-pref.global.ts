// Повертаємо користувача до раніше обраної мови.
//
// Працює тільки на SSR (перший запит документа): у SPA-навігації всі посилання й так
// локалізовані через localePath, тож на клієнті перевіряти нічого.
//
// SEO: редирект залежить від cookie, тому (1) віддаємо 302, а не 301 — сигнали лишаються
// за оригінальним URL; (2) пошуковим ботам не редиректимо взагалі — вони мають бачити рівно
// ту сторінку, яку запросили; (3) canonical/hreflang не чіпаємо — вони самопосилальні.

const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|duckduck|baidu|facebookexternalhit|embedly|lighthouse|headless|preview/i

export default defineNuxtRouteMiddleware((to) => {
	if (!import.meta.server) return

	const event = useRequestEvent()
	if (!event) return

	// Одна адреса може віддати і 200, і 302 — залежно від cookie. Попереджаємо проксі/CDN,
	// щоб редирект не потрапив у спільний кеш.
	const res = event.node.res
	const vary = String(res.getHeader('Vary') || '')
	if (!/cookie/i.test(vary)) res.setHeader('Vary', vary ? `${vary}, Cookie` : 'Cookie')

	const pref = useLocaleCookie()
	if (!pref.value) return

	if (BOT_RE.test(event.node.req.headers['user-agent'] || '')) return

	if (localeOfPath(to.path) === pref.value) return

	return navigateTo(
		{ path: pathForLocale(to.path, pref.value), query: to.query, hash: to.hash },
		{ redirectCode: 302 }
	)
})
