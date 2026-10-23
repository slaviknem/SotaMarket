// Налаштування сайту з адмінки: storage/settings/{site}.json.
//
// Файл віддає nginx статикою (PHP не задіяний) — його перезаписує SettingAction адмінки
// при кожному збереженні налаштувань. Тут лише кеш, щоб не ходити по мережі на кожен
// SSR-рендер: 5 хвилин — компроміс між «менеджер змінив ціну» і навантаженням.
//
// Остання вдала відповідь лягає на диск (.cache/settings, переживає деплой і перезапуск): коли
// адмінка лежить, сайт працює на ній, а не на стартових значеннях із конфігу бренду, які могли
// давно розійтися з БД. Наступна спроба — через ті ж 5 хвилин кешу.
//
// Якщо немає й копії (новий сайт без вузла public.{site}, перший старт при лежачій адмінці) —
// помилку навмисно НЕ перехоплюємо: Nitro кешує лише успішні відповіді, тож наступний рендер
// спробує ще раз. Сторінку це не ронить: плагін ловить помилку й лишає дефолти з useSiteSettings.
export default defineCachedEventHandler(
	async (): Promise<Record<string, unknown>> => {
		const { urlStorage, site } = useRuntimeConfig().public
		const backup = useStorage('settings')

		try {
			const data: unknown = await $fetch(`${urlStorage}settings/${site}.json`, {
				timeout: 5000,
				responseType: 'json',
			})
			// Файлу немає → адмінка відповідає 302 на сторінку входу, і $fetch повертає її HTML рядком
			if (!data || typeof data !== 'object' || Array.isArray(data)) {
				throw createError({ statusCode: 502, statusMessage: `settings/${site}.json: не JSON-об'єкт` })
			}
			// Копія — запасний шлях: збій запису (диск повний, права) не має губити свіжі дані
			await backup.setItem(site, data).catch((e) => console.warn(`[settings] копія на диск не записалась: ${e}`))
			return data as Record<string, unknown>
		} catch (error) {
			const last = await backup.getItem<Record<string, unknown>>(site).catch(() => null)
			if (last) return last
			throw error
		}
	},
	{
		maxAge: 300,
		name: 'site-settings',
		getKey: () => 'current',
	}
)
