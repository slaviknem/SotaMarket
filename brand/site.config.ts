// Конфіг бренду SotaMARKET (sotamarket.com.ua) — усе, чим цей магазин відрізняється від копій рушія.
// Що змінити при копіюванні — brand/README.md. Тип полів і їх призначення — types/brand.ts.
// Рішення власника, звідки значення, — NOTES/plans/PLAN-SITE-SOTAMARKET.md §2–§3, §7.
import type { BrandConfig } from '../types/brand'

export default {
	key: 'sotamarket',
	name: 'SotaMARKET',
	domain: 'sotamarket.com.ua',
	url: 'https://sotamarket.com.ua',

	// Лічильника поки немає: ID ресурсу GA4 — від власника (PLAN-SITE-SOTAMARKET §3 п. 3)

	// Стартові значення налаштувань адмінки. Живі — вузли public.common (доставка, політики) і
	// public.sotamarket (ціни, контакти й графік, соцмережі, аксесуари «в набір») — PLAN-SITE-SOTAMARKET §6;
	// вузла 30.10 ще немає, тож сайт живе на цих значеннях. Ціни — як у SMARKET (§3 п. 2, чекає
	// підтвердження), доставка — як public.common, контакти — зі старого сайту (§2, §3 п. 1)
	settingsFallback: {
		prices: {
			printcase: 289,
			printcase_old: 299,
			neoprint: 259,
			neoprint_old: 299,
			prepay_printcase: 50,
		},
		delivery: {
			n_pochta: { delivery: 80, nal_plateg: 20 },
			n_pochta_kur: { delivery: 140, nal_plateg: 20 },
			ukrpochta: { delivery: 60, nal_plateg: 15 },
			samovuvoz: { delivery: 0, nal_plateg: 0 },
			free_delivery_from: 1000,
		},
		contacts: {
			// Телефону на старому сайті немає — номер дасть власник (§3 п. 1)
			phones: [],
			// У футері старого сайту — з помилкою (info@sotamaket.com.ua)
			email: 'info@sotamarket.com.ua',
			address: 'м. Львів',
			address_city: 'Львів',
			address_street: '',
			schedule: [
				{ days: 'monSat', time: '9:00 – 18:00' },
				{ days: 'sunday', time: null },
			],
		},
		// Той самий склад і служба доставки, що й у FLOY
		policies: {
			return_days: 14,
			shipping_days: [1, 2],
		},
		// Соцмереж немає: порожня адреса — іконку не показуємо
		social: {
			instagram: '',
			facebook: '',
			youtube: '',
			telegram: '',
			viber: '',
			whatsapp: '',
		},
		// Аксесуарів у SotaMARKET немає — блоку «в набір» на товарі немає
		promo_accessories: [],
		np_local_db: false,
		alphaprint_on_fly: true,
	},

	// Асортимент — лише чохли з картинками: вкладки за розділами не потрібні (хіти з темами — T4)
	home: {
		productTabs: [{ title: 'product.type.all', category: 'all' }],
	},

	// Відгуків 0 — сторінки відгуків немає (PLAN-SITE-SOTAMARKET §3 п. 5)
	features: {
		reviews: false,
	},

	// 301 зі старого сайту (PLAN-SITE-SOTAMARKET §7); /uk-копії — самі
	redirects: {
		'/about/uk': '/uk/about',
		'/dostavka/uk': '/uk/dostavka',
		'/article/uk': '/uk/article',
		// Як на старому сайті (там — на /article, а статей 0)
		'/otzyvy-klientov': '/chekhly',
	},

	font: {
		preload: ['/fonts/nunito-cyrillic.woff2', '/fonts/nunito-latin.woff2'],
	},
} satisfies BrandConfig
