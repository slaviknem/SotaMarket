import sharp from 'sharp'

// Композиція «принт на моделі»: шаблон принта + маска моделі одним файлом. Дві адреси, один
// обробник, а кеш на диску в кожної свій (nitro storage з nuxt.config):
//   /img/neoprint/{модель}/{дизайн}[-{кадр}].{webp|jpg} — готові дизайни (неопрінти) → .cache/neoprint;
//   /img/print/{модель}/{принт}[-{кадр}].{webp|jpg}     — альфапринти: замість файлів, які
//                                                         генерує адмінка → .cache/alphaprint
//                                                         (PLAN-ALPHAPRINT-IMAGES.md).
// Окремі теки — щоб розмір і чистку кожного типу було видно й робити незалежно.
//
// ЄДИНЕ джерело зображень неопрінта: картки на сторінці фільтра, галерея сторінки дизайну,
// og:image, прев'ю в кошику. Раніше композицію робив CSS (шаблон і маска двома шарами):
// користувач бачив чохол, а в HTML лежав прямокутний принт — пошуковики та AI-боти
// індексували не те, що показано.
//
// Повторює бекендовий ImageH::composeAlphaprint: білий кадр → шаблон принта по висоті,
// по центру → маска моделі поверх. Результат кешується на диску, тож sharp відпрацьовує
// один раз на «модель + принт + кадр».

// Кадри — рівно під місця у верстці (1x/2x). Довільні розміри не приймаємо: кожен новий
// варіант це ще один файл у кеші на КОЖНУ пару «модель + дизайн».
// pad — поля зверху/знизу, частка висоти кадру з КОЖНОГО боку. Потрібні там, де картинку
// показує хтось чужий впритул до країв (Розетка, соцмережі): чохол не має впиратися в рамку.
// У card/hero полів немає навмисно — там кадр і так із запасом по ширині, а висоту ми
// вибираємо повністю, щоб принт був більший при тій самій ширині колонки.
const PRESETS = {
	og: { w: 600, h: 600, pad: 0.07 }, // Розетка, соцмережі, JSON-LD, кошик — квадрат (URL без суфікса)
	// Картка в сітці товарів і мініатюра в рейлі дизайнів — той самий кадр 4:5, що й hero:
	// ширина кадру та сама, що була в квадраті, але чохол вписаний у більшу висоту, тож
	// сам принт на 25% більший при тій самій ширині колонки
	card: { w: 252, h: 315, pad: 0 },
	card2x: { w: 504, h: 630, pad: 0 },
	hero: { w: 402, h: 502, pad: 0 }, // головне фото сторінки дизайну — кадр 4:5 (телефон займає більше кадру)
	hero2x: { w: 804, h: 1004, pad: 0 },
	// Альфапринти: квадрат без полів — точна копія файлів адмінки (ImageH::generateAlphaprint),
	// тож картка й галерея товару виглядають так само, як із файлами сховища.
	// s300 — як products/thumb (картка, мініатюра галереї), s600 — як products/big (головне фото)
	s300: { w: 300, h: 300, pad: 0 },
	s600: { w: 600, h: 600, pad: 0 },
} as const

type Preset = keyof typeof PRESETS

// Тека кешу на диску — назва nitro storage (nuxt.config): своя на кожну адресу
type CacheName = 'neoprint' | 'alphaprint'

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

// ---------- Шаблони й маски в пам'яті воркера ----------
// На сторінці моделі десятки кадрів з однією маскою, і без цього кожен холодний кадр заново
// тягнув її з адмінки. Межа — за байтами, найдавніші витісняються першими. Відсутній файл теж
// запам'ятовуємо (коротше): інакше модель без маски питала б сховище на кожен промах
const SOURCE_TTL = 60 * 60 * 1000
const MISSING_TTL = 10 * 60 * 1000
const SOURCE_BUDGET = 32 * 1024 * 1024

const sources = new Map<string, { buf: Buffer | null; until: number }>()
let sourceBytes = 0

function remember(url: string, buf: Buffer | null) {
	const old = sources.get(url)
	if (old) {
		sourceBytes -= old.buf?.length ?? 0
		sources.delete(url)
	}

	sources.set(url, { buf, until: Date.now() + (buf ? SOURCE_TTL : MISSING_TTL) })
	sourceBytes += buf?.length ?? 0

	// Map тримає порядок вставки, тож перші — найдавніші
	for (const [key, entry] of sources) {
		if (sourceBytes <= SOURCE_BUDGET) break
		sourceBytes -= entry.buf?.length ?? 0
		sources.delete(key)
	}
}

