// Незавершений макет конструктора — цілком у браузері (IndexedDB).
//
// Людина намалювала чохол, закрила вкладку, повернулась завтра — макет має бути на місці.
// Тримаємо це локально, а не на сервері: відновлення миттєве й офлайн, а покинутих макетів
// у рази більше, ніж замовлених, тож серверна чернетка означала б гігабайти сміття й ще одну
// чистку. localStorage тут не підходить у принципі — там ~5 МБ на домен, одне фото з телефона
// туди просто не влізе; IndexedDB зберігає блоби без такого обмеження.
//
// Термін той самий, що й у серверних сирців (printcase:cleanup) — 30 днів.

import type { PcAsset, PcState } from '~/composables/usePrintcaseDesign'

export interface PcDraft {
	key: string // alias моделі
	state: PcState
	model: any // обрана модель: з хаба макет відновлюється разом із нею
	assets: Record<string, Blob>
	saved: number
}

const DB_NAME = 'floy-printcase'
const STORE = 'drafts'
const TTL = 30 * 86400 * 1000
const KEEP = 5 // скільки макетів тримаємо; далі — найстаріші геть
const DEBOUNCE = 1500

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, 1)
			req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' })
			req.onsuccess = () => resolve(req.result)
			req.onerror = () => reject(req.error)
		})
	}
	return dbPromise
}

function request<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const req = fn(db.transaction(STORE, mode).objectStore(STORE))
				req.onsuccess = () => resolve(req.result as T)
				req.onerror = () => reject(req.error)
			})
	)
}

export function usePrintcaseDraft() {
	let timer: ReturnType<typeof setTimeout> | null = null
	let pending: PcDraft | null = null

	// Прибирає протерміноване і зайве. extra — скільки викинути понад норму
	// (виклик після нестачі місця).
	async function prune(extra = 0) {
		const all = await request<PcDraft[]>('readonly', (s) => s.getAll()).catch(() => [])
		const fresh = all.filter((d) => d.saved > Date.now() - TTL).sort((a, b) => b.saved - a.saved)
		const drop = [
			...all.filter((d) => d.saved <= Date.now() - TTL),
			...fresh.slice(Math.max(0, KEEP - extra)),
		]

		for (const d of drop) await request('readwrite', (s) => s.delete(d.key)).catch(() => {})
	}

	async function write(draft: PcDraft) {
		try {
			await request('readwrite', (s) => s.put(draft))
		} catch {
			// Скінчилось місце: звільняємо найстаріші макети й пробуємо ще раз
			await prune(2)
			await request('readwrite', (s) => s.put(draft)).catch(() => {})
		}
	}

	function flush() {
		if (!pending) return
		const draft = pending
		pending = null
		write(draft)
	}

	// Тільки ті фото, що реально є на макеті: видалені шари не мають лежати вічно
	function pickAssets(state: PcState, assets: Map<string, PcAsset>): Record<string, Blob> {
		const out: Record<string, Blob> = {}
		for (const el of state.els) {
			if (!el.src?.startsWith('sha:')) continue
			const asset = assets.get(el.src.slice(4))
			if (asset) out[asset.name] = asset.blob
		}
		return out
	}

	// Викликається на кожну зміну макета — запис відкладаємо, щоб перетягування шару
	// не било в базу сотні разів
	function save(key: string, state: PcState, model: any, assets: Map<string, PcAsset>) {
		if (!import.meta.client) return

		// Порожній макет — це не чернетка, а «почав заново»
		if (!state.els.length) return remove(key)

		pending = { key, state, model, assets: pickAssets(state, assets), saved: Date.now() }
		if (timer) clearTimeout(timer)
		timer = setTimeout(flush, DEBOUNCE)
	}

	async function load(key: string): Promise<PcDraft | null> {
		if (!import.meta.client) return null

		const draft = await request<PcDraft | undefined>('readonly', (s) => s.get(key)).catch(() => undefined)
		if (!draft) return null

		if (draft.saved <= Date.now() - TTL) {
			remove(key)
			return null
		}
		return draft
	}

	// Найсвіжіший макет будь-якої моделі — для хаба /printcase, де моделі ще немає
	async function latest(): Promise<PcDraft | null> {
		if (!import.meta.client) return null

		const all = await request<PcDraft[]>('readonly', (s) => s.getAll()).catch(() => [])
		const fresh = all.filter((d) => d.saved > Date.now() - TTL).sort((a, b) => b.saved - a.saved)
		return fresh[0] || null
	}

	function remove(key: string) {
		if (!import.meta.client) return
		if (pending?.key === key) pending = null
		request('readwrite', (s) => s.delete(key)).catch(() => {})
	}

	if (import.meta.client) {
		// Відкладений запис не має згоріти разом зі сторінкою
		onMounted(() => window.addEventListener('pagehide', flush))
		onUnmounted(() => {
			window.removeEventListener('pagehide', flush)
			flush()
		})
		// Протерміноване прибираємо при відкритті конструктора — крон тут нікого немає
		onMounted(() => prune())
	}

	return { save, load, latest, remove, flush }
}
