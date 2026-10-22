/**
 * Інвентар адрес старого сайту перед переїздом на рушій — NOTES/plans/PLAN-MULTISITE.md §0, етап A.
 * Запуск (портативний Node 22 з .node/, без залежностей — лише fetch):
 *
 *   node scripts/site-inventory.mjs <ключ>      smarket | sotamarket | printcase | floy (для звірки)
 *        --fresh         качати частини sitemap заново (інакше — з кешу .snapshots)
 *        --check         пройти зразки й адреси-проби на живому сайті: код і Location
 *        --samples=25    зразків на тип
 *
 * Sitemap → кожна частина по одній (у StekloMarket ~35 МБ на частину) → лише <loc> адрес →
 * тип адреси. Тип моделі/бренду/серії/категорії — з дерева меню apisite того ж сайту.
 * Результат — .snapshots/inventory/<ключ>/: urls.tsv (повний список з типами), summary.json,
 * summary.md (зведення для NOTES/inventory/<ключ>.md), samples.txt (адреси для прогону через стенд),
 * parts/*.tsv (кеш частин).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { SNAP_DIR, parseArgs, writeJson, pool, sleep } from './lib/snapshot.mjs'

const API = 'https://admin.floy.com.ua/apisite/'
const UA = 'Mozilla/5.0 (compatible; floy-site-inventory/1.0)'

/**
 * Старі сайти. base — хост, що віддає 200 (StekloMarket зараз 301 без-www → www);
 * scheme — логіка адрес: 'floy' (/{модель}, /{модель}/{товар}) або 'printcase' (свій рушій, §4.5).
 * probes — адреси для --check: мовні варіанти, хости, сторінки з відомими проблемами (§2.3)
 */
const SITES = {
	smarket: { base: 'https://www.steklomarket.com.ua', alt: 'https://steklomarket.com.ua', scheme: 'floy' },
	sotamarket: { base: 'https://sotamarket.com.ua', alt: 'https://www.sotamarket.com.ua', scheme: 'floy' },
	printcase: { base: 'https://print-case.com.ua', alt: 'https://www.print-case.com.ua', scheme: 'printcase' },
	floy: { base: 'https://floy.com.ua', alt: 'https://www.floy.com.ua', scheme: 'floy' },
}

const PROBES = {
	floy: [
		'/', '/uk', '/uk/', '/about', '/about/uk', '/about/uk/', '/uk/about', '/dostavka', '/dostavka/uk/',
		'/uk/dostavka', '/povernennya', '/otzyvy-klientov', '/article', '/article/uk/', '/uk/article',
		'/article/info', '/chekhly', '/printcase', '/printcase/iphone-15', '/uk/printcase', '/search?q=iphone',
		'/shop/cart', '/shop/track-order', '/robots.txt', '/neisnuyucha-storinka-xyz',
	],
	printcase: [
		'/', '/uk', '/brands', '/theme', '/o-nas', '/dostavka-oplata', '/faq', '/oformit-zakaz', '/cart/',
		'/about', '/dostavka', '/printcase', '/robots.txt', '/neisnuyucha-storinka-xyz',
	],
}

// Інфо-сторінки й розділи рушія (pages/), що мають ту саму адресу на старих Bootstrap-сайтах
const ENGINE_PAGES = new Set([
	'about', 'dostavka', 'povernennya', 'otzyvy-klientov', 'article', 'chekhly', 'printcase', 'search', 'shop',
])
const BLOG_TYPES = new Set(['new', 'akcii', 'review', 'info'])

// Інфо-сторінки Print-Case → адреса рушія (§4.5; FAQ — відкрите питання §16 п. 4)
const PC_INFO = {
	'o-nas': '/about',
	'dostavka-oplata': '/dostavka',
	faq: '/about (§16 п. 4)',
	'oformit-zakaz': '/shop/cart',
	cart: '/shop/cart',
}

const { opts, pos } = parseArgs()
const key = pos[0]
const site = SITES[key]
if (!site) {
	console.error(`Ключ сайту: ${Object.keys(SITES).join(' | ')}`)
	process.exit(1)
}
const SAMPLES = Number(opts.samples) || 25
const DIR = join(SNAP_DIR, 'inventory', key)
const PARTS_DIR = join(DIR, 'parts')
mkdirSync(PARTS_DIR, { recursive: true })

