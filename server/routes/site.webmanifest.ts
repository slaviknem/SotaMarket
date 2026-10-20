// site.webmanifest — назва з конфігу бренду, кольори — з brand/theme.css (--bg; зчитано під час
// збірки в nuxt.config.ts → runtimeConfig.brandTheme). Формат — побайтно як колишній статичний файл.
import brand from '#brand/site.config'

export default defineEventHandler((event) => {
	const { bg } = useRuntimeConfig(event).brandTheme
	const s = JSON.stringify
	setResponseHeader(event, 'content-type', 'application/manifest+json')

	return `{
	"name": ${s(brand.name)},
	"short_name": ${s(brand.name)},
	"start_url": "/",
	"display": "standalone",
	"background_color": ${s(bg)},
	"theme_color": ${s(bg)},
	"icons": [
		{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
		{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
		{ "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
	]
}
`
})
