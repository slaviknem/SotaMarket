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
			email: 'info@floy.com.ua',
			printcasePrice: 289,
			printcasePriceOld: 299,
		},
	},

	app: {
		head: {
			meta: [
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ name: 'theme-color', content: '#0d0d10' },
			],
			link: [
				{ rel: 'icon', type: 'image/png', href: '/favicon.png' },
				{ rel: 'preconnect', href: 'https://admin.floy.com.ua' },
				{ rel: 'dns-prefetch', href: 'https://admin.floy.com.ua' },
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
				{
					rel: 'stylesheet',
					href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
				},
			],
		},
	},

	css: ['~/assets/css/main.css'],

	i18n: {
		baseUrl: process.env.SITE_URL || 'https://floy.com.ua',
		locales: [
			{ code: 'ru', language: 'ru', file: 'ru.json', name: 'Рус' },
			{ code: 'uk', language: 'uk', file: 'uk.json', name: 'Укр' },
		],
		defaultLocale: 'ru',
		strategy: 'prefix_except_default',
		detectBrowserLanguage: false,
		bundle: {
			optimizeTranslationDirective: false,
		},
	},

	nitro: {
		compressPublicAssets: true,
	},
})
