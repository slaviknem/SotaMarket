<template>
	<ShopFaqList :title="title" :items="items" />
</template>

<script setup lang="ts">
// FAQ сторінки фільтра. Дві варіації:
//  - тема (принт): питання під ключовики «чохол з принтом/малюнком {тема}» + посилання
//    на картки-варіанти /attr/ (довгохвостові анкори) і на конструктор власного дизайну;
//  - інший фільтр (форм-фактор/матеріал): загальні питання з назвою фільтра в лапках.
// Дані — з уже завантажених товарів сторінки. Рендер і JSON-LD — у ShopFaqList.
const props = defineProps<{
	category: any
	categoryAlias: string
	filterPage: any
	// Розгорнуті картки «товар + атрибут» 1-ї сторінки (як у видимому списку)
	items: { product: any; attribute: any | null }[]
	total: number
}>()

const { t } = useI18n()
const url = useUrl()

// Три форми назви моделі: повна — заголовок і перші питання, кирилиця — «де купити /
// скільки коштує», коротка — повторні згадки в довгих відповідях
const names = useCatNames(() => props.category)
const catTitle = computed(() => names.value.full)

const isTheme = computed(() => props.filterPage?.type === 'theme')

// Топ-5 варіантів з URL /attr/ — унікальні анкори «Товар (Принт)»
const topLinks = computed(() =>
	props.items
		.filter(({ product }) => product.price)
		.slice(0, 5)
		.map(({ product, attribute }) => ({
			title: attribute ? `${product.title} (${attribute.title})` : product.title,
			to: url.product(product, attribute?.alias),
			price: product.price,
		}))
)

// Реальний діапазон цін серед товарів сторінки
const priceRange = computed(() => {
	const prices = [...new Set(props.items.map(({ product }) => product.price).filter(Boolean))] as number[]
	if (!prices.length) return null
	return { min: formatPrice(Math.min(...prices)), max: formatPrice(Math.max(...prices)) }
})

const title = computed(() =>
	t(isTheme.value ? 'faq.theme.title' : 'faq.filter.title', {
		filter: props.filterPage?.title,
		category_title: catTitle.value,
	})
)

const items = computed(() => {
	const p = {
		filter: props.filterPage?.title,
		category_title: catTitle.value,
		category_alt: names.value.alt_,
		category_short: names.value.short_,
	}
	const key = isTheme.value ? 'faq.theme' : 'faq.filter'
	const list: { q: string; a: string; links?: { title: string; to: string; price?: number }[] }[] = []

	if (topLinks.value.length) {
		list.push({
			q: t(`${key}.faq_1.question`, p),
			a: t(`${key}.faq_1.answer`, { ...p, count: props.total }),
			links: topLinks.value,
		})
	}
	if (priceRange.value) {
		list.push({ q: t(`${key}.faq_2.question`, p), a: t(`${key}.faq_2.answer`, { ...p, ...priceRange.value }) })
	}
	list.push({ q: t(`${key}.faq_3.question`, p), a: t(`${key}.faq_3.answer`, p) })

	if (isTheme.value) {
		list.push({ q: t('faq.theme.faq_4.question', p), a: t('faq.theme.faq_4.answer', p) })
		// «Свій принт/фото» — лише якщо для моделі увімкнено конструктор
		if (props.category?.printcase) {
			list.push({
				q: t('faq.theme.faq_5.question', p),
				a: t('faq.theme.faq_5.answer', p),
				links: [{ title: t('faq.theme.faq_5.link'), to: url.printcase(props.categoryAlias) }],
			})
		}
		list.push({ q: t('faq.theme.faq_6.question', p), a: t('faq.theme.faq_6.answer', p) })
	} else {
		list.push({ q: t('faq.filter.faq_4.question', p), a: t('faq.filter.faq_4.answer', p) })
	}

	return list
})
</script>
