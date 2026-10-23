// 301 зі старих адрес — карта бренду (brand/site.config.ts → redirects; формат — types/brand.ts).
//
// Мовний префікс переноситься сам: ключ пишеться без /uk, і /uk/стара веде на /uk/нова. Скісна в кінці
// не заважає збігу — інакше /dostavka/uk/ ішов би двома кроками (спершу trailing-slash, потім сюди).
// Ім'я файлу — щоб іти першим (Nitro запускає middleware за абеткою).
import brand from '#brand/site.config'
import type { BrandConfig } from '~/types/brand'

const exact = new Map<string, string>()
const prefixes: [string, string][] = []
for (const [from, to] of Object.entries((brand as BrandConfig).redirects ?? {})) {
	if (from.endsWith('/*')) prefixes.push([from.slice(0, -2), to])
	else exact.set(from, to)
}
// Довший префікс — першим
prefixes.sort((a, b) => b[0].length - a[0].length)

function target(path: string): string | undefined {
	const hit = exact.get(path)
	if (hit) return hit
	for (const [from, to] of prefixes) {
		if (path !== from && !path.startsWith(from + '/')) continue
		return to.endsWith('/*') ? to.slice(0, -2) + path.slice(from.length) : to
	}
}

export default defineEventHandler((event) => {
	if (!exact.size && !prefixes.length) return
	const url = event.node.req.url || ''
	if (!url.startsWith('/')) return

	const [rawPath, query] = url.split('?')
	const path = rawPath.replace(/\/+$/, '') || '/'
	const uk = path === '/uk' || path.startsWith('/uk/')
	const to = target(uk ? path.slice(3) || '/' : path)
	if (!to) return

	const location = uk && !to.startsWith('/uk') ? '/uk' + (to === '/' ? '' : to) : to
	return sendRedirect(event, location + (query ? `?${query}` : ''), 301)
})
