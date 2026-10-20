// Тип конфігу бренду (brand/site.config.ts). Живе в рушії, а не в теці бренду: копії теки для
// інших сайтів перевіряються тим самим типом (`satisfies BrandConfig`), тож не розходяться.
import type { SiteSettings } from '../composables/useSiteSettings'

export interface BrandPromoAccessory {
	id: number
	alias: string
	alias_cat: string
	/** Назва за мовою; {model} — повна назва моделі з картки товару */
	title: { uk: string; ru: string }
	/** Картинка — шлях від URL_STORAGE */
	image: string
	price: number
	discount: number
	/** Обраний у наборі за замовчуванням */
	default: boolean
	/** Лише для чохлів (скло на ту саму модель) */
	onlyCase?: boolean
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
	/** Ціни, доставка, контакти, соцмережі — поки недоступна адмінка (мають збігатися з БД) */
	settingsFallback: SiteSettings
	/** Графік у футері: days — ключ footer.* у i18n, time — години або null («вихідний») */
	schedule: { days: string; time: string | null }[]
	policies: {
		/** Днів на повернення — JSON-LD MerchantReturnPolicy */
		returnDays: number
		/** Строк доставки Новою поштою, днів [від, до] — JSON-LD ShippingService */
		shippingDays: [number, number]
	}
	home: {
		/** Вкладки каруселі новинок: ключ i18n назви й alias категорії в API */
		productTabs: { title: string; category: string }[]
	}
	/** Аксесуари «в набір» на сторінці товару */
	promoAccessories: BrandPromoAccessory[]
	/** Приклад номера в підказці форми підтвердження — {example} у confirm.phoneError */
	phoneExample: string
}
