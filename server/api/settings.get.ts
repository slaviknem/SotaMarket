// Налаштування сайту з адмінки: storage/settings/{site}.json.
//
// Файл віддає nginx статикою (PHP не задіяний) — його перезаписує SettingAction адмінки
// при кожному збереженні налаштувань. Тут лише кеш, щоб не ходити по мережі на кожен
// SSR-рендер: 5 хвилин — компроміс між «менеджер змінив ціну» і навантаженням.
//
// Помилку (адмінка лежить, файл ще не створений) навмисно НЕ перехоплюємо тут: Nitro кешує
// лише успішні відповіді, тож невдача не замикає сайт на порожньому результаті на 5 хвилин —
// наступний рендер спробує ще раз. Сторінку це не ронить: плагін ловить помилку й лишає
// дефолти з useSiteSettings.
export default defineCachedEventHandler(
	async () => {
		const { urlStorage, site } = useRuntimeConfig().public

		return await $fetch<Record<string, unknown>>(`${urlStorage}settings/${site}.json`, {
			timeout: 5000,
			responseType: 'json',
		})
	},
	{
		maxAge: 300,
		name: 'site-settings',
		getKey: () => 'current',
	}
)
