// Тип конфігу бренду (brand/site.config.ts). Живе в рушії, а не в теці бренду: копії теки для
// інших сайтів перевіряються тим самим типом (`satisfies BrandConfig`), тож не розходяться.
// У конфігу — обличчя й будова сайту (міняються з деплоєм). Усе, що менеджер міняє сам (ціни, доставка,
// контакти й графік, соцмережі, політики, аксесуари «в набір»), — налаштування адмінки, тут лише їх
// стартові значення (settingsFallback). Розподіл — NOTES/plans/PLAN-MULTISITE.md §5.0.1.
import type { SiteSettings } from '../composables/useSiteSettings'

/**
 * Перемикачі розділів (PLAN-MULTISITE §4.3). Чого немає — увімкнено (useFeatures()).
 * Вимкнений розділ зникає з меню й точок входу, його сторінка — з маршрутів (nuxt.config.ts → pages:extend);
 * стару адресу за потреби веде 301 з redirects
 */
export interface BrandFeatures {
	/** Сторінка відгуків /otzyvy-klientov, пункт меню, стрічка відгуків на головній */
	reviews: boolean
}

export interface BrandConfig {
	/** Ключ сайту в API адмінки: ?site=… у запитах і вузол налаштувань public.{key} */
	key: string
	/** Назва магазину: og:site_name, JSON-LD, хлібні крихти, aria-label лого, {brand} у текстах */
	name: string
	/** Домен без протоколу: «© …» у футері, {domain} у текстах */
	domain: string
	/** Адреса сайту, коли в оточенні немає SITE_URL */
	url: string
	/**
	 * Стартові значення налаштувань адмінки (public.common + public.{key}): на них сайт живе, поки його
	 * вузла немає, і коли адмінка недоступна, а копії на диску ще немає. Значення з адмінки їх перекривають
	 */
	settingsFallback: SiteSettings
	home: {
		/** Вкладки каруселі новинок: ключ i18n назви й alias категорії в API */
		productTabs: { title: string; category: string }[]
	}
	/** Перемикачі розділів; без поля — усе увімкнено */
	features?: Partial<BrandFeatures>
	/**
	 * 301 зі старих адрес (server/middleware/brand-redirects.ts): «стара» → «нова», шляхи без /uk —
	 * мовний префікс запиту переноситься сам. Ключ «/a/*» ловить /a і все під ним; «/b/*» у значенні
	 * дописує хвіст (/a/x → /b/x), без «/*» — хвіст відкидається
	 */
	redirects?: Record<string, string>
	/** Шрифт бренду: woff2 для preload (@font-face і --font — у theme.css); без поля — Inter рушія */
	font?: { preload: string[] }
}
