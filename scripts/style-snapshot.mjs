/**
 * Зліпок обчислених стилів і скріншоти для перевірок «до/після» — PLAN-SCALING.md §2.
 * Системний Chrome у headless через DevTools Protocol (вбудований у Node 22 WebSocket,
 * нових залежностей немає). Шлях до Chrome — CHROME_PATH або стандартне місце встановлення.
 *
 *   node scripts/style-snapshot.mjs <ім'я> [база]        зняти (база — http://localhost:3000)
 *        --only=/,/apple   лише ці сторінки (і їхні стани)
 *        --widths=390,1440 лише ці ширини;  --no-shots  без скріншотів;  --no-states  без станів
 *   node scripts/style-snapshot.mjs diff <a> <b> [--noise=<c>] [--all] [--tolerance=0] [--strict]
 *        відмінності стилів і пікселів (субпіксельне згладжування не рахується — comparePng; --strict — все);
 *        картинки відмінностей — .snapshots/style/diff_<a>_<b>/
 *   node scripts/style-snapshot.mjs find <ім'я> "255, 122, 0" ["13, 13, 16" …] [--all]
 *        де в обчислених стилях трапляється значення (тест підміни палітри, етап 1.9)
 *
 * Що знімається (ширини 390 / 1024 / 1440):
 *  - дамп стилів — сторінки з styles: true у scripts/lib/snapshot.mjs і стани STATES:
 *    для кожного елемента (і ::before/::after з content) — властивості PROPS нижче.
 *    Ключ — шлях у DOM за тегами й індексами (класи можуть перейменовуватись);
 *  - скріншот усієї сторінки — усі PAGES; стану — лише вікно;
 *  - кількість помилок консолі й попереджень про гідратацію.
 * Перед знімком: кошик, обране й порівняння наповнені двома товарами (SEED_PRODUCTS, кешуються
 * в .snapshots/style/seed.json — однакові для всіх зліпків), після гідратації сторінку прокручено
 * до кінця (lazy-картинки, hydrate-on-visible, перша партія автопідвантаження), автопрокрутку банерів
 * зупинено на першому слайді, CSS-анімації завершено (нескінченні — на першому кадрі).
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import {
	SNAP_DIR, DEFAULT_BASE, PAGES, STATES, WIDTHS, SEED_PRODUCTS, parseArgs, onlyFilter, readJson,
	writeJson, exists, slug, show, sleep,
} from './lib/snapshot.mjs'

const STYLE_DIR = join(SNAP_DIR, 'style')
const MAX_SHOT_H = 15000 // довші сторінки знімаємо до цієї висоти (межа текстури Chrome ~16К)
const SEP = '\u001f'

const PROPS = [
	'color', 'background-color', 'background-image',
	'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color',
	'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
	'box-shadow', 'text-shadow', 'opacity', 'filter', 'backdrop-filter', 'transform', 'scrollbar-color',
	'border-radius', 'z-index', 'display', 'visibility', 'position', 'top', 'scroll-margin-top',
	'max-height', 'min-width', 'grid-template-columns',
	'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'padding', 'margin',
	'width', 'height', // лише для кореневого <svg> (іконки), в інших порожні
]

// ───────────────────────────── Chrome і DevTools Protocol ─────────────────────────────

const CHROME = [
	process.env.CHROME_PATH,
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
	process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
].find((p) => p && exists(p))

async function launchChrome() {
	if (!CHROME) throw new Error('Chrome не знайдено — вкажіть шлях у CHROME_PATH')
	const profile = mkdtempSync(join(tmpdir(), 'floy-style-'))
	const proc = spawn(
		CHROME,
		[
			'--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
			'--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
			'--disable-background-networking', '--disable-component-update', '--hide-scrollbars',
			'--mute-audio', '--force-color-profile=srgb', '--disable-features=Translate,MediaRouter',
			// гліфи — на цілі пікселі: інакше текст на дробовій координаті між прогонами згладжується інакше
			'--disable-font-subpixel-positioning', '--disable-lcd-text',
			'about:blank',
		],
		{ stdio: 'ignore' }
	)
	// Порт DevTools Chrome пише у файл профілю (--remote-debugging-port=0 = будь-який вільний)
	// Windows: поки Chrome пише файл, читання дає EBUSY — просто чекаємо далі
	const portFile = join(profile, 'DevToolsActivePort')
	const readPort = () => {
		try {
			const text = readFileSync(portFile, 'utf8')
			return text.includes('\n') ? text : null
		} catch {
			return null
		}
	}
	let portText
	for (let i = 0; !(portText = readPort()); i++) {
		if (i > 150) throw new Error('Chrome не відкрив DevTools-порт за 15 с')
		await sleep(100)
	}
	const [port, path] = portText.trim().split('\n')
	const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`)
	await new Promise((ok, fail) => ((ws.onopen = ok), (ws.onerror = () => fail(new Error('DevTools WebSocket')))))

	let id = 0
	const pending = new Map()
	const listeners = new Set()
	ws.onmessage = (e) => {
		const msg = JSON.parse(e.data)
		if (!msg.id) return listeners.forEach((fn) => fn(msg))
		const p = pending.get(msg.id)
		pending.delete(msg.id)
		msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result)
	}
	const send = (method, params = {}, sessionId) =>
		new Promise((resolve, reject) => {
			pending.set(++id, { resolve, reject, method })
			ws.send(JSON.stringify({ id, method, params, sessionId }))
		})

	return {
		send,
		listeners,
		async close() {
			await send('Browser.close').catch(() => {})
			await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)))
			for (let i = 0; i < 10; i++) {
				try {
					return rmSync(profile, { recursive: true, force: true })
				} catch {
					await sleep(300) // Windows ще тримає файли профілю
				}
			}
		},
	}
}

/** Вкладка: навігація, очікування тиші в мережі, виконання JS, події консолі */
async function openTab(browser, initScript) {
	const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' })
	const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true })
	const s = (method, params) => browser.send(method, params, sessionId)

	const inflight = new Map() // requestId → час старту
	const docStatus = new Map() // requestId документа → HTTP-код
	let lastNet = Date.now()
	let console_ = { errors: 0, hydration: 0, samples: [] }
	const waiters = new Set()
	browser.listeners.add((m) => {
		if (m.sessionId !== sessionId) return
		const p = m.params
		switch (m.method) {
			case 'Network.requestWillBeSent':
				if (!['WebSocket', 'EventSource'].includes(p.type)) inflight.set(p.requestId, Date.now())
				lastNet = Date.now()
				break
			case 'Network.loadingFinished':
			case 'Network.loadingFailed':
				inflight.delete(p.requestId)
				lastNet = Date.now()
				break
			case 'Network.responseReceived':
				if (p.type === 'Document') docStatus.set(p.requestId, p.response.status)
				break
			case 'Runtime.consoleAPICalled': {
				if (!['error', 'warning'].includes(p.type)) break
				const msg = p.args.map((a) => a.value ?? a.description ?? '').join(' ')
				if (/hydration/i.test(msg)) console_.hydration++
				else if (p.type === 'error') console_.errors++
				else break
				if (console_.samples.length < 5) console_.samples.push(msg.slice(0, 200))
				break
			}
			case 'Runtime.exceptionThrown':
				console_.errors++
				if (console_.samples.length < 5)
					console_.samples.push(String(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text).slice(0, 200))
				break
		}
		waiters.forEach((fn) => fn(m))
	})
	const waitFor = (pred, timeout) =>
		new Promise((resolve, reject) => {
			const fn = (m) => pred(m) && (clearTimeout(t), waiters.delete(fn), resolve(m))
			const t = setTimeout(() => (waiters.delete(fn), reject(new Error(`немає події за ${timeout / 1000} с`))), timeout)
			waiters.add(fn)
		})

	await s('Page.enable')
	await s('Network.enable')
	await s('Runtime.enable')
	await s('Page.addScriptToEvaluateOnNewDocument', { source: initScript })

	const tab = {
		send: s,
		async eval(expression) {
			const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
			if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
			return r.result.value
		},
		async viewport({ width, height, mobile }) {
			await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
			await s('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 })
		},
		/** Перехід; повертає HTTP-код документа (після редиректів) */
		async goto(url) {
			inflight.clear()
			console_ = { errors: 0, hydration: 0, samples: [] }
			// dev-сервер компілює сторінку при першому запиті — чекаємо щедро. Якщо завис сам
			// Page.navigate, таймаут load не має лишитись необробленим — інакше Node завершує процес
			const loaded = waitFor((m) => m.method === 'Page.loadEventFired', 180_000)
			loaded.catch(() => {})
			const r = await Promise.race([s('Page.navigate', { url }), loaded.then(() => ({}))])
			if (r.errorText) throw new Error(r.errorText)
			await loaded
			return docStatus.get(r.loaderId) ?? null
		},
		/** Тиша в мережі quiet мс; запити, що висять понад 15 с (поллінг), не рахуємо */
		async idle(quiet = 700, timeout = 30_000) {
			const end = Date.now() + timeout
			while (Date.now() < end) {
				const now = Date.now()
				const busy = [...inflight.values()].some((t) => now - t < 15_000)
				if (!busy && now - lastNet >= quiet) return true
				await sleep(100)
			}
			return false
		},
		console: () => ({ errors: console_.errors, hydration: console_.hydration, _samples: console_.samples }),
		/**
		 * Яким шрифтом фактично відмальовано текст першого видимого h1/p/a: { family — перший
		 * з font-family, used — шрифти рендера }. Стан document.fonts тут не допомагає: на dev-сторінці
		 * 404 шрифти «завантажені», а текст через раз малювався запасним
		 */
		async renderedFont() {
			await s('DOM.enable')
			await s('CSS.enable')
			const { root } = await s('DOM.getDocument', { depth: 0 })
			for (const selector of ['h1', 'p', 'a']) {
				const { nodeIds } = await s('DOM.querySelectorAll', { nodeId: root.nodeId, selector })
				for (const nodeId of nodeIds.slice(0, 5)) {
					const { fonts } = await s('CSS.getPlatformFontsForNode', { nodeId })
					if (!fonts.length) continue // прихований вузол — нічого не відмальовано
					const { computedStyle } = await s('CSS.getComputedStyleForNode', { nodeId })
					const ff = computedStyle.find((p) => p.name === 'font-family')?.value ?? ''
					return { family: ff.split(',')[0].trim().replace(/^["']|["']$/g, ''), used: fonts.map((f) => f.familyName) }
				}
			}
			return null
		},
	}
	return tab
}

// ───────────────────────────── Підготовка сторінки ─────────────────────────────

/** Скрипт на кожен новий документ: наповнення сховища й зупинка автопрокрутки банерів */
const initScript = (origin, seed) => `(() => {
	if (location.origin !== ${JSON.stringify(origin)}) return
	try {
		const seed = ${JSON.stringify(seed)}
		for (const k in seed) localStorage.setItem(k, JSON.stringify(seed[k]))
	} catch {}
	// BannerSlider гортає кожні 5 с і на prefers-reduced-motion не зважає
	setInterval(() => {
		for (const el of document.querySelectorAll('.swiper')) if (el.swiper?.autoplay?.running) el.swiper.autoplay.stop()
	}, 50)
	// Курсор у полі блимає — інакше знімок стану «пошук» щоразу інший
	document.addEventListener('DOMContentLoaded', () => {
		const st = document.createElement('style')
		st.textContent = '*{caret-color:transparent!important}'
		document.head.append(st)
	})
})()`

// Шрифти — щоразу перед знімком: на dev-сторінці 404 стилі з @font-face доінжектуються пізніше,
// з'являються нові незавантажені копії шрифту, і текст знімався запасним шрифтом
const FREEZE = `(async () => {
	for (let i = 0; i < 20; i++) {
		const pending = [...document.fonts].filter((f) => f.status === 'unloaded' || f.status === 'loading')
		if (!pending.length) break
		await Promise.all(pending.map((f) => f.load().catch(() => {})))
		await new Promise((r) => setTimeout(r, 100))
	}
	await document.fonts.ready
	for (const el of document.querySelectorAll('.swiper')) {
		const s = el.swiper
		if (!s || s.destroyed) continue
		s.autoplay?.stop()
		s.params.loop ? s.slideToLoop(0, 0, false) : s.slideTo(0, 0, false)
	}
	for (const a of document.getAnimations()) {
		try {
			if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0 }
			else a.finish()
		} catch {}
	}
})()`

async function freeze(tab) {
	for (let i = 0; i < 2; i++) {
		await tab.eval(FREEZE)
		await sleep(150)
	}
}

// Кінець гідратації: спостерігачі (автопідвантаження, hydrate-on-visible) чіпляються лише в onMounted.
// На повільному dev без цього прокрутка проскакувала раніше, і перша партія товарів то була, то ні
const HYDRATED = `new Promise((resolve) => {
	const end = Date.now() + 60000
	const check = () => {
		const app = document.querySelector('#__nuxt')?.__vue_app__?.$nuxt
		if ((app && !app.isHydrating) || Date.now() > end) return resolve()
		setTimeout(check, 50)
	}
	check()
})`

const SCROLL_THROUGH = `(async () => {
	const step = innerHeight * 0.8
	for (let y = 0, i = 0; y < document.documentElement.scrollHeight && i < 100; y += step, i++) {
		scrollTo(0, y)
		await new Promise((r) => setTimeout(r, 150))
	}
	return document.documentElement.scrollHeight
})()`

// На dev main.css підключено двічі (SSR-посилання + стиль Vite) — два однакові набори @font-face,
// і текст через раз малювався то однією, то іншою копією (інша ширина рядків при однакових стилях).
// Закріплюємо: ті самі файли й дескриптори додаємо через document.fonts.add — такі шрифти Chrome
// ставить після CSS-шрифтів, тож вони виграють при підборі, і їх не перестворює повторна вставка стилів
const PIN_FONTS = `(async () => {
	if (window.__snapFontsPinned) return
	window.__snapFontsPinned = true
	const seen = new Set()
	const faces = []
	const DESC = [['weight', 'font-weight'], ['style', 'font-style'], ['stretch', 'font-stretch'], ['unicodeRange', 'unicode-range'], ['display', 'font-display']]
	for (const sheet of document.styleSheets) {
		let rules
		try { rules = sheet.cssRules } catch { continue }
		for (const r of rules) {
			if (!(r instanceof CSSFontFaceRule)) continue
			const s = r.style
			const family = s.getPropertyValue('font-family').trim().replace(/^["']|["']$/g, '')
			const src = s.getPropertyValue('src')
			const key = family + '|' + src + '|' + s.getPropertyValue('unicode-range')
			if (seen.has(key) || src.includes('data:')) continue
			seen.add(key)
			const desc = {}
			for (const [k, p] of DESC) if (s.getPropertyValue(p)) desc[k] = s.getPropertyValue(p)
			faces.push(new FontFace(family, src, desc))
		}
	}
	faces.forEach((f) => document.fonts.add(f))
	await Promise.all(faces.map((f) => f.load().catch(() => {})))
})()`

/** Стабілізація після завантаження — щоб два знімки поспіль збігались */
async function settle(tab, startedAt) {
	await tab.eval(HYDRATED)
	await tab.eval(PIN_FONTS)
	await tab.idle()
	// До кінця сторінки: lazy-картинки, hydrate-on-visible, перша партія автопідвантаження.
	// Проходимо ще раз, доки сторінка росте (дописані товари відсувають низ)
	for (let pass = 0; pass < 4; pass++) {
		const before = await tab.eval(SCROLL_THROUGH)
		await tab.idle()
		if ((await tab.eval('document.documentElement.scrollHeight')) === before && pass > 0) break
	}
	await tab.eval('scrollTo(0, 0)')
	// Мовний банер — через 1.5 с, чат і дерево меню — у простої браузера (до 3–4 с)
	const rest = 5000 - (Date.now() - startedAt)
	if (rest > 0) await sleep(rest)
	await tab.idle()
	// Шрифти довантажуємо явно: одразу після рестарту dev-сервера 404 і /about знялись запасним
	// шрифтом (font-display: swap), і весь текст «відрізнявся». Повертаємо кількість збійних
	const fontErrors = await tab.eval(`(async () => {
		await Promise.all([...document.fonts].filter((f) => f.status !== 'loaded').map((f) => f.load().catch(() => {})))
		await document.fonts.ready
		await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => {
			i.addEventListener('load', r, { once: true })
			i.addEventListener('error', r, { once: true })
			setTimeout(r, 15000)
		})))
		return [...document.fonts].filter((f) => f.status === 'error').length
	})()`)
	await freeze(tab)
	return fontErrors
}

const DUMP = `(() => {
	const PROPS = ${JSON.stringify(PROPS)}
	const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'HEAD', 'TITLE', 'BASE'])
	const out = []
	const read = (cs, svg) => PROPS.map((p) => (p === 'width' || p === 'height') && !svg ? '' : cs.getPropertyValue(p)).join(${JSON.stringify(SEP)})
	const walk = (el, path) => {
		out.push([path, read(getComputedStyle(el), el instanceof SVGSVGElement)])
		for (const pseudo of ['::before', '::after']) {
			const cs = getComputedStyle(el, pseudo)
			if (cs.content && cs.content !== 'none' && cs.content !== 'normal') out.push([path + pseudo, read(cs)])
		}
		if (el.matches('input, textarea')) out.push([path + '::placeholder', read(getComputedStyle(el, '::placeholder'))])
		const n = {}
		for (const ch of el.children) {
			if (SKIP.has(ch.tagName)) continue
			const tag = ch.tagName.toLowerCase()
			const i = (n[tag] = (n[tag] ?? -1) + 1)
			walk(ch, path + '>' + tag + (i ? ':' + i : ''))
		}
	}
	walk(document.documentElement, 'html')
	return { els: out, height: document.documentElement.scrollHeight, url: location.pathname + location.search }
})()`

/** Дії стану: hover мишею (спрацьовує CSS :hover), click, type; у hover/click value — номер збігу */
async function runActions(tab, actions) {
	for (const [kind, sel, value] of actions) {
		const nth = typeof value === 'number' ? value : 0
		const pos = await tab.eval(`(() => {
			const el = document.querySelectorAll(${JSON.stringify(sel)})[${nth}]
			if (!el) return null
			el.scrollIntoView({ block: 'center' })
			const r = el.getBoundingClientRect()
			${kind === 'click' ? 'el.click()' : kind === 'type' ? 'el.focus()' : ''}
			return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
		})()`)
		if (!pos) throw new Error(`немає елемента ${sel}${nth ? ` [${nth}]` : ''}`)
		if (kind === 'hover') await tab.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pos })
		if (kind === 'type') await tab.send('Input.insertText', { text: value })
		await sleep(kind === 'type' ? 1200 : 700) // debounce пошуку, затримка відкриття мегаменю
		await tab.idle()
	}
	await freeze(tab)
}

async function screenshot(tab, file, width, height) {
	const { data } = await tab.send('Page.captureScreenshot', {
		format: 'png',
		captureBeyondViewport: !!height,
		...(height ? { clip: { x: 0, y: 0, width, height: Math.min(height, MAX_SHOT_H), scale: 1 } } : {}),
	})
	writeFileSync(file, Buffer.from(data, 'base64'))
}

/** Кошик, обране й порівняння — у форматі useCart/useLists (persist.client.ts) */
async function loadSeed() {
	const file = join(STYLE_DIR, 'seed.json')
	if (exists(file)) return readJson(file)
	const api = process.env.URL_API || 'https://admin.floy.com.ua/apisite/'
	const products = []
	for (const alias of SEED_PRODUCTS) {
		const res = await fetch(`${api}products/product/${alias}?lang=ru&site=floy`)
		const p = res.ok ? (await res.json()).data : null
		if (!p) throw new Error(`товар для наповнення кошика ${alias} недоступний (${res.status}) — замініть у SEED_PRODUCTS`)
		products.push(p)
	}
	const card = (p) => ({
		id: p.id, alias: p.alias, alias_cat: p.alias_cat, title: p.title, price: p.price,
		price_old: p.price_old, image_file: p.image_file, group: p.group, available: p.available,
		categories: p.categories?.[0]
			? [{ id: p.categories[0].id, alphaprint_available: p.categories[0].alphaprint_available }]
			: undefined,
		description_short: p.description_short,
	})
	const items = products.map((p, i) => {
		const attr = p.attributes?.find((a) => a.available) ?? null
		return {
			id: i + 1,
			product: {
				id: p.id, alias: p.alias, alias_cat: p.alias_cat, title: p.title, image: p.image_file,
				price: p.price, price_old: p.price_old, attrib_title: attr?.title ?? '',
			},
			attribute: attr?.id ?? 0, price: p.price, quantity: 1, discount: 0, total: p.price,
			category_id: p.categories?.[0]?.id,
		}
	})
	const seed = {
		floy_cart: { lastItemId: items.length, items, discount: 0 },
		floy_wishlist: products.map(card),
		floy_compare: products.map(card),
	}
	writeJson(file, seed)
	return seed
}

// ───────────────────────────── Зняття ─────────────────────────────

async function snap(name, base, opts) {
	base = base.replace(/\/$/, '')
	const only = onlyFilter(opts.only)
	const widths = opts.widths ? WIDTHS.filter((w) => String(opts.widths).split(',').includes(String(w.width))) : WIDTHS
	const shots = !opts['no-shots']
	const pages = PAGES.filter((p) => only(p.path) && (shots || p.styles))
	const states = opts['no-states'] ? [] : STATES.filter((st) => only(st.path) && widths.some((w) => w.width === st.width))
	const dir = join(STYLE_DIR, name)
	rmSync(dir, { recursive: true, force: true })
	mkdirSync(join(dir, 'shots'), { recursive: true })

	const seed = await loadSeed()
	console.log(`Зліпок стилів «${name}» з ${base}: ${pages.length} сторінок × ${widths.length} ширин, ${states.length} станів`)
	console.log(`Chrome: ${CHROME}`)

	const table = []
	const tableIdx = new Map()
	const captures = {}
	const keep = (r) => ({
		...r,
		els: r.els.map(([path, st]) => {
			if (!tableIdx.has(st)) tableIdx.set(st, table.push(st) - 1)
			return [path, tableIdx.get(st)]
		}),
	})

	const browser = await launchChrome()
	const failed = []
	try {
		const tab = await openTab(browser, initScript(new URL(base).origin, seed))
		const jobs = [
			...pages.flatMap((p) => widths.map((w) => ({ path: p.path, w, dump: p.styles, shot: shots }))),
			...states.map((st) => ({ path: st.path, w: WIDTHS.find((w) => w.width === st.width), state: st, dump: true, shot: shots })),
		]
		const capture = async (job) => {
			const t = Date.now()
			await tab.viewport(job.w)
			const status = await tab.goto(base + job.path)
			const fontErrors = await settle(tab, t)
			if (job.state) await runActions(tab, job.state.actions)
			// Текст запасним шрифтом — кадр недостовірний: чекаємо, а не вийде — повтор з перезавантаженням
			for (let i = 0; ; i++) {
				const font = await tab.renderedFont()
				if (!font || font.used.some((u) => u.toLowerCase().includes(font.family.toLowerCase()))) break
				if (i === 3) throw new Error(`текст відмальовано шрифтом ${font.used.join(', ')} замість ${font.family}`)
				await sleep(500)
				await freeze(tab)
			}
			const r = await tab.eval(DUMP)
			const file = `${slug(job.path)}@${job.w.width}${job.state ? '~' + job.state.name : ''}.png`
			if (job.shot) await screenshot(tab, join(dir, 'shots', file), job.w.width, job.state ? 0 : r.height)
			const c = tab.console()
			const note =
				`${status} ${((Date.now() - t) / 1000).toFixed(1)} с` +
				(job.dump ? `, ${r.els.length} ел.` : '') +
				(c.errors || c.hydration ? `  ⚠ консоль: помилок ${c.errors}, гідратація ${c.hydration}` : '') +
				(fontErrors ? `  ⚠ шрифтів не завантажилось: ${fontErrors}` : '')
			return [{ status, url: r.url, height: r.height, fontErrors, console: c, ...(job.dump ? keep({ els: r.els }) : {}) }, note]
		}

		let n = 0
		for (const job of jobs) {
			const key = `${job.path}@${job.w.width}${job.state ? '~' + job.state.name : ''}`
			// dev-сервер зрідка зависає на запиті, а текст — малюється запасним шрифтом: до двох повторів
			for (let attempt = 1; attempt <= 3; attempt++) {
				try {
					const [result, note] = await capture(job)
					captures[key] = result
					console.log(`  [${++n}/${jobs.length}] ${key}  ${note}`)
					break
				} catch (e) {
					if (attempt < 3) {
						console.log(`  … ${key}: ${e.message} — повтор`)
						continue
					}
					failed.push(key)
					captures[key] = { error: e.message }
					console.log(`  [${++n}/${jobs.length}] ✗ ${key}: ${e.message}`)
				}
			}
		}
	} finally {
		await browser.close()
	}

	writeJson(join(dir, 'styles.json'), { meta: { base, date: new Date().toISOString(), chrome: CHROME }, props: PROPS, table, captures })
	console.log(`✓ ${dir}${failed.length ? `\n✗ не вдалося: ${failed.join(', ')}` : ''}`)
	if (failed.length) process.exitCode = 1
}

// ───────────────────────────── Порівняння ─────────────────────────────

const loadSnap = (name) => {
	const f = join(STYLE_DIR, name, 'styles.json')
	if (!exists(f)) throw new Error(`немає зліпка ${f}`)
	const s = readJson(f)
	for (const c of Object.values(s.captures)) if (c.els) c.map = new Map(c.els.map(([p, i]) => [p, s.table[i]]))
	return s
}

/** Відмінності однієї знятої сторінки: [{ path, prop, a, b }] (prop '+'/'-' — елемента немає) */
function captureDiff(ca, cb, props) {
	const out = []
	for (const f of ['status', 'url', 'height', 'error', 'fontErrors'])
		if ((ca[f] ?? null) !== (cb[f] ?? null)) out.push({ path: '', prop: f, a: ca[f], b: cb[f] })
	for (const f of ['errors', 'hydration'])
		if (ca.console?.[f] !== cb.console?.[f]) out.push({ path: '', prop: `консоль.${f}`, a: ca.console?.[f], b: cb.console?.[f] })
	if (!ca.map || !cb.map) return out
	for (const [path, sa] of ca.map) {
		const sb = cb.map.get(path)
		if (sb === undefined) out.push({ path, prop: '-', a: 'є', b: 'немає' })
		else if (sa !== sb) {
			const va = sa.split(SEP)
			const vb = sb.split(SEP)
			props.forEach((p, i) => va[i] !== vb[i] && out.push({ path, prop: p, a: va[i], b: vb[i] }))
		}
	}
	for (const path of cb.map.keys()) if (!ca.map.has(path)) out.push({ path, prop: '+', a: 'немає', b: 'є' })
	return out
}

/**
 * Попіксельне порівняння a і b. fc — знімок «шуму» (другий «до»): пікселі, що різняться
 * між a і c, не рахуються (згладжування іконок після анімації, статус чату тощо).
 * Без strict піксель не вважається зміненим, якщо його колір у кожному каналі лежить у межах кольорів
 * сусідства 3×3 іншого знімка (в обидва боки) — так виглядає зсув тексту на долю пікселя (бувало на
 * пагінації при однакових стилях). Зміна кольору заливки чи поява елемента — рахується; тонку зміну
 * кольору рамки так можна не помітити, але її точно ловить дамп стилів. --strict — рахувати все
 */
async function comparePng(fa, fb, out, tolerance, fc, strict) {
	const raw = (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
	const [A, B, C] = await Promise.all([raw(fa), raw(fb), fc && exists(fc) ? raw(fc) : null])
	const w = Math.min(A.info.width, B.info.width)
	const h = Math.min(A.info.height, B.info.height)
	const img = Buffer.alloc(w * h * 4)
	const at = (P, x, y) => (y * P.info.width + x) * 4
	const delta = (P, ip, Q, iq) =>
		Math.max(Math.abs(P.data[ip] - Q.data[iq]), Math.abs(P.data[ip + 1] - Q.data[iq + 1]), Math.abs(P.data[ip + 2] - Q.data[iq + 2]))
	// Чи лежить колір P(x, y) у межах кольорів Q на 3×3 навколо (x, y) — у кожному каналі
	const within = (P, Q, x, y) => {
		const ip = at(P, x, y)
		for (let ch = 0; ch < 3; ch++) {
			let lo = 255
			let hi = 0
			for (let dy = -1; dy <= 1; dy++)
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx
					const ny = y + dy
					if (nx < 0 || ny < 0 || nx >= Q.info.width || ny >= Q.info.height) continue
					const v = Q.data[at(Q, nx, ny) + ch]
					if (v < lo) lo = v
					if (v > hi) hi = v
				}
			const v = P.data[ip + ch]
			if (v < lo - tolerance || v > hi + tolerance) return false
		}
		return true
	}
	const changed = (P, Q, x, y) =>
		x < Q.info.width &&
		y < Q.info.height &&
		delta(P, at(P, x, y), Q, at(Q, x, y)) > tolerance &&
		(strict || !(within(P, Q, x, y) && within(Q, P, x, y)))
	let hidden = 0
	const mask = new Uint8Array(w * h)
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const differs = changed(A, B, x, y)
			const noisy = differs && C && changed(A, C, x, y)
			if (noisy) hidden++
			if (differs && !noisy) mask[y * w + x] = 1
		}
	// Поодинокий піксель без жодного зміненого сусіда — кінчик гліфа, а не зміна CSS (та завжди область)
	const isolated = (x, y) => {
		for (let dy = -1; dy <= 1; dy++)
			for (let dx = -1; dx <= 1; dx++) {
				const nx = x + dx
				const ny = y + dy
				if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) return false
			}
		return true
	}
	let n = 0
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const ia = at(A, x, y)
			const o = (y * w + x) * 4
			if (mask[y * w + x] && (strict || !isolated(x, y))) {
				n++
				img[o] = 255
				img[o + 3] = 255
			} else {
				// збіг — приглушена копія «до», щоб було видно, де саме відмінність
				img[o] = img[o + 1] = img[o + 2] = ((A.data[ia] + A.data[ia + 1] + A.data[ia + 2]) / 3) * 0.35
				img[o + 3] = 255
			}
		}
	const resized = A.info.width !== B.info.width || A.info.height !== B.info.height
	if (n || resized) await sharp(img, { raw: { width: w, height: h, channels: 4 } }).png().toFile(out)
	return { n, hidden, total: w * h, resized, a: `${A.info.width}×${A.info.height}`, b: `${B.info.width}×${B.info.height}` }
}

