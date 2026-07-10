<template>
	<ShopFaqList :title="t('faq.model.title', { category_title: catTitle })" :items="items" />
</template>

<script setup lang="ts">
// FAQ модельної сторінки. Відповіді будуються з реальних даних сторінки
// (топ товарів, діапазон цін) — контент унікальний для кожної моделі,
// без додаткових запитів до API. Рендер і JSON-LD — у ShopFaqList.
const props = defineProps<{
	category: any
	products: any[]
}>()

const { t } = useI18n()
const url = useUrl()

const catTitle = computed(() => props.category?.title_full || props.category?.title || '')
const year = new Date().getFullYear()

// Топ-5 товарів (дефолтне сортування API — за популярністю)
const topProducts = computed(() => props.products.filter((p: any) => p.price).slice(0, 5))

// Реальний діапазон цін серед товарів сторінки
const priceRange = computed(() => {
	const prices = props.products.map((p: any) => p.price).filter(Boolean)
	if (!prices.length) return null
	return { min: formatPrice(Math.min(...prices)), max: formatPrice(Math.max(...prices)) }
})

const items = computed(() => {
	const p = { category_title: catTitle.value }
	const list: { q: string; a: string; links?: { title: string; to: string; price?: number }[] }[] = [
		{ q: t('faq.model.faq_1.question', p), a: t('faq.model.faq_1.answer', p) },
	]
	if (topProducts.value.length) {
		list.push({
			q: t('faq.model.faq_2.question', { ...p, year }),
			a: t('faq.model.faq_2.answer', p),
			links: topProducts.value.map((tp: any) => ({ title: tp.title, to: url.product(tp), price: tp.price })),
		})
	}
	list.push({ q: t('faq.model.faq_3.question', p), a: t('faq.model.faq_3.answer', p) })
	if (priceRange.value) {
		list.push({ q: t('faq.model.faq_4.question', p), a: t('faq.model.faq_4.answer', { ...p, ...priceRange.value }) })
	}
	list.push(
		{ q: t('faq.model.faq_5.question', p), a: t('faq.model.faq_5.answer', p) },
		{ q: t('faq.model.faq_6.question', p), a: t('faq.model.faq_6.answer', p) }
	)
	return list
})
</script>