/** GET з повторами; великі частини sitemap віддаються повільно — таймаут щедрий */
async function get(url, { timeout = 600_000, tries = 3 } = {}) {
	for (let i = 1; ; i++) {
		try {
			const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) })
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return { text: await res.text(), url: res.url, redirected: res.redirected }
		} catch (e) {
			if (i >= tries) throw new Error(`${url}: ${e.message}`)
			await sleep(3000 * i)
		}
	}
}

const between = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'g'))].map((m) => m[1])

/**
 * Адреси частини: перший <loc> кожного <url> (картинки — <image:loc>, їх пропускаємо).
 * Індекс Print-Case невалідний — у <sitemapindex> змішано <url> і <sitemap>, тож беремо обидва
 */
function parseSitemap(xml) {
	const urls = between(xml, 'url').map((u) => ({
		loc: u.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1],
		lastmod: u.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1]?.slice(0, 10) ?? '',
	}))
	const children = between(xml, 'sitemap').map((s) => s.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1]).filter(Boolean)
	return { urls: urls.filter((u) => u.loc), children }
}

const decodeXml = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")

/** Частини sitemap по одній, з кешем у parts/ (рядок: адреса \t lastmod) */
async function loadSitemap() {
	const notes = []
	const index = await get(`${site.base}/sitemap.xml`, { timeout: 120_000 })
	const { urls: rootUrls, children } = parseSitemap(index.text)
	if (rootUrls.length) notes.push(`індекс sitemap невалідний: ${rootUrls.length} <url> прямо в <sitemapindex>`)
	const parts = [{ name: 'index', urls: rootUrls }]
	const childHosts = new Set(children.map((c) => new URL(c).origin))
	for (const h of childHosts) if (h !== site.base) notes.push(`індекс посилається на частини з хоста ${h} (сайт віддає ${site.base})`)

	for (const loc of children) {
		const name = loc.split('/').pop().replace(/\.xml$/, '')
		const cache = join(PARTS_DIR, `${name}.tsv`)
		let urls
		if (existsSync(cache) && !opts.fresh) {
			urls = readFileSync(cache, 'utf8').split('\n').filter(Boolean).map((l) => {
				const [loc, lastmod = ''] = l.split('\t')
				return { loc, lastmod }
			})
		} else {
			const t = Date.now()
			const res = await get(loc)
			if (res.redirected) notes.push(`${name}: ${loc} → ${res.url}`)
			urls = parseSitemap(res.text).urls
			writeFileSync(cache, urls.map((u) => `${u.loc}\t${u.lastmod}`).join('\n'))
			console.log(`  ${name}: ${urls.length} адрес, ${(res.text.length / 1e6).toFixed(1)} МБ, ${((Date.now() - t) / 1000).toFixed(0)} с`)
		}
		parts.push({ name, urls })
	}
	return { parts, notes, indexLastmod: between(index.text, 'lastmod').sort().slice(-1)[0] ?? '' }
}

