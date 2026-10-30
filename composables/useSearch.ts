// Єдиний стан пошуку: інпут у шапці, оверлей і сторінка /search працюють з ним разом.
// Дебаунс + скасування попереднього запиту + кеш у пам'яті сторінки.

import type { ISearchSuggest } from './useShopApi'

const HISTORY_KEY = 'floy_search_history'
const HISTORY_MAX = 6
const MIN_CHARS = 2
const DEBOUNCE = 200

// Живуть на рівні модуля: composable викликають кілька компонентів, а таймер,
// скасування й кеш мають бути спільні (інакше два дубльовані запити на кожне натискання).
const cache = new Map<string, ISearchSuggest>()
let timer: ReturnType<typeof setTimeout> | null = null
let controller: AbortController | null = null

const escapeHtml = (s: string) =>
	s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Обгортає точні входження токенів у <mark>. Текст спершу екранується (назви з БД),
// довші токени першими — щоб «pro max» не з'їв «pro» всередині.
function markMatches(text: string, tokens: string[]): string {
	const safe = escapeHtml(text || '')
	const list = tokens.filter((t) => t.length >= 2).map(escapeRe).sort((a, b) => b.length - a.length)
	if (!list.length) return safe

	return safe.replace(new RegExp(`(${list.join('|')})`, 'gi'), '<mark class="hl">$1</mark>')
}

export function useSearch() {
	const shopApi = useShopApi()
	const router = useRouter()
	const localePath = useLocalePath()
	const url = useUrl()
	const { blog } = useFeatures()

	const open = useState('searchOpen', () => false)
	const query = useState('searchQuery', () => '')
	const data = useState<ISearchSuggest | null>('searchData', () => null)
	const loading = useState('searchLoading', () => false)
	const active = useState('searchActive', () => -1) // підсвічений пункт (навігація клавіатурою)
	const history = useState<string[]>('searchHistory', () => [])
	const popular = useState<any[]>('searchPopular', () => [])

	// Плоский список посилань у порядку відображення — для ↑↓ та Enter
	const items = computed(() => {
		const d = data.value
		if (!d) return [] as { to: string; label: string }[]

		return [
			...d.models.map((m) => ({ to: url.category(m.alias), label: m.title })),
			...d.filters.map((f) => ({ to: url.category(f.model || 'chekhly', f.alias), label: f.title })),
			...d.products.map((p) => ({ to: url.product(p), label: p.title })),
			...d.articles.map((a) => ({ to: url.blogPost(a), label: a.title })),
		]
	})

	const hasResults = computed(() => items.value.length > 0)

	// Токени для підсвітки: і як увів користувач (кирилиця — ловить назви товарів),
	// і нормалізовані бекендом (латиниця — ловить назви моделей: «айфон»→«iphone»).
	const hlTokens = computed(() => {
		const raw = query.value.trim().toLowerCase().split(/\s+/)
		const norm = (data.value?.normalized || '').toLowerCase().split(/\s+/)
		return [...new Set([...raw, ...norm])].filter(Boolean)
	})

	const highlight = (text: string) => markMatches(text, hlTokens.value)

	async function fetchSuggest(q: string) {
		const hit = cache.get(q)
		if (hit) {
			data.value = hit
			loading.value = false
			return
		}

		controller?.abort()
		controller = new AbortController()
		loading.value = true

		try {
			const res = await shopApi.searchSuggest(q, 8, controller.signal)
			// Блог вимкнено — статей у підказках немає: їхніх сторінок теж немає
			if (!blog) res.articles = []
			cache.set(q, res)
			// поки летіла відповідь, користувач міг набрати далі — тоді вона вже не актуальна
			if (query.value.trim() === q) data.value = res
		} catch {
			if (query.value.trim() === q) data.value = null
		} finally {
			if (query.value.trim() === q) loading.value = false
		}
	}

	// Викликається з @input обох інпутів (шапка і фулскрін-оверлей)
	function onInput() {
		if (timer) clearTimeout(timer)
		active.value = -1

		const q = query.value.trim()
		if (q.length < MIN_CHARS) {
			data.value = null
			loading.value = false
			return
		}

		open.value = true
		timer = setTimeout(() => fetchSuggest(q), DEBOUNCE)
	}

	function setQuery(v: string) {
		query.value = v
		onInput()
	}

	// Очистити поле, лишивши пошук відкритим (повертаємось до історії/популярних)
	function reset() {
		if (timer) clearTimeout(timer)
		controller?.abort()
		query.value = ''
		data.value = null
		active.value = -1
		loading.value = false
	}

	// ---------- історія (localStorage) ----------

	function loadHistory() {
		if (!import.meta.client) return
		try {
			history.value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').slice(0, HISTORY_MAX)
		} catch {
			history.value = []
		}
	}

	function remember(q: string) {
		if (!import.meta.client || q.length < MIN_CHARS) return
		history.value = [q, ...history.value.filter((h) => h !== q)].slice(0, HISTORY_MAX)
		localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
	}

	function clearHistory() {
		history.value = []
		if (import.meta.client) localStorage.removeItem(HISTORY_KEY)
	}

	// Популярні моделі для порожнього стану — тягнемо один раз за сесію
	async function loadPopular() {
		if (popular.value.length) return
		popular.value = await shopApi.getPopularCategory({ type: 'model', limit: 8 }).catch(() => [])
	}

	// ---------- дії ----------

	function openSearch() {
		open.value = true
		loadHistory()
		loadPopular()
	}

	function close() {
		open.value = false
		active.value = -1
	}

	// Клік по результату-посиланню: навігацію робить сам <NuxtLink>, нам лишається
	// запам'ятати запит і згорнути панель (інакше був би подвійний router.push)
	function pick() {
		remember(query.value.trim())
		close()
	}

	// Програмний перехід — коли посилання немає (Enter, підсвічений пункт)
	function goTo(to: string) {
		pick()
		router.push(to)
	}

	// Enter: підсвічений пункт → він; точно розпізнана модель → одразу її сторінка;
	// у решті випадків — сторінка всіх результатів (навіть коли нічого не знайшли,
	// щоб панель не просто зникала, а користувач бачив зрозумілу відповідь)
	function submit() {
		const q = query.value.trim()
		if (q.length < MIN_CHARS) return

		if (active.value >= 0 && items.value[active.value]) {
			goTo(items.value[active.value].to)
			return
		}

		if (data.value?.exact_alias) {
			goTo(url.category(data.value.exact_alias))
			return
		}

		remember(q)
		close()
		router.push(localePath({ path: '/search', query: { q } }))
	}

	// Циклічний перехід ↑↓; позиція -1 = нічого не вибрано (повернення до інпута)
	function move(step: number) {
		const total = items.value.length
		if (!total) return
		active.value = ((active.value + 1 + step + total + 1) % (total + 1)) - 1
	}

	return {
		query, data, loading, open, active, items, hasResults, history, popular,
		onInput, setQuery, reset, openSearch, close, pick, goTo, submit, move, remember, clearHistory, loadHistory,
		highlight, MIN_CHARS,
	}
}
