// Онлайн-чат сайту (віджет) → бекенд FLOY-ADMIN: /apisite/chats/*
// Realtime немає — поллінг із ПОВНИМ реконсайлом за id (щоб підхоплювались правки/видалення адміном).
// Стан — глобальний (useState), сесія живе в localStorage. Викликається лише на клієнті (<ClientOnly>).

export interface ChatAttachment {
	path: string
	name: string
	mime: string
	url: string // готове абсолютне посилання
}

export interface ChatMessage {
	id: number | string // string ('tmp-*') — оптимістичне, ще не підтверджене сервером
	sender_type: 'client' | 'admin' | 'ai'
	message: string
	attachment: ChatAttachment | null
	page_url?: string | null
	is_read?: boolean
	edited?: boolean
	created_at: string // 'Y-m-d H:i:s' (таймзона сервера)
	// Локальні поля (не з сервера)
	pending?: boolean
	localUrl?: string // прев'ю картинки з буфера/файла до завантаження
	fileName?: string
}

export interface ChatContacts {
	client_name?: string
	client_phone?: string
	client_email?: string
}

// Обмеження файлів (дзеркалять валідацію бекенду)
export const CHAT_MAX_FILE = 10 * 1024 * 1024 // 10 МБ
export const CHAT_ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'zip']

const LS_SESSION = 'floy_chat_session'
const LS_READ = 'floy_chat_read'
const LS_CONTACTS = 'floy_chat_contacts'

// Екрануємо HTML і робимо посилання клікабельними (linkify, захист від XSS).
// Використовується у ChatMessage через v-html.
export function renderChatText(text: string): string {
	if (!text) return ''
	const esc = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
	const linked = esc.replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi, (u) => {
		const href = u.startsWith('http') ? u : 'https://' + u
		return `<a href="${href}" target="_blank" rel="noopener nofollow">${u}</a>`
	})
	return linked.replace(/\n/g, '<br>')
}

// Модульні (singleton на клієнті) — таймер поллінга та лічильники
let pollTimer: ReturnType<typeof setTimeout> | null = null
let inited = false
let tmpCounter = 0

