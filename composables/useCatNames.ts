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

export function catNames(category: any): ICatNames {
	const full = category?.title_full || category?.title_rus || category?.title || ''
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
