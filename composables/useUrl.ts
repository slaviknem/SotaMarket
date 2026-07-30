// Хелпери для URL та зображень (дзеркалять старий plugins/url.ts)

// products/thumb/<файл>.jpg -> products/thumb/<файл>.webp
// Так само іменує файли адмінська генерація (ImageH::makeWebpThumb / artisan images:webp)
const toWebp = (file: string) => file.replace(/\.[^.\/]+$/, '') + '.webp'

// Кадри готового чохла — whitelist на боці Nitro-роуту (server/routes/img/neoprint).
// Без пресета роут віддає квадрат 600×600 jpg (og:image, JSON-LD, кошик)
type NeoprintPreset = 'card' | 'card2x' | 'hero' | 'hero2x'

const neoprintUrl = (categoryAlias: string, alias: string | number, preset?: NeoprintPreset) =>
	preset
		? `/img/neoprint/${categoryAlias}/${alias}-${preset}.webp`
		: `/img/neoprint/${categoryAlias}/${alias}.jpg`

// Пропорції кадрів мусять збігатися з PRESETS у server/routes/img/neoprint
const NEOPRINT_FRAMES = { card: { width: 252, height: 252 }, hero: { width: 402, height: 502 } }

export function useUrl() {
	const config = useRuntimeConfig()
	const localePath = useLocalePath()

	return {
		// Зображення зі сховища адмінки: products/thumb/..., attributes/..., articles/...
		img: (path: string) => config.public.urlStorage + 'images/' + path.replace(/^\//, ''),

		// Прев'ю товару — одразу готовий стиснений webp (у сховищі лежить поруч із jpg).
		// Віддаємо його напряму, без IPX: файл уже потрібного розміру, зайве перекодування
		// лише додало б проксі-запит і втрату якості (див. AppImage).
		// Абсолютний URL (напр. акційні товари) лишаємо як є; інакше — шлях у сховищі
		productThumb: (imageFile?: string | null) =>
			imageFile
				? /^https?:\/\//.test(imageFile)
					? imageFile
					: config.public.urlStorage + 'images/products/thumb/' + toWebp(imageFile)
				: '/images/no-photo.svg',

		// Велике фото — поки що тільки jpg (стиснених копій ще немає)
		productBig: (imageFile?: string | null) =>
			imageFile ? config.public.urlStorage + 'images/products/big/' + imageFile : '/images/no-photo.svg',

		attributeImg: (alias: string) =>
			config.public.urlStorage + 'images/attributes/' + alias + '.jpg',

		// Стиль кружечка кольору атрибута (ЄДИНИЙ для картки і сторінки товару):
		// завантажений свотч → явний колір (поле «Колір») → превʼю за alias
		attrDot: (attr: { image_file?: string | null; color?: string | null; alias: string }) => {
			const base = config.public.urlStorage + 'images/attributes/'
			if (attr.image_file) return { backgroundImage: `url("${base}${attr.image_file}")` }
			if (attr.color) return { background: attr.color }
			return { backgroundImage: `url("${base}${attr.alias}.jpg")` }
		},

		// ---------- NeoPrint (готовий дизайн) ----------
		// Оригінал шаблона (jpg 1100×2100) — те, що йде В ДРУК: у замовлення й у конструктор.
		// Тут webp недоречний: це друге стиснення поверх уже стисненого jpg.
		neoprintTemplateSource: (alias: string | number) =>
			config.public.urlStorage + 'images/templates/' + alias + '.jpg',

		// Готовий чохол «шаблон + маска» одним файлом — збирає Nitro-роут /img/neoprint.
		// Без пресета — квадрат jpg для og:image, JSON-LD і кошика (соцмережі webp досі
		// перетравлюють через раз, а посилання лежать у старих замовленнях).
		neoprintImage: neoprintUrl,

		// Готовий до вставки кадр чохла: src + retina-кандидат + розміри проти CLS
		neoprintFrame: (categoryAlias: string, alias: string | number, kind: 'card' | 'hero' = 'card') => ({
			src: neoprintUrl(categoryAlias, alias, kind),
			srcset: `${neoprintUrl(categoryAlias, alias, kind)} 1x, ${neoprintUrl(categoryAlias, alias, `${kind}2x`)} 2x`,
			...NEOPRINT_FRAMES[kind],
		}),

		categoryImg: (imageFile?: string | null) =>
			imageFile ? config.public.urlStorage + 'images/categories/' + imageFile : '/images/no-photo.svg',

		articleImg: (imageFile?: string | null) =>
			imageFile ? config.public.urlStorage + 'images/articles/' + imageFile : '/images/no-photo.svg',

		bannerImg: (imageFile?: string | null) =>
			imageFile ? config.public.urlStorage + 'images/banners/' + imageFile : '',

		// Роути магазину (з мовним префіксом)
		category: (alias: string, filterAlias?: string) =>
			localePath(filterAlias ? `/${alias}/filter/${filterAlias}` : `/${alias}`),

		product: (p: { alias: string; alias_cat: string }, attributeAlias?: string) =>
			localePath(
				attributeAlias
					? `/${p.alias_cat}/${p.alias}/attr/${attributeAlias}`
					: `/${p.alias_cat}/${p.alias}`
			),

		// Сторінка готового дизайну на конкретній моделі
		neoprint: (categoryAlias: string, id: string | number) =>
			localePath(`/neoprint/${categoryAlias}/${id}`),

		// Конструктор. З neoPrintAlias — відкривається з уже завантаженим дизайном (правка готового)
		printcase: (modelAlias?: string, neoPrintAlias?: string | number) => {
			if (!modelAlias) return localePath('/printcase')
			const np = neoPrintAlias ? `&neo_print_id=${neoPrintAlias}` : ''
			return localePath(`/printcase?model=${modelAlias}${np}`)
		},

		blogPost: (post: { type: string; alias: string }) =>
			localePath(`/article/${post.type}/${post.alias}`),

		// Абсолютний URL сайту (для canonical, og, schema.org)
		absolute: (path: string) => config.public.siteUrl + path,
	}
}

// Форматування ціни
export function formatPrice(value?: number | null): string {
	if (value === null || value === undefined) return ''
	return `${value} грн`
}
