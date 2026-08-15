// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',

	ssr: true,

	devtools: { enabled: false },

	modules: ['@nuxtjs/i18n', '@nuxt/image'],

	image: {
		// IPX оптимізує зображення зі сховища адмінки (WebP + точні розміри + кеш)
		domains: ['admin.floy.com.ua'],
		format: ['webp'],
		quality: 80,
	},

	runtimeConfig: {
		public: {
			urlApi: process.env.URL_API || 'https://admin.floy.com.ua/apisite/',
			urlStorage: process.env.URL_STORAGE || 'https://admin.floy.com.ua/storage/',
			siteUrl: process.env.SITE_URL || 'https://floy.com.ua',
			// Ключ сайту: з ним ідуть усі запити до apisite і за ним же беруться
			// налаштування цього сайту (composables/useSiteSettings.ts)
			site: 'floy',
			siteName: 'FLOY',
			// Ціни, доставка, телефони, адреса та соцмережі сюди НЕ повертати — вони
			// редагуються в адмінці (вузол public.floy) і приїжджають через useSiteSettings.
			// Тут лишається тільки те, що залежить від оточення, а не від бізнесу.
			// Лічильники аналітики. Порожній ID = провайдер вимкнений (жодного запиту й байта JS).
			// Самі скрипти вантажаться відкладено — plugins/analytics.client.ts.
			// Зазвичай потрібен ЛИШЕ один із двох Google-варіантів: або GTM (з GA4-тегом
			// усередині), або GA4 напряму.
			analytics: {
				ga4: process.env.GA4_ID || '', // G-XXXXXXXXXX
				gtm: process.env.GTM_ID || '', // GTM-XXXXXXX
				metaPixel: process.env.META_PIXEL_ID || '', // 15-16 цифр
				dev: process.env.ANALYTICS_DEV === '1', // рахувати й у dev (для перевірки)
			},
		},
	},

	app: {
		head: {
			meta: [
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ name: 'theme-color', content: '#0d0d10' },
			],
			link: [
				// SVG — основний (усі сучасні браузери), .ico — фолбек для старих і для
				// закладок Windows, apple-touch — іконка «на екран “Додому”» в iOS.
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
				{ rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96.png' },
				{ rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
				{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
				{ rel: 'manifest', href: '/site.webmanifest' },
				{ rel: 'preconnect', href: 'https://admin.floy.com.ua' },
				{ rel: 'dns-prefetch', href: 'https://admin.floy.com.ua' },
				// Шрифт самохоститься (@font-face — у main.css). Два набори, потрібні на кожній
				// сторінці, стартують одразу з HTML, не чекаючи розбору CSS.
				{
					rel: 'preload',
					as: 'font',
					type: 'font/woff2',
					href: '/fonts/inter-cyrillic.woff2',
					crossorigin: 'anonymous',
				},
				{
					rel: 'preload',
					as: 'font',
					type: 'font/woff2',
					href: '/fonts/inter-latin.woff2',
					crossorigin: 'anonymous',
				},
			],
		},
	},

	// Базовий CSS Swiper — глобально, а не імпортом усередині компонента: інлайнер Nuxt
	// (features.inlineStyles) кладе в SSR-HTML лише стилі самих .vue, а <link> на решту чанків
	// прибирає хук build:manifest нижче. Через це геометрії слайдера (.swiper overflow,
	// .swiper-wrapper flex, .swiper-slide width) у першому кадрі не було: слайди ставали
	// стовпчиком і схлопувалися при ініціалізації, зсуваючи весь перший екран (CLS ~0.4).
	// Модульні стилі (pagination/navigation/thumbs/zoom) лишаються в компонентах — вони
	// позиціонують лише absolute-елементи й на розкладку не впливають.
	css: ['swiper/css', '~/assets/css/main.css'],

	i18n: {
		baseUrl: process.env.SITE_URL || 'https://floy.com.ua',
		locales: [
			{ code: 'uk', language: 'uk', file: 'uk.json', name: 'Укр' },
			{ code: 'ru', language: 'ru', file: 'ru.json', name: 'Рус' },
		],
		defaultLocale: 'ru',
		strategy: 'prefix_except_default',
		detectBrowserLanguage: false,
		bundle: {
			optimizeTranslationDirective: false,
		},
		// hreflang мусить вести на канонічну адресу, інакше Google його просто ігнорує.
		// Без цієї опції alternate тягнув за собою ВЕСЬ query: на /iphone-17?filter_cases=…
		// canonical показував на базову категорію, а hreflang — на комбінацію з фільтром.
		// Тепер у alternate лишається тільки ?page — рівно те, що зберігає й наш canonical
		// (usePageSeo), тож обидва сигнали завжди збігаються.
		experimental: {
			alternateLinkCanonicalQueries: true,
		},
	},

	// Стилі вже інлайняться в SSR-HTML (features.inlineStyles), але Nuxt додатково лишає
	// <link rel="stylesheet"> на ті самі чанки — 6 запитів, що блокують рендер (~600 мс).
	// Прибираємо їх з маніфесту: на першому екрані стилі й так у HTML, а при переході
	// між сторінками CSS приїде разом зі своїм JS-чанком (deps Vite усередині бандла).
	hooks: {
		'build:manifest'(manifest) {
			for (const chunk of Object.values(manifest)) {
				if (!chunk.isEntry) chunk.css = []
			}
		},
	},

	// Статика з public/ віддавалась узагалі без Cache-Control — повторний візит
	// перезавантажував і шрифти, і картинки. Імена без хеша, тож immutable — лише
	// шрифтам (файл фіксований), решті — місяць.
	routeRules: {
		// Службові розділи (кошик, порівняння, обране, відстеження) — noindex на рівні
		// заголовка, окремо від robots.txt: там вони теж закриті, але Disallow лише
		// забороняє обхід, а вже проіндексовані адреси прибирає саме noindex.
		// Сторінки і так ставлять цей meta через usePageSeo — заголовок дублює його для
		// випадків, коли бот бачить лише HTTP-відповідь.
		'/shop/**': { headers: { 'x-robots-tag': 'noindex, follow' } },
		'/uk/shop/**': { headers: { 'x-robots-tag': 'noindex, follow' } },
		'/search': { headers: { 'x-robots-tag': 'noindex, follow' } },
		'/uk/search': { headers: { 'x-robots-tag': 'noindex, follow' } },

		'/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
		'/images/**': { headers: { 'cache-control': 'public, max-age=2592000' } },
		'/favicon.svg': { headers: { 'cache-control': 'public, max-age=2592000' } },
		'/favicon.ico': { headers: { 'cache-control': 'public, max-age=2592000' } },
		'/favicon-96.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
		'/apple-touch-icon.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
		'/icon-192.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
		'/icon-512.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
		'/icon-maskable-512.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
	},

	nitro: {
		compressPublicAssets: true,

		// Кеш зібраних композицій «дизайн + модель» (server/routes/img/neoprint) —
		// sharp відпрацьовує один раз на пару, далі віддаємо з диска
		storage: {
			neoprint: { driver: 'fs', base: './.cache/neoprint' },
		},
		devStorage: {
			neoprint: { driver: 'fs', base: './.cache/neoprint' },
		},
	},
})
