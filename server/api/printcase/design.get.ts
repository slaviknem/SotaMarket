// Маніфест збереженого макета: /api/printcase/design?dir={id}_{token}
//
// state.json лежить у публічному сховищі адмінки, але воно віддається без CORS — з браузера
// його не прочитати. Тягнемо через Nitro: серверного запиту CORS не стосується (той самий
// прийом, що в /api/ukrposhta). Кешувати нічого не можна — макет міняється при кожній правці.

export default defineEventHandler(async (event) => {
	const dir = String(getQuery(event).dir || '')

	// {id}_{token} і нічого більше: у шлях до сховища не має потрапити ні '..', ні слеш
	if (!/^\d{9,12}_[a-f0-9]{10}$/.test(dir)) {
		throw createError({ statusCode: 400, statusMessage: 'bad design' })
	}

	const config = useRuntimeConfig()

	// Беремо текстом і розбираємо самі: сховище віддає файли без надійного Content-Type
	// (той самий випадок, що з webp), тож покладатись на автопарсинг не можна
	const raw = await $fetch<string>(`${config.public.urlStorage}images/printcase/designs/${dir}/state.json`, {
		responseType: 'text',
	}).catch(() => '')

	let state: any = null
	try {
		state = JSON.parse(raw)
	} catch {
		// Сховище на відсутній файл віддає 200 з HTML-сторінкою, а не 404 — ловимо саме тут
	}

	if (!state || !Array.isArray(state.els)) {
		throw createError({ statusCode: 404, statusMessage: 'design not found' })
	}

	return state
})
