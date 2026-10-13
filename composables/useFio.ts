// ПІБ отримувача: одна перевірка для кошика й опитувальника підтвердження.
// Латиницею Нова Пошта отримувача не приймає, а «MELNIK JOSIP» у ПІБ — здебільшого автозаповнення
// браузера з Google-акаунта або англійська розкладка («Vtkmybr»). Та сама перевірка на бекенді —
// OrderConfirm::recipientMissing() в адмінці

export function useFio() {
	const hasLatin = (value: string) => /[a-z]/i.test(value || '')

	return { hasLatin }
}
