// Підготовка HTML, що приходить з адмінки (описи категорій/товарів, статті) до v-html.

// Картинки в тексті редактор вставляє «голими» — без loading/decoding. Браузер тягне їх
// одразу, разом із LCP, хоча цей текст завжди нижче згину. Дописуємо lazy на SSR:
// це чиста робота з рядком, на клієнті нуль коштів.
// Теги, де loading уже проставлений, не чіпаємо.
export function contentHtml(html?: string | null): string {
	if (!html) return ''
	return html.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"')
}
