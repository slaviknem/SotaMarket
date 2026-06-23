// API Нової Пошти (пошук міст і відділень)

const NP_API = 'https://api.novaposhta.ua/v2.0/json/'

export interface NPOption {
	code: string
	label: string
}

export function useNovaPochta() {
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

		async getWarehouses(cityRef: string): Promise<NPOption[]> {
			const res = await call('getWarehouses', { CityRef: cityRef })
			if (!res?.data) return []

			return res.data
				.filter((item: any) => item.WarehouseStatus === 'Working')
				.map((item: any) => ({ code: item.Ref, label: item.Description }))
		},
	}
}
