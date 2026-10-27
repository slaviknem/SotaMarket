/**
 * Прогін адрес старого сайту через рушій перед перемиканням — NOTES/plans/PLAN-MULTISITE.md §14 п. 1.
 * Без залежностей (портативний Node 22 з .node/; на сервері — node 22 з nvm):
 *
 *   node scripts/url-check.mjs <база> <список> [опції]
 *        <база>     http://localhost:3010 (dev) або http://127.0.0.1:3010 (процес на сервері до перемикання)
 *        <список>   файл адрес: «шлях» або TSV «шлях \t тип …» (urls.tsv / samples.txt інвентаря,
 *                   scripts/site-inventory.mjs); рядок «# тип» у samples.txt задає тип наступних
 *   --sample=*:40,model:all,product@model:600   скільки адрес кожного типу (вибірка стала — та сама щоразу)
 *   --types=model,brand   лише ці типи
 *   --slice=0:1000        лише частина вибірки (dev падає по пам'яті після ~1–2 тис. сторінок — прогін
 *                         частинами з перезапуском dev між ними; зведення всіх частин — report)
 *   --probes              додати проби: 301-карта бренду (кожен ключ, ru і /uk) і службові адреси
 *   --host=steklomarket.com.ua   заголовок Host (сервер: так запит іде, як від nginx)
 *   --site=https://…      origin для canonical (за замовчуванням — https://{домен бренду})
 *   --compare=https://www.steklomarket.com.ua  ті самі адреси на старому сайті: title, h1, description
 *   --compare-sample=20   скільки адрес кожного типу порівнювати (старі сайти — по одному запиту)
 *   --parallel=4  --out=<ім'я>
 *   --save-list=<файл>    лише записати вибірку у файл (напр. список для сервера) — без прогону
 *
 *   node scripts/url-check.mjs report <ім'я> [<ім'я>…]   зведення збережених прогонів (частин) разом
 *
 * Для кожної адреси — ланцюг редиректів (до 5 кроків) і кінцева сторінка: код, canonical, robots
 * (meta й X-Robots-Tag), кількість h1, карток товарів, згадок «floy», title, description, час.
 * Очікування: адреса з sitemap — 200 одразу; товар зниклої моделі — 301 одним кроком на чинну
 * (тип «…немає-в-API»); проба — те, що в ній записано. Зведення — по типах, далі перелік проблем.
 * Результат — .snapshots/urls/<ім'я>.json.
 */
import http from 'node:http'
import https from 'node:https'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SNAP_DIR, parseArgs, readJson, writeJson, pool, sleep } from './lib/snapshot.mjs'
import { loadBrandConfig } from './lib/brand.mjs'

const UA = 'Mozilla/5.0 (compatible; floy-url-check/1.0)'
const MAX_HOPS = 5
// Як у seo-snapshot.mjs: «floy» поза хостом адмінки й назвами тек-репозиторіїв
const BRAND_RE = /(?<!admin\.)\bfloy\b(?!-(?:new|prod|admin)\b)/gi
const file = (name) => join(SNAP_DIR, 'urls', `${name}.json`)

// Службові адреси рушія: [шлях, очікування] — код або адреса, куди має вести 301 одним кроком
const PROBES = [
	['/uk/', '/uk'],
	['/about', 200],
	['/uk/about', 200],
	['/dostavka', 200],
	['/povernennya', 200],
	['/article', 200],
	['/chekhly', 200],
	['/printcase', 200],
	['/search?q=iphone', 200],
	['/shop/cart', 200],
	['/shop/track-order', 200],
	['/robots.txt', 200],
	['/neisnuyucha-storinka-xyz', 404],
]

// ---------- Список ----------

function readList(path) {
	const out = []
	let type = 'url'
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		if (!line.trim()) continue
		if (line.startsWith('#')) {
			type = line.replace(/^#\s*/, '').trim() || 'url'
			continue
		}
		const [p, t] = line.split('\t')
		if (p.startsWith('/')) out.push({ path: p, type: t || type })
	}
	return out
}