/** Дерево меню apisite: alias → { type, brand, title } (бренд → серія → модель; категорії окремо) */
async function loadTree(siteKey) {
	const res = await get(`${API}categories/menu/300?site=${siteKey}&lang=ru`, { timeout: 120_000 })
	const menu = JSON.parse(res.text)
	const tree = new Map()
	for (const b of menu.brends ?? []) {
		if (b.url === 'chekhly') continue // «ВСІ» у сайту без брендів (Print-Case)
		tree.set(b.url, { type: 'brand', brand: b.url, title: b.title })
		for (const s of b.children ?? []) {
			// серія — вузол без id (у пустої серії немає й children), модель — з id
			if (s.id) tree.set(s.url, { type: 'model', brand: b.url, title: s.title })
			else tree.set(s.url, { type: 'serie', brand: b.url, title: s.title })
			for (const m of s.children ?? []) tree.set(m.url, { type: 'model', brand: b.url, title: m.title })
		}
	}
	for (const c of menu.categories ?? []) {
		const alias = c.url.replace(/^\//, '')
		if (!ENGINE_PAGES.has(alias)) tree.set(alias, { type: 'category', title: c.title })
	}
	return tree
}

/**
 * Тип адреси на сайтах зі схемою FLOY. lang: ru | uk | uk-suffix (стара помилка Sota: /about/uk/).
 * target — адреса на рушії, якщо вона інша (301)
 */
function classifyFloy(path, tree) {
	let p = path.replace(/\/+$/, '') || '/'
	let lang = 'ru'
	let target
	if (p === '/uk' || p.startsWith('/uk/')) {
		lang = 'uk'
		p = p.slice(3) || '/'
	} else if (p.endsWith('/uk')) {
		lang = 'uk-suffix'
		p = p.slice(0, -3) || '/'
		target = '/uk' + (p === '/' ? '' : p)
	}
	const s = p.split('/').filter(Boolean)
	const node = tree.get(s[0])
	const ofCat = (t) => (node ? `${t}@${node.type}` : `${t}@поза-меню`)
	let type
	if (!s.length) type = 'home'
	else if (s[0] === 'article') type = s.length === 1 ? 'blog' : s.length === 2 ? (BLOG_TYPES.has(s[1]) ? 'blog-type' : 'other') : 'article'
	else if (s[0] === 'printcase') type = s.length === 1 ? 'page:printcase' : 'printcase-model'
	else if (s[0] === 'neoprint') type = 'neoprint'
	else if (s[0] === 'shop' || s[0] === 'search') type = `page:${s[0]}`
	else if (s.length === 1) type = ENGINE_PAGES.has(s[0]) ? `page:${s[0]}` : node ? node.type : 'category@поза-меню'
	else if (s[1] === 'filter') type = s[0] === 'chekhly' ? 'theme@chekhly' : ofCat('theme')
	else if (s.length === 2) type = ofCat('product')
	else if (s[2] === 'attr') type = ofCat('product-attr')
	else type = 'other'
	return { type, lang, target }
}

/**
 * Тип адреси Print-Case і нова адреса за шаблонами §4.5. models — моделі брендів з самого sitemap
 * (/{бренд}/cases/{модель}): з них береться найдовший збіг для /{бренд}/{модель}-{принт}
 */
function classifyPrintcase(path, brandModels) {
	const p = path.replace(/\/+$/, '') || '/'
	const s = p.split('/').filter(Boolean)
	if (!s.length) return { type: 'home', lang: 'ru' }
	if (s.length === 1) {
		if (s[0] === 'brands' || s[0] === 'theme') return { type: `pc:${s[0]}`, lang: 'ru', target: '/chekhly' }
		if (PC_INFO[s[0]]) return { type: `pc-info:${s[0]}`, lang: 'ru', target: PC_INFO[s[0]] }
		return { type: 'pc-brand', lang: 'ru', target: p }
	}
	if (s[0] === 'theme' && s.length === 2) return { type: 'pc-theme', lang: 'ru', target: `/chekhly/filter/${s[1]}` }
	if (s[1] === 'cases' && s.length === 3) return { type: 'pc-model', lang: 'ru', target: `/${s[2]}` }
	if (s[1] === 'cases' && s[3] === 'theme' && s.length === 5)
		return { type: 'pc-model-theme', lang: 'ru', target: `/${s[2]}/filter/${s[4]}` }
	if (s.length === 2) {
		// у сегменті «бренду» моделей PC бувають і серії (/seriya-tecno/cases/…) — тож запасний пошук по всіх
		const match = (list) => (list ?? []).find((m) => s[1].startsWith(m + '-'))
		const model = match(brandModels.get(s[0])) ?? match(brandModels.get('*'))
		if (!model) return { type: 'pc-print@без-моделі', lang: 'ru' }
		return { type: 'pc-print', lang: 'ru', target: `/neoprint/${model}/{id}`, model, print: s[1].slice(model.length + 1) }
	}
	return { type: 'other', lang: 'ru' }
}

/** Рівномірні зразки зі списку — щоб потрапили і старі, і нові адреси */
const spread = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]))

