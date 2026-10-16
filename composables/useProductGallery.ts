// Галерея товару: слайди з унікальними описами (alt/title) + режим показу фото.
//
// Режим визначає не тип товару, а структура його фото:
//  • 'all'       — у жодного атрибута немає більше одного фото (альфапринти, плівки).
//                  Показуємо ВСІ фото товару: галерея = вітрина принтів, гортання = вибір атрибута.
//  • 'attribute' — хоча б в одного атрибута повна фотосесія (2+ фото, напр. книжки по кольорах).
//                  Показуємо фото обраного атрибута + спільні фото товару (без attribute_id).

export interface IGallerySlide {
	id: number
	file: string
	attributeId: number | null
	alt: string // унікальний опис фото (alt + title)
	label: string // короткий підпис: назва атрибута або «Зображення N»
	// Готові адреси фото: в альфапринта — кадри на льоту (/img/print), у решти — файли сховища
	big: string
	thumb: string
	// Файли сховища на випадок, якщо кадр на льоту не віддасться (лише в альфапринта)
	bigFallback?: string
	thumbFallback?: string
}

export function useProductGallery(product: Ref<any>, selectedAttributeId: Ref<number>) {
	const { t } = useI18n()
	const url = useUrl()
	const { imageAlt } = useProductNaming(product)

	// Порядок слайдів фіксуємо за атрибутом, з яким сторінка відкрилась (однаково на SSR і клієнті):
	// фото обраного атрибута стає першим у HTML — це LCP-зображення і og:image, без «стрибка» після гідрації.
	// Далі вибір атрибута лише перемотує галерею, а не переставляє мініатюри.
	const initialAttributeId = selectedAttributeId.value

	const images = computed<any[]>(() => product.value?.images ?? [])

	const attrById = computed(() => {
		const map = new Map<number, any>()
		for (const attr of product.value?.attributes ?? []) map.set(attr.id, attr)
		return map
	})

	// Скільки фото у «найбагатшого» атрибута — за цим і обираємо режим
	const mode = computed<'all' | 'attribute'>(() => {
		const counts = new Map<number, number>()
		for (const img of images.value) {
			if (!img.attribute_id) continue
			counts.set(img.attribute_id, (counts.get(img.attribute_id) ?? 0) + 1)
		}
		return counts.size && Math.max(...counts.values()) > 1 ? 'attribute' : 'all'
	})

	// Кожне фото описуємо унікально (див. useProductNaming): пошуковики та AI мають розуміти,
	// що саме на ньому. Нумерація фото — у межах свого атрибута (спільні фото без атрибута —
	// окрема група), тому опис кожного фото товару лишається унікальним.
	function toSlides(list: any[]): IGallerySlide[] {
		const totals = new Map<number, number>()
		for (const img of list) {
			const key = img.attribute_id ?? 0
			totals.set(key, (totals.get(key) ?? 0) + 1)
		}

		const seen = new Map<number, number>()

		return list.map((img) => {
			const key = img.attribute_id ?? 0
			const num = (seen.get(key) ?? 0) + 1
			seen.set(key, num)

			const attr = img.attribute_id ? attrById.value.get(img.attribute_id) : null

			const big = url.productBig(img.image_file)
			const thumb = url.productThumb(img.image_file)
			const bigOnFly = url.alphaprintImage(product.value, img.image_file, 's600')
			const thumbOnFly = url.alphaprintImage(product.value, img.image_file, 's300')

			return {
				id: img.id,
				file: img.image_file,
				attributeId: attr?.id ?? null,
				alt: imageAlt(attr, num, totals.get(key) ?? 1),
				label: attr?.title || `${t('product.image')} ${num}`,
				big: bigOnFly ?? big,
				thumb: thumbOnFly ?? thumb,
				bigFallback: bigOnFly ? big : undefined,
				thumbFallback: thumbOnFly ? thumb : undefined,
			}
		})
	}

	const slides = computed<IGallerySlide[]>(() => {
		const list = images.value
		if (!list.length) return []

		if (mode.value === 'all') {
			const all = toSlides(list)
			const i = all.findIndex((s) => s.attributeId === initialAttributeId)
			return i > 0 ? [...all.slice(i), ...all.slice(0, i)] : all
		}

		const own = list.filter((img) => img.attribute_id === selectedAttributeId.value)
		const shared = list.filter((img) => !img.attribute_id)

		// Атрибут без власних фото — показуємо всі фото товару (як і раніше)
		return toSlides(own.length ? [...own, ...shared] : list)
	})

	// Слайд обраного атрибута: у режимі 'all' — його єдине фото, у 'attribute' — перше фото фотосесії
	const activeIndex = computed(() => {
		const i = slides.value.findIndex((s) => s.attributeId === selectedAttributeId.value)
		return i > 0 ? i : 0
	})

	// Для JSON-LD товару/групи: усі фото (не лише видимі в галереї), фото обраного атрибута — першим
	const seoImages = computed(() => {
		const own = images.value.filter((img) => img.attribute_id === selectedAttributeId.value)
		const rest = images.value.filter((img) => img.attribute_id !== selectedAttributeId.value)
		return [...own, ...rest].slice(0, 10).map((img) => url.productBig(img.image_file))
	})

	// Для JSON-LD сторінки варіанта: лише фото цього варіанта + спільні фото товару
	const variantImages = computed(() => {
		const own = images.value.filter((img) => img.attribute_id === selectedAttributeId.value)
		const shared = images.value.filter((img) => !img.attribute_id)
		const list = own.length ? [...own, ...shared] : images.value
		return list.map((img) => url.productBig(img.image_file))
	})

	return { slides, activeIndex, seoImages, variantImages }
}
