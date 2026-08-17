// Незавершений макет конструктора — цілком у браузері (IndexedDB).
//
// Людина намалювала чохол, закрила вкладку, повернулась завтра — макет має бути на місці.
// Тримаємо це локально, а не на сервері: відновлення миттєве й офлайн, а покинутих макетів
// у рази більше, ніж замовлених, тож серверна чернетка означала б гігабайти сміття й ще одну
// чистку. localStorage тут не підходить у принципі — там ~5 МБ на домен, одне фото з телефона
// туди просто не влізе; IndexedDB зберігає блоби без такого обмеження.
//
// Два сховища, а не одне: опис макета переписується на кожну зміну (сотні разів за сеанс),
// а фото — важкі й незмінні. Тримати їх в одному записі означало б перезаписувати мегабайти
// щоразу, коли посунули шар.
//
// Термін той самий, що й у серверних сирців (printcase:cleanup) — 30 днів.

import type { PcAsset, PcState } from '~/composables/usePrintcaseDesign'

export interface PcDraft {
	key: string // alias моделі
	state: PcState
	model: any // обрана модель: з хаба макет відновлюється разом із нею
	assets: string[] // імена фото; самі блоби — в окремому сховищі
	saved: number
}

// Те, що віддає load(): фото вже підставлені блобами
export interface PcDraftLoaded extends Omit<PcDraft, 'assets'> {
	assets: Record<string, Blob>
}

const DB_NAME = 'floy-printcase'
const DB_VERSION = 2
const DRAFTS = 'drafts'
const ASSETS = 'assets'

const TTL = 30 * 86400 * 1000
const KEEP = 5 // скільки макетів тримаємо; далі — найстаріші геть
const DEBOUNCE = 1500

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION)
			req.onupgradeneeded = () => {
				const db = req.result
				if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: 'key' })
				if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: 'name' })
			}
			req.onsuccess = () => {
				// Стара вкладка не має блокувати оновлення схеми в новій
				req.result.onversionchange = () => req.result.close()
				resolve(req.result)
			}
			req.onerror = () => reject(req.error)
			// Інакше при відкритій вкладці зі старою версією обіцянка не вирішилась би НІКОЛИ,
			// і всі звернення до чернетки тихо зависли б
			req.onblocked = () => reject(new Error('idb blocked'))
		})
	}
	return dbPromise
}

function request<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const req = fn(db.transaction(store, mode).objectStore(store))
				req.onsuccess = () => resolve(req.result as T)
				req.onerror = () => reject(req.error)
			})
	)
}

// Фото з локального сховища за іменем — окремо від composable, без життєвого циклу.
// Потрібне конструктору, коли макет відкривають одразу після «в кошик»: вивантаження фото
// на сервер іде у фоні й може ще не завершитись, а блоб у браузері вже є.
export async function getDraftAsset(name: string): Promise<Blob | null> {
	if (!import.meta.client) return null

	const rec = await request<{ blob: Blob } | undefined>(ASSETS, 'readonly', (s) => s.get(name)).catch(
		() => undefined
	)
	return rec?.blob || null
}

