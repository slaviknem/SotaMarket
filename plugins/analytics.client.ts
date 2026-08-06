// Лічильники поза критичним шляхом.
// Скрипти GA4/GTM/Pixel важать сотні кілобайт і виконуються в тому ж потоці, що й рендер,
// тому стартують ПІСЛЯ повного завантаження сторінки (window load), коли браузер простоює —
// або одразу на першу взаємодію, якщо вона сталася раніше. Той самий підхід, що й у чат-віджета.
// До цього моменту статистика не втрачається: події лягають у черги лічильників (useAnalytics).

export default defineNuxtPlugin((nuxtApp) => {
	const { enabled, setupQueues, loadScripts, pageView } = useAnalytics()
	if (!enabled) return

	setupQueues()

	// Перегляди: стартовий (після гідрації) + кожен SPA-перехід.
	// Пауза перед відправкою — щоб у page_title потрапив уже новий title сторінки,
	// який usePageSeo проставляє після навігації. Дедуплікація за fullPath.
	const router = useRouter()
	let lastPath = ''
	const send = () => {
		const path = router.currentRoute.value.fullPath
		if (path === lastPath) return
		lastPath = path
		pageView(path)
	}
	nuxtApp.hooks.hookOnce('app:suspense:resolve', () => setTimeout(send, 300))
	router.afterEach(() => setTimeout(send, 300))

	// Відкладений старт самих скриптів
	const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
	const start = () => {
		events.forEach((e) => window.removeEventListener(e, start))
		loadScripts()
	}
	events.forEach((e) => window.addEventListener(e, start, { passive: true }))

	const schedule = () => {
		if ('requestIdleCallback' in window) (window as any).requestIdleCallback(start, { timeout: 3000 })
		else setTimeout(start, 2000)
	}
	if (document.readyState === 'complete') schedule()
	else window.addEventListener('load', schedule, { once: true })
})
