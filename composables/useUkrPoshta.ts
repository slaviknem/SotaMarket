// Довідник відділень Укрпошти за поштовим індексом.
// Ходимо через власний проксі (server/api/ukrposhta.get.ts), а не напряму: класифікатор
// віддає 403 на будь-який запит із заголовком Origin, тож із браузера він недосяжний.
// Токена не потребує (новий /address-classifier-ws/ натомість вимагає Bearer із договору).
// Відповідь — XML із фіксованою схемою, тож розбираємо регуляркою: працює і на сервері,
// і в браузері, без DOMParser і без залежності на XML-парсер.

const UP_API = '/api/ukrposhta'

export interface UPOffice {
	postcode: string
	city: string
	region: string
	district: string
	address: string
	/** Готовий підпис для списку вибору */
	label: string
}

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'",
}

function decode(value: string) {
	return value.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] || m).trim()
}

// Порожні поля приходять як самозакритий тег з xsi:nil — така форма просто не збігається
function tag(entry: string, name: string) {
	const match = entry.match(new RegExp(`<${name}>([^<]*)</${name}>`))
	return match ? decode(match[1]) : ''
}

export function useUkrPoshta() {
	async function getOfficesByIndex(index: string): Promise<UPOffice[]> {
		if (!/^\d{5}$/.test(index)) return []

		let xml: string
		try {
			xml = await $fetch<string>(UP_API, { params: { pi: index }, responseType: 'text' })
		} catch {
			return []
		}

		const offices: UPOffice[] = []
		const seen = new Set<string>()

		for (const match of xml.matchAll(/<Entry>([\s\S]*?)<\/Entry>/g)) {
			const entry = match[1]
			if (tag(entry, 'AVALIBLE') !== '1') continue

			const city = tag(entry, 'CITY_UA') || tag(entry, 'PDCITY_UA')
			const address = tag(entry, 'ADDRESS')
			const postcode = tag(entry, 'POSTCODE') || index
			if (!city || !address) continue

			// Один індекс може віддати кілька записів одного відділення
			const key = `${postcode}|${address}`
			if (seen.has(key)) continue
			seen.add(key)

			offices.push({
				postcode,
				city,
				region: tag(entry, 'REGION_UA'),
				district: tag(entry, 'DISTRICT_UA'),
				address,
				label: `${postcode} — ${city}, ${address}`,
			})
		}

		return offices
	}

	return { getOfficesByIndex }
}