export function usePrintcaseDraft() {
	let timer: ReturnType<typeof setTimeout> | null = null
	// Маніфест не будуємо на кожну зміну — лише коли доходить до запису: watch спрацьовує
	// на кожен рух шару, тобто десятки разів на секунду, і майже вся ця робота викидалась
	let pending: { key: string; build: () => PcState; model: any; assets: Map<string, PcAsset> } | null = null

	// Що вже лежить у сховищі з цього сеансу — щоб не перекладати ті самі блоби щоразу
	const written = new Set<string>()

	// Імена фото, які реально є на макеті: видалені шари не мають лежати вічно
	function usedAssets(state: PcState): string[] {
		return [...new Set(state.els.filter((el) => el.src?.startsWith('sha:')).map((el) => el.src!.slice(4)))]
	}

	async function prune(extra = 0) {
		const drafts = await request<PcDraft[]>(DRAFTS, 'readonly', (s) => s.getAll()).catch(() => [])
		const fresh = drafts.filter((d) => d.saved > Date.now() - TTL).sort((a, b) => b.saved - a.saved)
		const keep = fresh.slice(0, Math.max(0, KEEP - extra))

		for (const d of drafts.filter((d) => !keep.includes(d))) {
			await request(DRAFTS, 'readwrite', (s) => s.delete(d.key)).catch(() => {})
		}

		// Фото, на які вже ніхто не посилається. Свіжі не чіпаємо: блоб лягає раніше за опис
		// макета, і на старті сеансу його ще ніхто не встиг згадати
		const used = new Set(keep.flatMap((d) => d.assets || []))
		const assets = await request<{ name: string; saved: number }[]>(ASSETS, 'readonly', (s) => s.getAll()).catch(
			() => []
		)

		for (const a of assets) {
			if (used.has(a.name) || a.saved > Date.now() - 86400000) continue
			await request(ASSETS, 'readwrite', (s) => s.delete(a.name)).catch(() => {})
		}
	}

	async function write(draft: PcDraft) {
		try {
			await request(DRAFTS, 'readwrite', (s) => s.put(draft))
		} catch {
			// Скінчилось місце: звільняємо найстаріші макети й пробуємо ще раз
			await prune(2)
			await request(DRAFTS, 'readwrite', (s) => s.put(draft)).catch(() => {})
		}
	}

	function flush() {
		if (!pending) return

		const { key, build, model, assets } = pending
		pending = null

		const state = build()
		// Порожній макет — це не чернетка, а «почав заново»
		if (!state.els.length) return remove(key)

		const names = usedAssets(state)

		// Копія моделі, а не сама вона: IndexedDB не вміє клонувати реактивні проксі Vue
		// і падає на них з DataCloneError — тобто чернетка мовчки не збереглась би
		write({ key, state, model: model ? { ...model } : null, assets: names, saved: Date.now() })

		// Фото кладемо один раз: вони незмінні, а перезапис мегабайтів на кожне збереження
		// підвішував би вкладку
		for (const name of names) {
			const asset = assets.get(name)
			if (!asset || written.has(name)) continue
			written.add(name)
			request(ASSETS, 'readwrite', (s) => s.put({ name, blob: asset.blob, saved: Date.now() })).catch(() =>
				written.delete(name)
			)
		}
	}

	// Викликається на кожну зміну макета. Тут — лише запамʼятати, ЩО зберігати;
	// сам маніфест будується й пишеться відкладено, у flush()
	function save(key: string, build: () => PcState, model: any, assets: Map<string, PcAsset>) {
		if (!import.meta.client) return

		pending = { key, build, model, assets }

		if (timer) clearTimeout(timer)
		timer = setTimeout(flush, DEBOUNCE)
	}

	async function hydrate(draft: PcDraft): Promise<PcDraftLoaded> {
		const assets: Record<string, Blob> = {}

		for (const name of Array.isArray(draft.assets) ? draft.assets : []) {
			const rec = await request<{ blob: Blob } | undefined>(ASSETS, 'readonly', (s) => s.get(name)).catch(
				() => undefined
			)
			if (rec?.blob) {
				assets[name] = rec.blob
				written.add(name) // уже в сховищі — перекладати не треба
			}
		}

		return { ...draft, assets }
	}

	async function load(key: string): Promise<PcDraftLoaded | null> {
		if (!import.meta.client) return null

		const draft = await request<PcDraft | undefined>(DRAFTS, 'readonly', (s) => s.get(key)).catch(() => undefined)
		if (!draft) return null

		if (draft.saved <= Date.now() - TTL) {
			remove(key)
			return null
		}
		return hydrate(draft)
	}

	// Найсвіжіший макет будь-якої моделі — для хаба /printcase, де моделі ще немає
	async function latest(): Promise<PcDraftLoaded | null> {
		if (!import.meta.client) return null

		const all = await request<PcDraft[]>(DRAFTS, 'readonly', (s) => s.getAll()).catch(() => [])
		const fresh = all.filter((d) => d.saved > Date.now() - TTL).sort((a, b) => b.saved - a.saved)
		return fresh[0] ? hydrate(fresh[0]) : null
	}

	function remove(key: string) {
		if (!import.meta.client) return
		if (pending?.key === key) pending = null
		request(DRAFTS, 'readwrite', (s) => s.delete(key)).catch(() => {})
	}

	if (import.meta.client) {
		onMounted(() => {
			window.addEventListener('pagehide', flush) // відкладений запис не має згоріти зі сторінкою
			prune() // протерміноване прибираємо при відкритті конструктора — крон тут нікого немає
		})
		onUnmounted(() => {
			window.removeEventListener('pagehide', flush)
			flush()
		})
	}

	// flush назовні не віддаємо: відкладений запис скидають самі хуки вище
	return { save, load, latest, remove }
}
