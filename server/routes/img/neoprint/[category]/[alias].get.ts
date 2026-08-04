import sharp from 'sharp'

// Композиція «готовий дизайн на моделі»: /img/neoprint/{модель}/{дизайн}[-{пресет}].{webp|jpg}
//
// ЄДИНЕ джерело зображень неопрінта: картки на сторінці фільтра, галерея сторінки дизайну,
// og:image, прев'ю в кошику. Раніше композицію робив CSS (шаблон і маска двома шарами):
// користувач бачив чохол, а в HTML лежав прямокутний принт — пошуковики та AI-боти
// індексували не те, що показано.
//
// Повторює бекендовий ImageH::composeAlphaprint: білий кадр → шаблон принта по висоті,
// по центру → маска моделі поверх. Результат кешується на диску (nitro storage 'neoprint'),
// тож sharp відпрацьовує один раз на «модель + дизайн + кадр».

// Кадри — рівно під місця у верстці (1x/2x). Довільні розміри не приймаємо: кожен новий
// варіант це ще один файл у кеші на КОЖНУ пару «модель + дизайн».
const PRESETS = {
	og: { w: 600, h: 600 }, // соцмережі, JSON-LD, кошик — квадрат (URL без суфікса)
	// Картка в сітці товарів і мініатюра в рейлі дизайнів — той самий кадр 4:5, що й hero:
	// ширина кадру та сама, що була в квадраті, але чохол вписаний у більшу висоту, тож
	// сам принт на 25% більший при тій самій ширині колонки
	card: { w: 252, h: 315 },
	card2x: { w: 504, h: 630 },
	hero: { w: 402, h: 502 }, // головне фото сторінки дизайну — кадр 4:5 (телефон займає більше кадру)
	hero2x: { w: 804, h: 1004 },
} as const

type Preset = keyof typeof PRESETS

// Прев'ю шаблона (264×504) вистачає кадрам не вищим за нього — не тягнемо заради картки
// повний 576×1100. Обидва розміри робить адмінка (ImageH::makeTemplateWebp + artisan
// images:webp-templates-thumb) — рушиш це число, треба міняти й там, інакше роут відкине
// прев'ю по висоті й на кожен кадр піде великий файл
const THUMB_MAX_HEIGHT = 504

// Місяць. Композиція міняється лише разом із шаблоном чи маскою в адмінці — саме стільки
// ми готові чекати на підхоплення заміни без ручної чистки кешу
const TTL = 30 * 24 * 3600 * 1000

// Сітка карток б'є десятками запитів одночасно (і боти теж) — на один кадр має бути
// рівно одна генерація, решта чекає її результат
const inflight = new Map<string, Promise<Buffer>>()

// Сховище адмінки на неіснуючий файл віддає HTML зі статусом 200, тож «є чи ні» вирішує
// sharp, а не код відповіді
async function fetchImage(url: string): Promise<Buffer | null> {
	try {
		const buf = Buffer.from(await $fetch<ArrayBuffer>(url, { responseType: 'arrayBuffer' }))
		await sharp(buf).metadata()
		return buf
	} catch {
		return null
	}
}

// Шаблон принта потрібної якості: дрібним кадрам — прев'ю (~24 КБ), великим — повний (~67 КБ).
// Якщо прев'ю замале (його ще не перегенерували під нові розміри) — беремо повний, щоб не
// отримати мильний апскейл. jpg лишається запасним для шаблонів без webp
async function loadTemplate(storage: string, alias: string, height: number) {
	if (height <= THUMB_MAX_HEIGHT) {
		const thumb = await fetchImage(`${storage}images/templates/thumb/${alias}.webp`)
		if (thumb && (await sharp(thumb).metadata()).height! >= height) return thumb
	}

	return (
		(await fetchImage(`${storage}images/templates/${alias}.webp`)) ??
		(await fetchImage(`${storage}images/templates/${alias}.jpg`))
	)
}

// Шар, вписаний по висоті кадру (як Intervention::heighten) і обрізаний до його ширини:
// маска квадратна (800×800), тож у кадрі 4:5 її прозорі поля виходять за краї
async function layer(buf: Buffer, w: number, h: number) {
	const resized = await sharp(buf).resize({ height: h }).toBuffer()
	const width = (await sharp(resized).metadata()).width ?? 0

	if (width <= w) return resized

	return sharp(resized)
		.extract({ left: Math.round((width - w) / 2), top: 0, width: w, height: h })
		.toBuffer()
}

async function compose(storage: string, category: string, alias: string, preset: Preset, ext: string) {
	const { w, h } = PRESETS[preset]

	const [template, mask] = await Promise.all([
		loadTemplate(storage, alias, h),
		fetchImage(`${storage}images/printcase/masks/${category}.png`),
	])

	if (!template) throw createError({ statusCode: 404, statusMessage: 'Template not found' })

	// Маску малюють не для кожної моделі — без неї показуємо сам принт, це краще за порожнє місце
	const layers = await Promise.all([layer(template, w, h), mask ? layer(mask, w, h) : null])

	const image = sharp({
		create: { width: w, height: h, channels: 3, background: '#ffffff' },
	}).composite(
		layers
			.filter((input): input is Buffer => !!input)
			.map((input) => ({ input, gravity: 'center' as const }))
	)

	return ext === 'webp'
		? image.webp({ quality: 80 }).toBuffer()
		: image.jpeg({ quality: 88, progressive: true }).toBuffer()
}

export default defineEventHandler(async (event) => {
	const category = getRouterParam(event, 'category') || ''
	const file = getRouterParam(event, 'alias') || ''

	// {дизайн}[-{пресет}].{webp|jpg}; alias лінивий, тож «bmw-m5.webp» лишається цілим alias'ом
	const parsed = /^([a-z0-9_-]+?)(?:-(card2x|card|hero2x|hero))?\.(webp|jpg)$/i.exec(file)

	// Обидва параметри йдуть у зовнішній URL — пускаємо лише безпечні alias'и
	if (!parsed || !/^[a-z0-9_-]+$/i.test(category)) {
		throw createError({ statusCode: 400, statusMessage: 'Bad request' })
	}

	const [, alias, presetName, ext] = parsed
	const preset = (presetName as Preset) ?? 'og'

	setResponseHeaders(event, {
		'Content-Type': ext === 'webp' ? 'image/webp' : 'image/jpeg',
		'Cache-Control': 'public, max-age=2592000',
	})

	const cache = useStorage('neoprint')
	const key = `${category}:${alias}-${preset}.${ext}`

	// Свіжий кеш віддаємо як є; протухлий перезбираємо — так підхоплюється заміна шаблона в адмінці
	const meta = await cache.getMeta(key)
	if (meta?.mtime && Date.now() - new Date(meta.mtime).getTime() < TTL) {
		const cached = await cache.getItemRaw<Buffer>(key)
		if (cached) return cached
	}

	const { urlStorage } = useRuntimeConfig(event).public

	let job = inflight.get(key)
	if (!job) {
		job = compose(urlStorage, category, alias, preset, ext)
			.then(async (image) => {
				await cache.setItemRaw(key, image)
				return image
			})
			.finally(() => inflight.delete(key))

		inflight.set(key, job)
	}

	return await job
})