/**
 * Код і Location адреси без переходу за редиректом. Старі сайти плаваюче віддають 502 уже на двох
 * паралельних запитах — тож 5xx перепитуємо; вдалося з другого разу — flaky (так само бачить і бот)
 */
async function probe(url, retry = true) {
	try {
		const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60_000) })
		await res.body?.cancel()
		if (res.status >= 500 && retry) {
			await sleep(2000)
			const again = await probe(url, false)
			return again.code < 500 ? { ...again, flaky: res.status } : again
		}
		const loc = res.headers.get('location')
		return { code: res.status, ...(loc ? { location: loc } : {}) }
	} catch (e) {
		return { code: 0, error: e.message }
	}
}

// ─── Збір ────────────────────────────────────────────────────────────────────

console.log(`Інвентар ${key}: ${site.base}`)
const { parts, notes, indexLastmod } = await loadSitemap()
const all = parts.flatMap((p) => p.urls.map((u) => ({ ...u, part: p.name })))

const hosts = {}
const paths = all.map((u) => {
	const url = new URL(decodeXml(u.loc))
	hosts[url.origin] = (hosts[url.origin] ?? 0) + 1
	return { path: url.pathname + url.search, lastmod: u.lastmod, part: u.part }
})

const seen = new Map()
for (const u of paths) seen.set(u.path, (seen.get(u.path) ?? 0) + 1)
const duplicates = [...seen].filter(([, n]) => n > 1)

/** Запис категорії з apisite (categories/category/{alias}): null — такої немає, на рушії буде 404 */
async function apiCategory(alias, siteKey = key) {
	const res = await get(`${API}categories/category/${encodeURIComponent(alias)}?site=${siteKey}&lang=ru`, { timeout: 60_000 })
	try {
		return JSON.parse(res.text)?.data ?? null
	} catch {
		return null
	}
}

