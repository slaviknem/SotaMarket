// Меню тем, що перемикає показані дизайни БЕЗ навігації.
//
// Спільне для сторінки готового дизайну (/neoprint/{модель}/{дизайн}) і конструктора
// (/printcase/{модель}): в обох випадках перехід на іншу сторінку коштує дорого —
// там зникла б галерея з вибраним дизайном, тут — намальований макет. Тому клік по темі
// підвантажує її дизайни на місці, а сам чип лишається справжнім <a href> (краулери,
// нова вкладка, копіювання посилання).

import type { IFilterNode } from '~/composables/useFilters'

// Дизайн у сітці/галереї — рівно те, що малює картка (решта полів роздула б SSR-payload)
export interface IThemeDesign {
	id: number
	alias: string
	title: string
	filter_id: number
}

export interface IThemeNode {
	alias: string
	title: string
	id: number
	children: { alias: string; title: string; id: number }[]
}

// Службові фільтри каталогу — це фасети (Категорія/Форм-фактор/Матеріал), а не теми принтів
const FILTER_TYPES = ['cat', 'form_factor', 'material']

// Дерево тем для меню: верхній рівень + підтеми з id. id потрібні, щоб вантажити дизайни
// теми прямо на кліку, без переходу на фільтр-сторінку.
export function buildThemeTree(filters: IFilterNode[] | null | undefined): IThemeNode[] {
	return ((filters as IFilterNode[]) || [])
		.filter((f) => !FILTER_TYPES.includes(f.type || ''))
		.map((f) => ({
			alias: f.alias,
			title: f.title,
			id: f.id ?? 0,
			children: (f.items || []).map((i) => ({ alias: i.alias, title: i.title, id: i.id ?? 0 })),
		}))
}

export function useThemeDesigns(designs: Ref<IThemeDesign[]>, limit = 30) {
	const shopApi = useShopApi()

	// Мережева пауза при перемиканні теми — приглушуємо сітку, щоб клік мав миттєвий відгук
	const switching = ref(false)

	// Тільки останній клік застосовується — захист від гонки при швидкому перемиканні тем
	let switchToken = 0

	// Дизайни теми = її власний filter_id + усі підтеми: дизайни бувають прив'язані і напряму
	// до теми (напр. «Футболісти»), і до підтем. Тому беремо обидва рівні, інакше тема
	// «не відкривається». id > 0 — захист від службових/порожніх вузлів.
	async function loadThemeDesigns(node: { id: number; children?: { id: number }[] }): Promise<IThemeDesign[]> {
		const toDesigns = (arr: any[]): IThemeDesign[] =>
			(Array.isArray(arr) ? arr : []).map((n) => ({
				id: n.id,
				alias: n.alias,
				title: n.title,
				filter_id: n.filter_id,
			}))

		const ids = [...new Set([node.id, ...(node.children || []).map((c) => c.id)].filter((cid) => cid > 0))]
		if (!ids.length) return []

		const batches = await Promise.all(ids.map((cid) => shopApi.getNeoPrints(cid)))
		return interleave(batches.map(toDesigns)).slice(0, limit)
	}

	// true — застосовано (або запит застарів); false — у теми немає жодного дизайну.
	// commit викликається вже після підміни designs, тож може спиратися на новий список.
	async function applyTheme(
		node: { id: number; children?: { id: number }[] },
		commit: () => void
	): Promise<boolean> {
		const token = ++switchToken
		switching.value = true
		try {
			const list = await loadThemeDesigns(node)
			if (token !== switchToken) return true // прийшов новіший клік — цей застарів
			if (!list.length) return false
			designs.value = list
			commit()
			return true
		} finally {
			if (token === switchToken) switching.value = false
		}
	}

	// Клік мишею, який має лишити браузеру його дефолт (нова вкладка/вікно)
	const isModifiedClick = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1

	return { switching, loadThemeDesigns, applyTheme, isModifiedClick }
}
