import sharp from 'sharp'

// Композиція «готовий дизайн на моделі» одним файлом: /img/neoprint/{модель}/{дизайн}.jpg
//
// У верстці композицію робить CSS (два шари, без canvas), але og:image, JSON-LD Product.image
// і прев'ю в кошику потребують ОДНОГО реального URL — його й віддає цей роут.
// Повторює бекендовий ImageH::composeAlphaprint: білий квадрат 600×600 → шаблон принта по
// висоті, по центру → маска моделі поверх. Результат кешується на диску, тож sharp
// відпрацьовує один раз на пару (модель, дизайн).

const SIZE = 600 // ImageH::$bigWidth

export default defineEventHandler(async (event) => {
	const category = getRouterParam(event, 'category') || ''
	const alias = (getRouterParam(event, 'alias') || '').replace(/\.jpg$/i, '')

	// Обидва параметри йдуть у зовнішній URL — пускаємо лише безпечні alias'и
	if (!/^[a-z0-9_-]+$/i.test(category) || !/^[a-z0-9_-]+$/i.test(alias)) {
		throw createError({ statusCode: 400, statusMessage: 'Bad request' })
	}

	setResponseHeaders(event, {
		'Content-Type': 'image/jpeg',
		'Cache-Control': 'public, max-age=31536000, immutable',
	})

	const cache = useStorage('neoprint')
	const key = `${category}:${alias}.jpg`

	const cached = await cache.getItemRaw<Buffer>(key)
	if (cached) return cached

	const { urlStorage } = useRuntimeConfig(event).public

	const [template, mask] = await Promise.all([
		$fetch<ArrayBuffer>(`${urlStorage}images/templates/${alias}.jpg`, { responseType: 'arrayBuffer' }),
		$fetch<ArrayBuffer>(`${urlStorage}images/printcase/masks/${category}.png`, { responseType: 'arrayBuffer' }),
	]).catch(() => {
		throw createError({ statusCode: 404, statusMessage: 'Template or mask not found' })
	})

	// Обидва шари вписуємо по висоті (як Intervention::heighten), далі — по центру
	const [templateLayer, maskLayer] = await Promise.all([
		sharp(Buffer.from(template)).resize({ height: SIZE }).toBuffer(),
		sharp(Buffer.from(mask)).resize({ height: SIZE }).toBuffer(),
	])

	const image = await sharp({
		create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' },
	})
		.composite([
			{ input: templateLayer, gravity: 'center' },
			{ input: maskLayer, gravity: 'center' },
		])
		.jpeg({ quality: 88, progressive: true })
		.toBuffer()

	await cache.setItemRaw(key, image)

	return image
})