// Причину пишемо в лог, але не частіше разу на хвилину: коли сховище лежить, падає кожен
// запит кадру, а логи pm2 на цьому сервері вже розросталися до 18 ГБ (DEPLOY.md)
let lastWarn = 0

function storageDown(url: string, reason: string): never {
	if (Date.now() - lastWarn > 60_000) {
		lastWarn = Date.now()
		console.warn(`[caseImage] сховище недоступне (${reason}): ${url}`)
	}
	throw createError({ statusCode: 503, statusMessage: 'Storage unavailable' })
}

// Файл зі сховища адмінки або null, якщо його немає. На неіснуючий файл сховище відповідає
// 302 на сторінку входу, тож за редиректом не йдемо: 3xx/4xx — файлу немає. Збій мережі чи
// 5xx — це НЕ «немає»: такий кадр не збираємо (503 без кешу), інакше модель без маски на
// 30 днів закешувала б голий принт замість чохла
async function fetchSource(url: string): Promise<Buffer | null> {
	const cached = sources.get(url)
	if (cached && cached.until > Date.now()) {
		// Свіжовикористаний — у кінець черги на витіснення
		sources.delete(url)
		sources.set(url, cached)
		return cached.buf
	}

	let res
	try {
		res = await $fetch.raw<ArrayBuffer>(url, {
			responseType: 'arrayBuffer',
			redirect: 'manual',
			ignoreResponseError: true,
			timeout: 10000,
		})
	} catch (error: any) {
		storageDown(url, error?.cause?.code || error?.message)
	}

	if (res.status >= 500) storageDown(url, `HTTP ${res.status}`)

	let buf: Buffer | null = null
	if (res.status === 200 && res._data) {
		const candidate = Buffer.from(res._data)
		// Захист від сторінки замість картинки: «є чи ні» остаточно вирішує sharp
		buf = await sharp(candidate)
			.metadata()
			.then(() => candidate)
			.catch(() => null)
	}

	remember(url, buf)
	return buf
}

// ---------- Обмеження паралельності ----------
// Не більше двох композицій одночасно на воркер: sharp ділить ядра з рендером сторінок, і хвиля
// холодних кадрів (нова модель, бот) не має гальмувати SSR. Решта чекає в черзі; слот
// передається напряму наступному, тож межа не перевищується навіть на мить
const MAX_PARALLEL = 2
let active = 0
const waiting: (() => void)[] = []

async function limited<T>(job: () => Promise<T>): Promise<T> {
	if (active < MAX_PARALLEL) active++
	else await new Promise<void>((resolve) => waiting.push(resolve))

	try {
		return await job()
	} finally {
		const next = waiting.shift()
		if (next) next()
		else active--
	}
}

// Шаблон принта потрібної якості: дрібним кадрам — прев'ю (~24 КБ), великим — повний (~67 КБ).
// Якщо прев'ю замале (його ще не перегенерували під нові розміри) — беремо повний, щоб не
// отримати мильний апскейл. jpg лишається запасним для шаблонів без webp
async function loadTemplate(storage: string, alias: string, height: number) {
	if (height <= THUMB_MAX_HEIGHT) {
		const thumb = await fetchSource(`${storage}images/templates/thumb/${alias}.webp`)
		if (thumb && (await sharp(thumb).metadata()).height! >= height) return thumb
	}

	return (
		(await fetchSource(`${storage}images/templates/${alias}.webp`)) ??
		(await fetchSource(`${storage}images/templates/${alias}.jpg`))
	)
}

// Шар, вписаний у задану висоту (як Intervention::heighten) і обрізаний до ширини кадру:
// маска квадратна (800×800), тож у кадрі 4:5 її прозорі поля виходять за краї.
// h тут — висота ЧОХЛА (кадр мінус поля), а не висота кадру
async function layer(buf: Buffer, w: number, h: number) {
	const resized = await sharp(buf).resize({ height: h }).toBuffer()
	const width = (await sharp(resized).metadata()).width ?? 0

	if (width <= w) return resized

	return sharp(resized)
		.extract({ left: Math.round((width - w) / 2), top: 0, width: w, height: h })
		.toBuffer()
}

