// Теги-перелінковка на сторінці товару (як на старому сайті): принт/фасет → модель → бренд.
// Анкори дзеркалять H1 цільових сторінок, тож пошуковики й AI бачать зв'язок «товар → добірка».
// Лінкуємо лише на фільтри самого товару (product.filters) — цільова сторінка гарантовано
// містить хоча б цей товар, тонких/порожніх сторінок не буде. Додаткових запитів не робимо:
// меню категорій беремо з кешу app.vue (useNuxtData).

export interface IProductTag {
	title: string
	to: string
}

// Фасети моделі — фільтри з власними SEO-сторінками (ті ж, що в сайдбарі категорії)
const MODEL_FACETS = ['cat', 'form_factor', 'material']

// Службова група API: тримає технічні мітки («Колір»), у яких немає осмислених
// фасетних сторінок — анкор «Павербанк Колір» був би сміттям
const SERVICE_GROUPS = ['kategorya']

// Скільки сусідніх категорій розділу підмішувати технічним товарам (кільцева перелінковка)
const SIBLINGS = 4

// Більше — розмиває вагу сторінки і засмічує блок
const MAX_TAGS = 8

export function useProductTags(product: Ref<any>) {
	const { t, locale } = useI18n()
	const url = useUrl()

	// Меню вже завантажене в app.vue — тут лише читаємо кеш (локалізовані назви категорій)
	const { data: menu } = useNuxtData<any>('menu-' + locale.value)

	// Категорії-аксесуари з меню, без спецсторінок (/printcase) і лендінгу чохлів
	const menuCategories = computed<{ title: string; url: string }[]>(() =>
		(menu.value?.categories || []).filter((c: any) => c.url && !c.url.startsWith('/') && c.url !== 'chekhly')
	)

	return computed<IProductTag[]>(() => {
		const p = product.value
		const cat = p?.categories?.[0]
		if (!cat?.alias) return []

		const filters: any[] = Array.isArray(p.filters) ? p.filters : []
		const isModel = cat.type === 'model'
		const tags: IProductTag[] = []

		if (isModel) {
			// Модель: name — це хвіст без бренда («13»), тож потрібна повна назва
			const catTitle = cat.name_full || cat.name

			// 1. Принти — найдовший хвіст: «Чохли з принтом Як приборкати дракона»
			for (const f of filters) {
				if (f.type !== 'theme') continue
				tags.push({
					title: t('productTags.theme', { filter: f.title }),
					to: url.category(cat.alias, f.alias),
				})
			}

			// 2. Хаб принта — батьківська добірка: «Чохли з принтами Кінематограф». Формула
			// інша, ніж у конкретного малюнка («з картинкою»): різні рівні — різні запити,
			// а однакові анкори по всьому сайту знецінюються.
			// Її сторінка агрегує всі принти теми, тож цей товар на ній точно є (порожньої
			// сторінки не буде). Сусідні теми моделі навмисно не беремо: на рідкісних
			// моделях вони порожні, а їх анкор не стосується цього товару.
			for (const f of filters) {
				if (f.type !== 'theme' || !f.parent?.alias) continue
				if (SERVICE_GROUPS.includes(f.parent.alias)) continue
				tags.push({
					title: t('productTags.themeHub', { filter: f.parent.title }),
					to: url.category(cat.alias, f.parent.alias),
				})
			}

			// 3. Фасети: «Чохол-книжка для iPhone 13». Фільтр-категорію «Чохол» на чохлі
			// пропускаємо — його анкор дублює тег самої моделі нижче.
			for (const f of filters) {
				if (!MODEL_FACETS.includes(f.type)) continue
				if (f.type === 'cat' && p.type === 'chekhly') continue
				tags.push({
					title: t('pageTitle.filters.main', { filter: f.title, category: catTitle }),
					to: url.category(cat.alias, f.alias),
				})
			}

			// 4. Хаби: модель → бренд
			tags.push({ title: t('pageTitle.model', { title_full: catTitle }), to: url.category(cat.alias) })

			if (cat.brend_alias && cat.brend_name) {
				tags.push({
					title: t('productTags.brand', { brend: cat.brend_name }),
					to: url.category(cat.brend_alias),
				})
			}
		} else {
			// Техніка та універсальні аксесуари (павербанки, кабелі, навушники): жодних «чохлів».
			// Назву категорії беремо з меню — вона локалізована («Павербанк»), на відміну від
			// name у товарі («Power Bank» / «Кабели»).
			const idx = menuCategories.value.findIndex((c) => c.url === cat.alias)
			const catTitle = (idx >= 0 && menuCategories.value[idx].title) || cat.name || cat.name_full

			// 1. Характеристики читаються як пошуковий запит: «Павербанк 20 000 mAh»
			for (const f of filters) {
				if (f.type !== 'theme' && SERVICE_GROUPS.includes(f.parent?.alias)) continue
				tags.push({
					title: t(f.type === 'theme' ? 'productTags.themeCategory' : 'productTags.spec', {
						category: catTitle,
						filter: f.title,
					}),
					to: url.category(cat.alias, f.alias),
				})
			}

			// 2. Сама категорія
			tags.push({ title: catTitle, to: url.category(cat.alias) })

			// 3. Сусідні категорії розділу: у більшості аксесуарів фільтрів немає взагалі,
			// тож без них блок був би порожнім. Беремо наступні по колу — кожна категорія
			// лінкує на інші, розділ перелінковується повністю, без однакових блоків.
			const list = menuCategories.value
			for (let i = 1; i <= SIBLINGS && idx >= 0 && i < list.length; i++) {
				const sibling = list[(idx + i) % list.length]
				tags.push({ title: sibling.title, to: url.category(sibling.url) })
			}
		}

		// Дедуплікація за URL + ліміт
		const seen = new Set<string>()
		return tags.filter((tag) => tag.title && !seen.has(tag.to) && seen.add(tag.to)).slice(0, MAX_TAGS)
	})
}
