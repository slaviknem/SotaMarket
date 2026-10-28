/**
 * SEO-зліпок сайту для перевірок «до/після» — NOTES/plans/PLAN-SCALING.md §2.
 * Запуск (портативний Node 22 з .node/, без залежностей — лише fetch):
 *
 *   node scripts/seo-snapshot.mjs <ім'я> [база]           зняти (база — http://localhost:3000)
 *        --only=/,/apple   лише ці адреси;  --parallel=3   одночасних запитів
 *   node scripts/seo-snapshot.mjs diff <a> <b> [--noise=<c>] [--all]
 *        друкує лише відмінності; --noise — сховати те, що різниться й між a і c
 *        (два знімки «до» підряд = природний шум: новинки, відгуки, лічильники)
 *
 * Результат — .snapshots/seo/<ім'я>.json. Для кожної адреси: код, Location, X-Robots-Tag,
 * <html lang>, <title>, усі <meta> (description, robots, og:*, twitter:*, theme-color…),
 * canonical, hreflang, іконки/manifest/preconnect, тексти h1, JSON-LD (розібраний,
 * ключі відсортовані) і кількість згадок «floy» поза admin.floy.com.ua — окремо в head,
 * JSON-LD, розмітці body та інших скриптах (payload, конфіг).
 */
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import {
	SNAP_DIR, DEFAULT_BASE, PAGES, FILES, parseArgs, onlyFilter, readJson, writeJson, exists,
	sortKeys, deepDiff, noiseKey, show, pool, sleep,
} from './lib/snapshot.mjs'

const UA = 'Mozilla/5.0 (compatible; floy-seo-snapshot/1.0)'
const SEO_DIR = join(SNAP_DIR, 'seo')
const file = (name) => join(SEO_DIR, `${name}.json`)

// Згадка бренду: слово «floy» у будь-якому регістрі (і в «floy.com.ua»), крім хоста адмінки —
// він спільний для всіх сайтів — і назв тек у шляхах dev-скриптів і конфігу i18n: `…/domains/FLOY/`,
// `…/nodeapps/FLOY/` і старі FLOY-NEW, FLOY-PROD (до 28.10.2026, є в старих зліпках). Ключі сховища floy_*
// сюди не потрапляють: «_» — частина слова
const BRAND_RE = /(?<!admin\.|(?:domains|nodeapps)[\\/])\bfloy\b(?!-(?:new|prod|admin)\b)/gi
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const LINK_RELS = new Set(['icon', 'apple-touch-icon', 'manifest', 'preconnect', 'dns-prefetch'])

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const decode = (s) =>
	s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => {
		if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1))
		return ENTITIES[e.toLowerCase()] ?? m
	})
const text = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

function parseAttrs(src) {
	const out = {}
	for (const [, k, v1, v2, v3] of src.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g))
		out[k.toLowerCase()] = decode(v1 ?? v2 ?? v3 ?? '')
	return out
}

/** Кількість згадок і до 8 різних контекстів (контексти — довідково, у diff не йдуть) */
function mentions(src) {
	const samples = new Set()
	let n = 0
	for (const m of src.matchAll(BRAND_RE)) {
		n++
		if (samples.size < 8) samples.add(src.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, ' '))
	}
	return { n, samples: [...samples] }
}

function parsePage(html) {
	const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? ''
	const bodyAt = html.search(/<body[\s>]/i)
	const body = bodyAt >= 0 ? html.slice(bodyAt) : ''

	const meta = {}
	for (const [, src] of head.matchAll(/<meta\b([^>]*)>/gi)) {
		const a = parseAttrs(src)
		const key = a.name ?? a.property ?? a['http-equiv'] ?? (a.charset !== undefined ? 'charset' : null)
		if (!key) continue
		const k = key.toLowerCase()
		const v = a.charset ?? a.content ?? ''
		meta[k] = k in meta ? [].concat(meta[k], v) : v
	}

	const canonical = []
	const hreflang = []
	const links = []
	for (const [, src] of head.matchAll(/<link\b([^>]*)>/gi)) {
		const a = parseAttrs(src)
		const rel = (a.rel ?? '').toLowerCase()
		if (rel === 'canonical') canonical.push(a.href)
		else if (rel === 'alternate' && a.hreflang) hreflang.push(`${a.hreflang} ${a.href}`)
		else if (LINK_RELS.has(rel) || (rel === 'preload' && a.as === 'font'))
			links.push([rel, a.href, a.type, a.sizes].filter(Boolean).join(' '))
	}

	const jsonld = []
	let jsonldRaw = ''
	let otherScripts = ''
	for (const [, attrs, code] of html.matchAll(SCRIPT_RE)) {
		if (/application\/ld\+json/i.test(attrs)) {
			jsonldRaw += code + '\n'
			try {
				jsonld.push(sortKeys(JSON.parse(code)))
			} catch (e) {
				jsonld.push({ error: `JSON не розбирається: ${e.message}`, raw: code.slice(0, 300) })
			}
		} else otherScripts += code + '\n'
	}

	const brand = {
		head: mentions(head.replace(SCRIPT_RE, '')),
		jsonld: mentions(jsonldRaw),
		body: mentions(body.replace(SCRIPT_RE, '')),
		scripts: mentions(otherScripts),
	}

	return {
		lang: parseAttrs(html.match(/<html\b([^>]*)>/i)?.[1] ?? '').lang ?? null,
		title: text(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
		meta: sortKeys(meta),
		canonical: canonical.length === 1 ? canonical[0] : canonical,
		hreflang: hreflang.sort(),
		links: links.sort(),
		h1: [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1])),
		jsonld,
		brand: Object.fromEntries(Object.entries(brand).map(([k, v]) => [k, v.n])),
		_brandSamples: Object.fromEntries(Object.entries(brand).filter(([, v]) => v.n).map(([k, v]) => [k, v.samples])),
	}
}