// Свіжий запис кешу або null
async function fresh(cacheName: CacheName, key: string): Promise<Buffer | null> {
	const cache = useStorage(cacheName)
	const meta = await cache.getMeta(key)
	if (!meta?.mtime || Date.now() - new Date(meta.mtime).getTime() >= TTL) return null
	return (await cache.getItemRaw<Buffer>(key)) ?? null
}

async function compose(storage: string, alias: string, preset: Preset, ext: string, mask: Buffer | null) {
	const { w, h, pad } = PRESETS[preset]

	// Висота самого чохла: кадр лишається w×h, а шари вписуємо в менший прямокутник —
	// composite(gravity:'center') сам розкладе поля порівну зверху й знизу
	const inner = Math.round(h * (1 - pad * 2))

	const template = await loadTemplate(storage, alias, h)

	if (!template) throw createError({ statusCode: 404, statusMessage: 'Template not found' })

	return limited(async () => {
		// Маску малюють не для кожної моделі — без неї показуємо сам принт, це краще за порожнє місце.
		// Обидва шари масштабуються ОДНАКОВО, інакше маска зʼїде відносно принта.
		const layers = await Promise.all([layer(template, w, inner), mask ? layer(mask, w, inner) : null])

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
	})
}

// Без маски кадр однаковий для будь-якої моделі, тож у кеш лягає один раз на дизайн, а не
// на кожен {category} з URL: модель у шляху ніхто не звіряє, і бот із вигаданими моделями
// інакше засипав би диск копіями того самого принта
async function build(
	cacheName: CacheName,
	storage: string,
	category: string,
	alias: string,
	preset: Preset,
	ext: string,
	key: string
) {
	const mask = await fetchSource(`${storage}images/printcase/masks/${category}.png`)
	const storeKey = mask ? key : `_nomask:${alias}-${preset}.${ext}`

	if (!mask) {
		const cached = await fresh(cacheName, storeKey)
		if (cached) return cached
	}

	const image = await compose(storage, alias, preset, ext, mask)
	await useStorage(cacheName).setItemRaw(storeKey, image)
	return image
}

// Обробник роуту з кешем у своїй теці: defineCaseImageHandler('neoprint' | 'alphaprint')
export const defineCaseImageHandler = (cacheName: CacheName) => defineEventHandler(async (event) => {
	const category = getRouterParam(event, 'category') || ''
	const file = getRouterParam(event, 'alias') || ''

	// {принт}[-{кадр}].{webp|jpg}; alias лінивий, тож «bmw-m5.webp» лишається цілим alias'ом
	const parsed = /^([a-z0-9_-]+?)(?:-(card2x|card|hero2x|hero|s300|s600))?\.(webp|jpg)$/i.exec(file)

	// Обидва параметри йдуть у зовнішній URL — пускаємо лише безпечні alias'и
	if (!parsed || !/^[a-z0-9_-]+$/i.test(category)) {
		throw createError({ statusCode: 400, statusMessage: 'Bad request' })
	}

	const [, alias, presetName, ext] = parsed
	const preset = (presetName as Preset) ?? 'og'
	const key = `${category}:${alias}-${preset}.${ext}`

	try {
		// Свіжий кеш віддаємо як є; протухлий перезбираємо — так підхоплюється заміна шаблона в адмінці
		let image = await fresh(cacheName, key)

		if (!image) {
			const { urlStorage } = useRuntimeConfig(event).public

			// Тека в ключі: та сама пара з іншої адреси має лягти у свій кеш, а не взяти чужу збірку
			const jobKey = `${cacheName}:${key}`
			let job = inflight.get(jobKey)
			if (!job) {
				job = build(cacheName, urlStorage, category, alias, preset, ext, key).finally(() =>
					inflight.delete(jobKey)
				)
				inflight.set(jobKey, job)
			}

			image = await job
		}

		// Кешувати дозволяємо лише вдалу відповідь: заголовок, виставлений до збірки, лишався
		// б і на 404/503 — і nginx із браузером тримали б помилку місяць
		setResponseHeaders(event, {
			'Content-Type': ext === 'webp' ? 'image/webp' : 'image/jpeg',
			'Cache-Control': 'public, max-age=2592000',
		})

		return image
	} catch (error) {
		setResponseHeader(event, 'Cache-Control', 'no-store')
		throw error
	}
})
