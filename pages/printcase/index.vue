<template>
	<PrintcasePage />
</template>

<script setup lang="ts">
// Хаб конструктора: /printcase.
//
// Старий короткий шлях ?model={alias|id} лишається робочим (внутрішні посилання, розсилки,
// посилання від менеджерів), але 301-иться на /printcase/{модель} — у видачі має бути одна
// адреса. Решта query (neo_print_id, order_id) — це стани конструктора, тож переносяться.
//
// Усе тіло middleware самодостатнє: definePageMeta — макрос, він не бачить змінних із setup.
definePageMeta({
	middleware: async (to) => {
		const raw = Array.isArray(to.query.model) ? to.query.model[0] : to.query.model
		if (!raw) return

		const { model: _model, ...query } = to.query
		const prefix = to.path.startsWith('/uk') ? '/uk' : ''
		let alias = String(raw).trim()

		// ?model=3491 — id моделі: розкриваємо в alias по дереву меню (у бекенді воно
		// кешоване, а тут потрібне лише в цій рідкісній гілці)
		if (/^\d+$/.test(alias)) {
			const config = useRuntimeConfig()
			alias = ''
			try {
				const res = await $fetch<any>(config.public.urlApi + 'categories/menu/100', {
					params: { lang: prefix ? 'uk' : 'ru', site: config.public.site },
				})
				const menu = typeof res === 'string' ? JSON.parse(res) : res
				outer: for (const brand of menu?.brends || []) {
					for (const serie of brand.children || []) {
						for (const m of serie.children || []) {
							if (String(m.id) === String(raw).trim()) {
								alias = m.url
								break outer
							}
						}
					}
				}
			} catch {
				/* меню недоступне — відкриваємо конструктор без моделі */
			}
		}

		return navigateTo(
			alias ? { path: `${prefix}/printcase/${alias}`, query } : { path: `${prefix}/printcase` },
			{ redirectCode: 301 }
		)
	},
})
</script>