export function useChat() {
	const config = useRuntimeConfig()
	const { locale } = useI18n()

	const base = config.public.urlApi + 'chats' // .../apisite/chats
	const site = config.public.site

	const messages = useState<ChatMessage[]>('chat_messages', () => [])
	const sessionId = useState<string | null>('chat_session', () => null)
	const status = useState<'open' | 'closed' | null>('chat_status', () => null)
	const aiTyping = useState('chat_ai_typing', () => false)
	const open = useState('chat_open', () => false)
	const lastReadId = useState('chat_last_read', () => 0)
	// Контакти вже надано (або пропущено) — щоб не питати повторно
	const contactsProvided = useState('chat_contacts', () => false)

	// Непрочитані відповіді (не від клієнта) з id більшим за прочитаний
	const unread = computed(
		() =>
			messages.value.filter(
				(m) => typeof m.id === 'number' && m.id > lastReadId.value && m.sender_type !== 'client'
			).length
	)

	// Сортуємо за id; оптимістичні (id-рядок) — завжди в кінці
	const sortKey = (m: ChatMessage) => (typeof m.id === 'number' ? m.id : Number.MAX_SAFE_INTEGER)

	// Повний реконсайл: додати нові / оновити змінені (edited+текст+attachment) / прибрати видалені
	function reconcile(server: ChatMessage[]) {
		const ids = new Set(server.map((m) => m.id))
		messages.value = messages.value.filter((m) => m.pending || ids.has(m.id))
		for (const m of server) {
			const ex = messages.value.find((x) => x.id === m.id)
			if (ex) Object.assign(ex, m)
			else messages.value.push(m)
		}
		messages.value.sort((a, b) => sortKey(a) - sortKey(b))
	}

	function removePending(id: string) {
		const m = messages.value.find((x) => x.id === id)
		if (m?.localUrl && import.meta.client) URL.revokeObjectURL(m.localUrl)
		messages.value = messages.value.filter((x) => x.id !== id)
	}

	function markRead() {
		const maxId = messages.value.reduce((mx, m) => (typeof m.id === 'number' && m.id > mx ? m.id : mx), 0)
		if (maxId > lastReadId.value) {
			lastReadId.value = maxId
			if (import.meta.client) localStorage.setItem(LS_READ, String(maxId))
		}
	}

	// Повертає код помилки або null
	function validateFile(f: File): 'size' | 'type' | null {
		if (f.size > CHAT_MAX_FILE) return 'size'
		const ext = f.name.split('.').pop()?.toLowerCase() || ''
		// Картинки з буфера обміну можуть не мати розширення в імені — пускаємо за mime
		if (!CHAT_ALLOWED_EXT.includes(ext) && !f.type.startsWith('image/')) return 'type'
		return null
	}

	const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

	// Надіслати повідомлення (текст і/або файл). Перше повідомлення → /start, далі → /message.
	async function send(text: string, file: File | null, contacts: ChatContacts = {}): Promise<boolean> {
		const fd = new FormData()
		fd.append('site', site)
		fd.append('lang', locale.value)
		if (text) fd.append('message', text)
		if (file) fd.append('file', file)
		if (import.meta.client) fd.append('page_url', location.href)

		const tmpId = 'tmp-' + ++tmpCounter
		const isImg = !!file && file.type.startsWith('image/')
		messages.value.push({
			id: tmpId,
			sender_type: 'client',
			message: text,
			attachment: null,
			localUrl: isImg && import.meta.client ? URL.createObjectURL(file!) : undefined,
			fileName: file?.name,
			created_at: nowStr(),
			pending: true,
		})

		try {
			if (!sessionId.value) {
				Object.entries(contacts).forEach(([k, v]) => v && fd.append(k, String(v)))
				const r = await $fetch<{ session_id: string; message: ChatMessage }>(`${base}/start`, {
					method: 'POST',
					body: fd,
				})
				sessionId.value = r.session_id
				if (import.meta.client) localStorage.setItem(LS_SESSION, r.session_id)
				status.value = 'open'
				removePending(tmpId)
				reconcile([r.message])
				startPolling()
			} else {
				const m = await $fetch<ChatMessage>(`${base}/${sessionId.value}/message`, {
					method: 'POST',
					body: fd,
				})
				status.value = 'open'
				removePending(tmpId)
				const kept = messages.value.filter((x) => typeof x.id === 'number')
				reconcile([...kept, m])
			}
			markRead()
			return true
		} catch {
			removePending(tmpId)
			return false
		}
	}

	// Повний фетч повідомлень + стан (status, ai_typing)
	async function poll() {
		if (!sessionId.value) return
		// Не поллимо у фоні прихованої вкладки — економія запитів/батареї
		if (import.meta.client && document.hidden) return
		try {
			const r = await $fetch<{ status: string; ai_typing: boolean; messages: ChatMessage[] }>(
				`${base}/${sessionId.value}/messages`,
				{ params: { lang: locale.value } }
			)
			status.value = (r.status as 'open' | 'closed') || 'open'
			aiTyping.value = !!r.ai_typing
			reconcile(r.messages || [])
			if (open.value) markRead()
		} catch {
			/* мовчазний ретрай наступним тіком */
		}
	}

	// Динамічний інтервал: 5с коли віджет відкритий, 20с у фоні (щоб бачити нові відповіді → бейдж)
	function startPolling() {
		if (pollTimer || !import.meta.client) return
		const tick = async () => {
			await poll()
			pollTimer = setTimeout(tick, open.value ? 5000 : 20000)
		}
		tick()
	}

	function stopPolling() {
		if (pollTimer) clearTimeout(pollTimer)
		pollTimer = null
	}

	// Ініціалізація на клієнті: відновити сесію та підвантажити історію
	function init() {
		if (!import.meta.client || inited) return
		inited = true
		lastReadId.value = Number(localStorage.getItem(LS_READ) || 0)
		contactsProvided.value = localStorage.getItem(LS_CONTACTS) === '1'
		const sid = localStorage.getItem(LS_SESSION)
		if (sid) {
			sessionId.value = sid
			startPolling()
		}
		// Повертаємось на вкладку → одразу свіжий стан (поки прихована — поллінг спав)
		document.addEventListener('visibilitychange', () => {
			if (!document.hidden && sessionId.value) poll()
		})
	}

	function markContactsProvided() {
		contactsProvided.value = true
		if (import.meta.client) localStorage.setItem(LS_CONTACTS, '1')
	}

	function openChat() {
		open.value = true
		markRead()
		if (sessionId.value) poll()
	}

	const closeChat = () => (open.value = false)

	return {
		messages,
		sessionId,
		status,
		aiTyping,
		open,
		unread,
		contactsProvided,
		send,
		poll,
		validateFile,
		init,
		startPolling,
		stopPolling,
		openChat,
		closeChat,
		markRead,
		markContactsProvided,
	}
}
