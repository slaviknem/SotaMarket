// API Нової Пошти (пошук міст і відділень)

const NP_API = 'https://api.novaposhta.ua/v2.0/json/'

export interface NPOption {
	code: string
	label: string
}

// Поштомати в під'їздах ЖК і точки з обмеженим доступом сторонньому клієнту недоступні,
// тож у списку їм не місце: у Києві це 3813 з 5980 поштоматів, у Полтаві — 269 з 433.
const CLOSED_POSTOMATS = ['ForResidentsOfEntrance', 'LimitedAccess', 'Private']

// Порядок точок у списку. Поштоматів удесятеро більше за відділення (Київ: 5980 проти 620),
// тож без сортування вони витісняють відділення з видачі.
const CATEGORY_ORDER: Record<string, number> = { Branch: 0, Postomat: 1, DropOff: 2 }
const byCategory = (key: string) => (a: any, b: any) =>
	(CATEGORY_ORDER[a[key]] ?? 9) - (CATEGORY_ORDER[b[key]] ?? 9)

export function useNovaPochta() {
	const { settings } = useSiteSettings()
	const { urlApi } = useRuntimeConfig().public

	// Галочка «Відділення НП зі своєї БД» в адмінці (np_local_db): міста й відділення — з нашої
	// копії довідника (apisite nova_pochta/*), бо API НП буває лежить. Поштомати в ЖК там
	// не відсіяти: тип поштомата в np_warehouses не зберігається. Вулиці — завжди з НП
	async function local(path: string) {
		try {
			const res = await $fetch<any>(urlApi + 'nova_pochta/' + path)
			return Array.isArray(res?.data) ? res.data : []
		} catch {
			return []
		}
	}

	async function call(method: string, properties: Record<string, any>) {
		try {
			return await $fetch<any>(NP_API, {
				method: 'POST',
				body: {
					modelName: 'Address',
					calledMethod: method,
					methodProperties: properties,
				},
			})
		} catch {
			return null
		}
	}

	return {
		async getCities(findString: string): Promise<NPOption[]> {
			// Область у назву адмінка доклеює сама (NPcitiesResource)
			if (settings.value.np_local_db) {
				const data = await local('get_cities/' + encodeURIComponent(findString))
				return data.map((item: any) => ({ code: item.ref, label: item.description }))
			}

			const res = await call('getCities', { FindByString: findString, Limit: 100 })
			if (!res?.data) return []

			return res.data.map((item: any) => {
				const areaIncluded = item.Description.includes(item.AreaDescription)
				return {
					code: item.Ref,
					label: areaIncluded
						? item.Description
						: `${item.Description} (${item.AreaDescription} обл.)`,
				}
			})
		},

		// Точки видачі міста: відділення, поштомати й пункти видачі приходять одним списком —
		// тому в формі це одне поле, а не окремі способи доставки.
		async getWarehouses(cityRef: string): Promise<NPOption[]> {
			if (settings.value.np_local_db) {
				const data = await local('get_warehouses/' + cityRef)
				return data
					.filter((item: any) => item.warehouse_status === 'Working')
					.sort(byCategory('category_of_warehouse'))
					.map((item: any) => ({ code: item.ref, label: item.description }))
			}

			const res = await call('getWarehouses', { CityRef: cityRef })
			if (!res?.data) return []

			return res.data
				.filter(
					(item: any) =>
						item.WarehouseStatus === 'Working' && !CLOSED_POSTOMATS.includes(item.PostMachineType)
				)
				// Сортування стабільне, тож усередині категорії лишається порядок НП (за номером)
				.sort(byCategory('CategoryOfWarehouse'))
				// Поштомат від відділення в ТТН не відрізняється (той самий Ref і ServiceType),
				// тож окремо його тип не тягнемо — назва точки від НП і так усе каже
				.map((item: any) => ({ code: item.Ref, label: item.Description }))
		},

		// Вулиці міста (адресна доставка). Шукає сама НП — з порожнім запитом метод
		// віддає весь довідник міста (у Києві це десятки тисяч рядків), тож без пошуку не ходимо.
		async getStreets(cityRef: string, findString: string): Promise<NPOption[]> {
			const res = await call('getStreet', { CityRef: cityRef, FindByString: findString, Limit: '50' })
			if (!res?.data) return []

			// Тип вулиці приходить окремим полем: «вул.» + «Соборності» → «вул. Соборності»
			return res.data.map((item: any) => ({
				code: item.Ref,
				label: `${item.StreetsType} ${item.Description}`,
			}))
		},
	}
}