async function diff(nameA, nameB, opts) {
	const a = loadSnap(nameA)
	const b = loadSnap(nameB)
	const noise = new Set()
	if (opts.noise) {
		const c = loadSnap(opts.noise)
		for (const [key, ca] of Object.entries(a.captures))
			if (c.captures[key]) for (const d of captureDiff(ca, c.captures[key], a.props)) noise.add(`${key}|${d.path}|${d.prop}`)
	}

	let total = 0
	let hidden = 0
	const limit = opts.all ? Infinity : 20
	// Кадри, зняті лише в одному зі зліпків (наприклад, другий — частковий, з --only), — одним рядком
	const onlyIn = (x, y) => Object.keys(x.captures).filter((k) => !y.captures[k])
	for (const [name, keys] of [[nameA, onlyIn(a, b)], [nameB, onlyIn(b, a)]])
		if (keys.length) console.log(`Лише в ${name}: ${keys.length} кадрів (${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}) — не порівнюються`)
	for (const key of Object.keys(a.captures)) {
		const ca = a.captures[key]
		const cb = b.captures[key]
		if (!cb) continue
		const diffs = captureDiff(ca, cb, a.props).filter((d) => {
			const isNoise = noise.has(`${key}|${d.path}|${d.prop}`)
			if (isNoise) hidden++
			return !isNoise
		})
		if (!diffs.length) continue
		total += diffs.length
		console.log(`~ ${key}  (${diffs.length})`)
		for (const d of diffs.slice(0, limit)) console.log(`    ${d.path} ${d.prop}: ${show(d.a, 90)} → ${show(d.b, 90)}`)
		if (diffs.length > limit) console.log(`    … ще ${diffs.length - limit} (--all — усі)`)
	}
	console.log(
		total ? `\nСтилі: ${total} відмінностей.` : '\nСтилі: відмінностей немає.',
		opts.noise ? `Сховано як шум (є й між ${nameA} і ${opts.noise}): ${hidden}.` : ''
	)

	// Скріншоти — попіксельно; картинка відмінностей лише там, де вони є
	const shotsA = join(STYLE_DIR, nameA, 'shots')
	const shotsB = join(STYLE_DIR, nameB, 'shots')
	const files = exists(shotsA) && exists(shotsB) ? readdirSync(shotsA).filter((f) => exists(join(shotsB, f))) : []
	if (files.length) {
		const outDir = join(STYLE_DIR, `diff_${nameA}_${nameB}`)
		rmSync(outDir, { recursive: true, force: true })
		mkdirSync(outDir, { recursive: true })
		const tolerance = Number(opts.tolerance) || 0
		const shotsC = opts.noise ? join(STYLE_DIR, opts.noise, 'shots') : null
		let differ = 0
		let hiddenPx = 0
		for (const f of files) {
			const r = await comparePng(join(shotsA, f), join(shotsB, f), join(outDir, f), tolerance, shotsC && join(shotsC, f), opts.strict)
			hiddenPx += r.hidden
			if (!r.n && !r.resized) continue
			differ++
			console.log(`  ✗ ${f}: ${r.n} пікс. (${((r.n / r.total) * 100).toFixed(2)}%)${r.resized ? `, розмір ${r.a} → ${r.b}` : ''}`)
		}
		console.log(
			differ
				? `Скріншоти: відрізняються ${differ} з ${files.length} — картинки в ${outDir}`
				: `Скріншоти: усі ${files.length} збігаються попіксельно.`,
			hiddenPx ? `Сховано як шум: ${hiddenPx} пікс.` : ''
		)
		total += differ
	}
	process.exitCode = total ? 1 : 0
}

