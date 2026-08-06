// Лічильники аналітики (GA4 / Google Tag Manager / Meta Pixel).
// Тут лише логіка — «коли» вантажити вирішує plugins/analytics.client.ts (після завантаження
// сторінки). Сенс розділення: черги лічильників створюються одразу (0 запитів у мережу), тож
// track() можна викликати будь-коли — події, що сталися до підвантаження скриптів, лягають
// у чергу провайдера й відправляться, щойно лічильник ожив.

export type AnalyticsIds = {
	ga4: string
	gtm: string
	metaPixel: string
	dev: boolean
}

declare global {
	interface Window {
		dataLayer?: any[]
		gtag?: (...args: any[]) => void
		fbq?: any
		_fbq?: any
	}
}

// GA4-назва події → стандартна подія Meta Pixel. Для решти йде trackCustom,
// бо Pixel рахує «своїми» лише фіксований список назв.
const FB_EVENTS: Record<string, string> = {
	view_item: 'ViewContent',
	add_to_cart: 'AddToCart',
	add_to_wishlist: 'AddToWishlist',
	begin_checkout: 'InitiateCheckout',
	purchase: 'Purchase',
	search: 'Search',
	generate_lead: 'Lead',
}

// Модульний прапорець (а не ref у composable): скрипти вантажимо рівно один раз на сторінку
let scriptsRequested = false

export function useAnalytics() {
	const ids = useRuntimeConfig().public.analytics as AnalyticsIds

	const has = (v?: string) => Boolean(v && v.trim())
	// У dev мовчимо, щоб не засмічувати статистику локальними переглядами (ANALYTICS_DEV=1 — увімкнути)
	const enabled =
		import.meta.client &&
		(!import.meta.dev || ids.dev) &&
		(has(ids.ga4) || has(ids.gtm) || has(ids.metaPixel))

	// Заглушки-черги. Створюються одразу при гідрації: це кілька рядків JS без жодного
	// мережевого запиту, зате нічого не губиться до приходу самих лічильників.
	function setupQueues() {
		window.dataLayer = window.dataLayer || []

		if (!window.gtag) {
			// Саме function, не стрілка: gtag складає у чергу власний arguments
			window.gtag = function () {
				window.dataLayer!.push(arguments)
			}
		}

		if (has(ids.ga4)) {
			window.gtag('js', new Date())
			// send_page_view: false — перегляди шлемо вручну (pageView), інакше на SPA-переходах
			// їх не було б узагалі, а на старті вони б дублювалися.
			// ВАЖЛИВО: у налаштуваннях потоку GA4 вимкни «Зміни сторінки на основі подій історії
			// браузера» (Enhanced measurement), інакше перегляди рахуватимуться двічі.
			window.gtag('config', ids.ga4, { send_page_view: false })
		}

		if (has(ids.gtm)) window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

		if (has(ids.metaPixel) && !window.fbq) {
			const fbq: any = function () {
				fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments)
			}
			fbq.queue = []
			fbq.loaded = true
			fbq.version = '2.0'
			window.fbq = window._fbq = fbq
			window.fbq('init', ids.metaPixel)
		}
	}

	// Самі скрипти — async, без блокування рендера. Викликається відкладено (див. плагін).
	function loadScripts() {
		if (!enabled || scriptsRequested) return
		scriptsRequested = true

		const add = (src: string) => {
			const s = document.createElement('script')
			s.async = true
			s.src = src
			document.head.appendChild(s)
		}

		// Потрібен, як правило, ЛИШЕ один із двох: або GTM (з GA4-тегом усередині нього),
		// або GA4 напряму. Обидва з тим самим потоком = подвійні перегляди.
		if (has(ids.gtm)) add(`https://www.googletagmanager.com/gtm.js?id=${ids.gtm}`)
		if (has(ids.ga4)) add(`https://www.googletagmanager.com/gtag/js?id=${ids.ga4}`)
		if (has(ids.metaPixel)) add('https://connect.facebook.net/en_US/fbevents.js')
	}

	// Перегляд сторінки: стартовий і на кожному SPA-переході
	function pageView(path?: string) {
		if (!enabled) return
		const url = path || location.pathname + location.search

		if (has(ids.ga4)) {
			window.gtag?.('event', 'page_view', {
				page_path: url,
				page_location: location.origin + url,
				page_title: document.title,
			})
		}
		// У GTM під це треба тригер на користувацьку подію page_view
		if (has(ids.gtm)) {
			window.dataLayer?.push({ event: 'page_view', page_path: url, page_title: document.title })
		}
		if (has(ids.metaPixel)) window.fbq?.('track', 'PageView')
	}

	// Довільна подія в усі підключені лічильники: track('add_to_cart', { value: 289, currency: 'UAH' })
	function track(name: string, params: Record<string, any> = {}) {
		if (!enabled) return

		if (has(ids.ga4)) window.gtag?.('event', name, params)
		if (has(ids.gtm)) window.dataLayer?.push({ event: name, ...params })
		if (has(ids.metaPixel)) {
			const fb = FB_EVENTS[name]
			window.fbq?.(fb ? 'track' : 'trackCustom', fb || name, params)
		}
	}

	return { enabled, setupQueues, loadScripts, pageView, track }
}
