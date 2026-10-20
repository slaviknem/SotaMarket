// Налаштування сайту — єдине джерело для цін, доставки, контактів і соцмереж.
//
// Значення приходять з адмінки: вузол public.{site} (злитий зі public.common) вивантажується
// в storage/settings/{site}.json при кожному збереженні налаштувань, сайт читає його через
// server/api/settings.ts і кладе сюди на SSR (plugins/settings.server.ts).
//
// DEFAULTS — не «значення за замовчуванням для нового сайту», а страховка: якщо адмінка
// недоступна або вузол ще не заведений, сайт працює на них замість того, щоб показати
// порожні ціни. Тому вони мають збігатися з тим, що зараз у БД. Самі значення — у конфігу
// бренду (brand/site.config.ts → settingsFallback): у кожного магазину свої.
import brand from '#brand/site.config'

export interface DeliveryTariff {
	delivery: number
	nal_plateg: number
}

export interface SitePhone {
	operator: string
	phone: string
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
	}
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

	return {
		settings,
		prices: computed(() => settings.value.prices),
		delivery: computed(() => settings.value.delivery),
		freeDeliveryFrom: computed(() => settings.value.delivery.free_delivery_from),
		contacts,
		social: computed(() => settings.value.social),
		phones,
		phone,
		// Для tel: та посилань — лише цифри
		phoneDigits: computed(() => phone.value.replace(/\D/g, '')),
	}
}
