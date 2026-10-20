/**
 * Спільне для зліпків «до/після» (PLAN-SCALING.md §2): перелік адрес, файлів і станів,
 * тека результатів, розбір аргументів і порівняння двох зліпків.
 * Користувачі — scripts/seo-snapshot.mjs і scripts/style-snapshot.mjs.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const SNAP_DIR = join(ROOT, '.snapshots')
export const DEFAULT_BASE = 'http://localhost:3000'

/**
 * Адреси для зліпків. Живі alias перевірено 19.10.2026 на проді.
 * styles: true — сторінка ще й у дампі обчислених стилів (§2: «~10 представницьких»),
 * скріншоти знімаються з усіх.
 */
export const PAGES = [
	{ path: '/', styles: true },
	{ path: '/uk' },
	{ path: '/apple', styles: true },
	{ path: '/iphone-17-pro', styles: true },
	{ path: '/uk/iphone-17-pro' },
	// тематичний фільтр — тексти faq.theme.*; нетематичний (матеріал) — faq.filter.*
	{ path: '/iphone-17-pro/filter/anime', styles: true },
	{ path: '/uk/iphone-17-pro/filter/anime' },
	{ path: '/iphone-17-pro/filter/silikone-case' },
	{ path: '/chekhly' },
	// У «chekhly» фільтрів в API немає — будь-який /chekhly/filter/* дає 301 на /chekhly.
	// Лишаємо як перевірку самого редиректу
	{ path: '/chekhly/filter/anime' },
	{ path: '/iphone-17-pro/chekhly_1043975', styles: true },
	{ path: '/iphone-17-pro/chekhly_1043975/attr/black' },
	{ path: '/article' },
	{ path: '/article/new' },
	{ path: '/article/info/kabeli-do-smartfoniv-tipi-osoblivosti-ta-vazhlivist-viboru', styles: true },
	{ path: '/about', styles: true },
	{ path: '/dostavka' },
	{ path: '/povernennya' },
	{ path: '/otzyvy-klientov' },
	{ path: '/uk/otzyvy-klientov' },
	{ path: '/printcase' },
	{ path: '/printcase/iphone-15', styles: true },
	{ path: '/uk/printcase/iphone-15' },
	{ path: '/neoprint/iphone-15/4353' },
	{ path: '/search?q=iphone' },
	{ path: '/shop/cart', styles: true },
	{ path: '/shop/wishlist' },
	{ path: '/shop/compare', styles: true },
	{ path: '/shop/track-order' },
	{ path: '/neisnuyucha-storinka-xyz', styles: true },
]

/** Файли бренду й статики: код, content-type, cache-control, розмір, хеш */
export const FILES = [
	'/robots.txt',
	'/site.webmanifest',
	'/favicon.svg',
	'/favicon.ico',
	'/favicon-96.png',
	'/apple-touch-icon.png',
	'/icon-192.png',
	'/icon-512.png',
	'/icon-maskable-512.png',
	'/images/logo.svg',
	'/images/og-default.jpg',
	'/googleefee091a713c6ef7.html',
]

/** Ширини зліпка стилів і висота вікна для кожної */
export const WIDTHS = [
	{ width: 390, height: 844, mobile: true },
	{ width: 1024, height: 768, mobile: false },
	{ width: 1440, height: 900, mobile: false },
]

/**
 * Стани, яких немає в HTML одразу після завантаження: етап 1 міняє кольори саме тут
 * (мегаменю, шторки, лайтбокс, чат). Кожен знімається на свіжо завантаженій сторінці.
 * Дії: ['hover', sel] — мишею в центр елемента (спрацьовує й CSS :hover),
 * ['click', sel], ['type', sel, текст]. У hover/click третім можна дати номер збігу (з 0).
 */
