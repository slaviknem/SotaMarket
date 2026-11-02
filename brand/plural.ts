// Форма множини для uk і ru (правило однакове): «1 дизайн · 2 дизайни · 5 дизайнів». У i18n рушія множини
// немає (лічильники — одним словом: «товарів»), тож ключі бренду мають три форми з параметром {n}:
// t(`index.designs.${pluralForm(n)}`, { n })
export function pluralForm(n: number): 'one' | 'few' | 'many' {
	const d = n % 10
	const h = n % 100
	if (d === 1 && h !== 11) return 'one'
	return d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'few' : 'many'
}
