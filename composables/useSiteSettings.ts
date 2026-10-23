// Налаштування сайту — єдине джерело для всього, що менеджер міняє без деплою: ціни, доставка,
// контакти й графік, соцмережі, умови повернення й строки доставки, аксесуари «в набір».
// Що де лежить (однаково для всіх сайтів) — NOTES/plans/PLAN-MULTISITE.md §5.0.1.
//
// Значення приходять з адмінки: вузол public.{site} (злитий зі public.common) вивантажується
// в storage/settings/{site}.json при кожному збереженні налаштувань, сайт читає його через
// server/api/settings.get.ts і кладе сюди на SSR (plugins/settings.server.ts). Коли адмінка
// недоступна — остання успішна копія з диска (.cache/settings).
//
// DEFAULTS — стартові значення з конфігу бренду (brand/site.config.ts → settingsFallback): на
// них живе новий сайт, поки його вузла ще немає, і будь-який сайт, якщо адмінка лежить, а копії
// на диску ще немає (перший старт). Будь-яке поле з адмінки їх перекриває.
import brand from '#brand/site.config'

export interface DeliveryTariff {
	delivery: number
	nal_plateg: number
}

export interface SitePhone {
	operator: string
	phone: string
}

/**
 * Рядок графіка у футері: days — ключ footer.* у i18n (зараз є monSat і sunday; інший набір днів —
 * спершу ключ у i18n/locales), time — години або null («вихідний»)
 */
export interface ScheduleRow {
	days: string
	time: string | null
}

/** Аксесуар «в набір» на сторінці товару (товари в кожного сайту свої — id з його каталогу) */
export interface PromoAccessory {
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
	/** Лише до чохлів (напр. скло на ту саму модель) */
	only_case?: boolean
}

export interface SiteSettings {
	prices: {
		printcase: number
		printcase_old: number
		neoprint: number
		neoprint_old: number
		// Аванс за ОДИН чохол індивідуального друку при накладеному платежі (0 = не беремо)
		prepay_printcase: number
	}
	delivery: {
		n_pochta: DeliveryTariff
		n_pochta_kur: DeliveryTariff // адресна (кур'єрська) доставка НП — дорожча за відділення
		ukrpochta: DeliveryTariff
		samovuvoz: DeliveryTariff
		free_delivery_from: number
	}
	contacts: {
		phones: SitePhone[]
		email: string
		address: string
		address_city: string
		address_street: string
		schedule: ScheduleRow[]
	}
	// Умови для JSON-LD магазину (MerchantReturnPolicy, ShippingService) — спільні, public.common
	policies: {
		return_days: number
		// Строк доставки Новою поштою, днів [від, до]
		shipping_days: [number, number]
	}
	promo_accessories: PromoAccessory[]
	social: {
		instagram: string
		facebook: string
		youtube: string
		telegram: string
		viber: string
		whatsapp: string
	}
	// Галочка «Відділення НП зі своєї БД» в адмінці: міста й відділення беремо з адмінки,
	// а не з API Нової Пошти (коли НП лежить). Див. useNovaPochta
	np_local_db: boolean
	// Альфапринти в картці й галереї — кадри на льоту (/img/print), а не файли адмінки.
	// Вимикач на випадок проблем: false у вузлі public.{site} адмінки повертає файли сховища
	// без деплою (через ≤5 хв кешу налаштувань + чистку кешу nginx). Див. useUrl().alphaprintImage
	alphaprint_on_fly: boolean
}

const DEFAULTS: SiteSettings = brand.settingsFallback

// Глибоке злиття «дефолти ← дані з адмінки»: часткова відповідь (наприклад, лише prices)
// не має обнуляти решту. Масиви замінюються цілком — список телефонів редагують як список.
function merge<T>(base: T, patch: any): T {
	if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base

	const result: any = { ...base }

	for (const [key, value] of Object.entries(patch)) {
		// Порожній рядок — це усвідомлене «прибрати» (напр. соцмережу, яку більше не ведемо),
		// тому він перекриває дефолт. Ігноруємо лише відсутнє значення.
		if (value === null || value === undefined) continue

		const current = (base as any)?.[key]
		const isPlainObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v)

		result[key] = isPlainObject(current) && isPlainObject(value) ? merge(current, value) : value
	}

	return result as T
}

export const mergeSiteSettings = (patch: unknown) => merge(DEFAULTS, patch)

export function useSiteSettingsState() {
	return useState<SiteSettings>('site-settings', () => DEFAULTS)
}

export function useSiteSettings() {
	const settings = useSiteSettingsState()

	const contacts = computed(() => settings.value.contacts)
	// Сайту потрібні самі номери; оператор у списку — для панелі менеджера в адмінці,
	// яка читає той самий вузол
	const phones = computed(() => contacts.value.phones.map((p) => p.phone))
	const phone = computed(() => phones.value[0] || '')
	const social = computed(() => settings.value.social)

	return {
		settings,
		prices: computed(() => settings.value.prices),
		delivery: computed(() => settings.value.delivery),
		freeDeliveryFrom: computed(() => settings.value.delivery.free_delivery_from),
		contacts,
		schedule: computed(() => contacts.value.schedule),
		policies: computed(() => settings.value.policies),
		promoAccessories: computed(() => settings.value.promo_accessories),
		social,
		// Соцпрофілі магазину — іконки футера (SocialLinks) і sameAs у JSON-LD.
		// Порожня адреса — мережу не ведемо: ні іконки, ні посилання
		socialLinks: computed(() =>
			[
				{ name: 'Instagram', icon: 'instagram', url: social.value.instagram },
				{ name: 'Facebook', icon: 'facebook', url: social.value.facebook },
				{ name: 'Telegram', icon: 'telegram', url: social.value.telegram },
				{ name: 'YouTube', icon: 'youtube', url: social.value.youtube },
			].filter((s) => s.url)
		),
		phones,
		phone,
		// Приклад номера в підказках форм — головний телефон магазину: «099 419 03 90» → «099-419-03-90»
		phoneExample: computed(() => phone.value.replace(/\s+/g, '-')),
	}
}