/** Запит без переходу за редиректами; 429/502/504 і мережеві збої — до 3 спроб */
async function get(url) {
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url, {
				redirect: 'manual',
				headers: { 'user-agent': UA, accept: 'text/html,*/*' },
				signal: AbortSignal.timeout(120_000),
			})
			if (![429, 502, 504].includes(res.status) || attempt === 3) return res
		} catch (e) {
			if (attempt === 3) throw e
		}
		await sleep(attempt * 3000)
	}
}

async function snapPage(base, path) {
	const t = Date.now()
	try {
		const res = await get(base + path)
		const html = await res.text()
		const location = res.headers.get('location')
		const isHtml = /text\/html/i.test(res.headers.get('content-type') ?? '')
		return {
			status: res.status,
			location: location ? location.replace(new URL(base).origin, '') : null,
			xRobotsTag: res.headers.get('x-robots-tag'),
			// у редиректу тіла немає — розбираємо лише сторінки (зокрема 404/503)
			...(isHtml && (res.status < 300 || res.status >= 400) ? parsePage(html) : {}),
			_ms: Date.now() - t,
		}
	} catch (e) {
		return { error: String(e.cause?.code ?? e.message), _ms: Date.now() - t }
	}
}

async function snapFile(base, path) {
	try {
		const res = await get(base + path)
		const buf = Buffer.from(await res.arrayBuffer())
		return {
			status: res.status,
			contentType: res.headers.get('content-type'),
			cacheControl: res.headers.get('cache-control'),
			xRobotsTag: res.headers.get('x-robots-tag'),
			size: buf.length,
			sha1: createHash('sha1').update(buf).digest('hex'),
		}
	} catch (e) {
		return { error: String(e.cause?.code ?? e.message) }
	}
}

async function snap(name, base, opts) {
	base = base.replace(/\/$/, '')
	const only = onlyFilter(opts.only)
	const parallel = Number(opts.parallel) || 3
	const pages = PAGES.filter((p) => only(p.path))
	const files = FILES.filter(only)
	console.log(`SEO-зліпок «${name}» з ${base}: ${pages.length} адрес, ${files.length} файлів`)

	const out = { meta: { base, date: new Date().toISOString() }, pages: {}, files: {} }
	await pool(pages, parallel, async ({ path }) => {
		const r = (out.pages[path] = await snapPage(base, path))
		const flag = r.error ? `помилка ${r.error}` : `${r.status}${r.location ? ' → ' + r.location : ''}`
		const brand = r.brand ? Object.values(r.brand).reduce((s, n) => s + n, 0) : 0
		console.log(`  ${flag.padEnd(6)} ${path}  (${r._ms} мс${r.brand ? `, «floy» ×${brand}` : ''})`)
	})
	await pool(files, parallel, async (path) => {
		out.files[path] = await snapFile(base, path)
	})
	// Порядок ключів — як у переліку, а не як відповіли запити
	out.pages = Object.fromEntries(pages.map((p) => [p.path, out.pages[p.path]]))
	out.files = Object.fromEntries(files.map((f) => [f, out.files[f]]))

	writeJson(file(name), out)
	console.log(`✓ ${file(name)}`)
}

function diff(nameA, nameB, opts) {
	const load = (n) => {
		if (!exists(file(n))) throw new Error(`немає зліпка ${file(n)}`)
		return readJson(file(n))
	}
	const a = load(nameA)
	const b = load(nameB)
	const noise = new Set()
	if (opts.noise) {
		const c = load(opts.noise)
		for (const scope of ['pages', 'files'])
			for (const key of Object.keys(a[scope]))
				for (const d of deepDiff(a[scope][key], c[scope]?.[key])) noise.add(noiseKey(key, d.path))
	}

	let total = 0
	let hidden = 0
	let places = 0
	for (const scope of ['pages', 'files']) {
		for (const key of new Set([...Object.keys(a[scope]), ...Object.keys(b[scope])])) {
			if (!(key in a[scope]) || !(key in b[scope])) {
				console.log(`${key in a[scope] ? '-' : '+'} ${key}  (є лише в ${key in a[scope] ? nameA : nameB})`)
				continue
			}
			const diffs = deepDiff(a[scope][key], b[scope][key]).filter((d) => {
				const isNoise = noise.has(noiseKey(key, d.path))
				if (isNoise) hidden++
				return !isNoise
			})
			if (!diffs.length) continue
			places++
			total += diffs.length
			console.log(`~ ${key}`)
			const limit = opts.all ? Infinity : 25
			for (const d of diffs.slice(0, limit)) console.log(`    ${d.path || '(весь запис)'}: ${show(d.a)} → ${show(d.b)}`)
			if (diffs.length > limit) console.log(`    … ще ${diffs.length - limit} (--all — усі)`)
		}
	}
	console.log(
		total
			? `\nВідмінностей: ${total} на ${places} адресах.`
			: `\nВідмінностей немає.`,
		opts.noise ? `Сховано як шум (є й між ${nameA} і ${opts.noise}): ${hidden}.` : ''
	)
	process.exitCode = total ? 1 : 0
}

const { opts, pos } = parseArgs()
if (pos[0] === 'diff' && pos[1] && pos[2]) diff(pos[1], pos[2], opts)
else if (pos[0] && pos[0] !== 'diff') await snap(pos[0], pos[1] ?? DEFAULT_BASE, opts)
else {
	console.log('Використання:\n  node scripts/seo-snapshot.mjs <ім\'я> [база] [--only=/,/apple] [--parallel=3]')
	console.log('  node scripts/seo-snapshot.mjs diff <a> <b> [--noise=<c>] [--all]')
	process.exitCode = 2
}
