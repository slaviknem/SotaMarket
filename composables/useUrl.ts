// Хелпери для URL та зображень (дзеркалять старий plugins/url.ts)

// <файл>.jpg -> <файл>.webp
// Так само іменує файли адмінська генерація (ImageH::makeWebpThumb / artisan images:webp)
const toWebp = (file: string) => file.replace(/\.[^.\/]+$/, '') + '.webp'

// Атрибут у частині, що стосується картинки: файл свотча/принта або превʼю за alias
interface IAttrImage {
	image_file?: string | null
	alias: string
}

// Кадри готового чохла — whitelist на боці Nitro-роуту (server/utils/caseImage.ts).
// Без пресета роут віддає квадрат 600×600 jpg (og:image, JSON-LD, кошик)
type NeoprintPreset = 'card' | 'card2x' | 'hero' | 'hero2x'

const neoprintUrl = (categoryAlias: string, alias: string | number, preset?: NeoprintPreset) =>
	preset
		? `/img/neoprint/${categoryAlias}/${alias}-${preset}.webp`
		: `/img/neoprint/${categoryAlias}/${alias}.jpg`

// Пропорції кадрів мусять збігатися з PRESETS у server/utils/caseImage.ts
const NEOPRINT_FRAMES = { card: { width: 252, height: 315 }, hero: { width: 402, height: 502 } }

// Файл альфапринта, який генерує адмінка (ImageH::generateAlphaprint): {модель}/{шаблон}_{принт}.jpg.
// У шаблонах «_» не буває, тож принт — усе після першого «_» (перевірено на 19 731 файлі);
// фото інших товарів мають числові імена без «_». Розбір — PLAN-ALPHAPRINT-IMAGES.md
const ALPHAPRINT_FILE = /^([a-z0-9-]+)\/[a-z0-9-]+_([a-z0-9_-]+)\.jpg$/

// Квадратні кадри альфапринта без полів (PRESETS у server/utils/caseImage.ts):
// s300 — як products/thumb, s600 — як products/big
type AlphaprintSize = 's300' | 's600'

export function useUrl() {
	const config = useRuntimeConfig()
	const localePath = useLocalePath()
	const settings = useSiteSettingsState()

	// Зображення атрибута: завантажений свотч/принт → превʼю за alias.
	// Одна точка істини для картки, сторінки товару і кружечка кольору
	const attributeUrl = (attr: IAttrImage) =>
		config.public.urlStorage +
		'images/attributes/' +
		(attr.image_file ? toWebp(attr.image_file) : attr.alias + '.webp')

	return {
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

		// Прев'ю позиції для ЗАМОВЛЕННЯ (адмінка підставляє його в <img src> як є).
		// Тому тут завжди АБСОЛЮТНИЙ URL: голе ім'я файлу чи шлях від кореня на домені
		// адмінки не відкриється. Так само робив старий сайт (URL_STORAGE + thumb/<файл>).
		// webp навмисно не робимо: менеджер скачує прев'ю з адмінки, а там очікується jpg.
		orderImage: (image?: string | null) =>
			image
				? /^https?:\/\//.test(image)
					? image // уже абсолютний (макет конструктора, акційні аксесуари)
					: image.startsWith('/')
						? config.public.siteUrl + image // кадр чохла з нашого домену (/img/neoprint/…)
						: config.public.urlStorage + 'images/products/thumb/' + image
				: null,

		// Велике фото — поки що тільки jpg (стиснених копій ще немає)
		productBig: (imageFile?: string | null) =>
			imageFile ? config.public.urlStorage + 'images/products/big/' + imageFile : '/images/no-photo.svg',

		// Альфапринт (товар «шаблон × модель»): кадр на льоту /img/print/{модель}/{принт}-{кадр}.webp
		// замість файлу адмінки. null — не альфапринт, нестандартне ім'я файлу або вимкнено в
		// налаштуваннях: тоді лишається файл сховища (productThumb/productBig) — він же запасний,
		// якщо кадр не віддасться. og:image, JSON-LD, кошик і замовлення поки беруть файли сховища
		alphaprintImage: (product: any, imageFile: string | null | undefined, size: AlphaprintSize) => {
			if (!settings.value.alphaprint_on_fly || !isAlphaprint(product) || !imageFile) return null
			const match = ALPHAPRINT_FILE.exec(imageFile)
			return match ? `/img/print/${match[1]}/${match[2]}-${size}.webp` : null
		},

		// Готовий webp зі сховища (лежить поруч з оригіналом) — як і productThumb
		attributeImg: attributeUrl,

		// Стиль кружечка кольору атрибута (ЄДИНИЙ для картки і сторінки товару):
		// завантажений свотч → явний колір (поле «Колір») → превʼю за alias
		attrDot: (attr: IAttrImage & { color?: string | null }) =>
			!attr.image_file && attr.color
				? { background: attr.color }
				: { backgroundImage: `url("${attributeUrl(attr)}")` },

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

		// Категорії, бренди, моделі — готовий webp зі сховища (як productThumb)
		categoryImg: (imageFile?: string | null) =>
			imageFile
				? config.public.urlStorage + 'images/categories/' + toWebp(imageFile)
				: '/images/no-photo.svg',

		// Прев'ю та герой статті — готовий webp зі сховища
		articleImg: (imageFile?: string | null) =>
			imageFile
				? config.public.urlStorage + 'images/articles/' + toWebp(imageFile)
				: '/images/no-photo.svg',

		// Оригінал статті для og:image / JSON-LD: webp зі сховища віддається без
		// Content-Type, і соцмережеві боти його не завжди перетравлюють (пор. neoprintImage)
		articleImgSource: (imageFile: string) =>
			config.public.urlStorage + 'images/articles/' + imageFile,

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

		// Посилання з кошика. У звичайного товару — його сторінка, а в індивідуального макета
		// воно веде одразу на правку ЦЬОГО макета в конструкторі: інакше клік відкривав би
		// порожній конструктор, і намальоване довелось би робити наново.
		cartItem: (item: { product: { alias: string; alias_cat: string }; printcaseDir?: string }) =>
			item.printcaseDir
				? `${localePath(`/printcase/${item.product.alias}`)}?design=${item.printcaseDir}`
				: localePath(`/${item.product.alias_cat}/${item.product.alias}`),

		// Сторінка готового дизайну на конкретній моделі
		neoprint: (categoryAlias: string, id: string | number) =>
			localePath(`/neoprint/${categoryAlias}/${id}`),

		// Конструктор. Модель — окремим сегментом шляху (індексована сторінка-лендінг),
		// а не ?model=: параметричний варіант лишається робочим, але 301-иться сюди.
		// З neoPrintAlias — відкривається з уже завантаженим дизайном (правка готового).
		printcase: (modelAlias?: string, neoPrintAlias?: string | number) =>
			localePath(modelAlias ? `/printcase/${modelAlias}` : '/printcase') +
			(neoPrintAlias ? `?neo_print_id=${neoPrintAlias}` : ''),

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
