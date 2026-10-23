// Конфіг бренду FLOY — усе, чим цей магазин відрізняється від копій рушія під інші бренди.
// Що змінити при копіюванні — brand/README.md. Тип полів і їх призначення — types/brand.ts.
import type { BrandConfig } from '../types/brand'

export default {
	key: 'floy',
	name: 'FLOY',
	domain: 'floy.com.ua',
	url: 'https://floy.com.ua',

	// Стартові значення налаштувань адмінки (NOTES/plans/PLAN-MULTISITE.md §5.0.1). Живі — вузли
	// public.common (доставка, політики) і public.floy (ціни, контакти й графік, соцмережі, аксесуари
	// «в набір»), приходять через composables/useSiteSettings.ts; коли адмінка лежить — остання копія
	// з диска (.cache/settings). Значення — як у storage/settings/floy.json 23.10
	settingsFallback: {
		prices: {
			printcase: 299,
			printcase_old: 299,
			neoprint: 269,
			neoprint_old: 299,
			prepay_printcase: 50,
		},
		delivery: {
			n_pochta: { delivery: 80, nal_plateg: 20 },
			// 140 грн — реальна ціна НП за адресну доставку (Полтава → Київ, «Документи»)
			n_pochta_kur: { delivery: 140, nal_plateg: 20 },
			ukrpochta: { delivery: 60, nal_plateg: 15 },
			samovuvoz: { delivery: 0, nal_plateg: 0 },
			free_delivery_from: 1000,
		},
		contacts: {
			phones: [
				{ operator: 'vodafone', phone: '099 072 14 12' },
				{ operator: 'kievstar', phone: '098 072 14 12' },
				{ operator: 'life', phone: '093 072 14 12' },
			],
			email: 'info@floy.com.ua',
			address: 'м. Полтава, проспект Віталія Грицаєнка, 15А',
			address_city: 'Полтава',
			address_street: 'проспект Віталія Грицаєнка, 15А',
			schedule: [
				{ days: 'monSat', time: '9:00 – 18:00' },
				{ days: 'sunday', time: null },
			],
		},
		policies: {
			// Підтверджено магазином: 14 днів поштою, пересилку назад оплачує покупець
			return_days: 14,
			// Плитка біля банера пише «1–3 дні» (brand/i18n: index.deliveryNovaInfo) — розбіжність
			// чекає рішення власника (PLAN-SCALING §4 п. 1)
			shipping_days: [1, 2],
		},
		social: {
			instagram: 'https://www.instagram.com/floy.com.ua/',
			facebook: 'https://www.facebook.com/floy.com.ua',
			youtube: 'https://www.youtube.com/channel/UCmxlccT0fGh6hF79LSKYIPQ',
			telegram: 'https://t.me/floyshop',
			viber: 'viber://chat?number=%2B380990721412',
			whatsapp: 'https://wa.me/380990721412',
		},
		promo_accessories: [
			{
				id: 102,
				alias: 'steklo',
				alias_cat: 'zashchitnye-stekla',
				title: { uk: 'Скло на {model}', ru: 'Стекло на {model}' },
				image: 'temp/promotional/steklo.jpg',
				price: 249,
				discount: 50,
				default: true,
				only_case: true,
			},
			{
				id: 516219,
				alias: 'accessories_106456',
				alias_cat: 'aksessuary',
				title: { uk: 'Дата кабель Baseus Cafule Type-C 3A (1m)', ru: 'Дата кабель Baseus Cafule Type-C 3A (1m)' },
				image: 'images/products/big/kabelya/2471033.jpg',
				price: 269,
				discount: 30,
				default: true,
			},
			{
				id: 537181,
				alias: 'accessories_398159',
				alias_cat: 'aksessuary',
				title: { uk: 'МЗП Hoco CS22A Value PD30W + кабель Type-C', ru: 'СЗУ Hoco CS22A Value PD30W + кабель Type-C' },
				image: 'images/products/big/zaryadnye-ustroystva/4528473.jpg',
				price: 279,
				discount: 50,
				default: false,
			},
		],
		np_local_db: false,
		alphaprint_on_fly: true,
	},

	home: {
		productTabs: [
			{ title: 'product.type.all', category: 'all' },
			{ title: 'product.type.case', category: 'chekhly' },
			{ title: 'product.type.glass', category: 'plenki' },
			{ title: 'product.type.accessories', category: 'accessories' },
		],
	},
} satisfies BrandConfig
