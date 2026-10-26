// Три форми назви моделі/категорії для текстів сторінки.
//
// Одна модель у текстах звучить по-різному, і кожна форма ловить свій пласт запитів:
//   full  — офіційна: «Samsung Galaxy S25 Ultra» (запит латиницею, точна модель)
//   alt   — кирилиця з адмінки (title_rus, локалізована): «Самсунг Галаксі С25 Ультра»
//   short — без бренду: «Galaxy S25 Ultra» (у брендів, чия назва входить у title_full)
//
// Розподіл по сторінці: full — заголовки, крихти, JSON-LD і перша згадка в блоці;
// alt — лід і питання «де купити / скільки коштує»; short — повторні згадки в текстах,
// щоб та сама повна назва не повторювалася десятки разів (переспам).
//
// Коли форма збігається з повною (напр. «iPhone 17» — бренд Apple у назву не входить),
// alt/short порожні, а alt_/short_ падають на full: підстановка в i18n лишається безпечною.

export interface ICatNames {
	full: string
	alt: string
	short: string
	// Готові до підстановки в i18n: завжди непорожні (фолбек — повна назва)
	alt_: string
	short_: string
}

// Назва категорії для заголовків, плиток і крихт. У розділів аксесуарів (type=category) title_full —
// загальна назва з довідника, російською й у /uk («Зарядные Устройства»), а назва сайту мовою сторінки
// (та сама, що в меню) — title_rus («Зарядні пристрої»; поле названо невдало). У моделей, брендів і серій
// навпаки: title_full — офіційна назва («iPhone 17 Pro»), title_rus — кирилицею («Айфон 17 Про»)
export function catTitle(category: any): string {
	if (category?.type === 'category') return category.title_rus || category.title_full || category.title || ''
	return category?.title_full || category?.title_rus || category?.title || ''
}

// Назва розділу аксесуарів мовою сторінки за alias — з меню, яке вже завантажив app.vue (кеш
// 'menu-{мова}', без запиту): категорія товару приходить лише з name/name_full довідника
export function useMenuCategoryTitle() {
	const { locale } = useI18n()
	const { data: menu } = useNuxtData<any>('menu-' + locale.value)
	return (alias: string): string => menu.value?.categories?.find((c: any) => c.url === alias)?.title || ''
}

export function catNames(category: any): ICatNames {
	// У розділу аксесуарів повна назва — та, що й кирилична (title_rus), тож alt нижче порожній
	const full = catTitle(category)
	const brand = category?.brend?.title || ''

	const altRaw = category?.title_rus || ''
	const alt = altRaw && altRaw !== full ? altRaw : ''

	// Зрізаємо бренд лише на початку назви — «Samsung Galaxy S25» → «Galaxy S25»
	const shortRaw = brand ? full.replace(new RegExp('^' + escapeRe(brand) + '\\s+', 'i'), '').trim() : ''
	const short = shortRaw && shortRaw !== full ? shortRaw : ''

	return { full, alt, short, alt_: alt || full, short_: short || full }
}

export function useCatNames(category: MaybeRefOrGetter<any>) {
	return computed(() => catNames(toValue(category)))
}

function escapeRe(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
