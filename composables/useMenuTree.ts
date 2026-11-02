// Повне дерево меню «бренд → серії → моделі» (~90 КБ) — лише на клієнті. У SSR (а отже, в payload
// кожної сторінки) — тільки верхній рівень (app.vue, ключ 'menu-{мова}'): дерево малюють мегаменю при
// наведенні, мобільне меню після відкриття й підбір моделі, у HTML його не було. Тягнемо, коли браузер
// простоює або щойно воно знадобилось, — один запит, хоч скільки компонентів його просять.
//
// Стан — один на вкладку браузера (модульний shallowRef): на сервері load() нічого не робить, тож там
// він завжди null і між запитами нічого не протікає; shallowRef — дерево не робимо глибоко реактивним
const tree = shallowRef<any[] | null>(null)
let request: Promise<void> | null = null

export function useMenuTree() {
	const { locale } = useI18n()
	const shopApi = useShopApi()

	function load() {
		if (!import.meta.client || tree.value || request) return
		const lang = locale.value
		request = shopApi
			.getMenu(10)
			.then((m: any) => {
				// Поки йшов запит, мову могли перемкнути — чуже дерево не підставляємо
				if (lang === locale.value && Array.isArray(m?.brends)) tree.value = m.brends
			})
			.catch(() => {})
			.finally(() => (request = null))
	}

	// Назви серій і моделей локалізовані — після зміни мови дерево вантажимо заново
	function reload() {
		tree.value = null
		request = null
		load()
	}

	return { tree, load, reload }
}
