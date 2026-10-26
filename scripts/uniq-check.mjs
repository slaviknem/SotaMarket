/**
 * Тест унікальності текстів між двома сайтами рушія — NOTES/plans/PLAN-MULTISITE.md §8, §14.
 * Ті самі типи сторінок на обох сайтах → частка спільних n-грам (за замовчуванням 5 слів) видимого
 * тексту. Без залежностей — лише fetch (портативний Node 22 з .node/).
 *
 *   node scripts/uniq-check.mjs <база A> <база B> [--only=/,/apple] [--n=5] [--limit=30] [--runs] [--parallel=3]
 *        напр. http://localhost:3010 https://floy.com.ua — SMARKET (dev) проти FLOY (прод)
 *
 * Текст сторінки — <title>, meta description і вміст <main> (шапка, футер, чат — поза ним і не
 * рахуються: це навігація, а не текст сторінки). Частка — яка доля n-грам сторінки A трапляється на
 * тій самій сторінці B. Поріг (--limit, %) — пропозиція §14; вище — «!». --runs друкує найдовші спільні
 * фрагменти (від 8 слів) — щоб знайти, який саме текст збігається.
 *
 * Товар у сайтів різний, тому замість адреси — «@product:/модель»: береться перша картка товару зі
 * сторінки моделі кожного сайту (той самий тип сторінки, свої дані).
 */
import { parseArgs, onlyFilter, pool } from './lib/snapshot.mjs'

const PAGES = [
	'/', '/uk',
	'/apple', '/uk/apple',
	'/iphone-17-pro', '/uk/iphone-17-pro', '/iphone-15', '/uk/iphone-15',
	'/iphone-17-pro/filter/anime', '/uk/iphone-17-pro/filter/anime',
	'/chekhly',
	'/zaryadnye-ustroystva', '/uk/zaryadnye-ustroystva',
	'@product:/iphone-17-pro', '@product:/uk/iphone-17-pro',
	'/printcase/iphone-15', '/uk/printcase/iphone-15',
	'/about', '/uk/about', '/dostavka', '/uk/dostavka', '/povernennya', '/uk/povernennya',
	'/article',
]

const UA = 'Mozilla/5.0 (compatible; floy-uniq-check/1.0)'
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const decode = (s) =>
	s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => {
		if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1))
		return ENTITIES[e.toLowerCase()] ?? m
	})

const get = async (base, path) => {
	const res = await fetch(base + path, { headers: { 'user-agent': UA }, redirect: 'manual' })
	return { status: res.status, html: res.status === 200 ? await res.text() : '' }
}

// Видимий текст сторінки: title + description + <main> без скриптів, стилів і svg
function pageText(html) {
	const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ''
	const desc = (html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || [])[1] || ''
	const main = (html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i) || [])[1] || ''
	const body = main.replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
	return decode([title, desc, body].join(' '))
}

const words = (text) => text.toLowerCase().replace(/ё/g, 'е').match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || []

const grams = (w, n) => {
	const out = []
	for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '))
	return out
}

// Найдовші спільні фрагменти: суміжні n-грами A, що є в B, зливаємо в один шматок тексту
function commonRuns(w, list, setB, n, min = 8) {
	const runs = []
	let start = -1
	for (let i = 0; i <= list.length; i++) {
		const hit = i < list.length && setB.has(list[i])
		if (hit && start < 0) start = i
		if (!hit && start >= 0) {
			const len = i - start + n - 1
			if (len >= min) runs.push(w.slice(start, i + n - 1).join(' '))
			start = -1
		}
	}
	return [...new Set(runs)].sort((a, b) => b.length - a.length)
}

async function productPath(base, modelPath) {
	const { html } = await get(base, modelPath)
	const model = modelPath.replace(/^\/uk/, '')
	const re = new RegExp(`href="(${modelPath.startsWith('/uk') ? '/uk' : ''}${model}/(?!filter/)[a-z0-9_-]+)"`, 'i')
	return (html.match(re) || [])[1] || null
}

const { opts, pos } = parseArgs()
const [baseA, baseB] = pos.map((b) => b?.replace(/\/$/, ''))
if (!baseA || !baseB) {
	console.log('node scripts/uniq-check.mjs <база A> <база B> [--only=…] [--n=5] [--limit=30] [--runs]')
	process.exit(1)
}
const N = +opts.n || 5
const LIMIT = +opts.limit || 30
const only = onlyFilter(opts.only)

console.log(`Унікальність ${N}-грам: A = ${baseA}, B = ${baseB} (поріг ${LIMIT} %)\n`)

const rows = await pool(PAGES.filter(only), +opts.parallel || 3, async (page) => {
	let pathA = page
	let pathB = page
	if (page.startsWith('@product:')) {
		const model = page.slice('@product:'.length)
		;[pathA, pathB] = await Promise.all([productPath(baseA, model), productPath(baseB, model)])
		if (!pathA || !pathB) return { page, note: 'товар не знайдено' }
	}
	const [a, b] = await Promise.all([get(baseA, pathA), get(baseB, pathB)])
	if (a.status !== 200 || b.status !== 200) return { page, note: `код A ${a.status}, B ${b.status}` }

	const wA = words(pageText(a.html))
	const listA = grams(wA, N)
	const setA = new Set(listA)
	const setB = new Set(grams(words(pageText(b.html)), N))
	let shared = 0
	for (const g of setA) if (setB.has(g)) shared++
	const pct = setA.size ? (shared / setA.size) * 100 : 0
	return { page, pathA, pathB, words: wA.length, grams: setA.size, pct, runs: opts.runs ? commonRuns(wA, listA, setB, N) : [] }
})

let sum = 0
let cnt = 0
for (const r of rows) {
	if (r.note) {
		console.log(`  —  ${r.page}  (${r.note})`)
		continue
	}
	sum += r.pct
	cnt++
	const flag = r.pct > LIMIT ? '!' : ' '
	const where = r.pathA !== r.page ? `  [${r.pathA} ↔ ${r.pathB}]` : ''
	console.log(`${flag} ${r.pct.toFixed(1).padStart(5)} %  ${r.page}  (${r.words} слів)${where}`)
	for (const run of r.runs.slice(0, 6)) console.log(`        «${run.length > 220 ? run.slice(0, 220) + '…' : run}»`)
}
if (cnt) console.log(`\nСереднє: ${(sum / cnt).toFixed(1)} % на ${cnt} сторінках; вище порогу: ${rows.filter((r) => r.pct > LIMIT).length}`)
