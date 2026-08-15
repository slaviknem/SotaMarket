// Налаштування підтягуємо один раз на SSR і кладемо в useState — на клієнт вони їдуть
// разом із payload, тож жодного запиту з браузера й жодного зайвого байта JS.
// Тільки .server: на клієнті стан уже гідратований.
export default defineNuxtPlugin(async () => {
	const state = useSiteSettingsState()

	const remote = await $fetch('/api/settings').catch(() => null)
	if (remote) state.value = mergeSiteSettings(remote)
})
