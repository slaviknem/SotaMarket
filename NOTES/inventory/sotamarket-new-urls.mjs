// Нові адреси Sota поза старим sitemap (T8): моделі й серії з меню apisite, теми моделей (групи й підтеми), конструктор.
// Вибірки сталі (той самий набір щоразу). ПК, PowerShell, C:\Web-SERVER\domains\SOTAMARKET (Node 22 з .node у PATH):
//   node NOTES/inventory/sotamarket-new-urls.mjs .snapshots/inventory/sotamarket/urls.tsv .snapshots/inventory/sotamarket/new.tsv
// Далі — список: старий sitemap + нові (all.tsv) → scripts/url-check.mjs (--save-list / прогін), NOTES/plans/PLAN-SITE-SOTAMARKET.md §9 T8
import { readFileSync, writeFileSync } from 'node:fs'
const API = 'https://admin.floy.com.ua/apisite/'
const [urlsFile, outFile] = process.argv.slice(2)

async function get(path) {
	for (let i = 0; i < 3; i++) {
		try {
			const sep = path.includes('?') ? '&' : '?'
			const r = await fetch(`${API}${path}${sep}site=sotamarket&lang=ru`, { signal: AbortSignal.timeout(60000) })
			if (r.ok) return await r.json()
		} catch {}
		await new Promise((r) => setTimeout(r, 1500))
	}
	throw new Error('apisite: ' + path)
}
async function pool(items, n, fn) {
	const out = []
	let i = 0
	await Promise.all(Array.from({ length: n }, async () => {
		while (i < items.length) {
			const k = i++
			out[k] = await fn(items[k])
		}
	}))
	return out
}
// Стала вибірка (той самий набір щоразу)
function pick(list, n, seed) {
	let a = seed
	const rnd = () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296)
	const copy = list.slice()
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1))
		;[copy[i], copy[j]] = [copy[j], copy[i]]
	}
	return copy.slice(0, n)
}

const old = new Set(readFileSync(urlsFile, 'utf8').split('\n').map((l) => l.split('\t')[0].replace(/\/+$/, '')).filter(Boolean))
const brands = await get('categories/menu_brends')
const models = []
const series = []
await pool(brands, 4, async (b) => {
	const tree = await get(`categories/menu_brend/${b.alias}`)
	const nodes = Array.isArray(tree) ? tree : tree?.data ?? tree?.children ?? []
	for (const s of nodes) {
		if (!(s.children ?? []).length) models.push(s.url ?? s.alias)
		else {
			series.push(s.url ?? s.alias)
			for (const m of s.children ?? []) models.push(m.url ?? m.alias)
		}
	}
})
const uniqModels = [...new Set(models)].sort()
const uniqSeries = [...new Set(series)].sort()
const fresh = uniqModels.filter((m) => !old.has('/' + m))
console.log(`брендів ${brands.length}, серій ${uniqSeries.length}, моделей ${uniqModels.length}, поза старим sitemap ${fresh.length}`)

const rows = []
const both = (path, type) => rows.push(`${path}\t${type}`, `/uk${path}\t${type}`)
for (const m of fresh) both('/' + m, 'model~нова')
for (const s of uniqSeries) both('/' + s, 'serie')
for (const m of pick(uniqModels, 150, 7)) both('/printcase/' + m, 'printcase-model')

// Теми: 120 моделей вибірки — усі групи й підтеми з товарами на цій моделі
const sample = pick(uniqModels, 120, 11)
const trees = await pool(sample, 4, (m) => get(`filters/${m}`).then((d) => [m, d?.data ?? []]))
let groups = 0
let subs = 0
for (const [m, tree] of trees)
	for (const g of tree) {
		if (g.type !== 'theme' || !g.count) continue
		both(`/${m}/filter/${g.alias}`, 'theme@model'), groups++
		for (const c of g.items ?? []) if (c.count) both(`/${m}/filter/${c.alias}`, 'theme@model~підтема'), subs++
	}
console.log(`тем-груп ${groups}, підтем ${subs} (на ${sample.length} моделях)`)
writeFileSync(outFile, rows.join('\n') + '\n')
console.log(`записано ${rows.length} адрес: ${outFile}`)
writeFileSync(outFile.replace(/\.tsv$/, '-models.json'), JSON.stringify({ models: uniqModels, series: uniqSeries, fresh }, null, 1))
