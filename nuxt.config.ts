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
			site: 'floy',
			siteName: 'FLOY',
			phone: '099 072 14 12',
			phones: ['099 072 14 12', '098 072 14 12', '093 072 14 12'],
			address: 'м. Полтава, проспект Віталія Грицаєнка, 15А',
			// Та сама адреса по частинах — для PostalAddress у schema.org (app.vue),
			// щоб не дублювати літерали в розмітці
			addressCity: 'Полтава',
			addressStreet: 'проспект Віталія Грицаєнка, 15А',
			email: 'info@floy.com.ua',
			// Месенджери (кнопки швидкого переходу в онлайн-чаті)
			telegram: 'https://t.me/floyshop',
			viber: 'viber://chat?number=%2B380990721412',
			whatsapp: 'https://wa.me/380990721412',
			// Соцпрофілі: одне джерело для іконок у футері (SocialLinks) і для sameAs
			// у schema.org (app.vue) — інакше два списки роз'їхались би
			instagram: 'https://www.instagram.com/floy.com.ua/',
			facebook: 'https://www.facebook.com/floy.com.ua',
			youtube: 'https://www.youtube.com/channel/UCmxlccT0fGh6hF79LSKYIPQ',
			printcasePrice: 289,
			printcasePriceOld: 299,
			// Готовий дизайн (NeoPrint) — дешевший за індивідуальний друк у конструкторі
			neoprintPrice: 259,
			neoprintPriceOld: 299,
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

	css: ['~/assets/css/main.css'],

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
		// ⛔ ТЕСТОВИЙ РЕЖИМ: увесь сайт закритий від індексації.
		// ПЕРЕД ЗАПУСКОМ — прибрати цей рядок і повернути прод-версію public/robots.txt.
		'/**': { headers: { 'x-robots-tag': 'noindex, nofollow' } },

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
