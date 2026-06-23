// Хелпери для URL та зображень (дзеркалять старий plugins/url.ts)

export function useUrl() {
	const config = useRuntimeConfig()
	const localePath = useLocalePath()

	return {
		// Зображення зі сховища адмінки: products/thumb/..., attributes/..., articles/...
		img: (path: string) => config.public.urlStorage + 'images/' + path.replace(/^\//, ''),

		// Абсолютний URL (напр. акційні товари) лишаємо як є; інакше — шлях у сховищі
		productThumb: (imageFile?: string | null) =>
			imageFile
				? /^https?:\/\//.test(imageFile)
					? imageFile
					: config.public.urlStorage + 'images/products/thumb/' + imageFile
				: '/images/no-photo.svg',

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

		printcase: (modelAlias?: string) =>
			localePath(modelAlias ? `/printcase?model=${modelAlias}` : '/printcase'),

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