export const STATES = [
	{ name: 'brand-menu', path: '/', width: 1440, actions: [['hover', '.brands-nav__item']] },
	{ name: 'catalog', path: '/', width: 1440, actions: [['click', '.departments__toggle']] },
	{ name: 'card-hover', path: '/', width: 1440, actions: [['hover', '.p-card']] },
	{ name: 'search', path: '/', width: 1440, actions: [['type', '.search__input', 'iphone']] },
	{ name: 'cart-drawer', path: '/', width: 1440, actions: [['click', '.action-btn--cart']] },
	{ name: 'chat', path: '/', width: 1440, actions: [['click', '.chat__fab']] },
	{ name: 'mobile-menu', path: '/', width: 390, actions: [['click', '.burger']] },
	{ name: 'filters', path: '/iphone-17-pro', width: 390, actions: [['click', '.cat-head__filters-btn']] },
	{ name: 'lightbox', path: '/iphone-17-pro/chekhly_1043975', width: 1440, actions: [['click', '.gallery__figure']] },
	{ name: 'quick-order', path: '/iphone-17-pro/chekhly_1043975', width: 1440, actions: [['click', '.quick-order > .btn']] },
	// Конструктор: кнопки дій button.pc-action по порядку — «фото» (0), «текст» (1), «бібліотека» (2)
	{ name: 'text-modal', path: '/printcase/iphone-15', width: 1440, actions: [['click', 'button.pc-action', 1]] },
	{ name: 'library', path: '/printcase/iphone-15', width: 1440, actions: [['click', 'button.pc-action', 2]] },
	// Текст на сцені: рамка, ручка повороту, панель шарів. Останнім — чернетка лишається в IndexedDB профілю
	{
		name: 'stage-text',
		path: '/printcase/iphone-15',
		width: 1440,
		actions: [
			['click', 'button.pc-action', 1],
			['type', '.text-preview-input', 'Тест'],
			['click', '.app-modal .btn-primary.btn-lg'],
		],
	},
	// Вибір моделі в конструкторі: дерево брендів (шеврони) і серії першого бренду
	{
		name: 'model-select',
		path: '/printcase/iphone-15',
		width: 1440,
		actions: [
			['click', 'button.pc-model-btn'],
			['click', '.model-tree__brand-btn'],
		],
	},
	// 404 українською → «На головну» має вести на /uk, а не на російську (url кадру — після кліку)
	{ name: 'home-button', path: '/uk/neisnuyucha-storinka-xyz', width: 390, actions: [['click', '.error-page .btn']] },
	// Палітра фону й «прозорий» фон (шахівниця на кнопці, в палітрі й на сцені)
	{ name: 'bg-picker', path: '/printcase/iphone-15', width: 1440, actions: [['click', 'button.ctrl-bg']] },
	{
		name: 'bg-transparent',
		path: '/printcase/iphone-15',
		width: 1440,
		actions: [
			['click', 'button.ctrl-bg'],
			['click', '.bg-sw--transparent'],
		],
	},
]

/** Товари, якими наповнюємо кошик, обране й порівняння у зліпку стилів */
export const SEED_PRODUCTS = ['chekhly_1043975', 'chekhly_1044081']

/** --key=value / --flag → { key: value | true }, решта — позиційні */
export function parseArgs(argv = process.argv.slice(2)) {
	const opts = {}
	const pos = []
	for (const a of argv) {
		const m = a.match(/^--([^=]+)(?:=(.*))?$/)
		if (m) opts[m[1]] = m[2] ?? true
		else pos.push(a)
	}
	return { opts, pos }
}

/** --only=/,/apple → фільтр сторінок за шляхом */
export const onlyFilter = (only) => {
	if (!only || only === true) return () => true
	const set = new Set(String(only).split(','))
	return (path) => set.has(path)
}

export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

export function writeJson(file, data) {
	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, JSON.stringify(data, null, '\t'))
}

export const exists = existsSync

/** Шлях сторінки → безпечне ім'я файлу (Windows не приймає ? : * тощо) */
export const slug = (path) =>
	path === '/' ? 'home' : path.replace(/^\//, '').replace(/[/?&:*"<>|\\]/g, '_')

/** Глибоке сортування ключів — щоб порядок полів у JSON-LD не давав «відмінностей» */
export function sortKeys(v) {
	if (Array.isArray(v)) return v.map(sortKeys)
	if (v && typeof v === 'object') {
		const out = {}
		for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k])
		return out
	}
	return v
}

/**
 * Відмінності двох значень до рівня листків: [{ path, a, b }].
 * Ключі з «_» на початку — довідкові (зразки контексту тощо), їх не порівнюємо.
 */
export function deepDiff(a, b, path = '', out = []) {
	if (a === b) return out
	const isObj = (x) => x && typeof x === 'object'
	if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) {
		if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, a, b })
		return out
	}
	if (Array.isArray(a)) {
		const n = Math.max(a.length, b.length)
		for (let i = 0; i < n; i++) deepDiff(a[i], b[i], `${path}[${i}]`, out)
		return out
	}
	for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
		if (k.startsWith('_')) continue
		deepDiff(a[k], b[k], path ? `${path}.${k}` : k, out)
	}
	return out
}

/** Ключ відмінності для «шуму»: індекси масивів не важливі — новинка зсуває весь список */
export const noiseKey = (scope, path) => `${scope}|${path.replace(/\[\d+\]/g, '[]')}`

/** Коротке подання значення в звіті */
export function show(v, max = 160) {
	if (v === undefined) return '—'
	const s = JSON.stringify(v)
	return s.length > max ? s.slice(0, max) + '…' : s
}

/** Паралельний map з обмеженням одночасних задач */
export async function pool(items, limit, fn) {
	const out = new Array(items.length)
	let next = 0
	const worker = async () => {
		while (next < items.length) {
			const i = next++
			out[i] = await fn(items[i], i)
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
	return out
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