// Стала вибірка: перемішування з сідом від назви типу (mulberry32) — щоразу ті самі адреси
function seeded(str) {
	let a = [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 7)
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function sample(list, spec) {
	const limits = Object.fromEntries(
		String(spec || '*:all').split(',').map((s) => {
			const [k, v] = s.includes(':') ? s.split(/:(?=[^:]*$)/) : ['*', s]
			return [k, v === 'all' ? Infinity : Number(v)]
		})
	)
	const byType = new Map()
	const seen = new Set()
	for (const u of list) {
		if (seen.has(u.path)) continue // у sitemap частина адрес повторюється
		seen.add(u.path)
		if (!byType.has(u.type)) byType.set(u.type, [])
		byType.get(u.type).push(u)
	}
	const out = []
	for (const [type, items] of byType) {
		const n = limits[type] ?? limits['*'] ?? Infinity
		if (n >= items.length) {
			out.push(...items)
			continue
		}
		const rnd = seeded(type)
		const copy = items.slice()
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(rnd() * (i + 1))
			;[copy[i], copy[j]] = [copy[j], copy[i]]
		}
		out.push(...copy.slice(0, n))
	}
	return out
}

/** Куди веде 301-карта бренду — та сама логіка, що в server/middleware/brand-redirects.ts */
function redirectMap(brand) {
	const exact = new Map()
	const prefixes = []
	for (const [from, to] of Object.entries(brand?.redirects ?? {})) {
		if (from.endsWith('/*')) prefixes.push([from.slice(0, -2), to])
		else exact.set(from, to)
	}
	prefixes.sort((a, b) => b[0].length - a[0].length)
	return (raw) => {
		const path = strip(raw).replace(/\/+$/, '') || '/'
		const uk = path === '/uk' || path.startsWith('/uk/')
		const p = uk ? path.slice(3) || '/' : path
		let to = exact.get(p)
		for (const [from, t] of to ? [] : prefixes) {
			if (p !== from && !p.startsWith(from + '/')) continue
			to = t.endsWith('/*') ? t.slice(0, -2) + p.slice(from.length) : t
			break
		}
		if (!to) return null
		return uk && !to.startsWith('/uk') ? '/uk' + (to === '/' ? '' : to) : to
	}
}

function probes(brand, target) {
	const out = PROBES.map(([path, expect]) => ({ path, type: 'probe', expect }))
	for (const from of Object.keys(brand?.redirects ?? {})) {
		const src = from.endsWith('/*') ? from.slice(0, -2) : from
		for (const path of [src, '/uk' + src]) out.push({ path, type: 'probe:301', expect: target(path) })
	}
	return out
}

// ---------- Запити ----------

/** GET без автоматичних редиректів; тіло — лише в HTML 200 */
function get(url, host) {
	return new Promise((resolve) => {
		const u = new URL(url)
		const lib = u.protocol === 'https:' ? https : http
		const started = Date.now()
		const req = lib.get(
			u,
			{ headers: { 'user-agent': UA, accept: 'text/html,*/*', ...(host ? { host } : {}) }, timeout: 90_000 },
			(res) => {
				const html = res.statusCode === 200 && /html/.test(res.headers['content-type'] || '')
				const chunks = []
				res.on('data', (c) => html && chunks.push(c))
				res.on('end', () =>
					resolve({
						status: res.statusCode,
						location: res.headers.location || null,
						robots: res.headers['x-robots-tag'] || null,
						html: html ? Buffer.concat(chunks).toString('utf8') : '',
						ms: Date.now() - started,
					})
				)
			}
		)
		req.on('timeout', () => req.destroy(new Error('timeout')))
		req.on('error', (e) => resolve({ status: 0, error: e.message, ms: Date.now() - started }))
	})
}

// 5xx і обрив — ще раз за 2 с: dev під навантаженням і старі сайти іноді віддають 502
async function getRetry(url, host) {
	const r = await get(url, host)
	if (r.status && r.status < 500) return r
	await sleep(2000)
	return get(url, host)
}

