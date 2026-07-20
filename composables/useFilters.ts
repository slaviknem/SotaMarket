// Трансформація плоского списку фільтрів API у дерево для сайдбара + хелпери
// мапінгу alias → група/значення. Дзеркалить стару логіку widget-filters.getFiltersAll().

export interface IFilterNode {
	id?: number
	ordering?: number
	alias: string
	title: string
	type?: string
	count?: number
	open?: boolean
	items?: IFilterNode[]
	// Синтетична група (Категорія/Форм-фактор/Матеріал) — лише UI-групувальник, без власної сторінки
	synthetic?: boolean
}

// Листкові типи (пункти з порожнім items), які групуємо під синтетичними батьками
const LEAF_TYPES = ['cat', 'form_factor', 'material'] as const

// Плоский перелік усіх фільтрів (батьки + діти) — коли потрібен пошук за id/alias
export function flattenFilters(raw: IFilterNode[] = []): IFilterNode[] {
	const list = Array.isArray(raw) ? raw : []
	return list.flatMap((f) => [f, ...(f.items || [])])
}

export function useFilters() {
	const { t } = useI18n()

	// Плоский API-список → дерево: [синтетичні батьки з листків] + [теми як є].
	// Причина: API віддає листкові фільтри плоско (items порожні), а сайдбару треба групи.
	const buildFilterTree = (raw: IFilterNode[] = []): IFilterNode[] => {
		const list = Array.isArray(raw) ? raw : []

		// Групуємо листкові фільтри (без дітей) за type
		const byType: Record<string, IFilterNode[]> = {}
		for (const f of list) {
			if (!f.items || f.items.length === 0) {
				;(byType[f.type || ''] ??= []).push(f)
			}
		}

		// Синтетичні батьки — лише для відомих типів і лише непорожні
		const parents: IFilterNode[] = LEAF_TYPES.filter((type) => byType[type]?.length).map((type) => ({
			alias: type,
			title: t(`filters.type.${type}`),
			type,
			open: true,
			synthetic: true,
			items: [...byType[type]].sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0)),
		}))

		// Теми (записи, що мають дітей) — як є, зі своїм open/alias
		const themes = list.filter((f) => f.items && f.items.length > 0)

		return [...parents, ...themes]
	}

	// Ключ групи для query/API за alias:
	// дитина теми → alias теми-батька; лист → його type (cat/form_factor/material); інакше — сам alias.
	const findGroupAlias = (raw: IFilterNode[] = [], alias: string): string => {
		const list = Array.isArray(raw) ? raw : []
		for (const g of list) {
			if (g.items?.some((i) => i.alias === alias)) return g.alias
		}
		const leaf = list.find((f) => f.alias === alias && (!f.items || !f.items.length))
		if (leaf?.type && (LEAF_TYPES as readonly string[]).includes(leaf.type)) return leaf.type
		return alias
	}

	// Чи є alias темою-батьком (має дітей) — у неї немає власного тега на товарах, лише в дітей
	const isParentTheme = (raw: IFilterNode[] = [], alias: string): boolean =>
		(Array.isArray(raw) ? raw : []).some((f) => f.alias === alias && !!f.items?.length)

	// Розкриття alias для продуктового запиту:
	// тема-батько → перелік дітей (OR через кому, щоб зібрати товари всіх підкатегорій),
	// лист/дитина → сам alias під правильним groupKey.
	const expandAliasForApi = (
		raw: IFilterNode[] = [],
		alias: string
	): { groupKey: string; value: string } => {
		const list = Array.isArray(raw) ? raw : []
		const parent = list.find((f) => f.alias === alias && !!f.items?.length)
		if (parent) return { groupKey: alias, value: parent.items!.map((i) => i.alias).join(',') }
		return { groupKey: findGroupAlias(list, alias), value: alias }
	}

	// id-и дітей теми-батька (для збору дизайнів усіх підтем). Порожньо, якщо це не батько.
	const filterChildIds = (raw: IFilterNode[] = [], alias: string): number[] => {
		const node = flattenFilters(raw).find((f) => f.alias === alias)
		return (node?.items || []).map((i) => i.id).filter((id): id is number => typeof id === 'number')
	}

	return { buildFilterTree, findGroupAlias, isParentTheme, expandAliasForApi, filterChildIds }
}
