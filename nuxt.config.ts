// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import brandConfig from './brand/site.config'
import type { BrandConfig } from './types/brand'
import { readTheme } from './scripts/lib/brand.mjs'
import { readServerEnv } from './scripts/lib/server-env.cjs'

// Через BrandConfig: необов'язкові поля (features, font) читаються й тоді, коли в конфігу їх немає
const brand: BrandConfig = brandConfig

// Тека бренду: назва, домен, лого, палітра, тексти про магазин (brand/README.md).
// Код бере її лише через аліас #brand, тож теку можна підмінити одним рядком
const BRAND_DIR = fileURLToPath(new URL('./brand', import.meta.url))
// Власні версії компонентів бренду (brand/components/README.md): те саме ім'я перекриває рушій
const BRAND_COMPONENTS = join(BRAND_DIR, 'components')
// Шрифт, який вантажиться на кожній сторінці: preload з конфігу бренду, без нього — Inter рушія
const FONT_PRELOAD = brand.font?.preload ?? ['/fonts/inter-cyrillic.woff2', '/fonts/inter-latin.woff2']
// Сторінки вимкнених розділів (brand → features): сторінка й усі вкладені в неї. Адреса без сторінки — 404,
// або 301 з redirects
const FEATURE_PAGES: Record<string, keyof NonNullable<BrandConfig['features']>> = {
	'/otzyvy-klientov': 'reviews',
	'/article': 'blog',
}
// Кольори теми як hex — для theme-color і site.webmanifest (джерело — brand/theme.css)
const theme = readTheme(BRAND_DIR)
// Профіль сервера сайту (brand/server.env, його ж читають deploy.sh і ecosystem.config.cjs): тут — лише
// порт, щоб dev кожної копії рушія мав свій (FLOY — 3000, SMARKET — 3010); NUXT_PORT / --port перекривають
const SERVER = readServerEnv(BRAND_DIR)
// Сховище адмінки — спільне для всіх сайтів; хост для IPX і preconnect береться звідси ж
const URL_STORAGE = process.env.URL_STORAGE || 'https://admin.floy.com.ua/storage/'

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',

	ssr: true,

	devtools: { enabled: false },

	devServer: { port: Number(SERVER.PORT) || 3000 },

	modules: ['@nuxtjs/i18n', '@nuxt/image'],

	alias: {
		'#brand': BRAND_DIR,
	},

	// Компонент із тим самим іменем у brand/components (з тією ж вкладеністю: blocks/, shop/…)
	// перекриває рушій — вищий priority. Теки бренду може й не бути (сайт без власних компонентів)
	components: [
		...(existsSync(BRAND_COMPONENTS) ? [{ path: BRAND_COMPONENTS, priority: 2 }] : []),
		{ path: '~/components', priority: 1 },
	],

	image: {
		// IPX оптимізує зображення зі сховища адмінки (WebP + точні розміри + кеш)
		domains: [new URL(URL_STORAGE).hostname],
		format: ['webp'],
		quality: 80,
	},

	runtimeConfig: {
		// Сторож тестових стендів: NUXT_NOINDEX=1 в оточенні процесу → noindex на всі відповіді
		// й Disallow: / у robots.txt (server/middleware/noindex.ts, server/routes/robots.txt.ts)
		noindex: false,
		// Колір теми для site.webmanifest (сервер; у payload сторінок не потрапляє)
		brandTheme: { bg: theme.bg },
		public: {
			urlApi: process.env.URL_API || 'https://admin.floy.com.ua/apisite/',
			urlStorage: URL_STORAGE,
			siteUrl: process.env.SITE_URL || brand.url,
			// Ключ сайту: з ним ідуть усі запити до apisite і за ним же беруться
			// налаштування цього сайту (composables/useSiteSettings.ts). Ключ і назва —
			// з brand/site.config.ts; у новому коді — useBrand()
			site: brand.key,
			siteName: brand.name,
			// Ціни, доставка, телефони, адреса та соцмережі сюди НЕ повертати — вони
			// редагуються в адмінці (вузол public.floy) і приїжджають через useSiteSettings.
			// Тут лишається тільки те, що залежить від оточення, а не від бізнесу.
			// Лічильники аналітики. Порожній ID = провайдер вимкнений (жодного запиту й байта JS).
			// Самі скрипти вантажаться відкладено — plugins/analytics.client.ts.
			// Зазвичай потрібен ЛИШЕ один із двох Google-варіантів: або GTM (з GA4-тегом
			// усередині), або GA4 напряму. ID — свої в кожного сайту: brand/site.config.ts → analytics;
			// змінна оточення під час збірки перекриває (?? — порожня вимикає)
			analytics: {
				ga4: process.env.GA4_ID ?? brand.analytics?.ga4 ?? '', // G-XXXXXXXXXX
				gtm: process.env.GTM_ID ?? brand.analytics?.gtm ?? '', // GTM-XXXXXXX
				metaPixel: process.env.META_PIXEL_ID ?? brand.analytics?.metaPixel ?? '', // 15-16 цифр
				dev: process.env.ANALYTICS_DEV === '1', // рахувати й у dev (для перевірки)
			},
		},
	},

	app: {
		head: {
			meta: [
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ name: 'theme-color', content: theme.bg },
			],
			link: [
				// SVG — основний (усі сучасні браузери), .ico — фолбек для старих і для
				// закладок Windows, apple-touch — іконка «на екран “Додому”» в iOS.
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
				{ rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96.png' },
				{ rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
				{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
				{ rel: 'manifest', href: '/site.webmanifest' },
				{ rel: 'preconnect', href: new URL(URL_STORAGE).origin },
				{ rel: 'dns-prefetch', href: new URL(URL_STORAGE).origin },
				// Шрифт самохоститься (@font-face — у main.css, шрифт бренду — у brand/theme.css). Два
				// набори, потрібні на кожній сторінці, стартують одразу з HTML, не чекаючи розбору CSS.
				...FONT_PRELOAD.map(
					(href) =>
						({
							rel: 'preload',
							as: 'font',
							type: 'font/woff2',
							href,
							crossorigin: 'anonymous',
						}) as const
				),
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
	// Палітра бренду — після main.css: тема може перевизначити й структурні токени
	css: ['swiper/css', '~/assets/css/main.css', '#brand/theme.css'],

	i18n: {
		baseUrl: process.env.SITE_URL || brand.url,
		// Тексти, що описують сам магазин (title головної, «про нас» у футері…), — у brand/i18n:
		// пізніший файл перекриває ключі спільного. Шляхи — від i18n/locales
		locales: [
			{ code: 'uk', language: 'uk', files: ['uk.json', '../../brand/i18n/uk.json'], name: 'Укр' },
			{ code: 'ru', language: 'ru', files: ['ru.json', '../../brand/i18n/ru.json'], name: 'Рус' },
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

		// Вимкнений розділ бренду — без сторінки (i18n додає мовні копії вже після цього хука)
		'pages:extend'(pages) {
			for (let i = pages.length - 1; i >= 0; i--) {
				const section = '/' + pages[i].path.split('/')[1]
				const feature = FEATURE_PAGES[section]
				if (feature && brand.features?.[feature] === false) pages.splice(i, 1)
			}
		},
	},

	// Вкладка, яку лишили відкритою, сама помічає нову збірку: Nuxt звіряє id білда
	// (/_nuxt/builds/latest.json) і на найближчому переході робить повне перезавантаження
	// замість клієнтського. Стандартна година — задовго: стільки часу людина сидить зі старим
	// кодом, чиї чанки на сервері вже могли зникнути. Чверть години коштує один крихітний
	// запит на вкладку.
	experimental: {
		checkOutdatedBuildInterval: 15 * 60 * 1000,
	},

	// Статика з public/ віддавалась узагалі без Cache-Control — повторний візит
	// перезавантажував і шрифти, і картинки. Імена без хеша, тож immutable — лише
	// шрифтам (файл фіксований), решті — місяць.
	routeRules: {
		// Базові заголовки безпеки на все. Nitro зливає правила, тож кеш-заголовки нижче
		// лишаються. SAMEORIGIN — щоб сайт не можна було загорнути в чужий фрейм (clickjacking);
		// referrer — не no-referrer: аналітиці й платіжним сторінкам потрібен хоча б origin
		'/**': {
			headers: {
				'x-frame-options': 'SAMEORIGIN',
				'x-content-type-options': 'nosniff',
				'referrer-policy': 'strict-origin-when-cross-origin',
			},
		},

		// Службові розділи (кошик, порівняння, обране, відстеження) — noindex на рівні
		// заголовка, окремо від robots.txt: там вони теж закриті, але Disallow лише
		// забороняє обхід, а вже проіндексовані адреси прибирає саме noindex.
		// Сторінки і так ставлять цей meta через usePageSeo — заголовок дублює його для
		// випадків, коли бот бачить лише HTTP-відповідь.
		'/shop/**': { headers: { 'x-robots-tag': 'noindex, follow' } },
		'/uk/shop/**': { headers: { 'x-robots-tag': 'noindex, follow' } },
		'/search': { headers: { 'x-robots-tag': 'noindex, follow' } },
		'/uk/search': { headers: { 'x-robots-tag': 'noindex, follow' } },

		// «Дякуємо» з опитувальником підтвердження — особиста сторінка: телефон і склад замовлення.
		// НЕ в кеш: nginx перед Node кешує сторінки, і чужий стан (або вчорашня оплата) не має
		// віддаватись із кешу. noindex дає правило /shop/** вище — Nitro зливає обидва
		'/shop/cart/success': { headers: { 'cache-control': 'no-store, private' } },
		'/uk/shop/cart/success': { headers: { 'cache-control': 'no-store, private' } },

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

		// Статика бренду (фавікони, лого, og, верифікація Google) — з кореня сайту, як і public/.
		// Шлях абсолютний: відносні Nitro рахує від server/. Один файл не може лежати в обох теках
		publicAssets: [{ dir: join(BRAND_DIR, 'public') }],

		// Кеш зібраних композицій «принт + модель» (server/utils/caseImage.ts) — sharp відпрацьовує
		// один раз на пару, далі віддаємо з диска. Окремі теки: неопрінти (/img/neoprint) і
		// альфапринти (/img/print) — розмір і чистка кожного типу незалежні.
		// settings — остання вдала відповідь налаштувань адмінки (server/api/settings.get.ts)
		storage: {
			neoprint: { driver: 'fs', base: './.cache/neoprint' },
			alphaprint: { driver: 'fs', base: './.cache/alphaprint' },
			settings: { driver: 'fs', base: './.cache/settings' },
		},
		devStorage: {
			neoprint: { driver: 'fs', base: './.cache/neoprint' },
			alphaprint: { driver: 'fs', base: './.cache/alphaprint' },
			settings: { driver: 'fs', base: './.cache/settings' },
		},
	},

	vite: {
		plugins: [
			// Vite 7 не зважає на /* @vite-ignore */ у динамічному import('#app-manifest')
			// всередині nuxt/dist/app/composables/manifest.js і в dev сипле «Failed to resolve
			// import #app-manifest». Аліас існує лише для серверної (Nitro) збірки; на клієнті
			// та сама функція бере маніфест через $fetch('/_nuxt/builds/meta/<buildId>.json').
			// Тож для клієнтського dev-графа віддаємо пустий стаб, а серверну гілку (opts.ssr)
			// не чіпаємо — вона резолвиться як і раніше. Тільки dev (apply: 'serve'),
			// прод-збірка лишається незмінною.
			{
				name: 'floy:silence-app-manifest',
				enforce: 'pre',
				apply: 'serve',
				resolveId(id: string, _importer: string | undefined, opts?: { ssr?: boolean }) {
					if (id === '#app-manifest' && !opts?.ssr) return '\0floy-app-manifest-stub'
				},
				load(id: string) {
					if (id === '\0floy-app-manifest-stub') return 'export default {}'
				},
			},
		],
	},
})