/** Ланцюг редиректів від адреси: [{ status, path }], остання ланка — кінцева сторінка */
async function walk(origin, path, host, site) {
	const chain = []
	let url = origin + path
	for (let hop = 0; hop <= MAX_HOPS; hop++) {
		const r = await getRetry(url, host)
		const u = new URL(url)
		chain.push({ status: r.status, path: u.pathname + u.search, ms: r.ms, error: r.error })
		if (![301, 302, 307, 308].includes(r.status) || !r.location) return { chain, page: r }
		const next = new URL(r.location, url)
		// Абсолютний Location на бойовий домен — далі по тій самій базі (процес за портом)
		url = next.origin === site || next.host === host ? origin + next.pathname + next.search : next.href
	}
	return { chain, page: { status: 'loop' } }
}

// ---------- Розбір сторінки ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const decode = (s) =>
	s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => {
		if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1))
		return ENTITIES[e.toLowerCase()] ?? m
	})
const clean = (s) => decode(String(s ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const attr = (html, re) => clean((html.match(re) || [])[1] || '') || null

function inspect(html) {
	const head = html.slice(0, html.indexOf('</head>') + 1 || 200_000)
	// «floy» у видимому (head і розмітка без скриптів) — проблема; у даних payload (напр. посилання
	// на відео товару) — лише довідково: на сторінці їх не видно
	const floy = (html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').match(BRAND_RE) || []).length
	return {
		title: attr(head, /<title[^>]*>([\s\S]*?)<\/title>/i),
		description: attr(head, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
		canonical: attr(head, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i),
		robots: attr(head, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i),
		lang: attr(html, /<html[^>]+lang="([^"]*)"/i),
		h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => clean(m[1])),
		cards: (html.match(/class="p-card[\s"]/g) || []).length,
		floy,
		floyData: (html.match(BRAND_RE) || []).length - floy,
	}
}

// ---------- Оцінка ----------

const LISTING = new Set(['model', 'brand', 'category', 'model~поза-меню'])
function strip(p) {
	return p.split('?')[0]
}
// Модель товару з його адреси: /uk/модель/товар → /uk/модель
const modelOf = (p) => strip(p).match(/^(\/uk)?\/[^/]+/)?.[0]

/**
 * Проблеми адреси й очікувані редиректи (notes — не проблема, лише в зведення): 301 за картою бренду;
 * товару вже немає — 301 на його модель (старий сайт у цьому разі вів на головну); товар переїхав в іншу
 * категорію — на свою адресу; товар зниклої моделі, якого теж немає, — на модель, а звідти картою бренду
 * на чинну (два кроки)
 */
function verdict(u, chain, info, site, target) {
	const issues = []
	const notes = []
	const end = chain.at(-1)
	const hops = chain.length - 1
	const hop = (i) => strip(chain[i]?.path || '')
	if (u.type.startsWith('probe')) {
		if (typeof u.expect === 'number') {
			if (end.status !== u.expect) issues.push(`код ${end.status}, а мав ${u.expect}`)
		} else if (hops !== 1 || hop(1) !== u.expect || end.status !== 200) {
			issues.push(`мав 301 → ${u.expect} одним кроком`)
		}
		return { issues, notes }
	}
	if (end.status !== 200) issues.push(`кінцевий код ${end.status}`)
	// Зникла модель: товар має переїхати одним кроком; решта адрес sitemap — без редиректу
	// (скісна в кінці — `/uk/` з sitemap — не проблема: рушій веде на адресу без неї, як і його sitemap)
	const product = u.type.startsWith('product')
	if (hops === 1 && hop(1) !== strip(u.path).replace(/\/+$/, '')) {
		if (hop(1) === target(u.path)) notes.push('301 за картою бренду')
		else if (product && hop(1) === modelOf(u.path)) notes.push('товару вже немає → модель')
		else if (product && hop(1).split('/').at(-1) === strip(u.path).split('/').at(-1)) notes.push('товар в іншій категорії → його адреса')
		else if (!u.type.includes('немає-в-API')) issues.push(`301 → ${end.path}`)
	} else if (hops === 2 && product && hop(1) === modelOf(u.path) && hop(2) === target(hop(1))) {
		notes.push('товару вже немає → модель → чинна модель')
	} else if (hops > 1) issues.push(`${hops} редиректи`)
	if (end.status !== 200 || !info) return { issues, notes }
	if (/noindex/i.test(`${info.robots} ${end.robots}`)) issues.push('noindex')
	if (info.canonical !== site + strip(end.path)) issues.push(`canonical ${info.canonical}`)
	if (info.h1.length !== 1) issues.push(`h1 × ${info.h1.length}`)
	if (info.floy) issues.push(`floy × ${info.floy}`)
	if (LISTING.has(u.type) && !info.cards) issues.push('без товарів')
	return { issues, notes }
}

// ---------- Зведення ----------

function report(results) {
	const signature = (chain) => chain.map((c) => c.status).join('→')
	const median = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0
	const byType = new Map()
	for (const r of results) {
		if (!byType.has(r.type)) byType.set(r.type, { n: 0, sig: new Map(), bad: 0, ms: [] })
		const t = byType.get(r.type)
		t.n++
		t.sig.set(signature(r.chain), (t.sig.get(signature(r.chain)) || 0) + 1)
		if (r.issues.length) t.bad++
		t.ms.push(r.chain.at(-1).ms)
	}
	console.log('\n' + 'Тип'.padEnd(28) + 'адрес'.padStart(6) + '  проблем  медіана  коди')
	for (const [type, t] of [...byType].sort((a, b) => b[1].n - a[1].n)) {
		const sig = [...t.sig].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ×${n}`).join(', ')
		console.log(`${type.padEnd(28)}${String(t.n).padStart(6)}  ${String(t.bad).padStart(7)}  ${String(median(t.ms)).padStart(5)} мс  ${sig}`)
	}

	const data = results.filter((r) => r.info?.floyData)
	if (data.length) console.log(`\n«floy» лише в даних payload (не видно на сторінці): ${data.length} сторінок, напр. ${data[0].path}`)

	const notes = new Map()
	for (const r of results) for (const n of r.notes) notes.set(n, [...(notes.get(n) || []), r])
	if (notes.size) console.log('\nОчікувані редиректи (не проблема):')
	for (const [note, rs] of notes) console.log(`  ${note} — ${rs.length}, напр. ${rs[0].path} → ${rs[0].chain.at(-1).path}`)

	const bad = results.filter((r) => r.issues.length)
	console.log(`\nПроблеми: ${bad.length} з ${results.length}`)
	// Група — вид проблеми без конкретної адреси («301 → /x» і «301 → /y» — одна група)
	const kind = (issue) => issue.replace(/^canonical .*/, 'canonical').replace(/ (?:→ )?\/\S*$/, '')
	const groups = new Map()
	for (const r of bad) {
		const key = r.issues.map(kind).join('; ')
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key).push(r)
	}
	for (const [key, rs] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
		console.log(`  ${key} — ${rs.length}`)
		for (const r of rs.slice(0, 8))
			console.log(`      ${r.path}  [${r.type}]  ${r.chain.map((c) => `${c.status} ${c.path}`).join(' → ')}  ${r.issues.join('; ')}`)
		if (rs.length > 8) console.log(`      … ще ${rs.length - 8}`)
	}

	const compared = results.filter((r) => r.old)
	if (!compared.length) return
	// Суфікс title не рахуємо: старий « — домен» рушій свідомо не ставить, а в товару його « — 289 грн»
	const norm = (s) =>
		(s || '').replace(/\s+[—–-]\s+(?:(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}|\d[\d\s]*(?:грн|₴))$/i, '').toLowerCase()
	const rows = new Map()
	for (const r of compared) {
		const a = r.old.info
		const b = r.info
		if (!rows.has(r.type)) rows.set(r.type, { n: 0, title: 0, h1: 0, desc: 0, oldBad: 0 })
		const t = rows.get(r.type)
		t.n++
		if (!a || !b) {
			t.oldBad++
			continue
		}
		if (norm(a.title) === norm(b.title)) t.title++
		if (norm(a.h1[0]) === norm(b.h1[0])) t.h1++
		if (norm(a.description) === norm(b.description)) t.desc++
	}
	console.log('\nЗі старим сайтом збігаються (title — без суфікса домену чи ціни):')
	console.log('Тип'.padEnd(28) + 'адрес  title     h1  description  не порівняно')
	for (const [type, t] of rows)
		console.log(
			`${type.padEnd(28)}${String(t.n).padStart(5)}  ${String(t.title).padStart(5)}  ${String(t.h1).padStart(5)}  ${String(t.desc).padStart(11)}  ${String(t.oldBad).padStart(12)}`
		)
}

// ---------- Запуск ----------

const { opts, pos } = parseArgs()

const brand = await loadBrandConfig().catch(() => null)
const target = redirectMap(brand)

// Оцінка — за чинними правилами скрипта, тож і давні прогони зводяться однаково. Та сама адреса в
// кількох прогонах — береться з останнього (повторна перевірка збоїв: report част-1 част-2 повтор)
if (pos[0] === 'report') {
	const byPath = new Map()
	for (const { meta, results } of pos.slice(1).map((name) => readJson(file(name))))
		for (const r of results) byPath.set(r.path, { ...r, ...verdict(r, r.chain, r.info, meta.site, target) })
	const results = [...byPath.values()]
	console.log(`Зведення ${pos.slice(1).join(' + ')}: адрес ${results.length}`)
	report(results)
	process.exit(0)
}

const [base, listFile] = [pos[0]?.replace(/\/$/, ''), pos[1]]
if (!base || !listFile) {
	console.log('node scripts/url-check.mjs <база> <список> [--sample=…] [--slice=…] [--probes] [--host=…] [--compare=…] [--out=…]')
	console.log('node scripts/url-check.mjs report <ім\'я>…')
	process.exit(1)
}
const SITE = String(opts.site || (brand ? `https://${brand.domain}` : base)).replace(/\/$/, '')
const OUT = opts.out || `check-${new Date().toISOString().slice(0, 10)}`

let list = sample(readList(listFile), opts.sample)
if (opts.types) {
	const types = new Set(String(opts.types).split(','))
	list = list.filter((u) => types.has(u.type))
}
if (opts['save-list']) {
	writeFileSync(opts['save-list'], list.map((u) => `${u.path}\t${u.type}`).join('\n') + '\n')
	console.log(`Вибірку (${list.length}) записано: ${opts['save-list']} — прогону не було`)
	process.exit(0)
}
const [from, to] = opts.slice ? String(opts.slice).split(':').map((n) => (n === '' ? undefined : Number(n))) : []
if (opts.slice) list = list.slice(from, to)
if (opts.probes && !from) list = [...probes(brand, target), ...list]

console.log(`Прогін: ${base}${opts.host ? ` (Host: ${opts.host})` : ''}, canonical — ${SITE}, адрес ${list.length}`)
let done = 0
const t0 = Date.now()
const results = await pool(list, Number(opts.parallel) || 4, async (u) => {
	const { chain, page } = await walk(base, u.path, opts.host, SITE)
	chain.at(-1).robots = page.robots
	const info = page.html ? inspect(page.html) : null
	if (++done % 200 === 0) console.log(`  ${done}/${list.length} (${Math.round((Date.now() - t0) / 1000)} с)`)
	return { ...u, chain, info, ...verdict(u, chain, info, SITE, target) }
})
console.log(`Готово за ${Math.round((Date.now() - t0) / 1000)} с`)

// Старий сайт: ті самі адреси по одній, з паузою — Nuxt 2 віддає 502 вже на двох паралельних
if (opts.compare) {
	const origin = String(opts.compare).replace(/\/$/, '')
	const per = Number(opts['compare-sample']) || 20
	const count = new Map()
	const subset = results.filter(
		(r) => !r.type.startsWith('probe') && (count.set(r.type, (count.get(r.type) || 0) + 1), count.get(r.type) <= per)
	)
	console.log(`Старий сайт ${origin}: ${subset.length} адрес`)
	for (const r of subset) {
		const { chain, page } = await walk(origin, r.path, null, origin)
		r.old = { chain: chain.map((c) => `${c.status} ${c.path}`), info: page.html ? inspect(page.html) : null }
		await sleep(300)
	}
}

report(results)
writeJson(file(OUT), {
	meta: { base, host: opts.host || null, site: SITE, compare: opts.compare || null, slice: opts.slice || null, date: new Date().toISOString() },
	results,
})
console.log(`\nЗбережено: ${file(OUT)}`)