/** Де в обчислених стилях трапляються задані підрядки: рядок на елемент, властивості згруповані за значенням */
function find(name, needles, opts) {
	const s = loadSnap(name)
	const hits = Object.fromEntries(needles.map((n) => [n, 0]))
	const limit = opts.all ? Infinity : 60
	let printed = 0
	for (const [key, c] of Object.entries(s.captures)) {
		if (!c.map) continue
		for (const [path, st] of c.map) {
			const byValue = new Map()
			st.split(SEP).forEach((v, i) => {
				const n = needles.find((n) => v.includes(n))
				if (!n) return
				hits[n]++
				byValue.set(v, [...(byValue.get(v) ?? []), s.props[i]])
			})
			if (byValue.size && printed++ < limit)
				console.log(`  ${key}  ${path}  ${[...byValue].map(([v, ps]) => `${ps.join(', ')}: ${v}`).join(' | ')}`)
		}
	}
	if (printed > limit) console.log(`  … ще ${printed - limit} елементів (--all — усі)`)
	for (const [n, k] of Object.entries(hits)) console.log(`«${n}»: ${k} властивостей`)
	process.exitCode = Object.values(hits).some(Boolean) ? 1 : 0
}

const { opts, pos } = parseArgs()
if (pos[0] === 'diff' && pos[2]) await diff(pos[1], pos[2], opts)
else if (pos[0] === 'find' && pos[2]) find(pos[1], pos.slice(2), opts)
else if (pos[0] && !['diff', 'find'].includes(pos[0])) await snap(pos[0], pos[1] ?? DEFAULT_BASE, opts)
else {
	console.log("Використання:\n  node scripts/style-snapshot.mjs <ім'я> [база] [--only=/,/apple] [--widths=390,1440] [--no-shots] [--no-states]")
	console.log('  node scripts/style-snapshot.mjs diff <a> <b> [--noise=<c>] [--all] [--tolerance=0] [--strict]')
	console.log('  node scripts/style-snapshot.mjs find <ім\'я> "255, 122, 0" […] [--all]')
	process.exitCode = 2
}
