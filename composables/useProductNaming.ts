// Назви варіантів товару та описи фото — єдина формула для галереї (alt/title) і schema.org (name).
//
// У альфапринтів назва товару рекламна й однакова для всіх принтів («Захисні чохли … (ХІТ продажів)»),
// тому варіант описуємо через сам принт і модель. Назва звичайного товару вже містить модель —
// там достатньо додати колір.

export function useProductNaming(product: Ref<any>) {
	const { t } = useI18n()

	const modelName = computed(() => product.value?.categories?.[0]?.name_full || '')

	// «Чохол з принтом «Олень у светрі» для Samsung Galaxy M12» / «Чохол-книжка … — Чорний»
	function variantTitle(attr: any): string {
		const title = product.value?.title || ''
		if (!attr) return title

		return isPrintAttribute(attr) && product.value?.type === 'chekhly' && modelName.value
			? t('product.naming.casePrint', { attr: attr.title, model: modelName.value })
			: t('product.naming.variant', { title, attr: attr.title })
	}

	// Опис фото: назва варіанта + номер, коли фото цього варіанта кілька
	function imageAlt(attr: any, num: number, total: number): string {
		const base = variantTitle(attr)
		return total > 1 ? t('product.naming.photo', { base, n: num }) : base
	}

	// Лід сторінки варіанта — власний текст замість спільного опису товару: інакше десятки
	// принтів одного товару були б near-duplicate. Дані живі: назва варіанта, ціна, наявність.
	//
	// Назва тут у ПРОЗОВІЙ формі («… у кольорі «Чорний»»), а не в підписній («… — Чорний»):
	// variantTitle — це підпис картки/H1, у реченні він читається як обрубок.
	function variantLead(attr: any): string {
		const p = product.value
		if (!attr || !p) return ''

		const variant = isPrintAttribute(attr)
			? p.type === 'chekhly' && modelName.value
				? t('product.naming.casePrint', { attr: attr.title, model: modelName.value })
				: t('product.naming.printPhrase', { title: p.title, attr: attr.title })
			: t('product.naming.colorPhrase', { title: p.title, attr: attr.title })

		return t(p.type === 'chekhly' ? 'product.lead.case' : 'product.lead.other', {
			variant,
			stock: t(isProductInStock(p, attr) ? 'product.lead.inStock' : 'product.lead.notStock'),
			price: formatPrice(p.price),
		})
	}

	return { variantTitle, imageAlt, variantLead }
}