let tree = new Map()
const extra = {}
if (site.scheme === 'floy') {
	tree = await loadTree(key)
	for (const u of paths) Object.assign(u, classifyFloy(u.path, tree))
	// Категорії поза меню (модель без серії тощо): тип — з apisite; немає там — сторінка зникне на рушії
	const offMenu = [...new Set(paths.filter((u) => u.type.includes('поза-меню')).map((u) => u.path.replace(/^\/uk/, '').split('/')[1]))]
	await pool(offMenu, 4, async (alias) => {
		const c = await apiCategory(alias)
		tree.set(alias, c ? { type: `${c.type}~поза-меню` } : { type: 'немає-в-API' })
	})
	for (const u of paths) if (u.type.includes('поза-меню')) Object.assign(u, classifyFloy(u.path, tree))
	extra.offMenu = Object.fromEntries(offMenu.map((a) => [a, tree.get(a).type]))
	// Моделі й категорії з меню, яких немає в sitemap (новинки після останньої генерації) — і навпаки
	const inMap = new Set(paths.filter((u) => u.lang === 'ru').map((u) => u.path.replace(/^\//, '').replace(/\/$/, '')))
	const missing = [...tree].filter(([alias]) => !inMap.has(alias))
	extra.menuNotInSitemap = Object.fromEntries(
		['brand', 'serie', 'model', 'category'].map((t) => {
			const list = missing.filter(([, n]) => n.type === t).map(([a]) => a)
			return [t, { n: list.length, samples: list.slice(0, 40) }]
		}),
	)
	extra.tree = Object.fromEntries(['brand', 'serie', 'model', 'category'].map((t) => [t, [...tree.values()].filter((n) => n.type === t).length]))
} else {
	const brandModels = new Map()
	for (const u of paths) {
		const s = u.path.split('/').filter(Boolean)
		if (s[1] === 'cases' && s.length === 3)
			for (const b of [s[0], '*']) brandModels.set(b, [...(brandModels.get(b) ?? []), s[2]])
	}
	// найдовший збіг першим: iphone-15-pro-max раніше за iphone-15
	for (const list of brandModels.values()) list.sort((a, b) => b.length - a.length)
	for (const u of paths) Object.assign(u, classifyPrintcase(u.path, brandModels))

	// Чи є такі alias серед категорій рушія (FLOY) — від цього залежать 301 /{бренд}/cases/{модель} → /{модель}
	const floyTree = await loadTree('floy')
	const models = [...new Set(paths.filter((u) => u.type === 'pc-model').map((u) => u.target.slice(1)))]
	const brands = paths.filter((u) => u.type === 'pc-brand').map((u) => u.path.slice(1))
	const notModel = models.filter((m) => floyTree.get(m)?.type !== 'model')
	extra.models = { n: models.length, notFloyModel: { n: notModel.length, list: notModel } }
	// перший сегмент /{бренд}/cases/{модель}: не лише бренди (seriya-tecno, seriya-e…)
	extra.caseSegments = Object.fromEntries([...brandModels].filter(([b]) => b !== '*').map(([b, l]) => [b, l.length]))
	extra.brands = { n: brands.length, notFloyBrand: brands.filter((b) => floyTree.get(b)?.type !== 'brand') }
	const prints = paths.filter((u) => u.type === 'pc-print')
	const printSlugs = new Map()
	for (const u of prints) printSlugs.set(u.print, (printSlugs.get(u.print) ?? 0) + 1)
	const themes = new Set(paths.filter((u) => u.type === 'pc-theme').map((u) => u.path.split('/')[2]))
	const modelThemes = new Set(paths.filter((u) => u.type === 'pc-model-theme').map((u) => u.path.split('/')[5]))
	extra.prints = {
		distinct: printSlugs.size,
		perModel: Math.round(prints.length / Math.max(1, models.length)),
		top: [...printSlugs].sort((a, b) => b[1] - a[1]).slice(0, 15),
	}
	extra.themes = { pages: themes.size, onModels: modelThemes.size, onModelsNotInIndex: [...modelThemes].filter((t) => !themes.has(t)) }
}

// ─── Зведення ────────────────────────────────────────────────────────────────

const byType = {}
for (const u of paths) {
	const t = (byType[u.type] ??= { total: 0, lang: {}, lastmod: { min: '9999', max: '' }, list: [], targets: new Set() })
	t.total++
	t.lang[u.lang] = (t.lang[u.lang] ?? 0) + 1
	if (u.lastmod) {
		if (u.lastmod < t.lastmod.min) t.lastmod.min = u.lastmod
		if (u.lastmod > t.lastmod.max) t.lastmod.max = u.lastmod
	}
	if (u.lang !== 'uk') t.list.push(u)
}
const types = Object.entries(byType).sort((a, b) => b[1].total - a[1].total)

const samples = {}
for (const [type, t] of types) samples[type] = spread(t.list, SAMPLES).map((u) => ({ path: u.path, ...(u.target ? { target: u.target } : {}) }))

let checks
if (opts.check) {
	console.log('Перевірка зразків і проб на живому сайті…')
	const probePaths = PROBES[site.scheme === 'floy' ? 'floy' : 'printcase']
	const probeUrls = [
		...probePaths.map((p) => site.base + p),
		site.alt + '/',
		site.alt + '/about',
		site.base.replace('https:', 'http:') + '/',
	]
	const sampleUrls = types.flatMap(([type]) => samples[type].slice(0, 8).map((s) => ({ type, url: site.base + s.path })))
	// по одному запиту з паузою: старий сайт не витримує й двох паралельних (див. probe)
	const probeRes = await pool(probeUrls, 1, async (url) => ({ url, ...(await probe(url)) }))
	const sampleRes = await pool(sampleUrls, 1, async (s) => {
		await sleep(300)
		return { ...s, ...(await probe(s.url)) }
	})
	checks = {
		probes: probeRes,
		samples: sampleRes.filter((r) => r.code !== 200 || r.flaky),
		samplesOk: sampleRes.filter((r) => r.code === 200 && !r.flaky).length,
	}
	// Товари зі старого sitemap, яких уже немає в API, на рушії стануть 404 (старий сайт міг віддавати 200/301)
	if (site.scheme === 'floy') {
		const products = types.filter(([t]) => t.startsWith('product@')).flatMap(([, t]) => spread(t.list, 40))
		const res = await pool(products, 4, async (u) => {
			const r = await get(`${API}products/product/${encodeURIComponent(u.path.split('/')[2])}?site=${key}&lang=ru`, { timeout: 60_000 }).catch(() => null)
			let found = false
			try {
				found = !!JSON.parse(r?.text ?? 'null')?.data
			} catch {}
			return { path: u.path, found }
		})
		checks.productsInApi = { checked: res.length, missing: res.filter((r) => !r.found).map((r) => r.path) }
	}
}

const summary = {
	site: key,
	base: site.base,
	date: new Date().toISOString().slice(0, 10),
	indexLastmod,
	total: paths.length,
	unique: seen.size,
	duplicates: { n: duplicates.length, samples: duplicates.slice(0, 20) },
	hosts,
	parts: parts.map((p) => ({ name: p.name, n: p.urls.length })),
	notes,
	types: Object.fromEntries(types.map(([type, t]) => [type, { total: t.total, lang: t.lang, lastmod: t.total ? t.lastmod : null }])),
	extra,
	samples,
	...(checks ? { checks } : {}),
}

writeJson(join(DIR, 'summary.json'), summary)
writeFileSync(join(DIR, 'urls.tsv'), paths.map((u) => [u.path, u.type, u.lang, u.lastmod, u.target ?? ''].join('\t')).join('\n'))
writeFileSync(
	join(DIR, 'samples.txt'),
	Object.entries(samples).flatMap(([type, list]) => [`# ${type}`, ...list.map((s) => s.path)]).join('\n') + '\n',
)

// Markdown-зведення — для NOTES/inventory/<ключ>.md
const md = []
md.push(`Зведення sitemap ${site.base} на ${summary.date} (скрипт \`scripts/site-inventory.mjs ${key}\`).`, '')
md.push(`Адрес: **${summary.total.toLocaleString('uk')}** (унікальних ${summary.unique.toLocaleString('uk')}); останній lastmod індексу — ${indexLastmod || '—'}.`)
md.push(`Частини: ${summary.parts.filter((p) => p.n).map((p) => `${p.name} (${p.n})`).join(', ')}.`)
if (notes.length) md.push('', ...notes.map((n) => `- ${n}`))
md.push('', '| Тип | Усього | ru | uk | інше | lastmod |', '|---|---:|---:|---:|---:|---|')
for (const [type, t] of types) {
	const other = t.total - (t.lang.ru ?? 0) - (t.lang.uk ?? 0)
	const lm = t.lastmod.max ? `${t.lastmod.min} … ${t.lastmod.max}` : '—'
	md.push(`| \`${type}\` | ${t.total} | ${t.lang.ru ?? 0} | ${t.lang.uk ?? 0} | ${other || ''} | ${lm} |`)
}
if (checks) {
	const line = (r) => `${r.flaky ? `${r.flaky}→` : ''}${r.code} ${r.url.replace(site.base, '')}${r.location ? ' → ' + r.location : ''}${r.error ? ' ' + r.error : ''}`
	md.push('', `Перевірка на живому сайті ${summary.date} (по одному запиту, 5xx перепитано; «502→200» — вдалося з другого разу):`, '')
	md.push(...checks.probes.map((r) => `- \`${line(r)}\``))
	md.push('', `Зразки (до 8 на тип): 200 — ${checks.samplesOk}; інші:`, '')
	md.push(...(checks.samples.length ? checks.samples.map((r) => `- \`[${r.type}] ${line(r)}\``) : ['- немає']))
	if (checks.productsInApi) {
		const p = checks.productsInApi
		md.push('', `Товари зі sitemap у API (\`products/product\`): перевірено ${p.checked}, немає — ${p.missing.length}.`)
		md.push(...p.missing.slice(0, 20).map((m) => `- \`${m}\``))
	}
}
writeFileSync(join(DIR, 'summary.md'), md.join('\n') + '\n')

console.log(md.join('\n'))
console.log('\nДодатково:', JSON.stringify(extra, null, 1).slice(0, 3000))
console.log(`\n→ ${DIR}`)
