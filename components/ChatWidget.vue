<template>
	<div class="chat">
		<!-- Плаваюча кнопка -->
		<Transition name="chat-fab">
			<button v-if="!chat.open.value" class="chat__fab" :aria-label="t('chat.title')" @click="chat.openChat()">
				<AppIcon name="chat-dots" :size="26" />
				<span v-if="chat.unread.value" class="chat__badge">{{ chat.unread.value > 9 ? '9+' : chat.unread.value }}</span>
			</button>
		</Transition>

		<!-- Панель чату -->
		<Transition name="chat-panel">
			<section
				v-if="chat.open.value"
				class="chat__panel"
				role="dialog"
				:aria-label="t('chat.title')"
				@dragenter.prevent="dragActive = true"
				@dragover.prevent="dragActive = true"
				@dragleave.self="dragActive = false"
				@drop.prevent="onDrop"
			>
				<!-- Шапка -->
				<header class="chat__head">
					<div class="chat__head-avatar"><AppIcon name="headset" :size="20" /></div>
					<div class="chat__head-info">
						<strong>{{ t('chat.title') }}</strong>
						<span class="chat__status">
							<i class="chat__dot" :class="{ 'is-off': chat.status.value === 'closed' }" />
							{{ chat.status.value === 'closed' ? t('chat.closedNote') : t('chat.subtitle') }}
						</span>
					</div>
					<button class="chat__icon-btn" :aria-label="t('other.close')" @click="chat.closeChat()">
						<AppIcon name="close" :size="20" />
					</button>
				</header>

				<!-- Стрічка повідомлень -->
				<div ref="bodyEl" class="chat__body">
					<!-- Інтро: привітання + месенджери + контакти — ховається після першого повідомлення клієнта -->
					<div v-if="showIntro" class="chat__intro">
						<div class="chat__greeting">
							<div class="chat__greeting-avatar"><AppIcon name="headset" :size="18" /></div>
							<p>{{ t('chat.greeting') }}</p>
						</div>

						<div class="chat__messengers">
							<span class="chat__messengers-label">{{ t('chat.orMessenger') }}</span>
							<div class="chat__messengers-row">
								<a
									class="chat__messenger"
									:href="social.telegram"
									target="_blank"
									rel="noopener nofollow"
									aria-label="Telegram"
								>
									<AppIcon name="telegram" :size="20" />
								</a>
								<a
									class="chat__messenger"
									:href="social.viber"
									target="_blank"
									rel="noopener nofollow"
									aria-label="Viber"
								>
									<AppIcon name="viber" :size="20" />
								</a>
								<a
									class="chat__messenger"
									:href="social.whatsapp"
									target="_blank"
									rel="noopener nofollow"
									aria-label="WhatsApp"
								>
									<AppIcon name="whatsapp" :size="20" />
								</a>
							</div>
						</div>
					</div>

					<ChatMessage
						v-for="m in chat.messages.value"
						:key="m.id"
						:m="m"
						@open-image="lightbox = $event"
					/>

					<!-- Бот друкує -->
					<div v-if="chat.aiTyping.value" class="chat__typing">
						<div class="chat__typing-avatar"><AppIcon name="robot" :size="15" /></div>
						<div class="chat__typing-bubble"><span /><span /><span /></div>
					</div>
				</div>

				<!-- Контакти (необов'язкові) — з'являються після першого повідомлення, прижаті до низу -->
				<div v-if="showContacts" class="chat__contacts">
					<div class="chat__contacts-head">
						<span class="chat__contacts-label">{{ t('chat.contactsPrompt') }}</span>
						<button
							class="chat__icon-btn chat__icon-btn--sm"
							:aria-label="t('chat.contactsSkip')"
							@click="chat.markContactsProvided()"
						>
							<AppIcon name="close" :size="14" />
						</button>
					</div>
					<div class="chat__contacts-row">
						<input
							v-model="name"
							class="chat__contact-input"
							type="text"
							:placeholder="t('chat.namePlaceholder')"
							@keydown.enter.prevent="saveContacts"
						/>
						<input
							v-model="phone"
							class="chat__contact-input"
							type="tel"
							:placeholder="t('chat.phonePlaceholder')"
							@keydown.enter.prevent="saveContacts"
						/>
						<button
							class="chat__contacts-save"
							:disabled="!name.trim() && !phone.trim()"
							:aria-label="t('chat.contactsSave')"
							@click="saveContacts"
						>
							<AppIcon name="check" :size="18" />
						</button>
					</div>
				</div>

				<!-- Прев'ю прикріпленого файлу -->
				<div v-if="pendingFile" class="chat__attach">
					<img v-if="pendingPreview" :src="pendingPreview" class="chat__attach-thumb" alt="" />
					<AppIcon v-else name="document" :size="20" class="chat__attach-ico" />
					<span class="chat__attach-name">{{ pendingFile.name }}</span>
					<button class="chat__icon-btn chat__icon-btn--sm" :aria-label="t('chat.removeFile')" @click="clearFile">
						<AppIcon name="close" :size="16" />
					</button>
				</div>

				<!-- Поле вводу -->
				<footer class="chat__foot">
					<!-- Емодзі -->
					<div ref="emojiWrapEl" class="chat__emoji-wrap">
						<button
							class="chat__icon-btn"
							:class="{ 'is-active': emojiOpen }"
							:aria-label="t('chat.emoji')"
							@click="emojiOpen = !emojiOpen"
						>
							<AppIcon name="smile" :size="21" />
						</button>
						<Transition name="chat-pop">
							<div v-if="emojiOpen" class="chat__emoji-pop">
								<button
									v-for="e in EMOJIS"
									:key="e"
									class="chat__emoji"
									type="button"
									@click="insertEmoji(e)"
								>{{ e }}</button>
							</div>
						</Transition>
					</div>

					<!-- Прикріпити файл -->
					<button class="chat__icon-btn" :aria-label="t('chat.attach')" @click="fileInputEl?.click()">
						<AppIcon name="paperclip" :size="20" />
					</button>
					<input
						ref="fileInputEl"
						type="file"
						class="visually-hidden"
						:accept="ACCEPT"
						@change="onFilePick"
					/>

					<textarea
						ref="textareaEl"
						v-model="draft"
						class="chat__input"
						rows="1"
						:placeholder="t('chat.inputPlaceholder')"
						@input="autoGrow"
						@paste="onPaste"
						@keydown.enter.exact.prevent="onSend"
					/>

					<button class="chat__send" :disabled="!canSend" :aria-label="t('chat.send')" @click="onSend">
						<AppIcon name="send" :size="19" />
					</button>
				</footer>

				<!-- Оверлей перетягування файлу -->
				<div v-if="dragActive" class="chat__drop" @dragleave.prevent="dragActive = false" @drop.prevent="onDrop">
					<AppIcon name="paperclip" :size="30" />
					<span>{{ t('chat.dropHere') }}</span>
				</div>
			</section>
		</Transition>

		<!-- Лайтбокс для картинок -->
		<Teleport to="body">
			<Transition name="chat-lb">
				<div v-if="lightbox" class="chat__lightbox" @click="lightbox = null">
					<img :src="lightbox" alt="" />
					<button class="chat__lb-close" :aria-label="t('other.close')"><AppIcon name="close" :size="24" /></button>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { notify } = useNotify()
const { social } = useSiteSettings()
const chat = useChat()

// Інтро (привітання + месенджери) показуємо, доки клієнт не написав перше повідомлення
const showIntro = computed(() => !chat.messages.value.some((m: ChatMessage) => m.sender_type === 'client'))
// Контакти пропонуємо ПІСЛЯ старту чату (щоб не відлякувати формою), поки їх не надано/пропущено
const showContacts = computed(() => !!chat.sessionId.value && !chat.contactsProvided.value)

// Найпопулярніші емодзі для швидкої вставки
const EMOJIS = ['😊', '👍', '❤️', '😂', '🙏', '🔥', '😍', '👌', '🎉', '😉', '🤔', '🙌', '💯', '😅', '😎', '🥰']
const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.zip,image/*'

const draft = ref('')
const name = ref('')
const phone = ref('')
const pendingFile = ref<File | null>(null)
const pendingPreview = ref('')
const sending = ref(false)
const emojiOpen = ref(false)
const dragActive = ref(false)
const lightbox = ref<string | null>(null)

const bodyEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)
const emojiWrapEl = ref<HTMLElement | null>(null)

const canSend = computed(() => !sending.value && (draft.value.trim().length > 0 || !!pendingFile.value))

function setFile(f: File) {
	const err = chat.validateFile(f)
	if (err) return notify('error', t(err === 'size' ? 'chat.errSize' : 'chat.errType'))
	if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value)
	pendingFile.value = f
	pendingPreview.value = f.type.startsWith('image/') ? URL.createObjectURL(f) : ''
}

function clearFile() {
	if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value)
	pendingFile.value = null
	pendingPreview.value = ''
	if (fileInputEl.value) fileInputEl.value.value = ''
}

function onFilePick(e: Event) {
	const f = (e.target as HTMLInputElement).files?.[0]
	if (f) setFile(f)
}

// Вставка зображення з буфера обміну (Ctrl+V)
function onPaste(e: ClipboardEvent) {
	const items = e.clipboardData?.items
	if (!items) return
	for (const it of items) {
		if (it.type.startsWith('image/')) {
			const f = it.getAsFile()
			if (f) {
				e.preventDefault()
				setFile(f)
				break
			}
		}
	}
}

// Перетягування файлу в панель
function onDrop(e: DragEvent) {
	dragActive.value = false
	const f = e.dataTransfer?.files?.[0]
	if (f) setFile(f)
}

function insertEmoji(e: string) {
	const el = textareaEl.value
	if (!el) {
		draft.value += e
		return
	}
	const s = el.selectionStart ?? draft.value.length
	const en = el.selectionEnd ?? draft.value.length
	draft.value = draft.value.slice(0, s) + e + draft.value.slice(en)
	emojiOpen.value = false
	nextTick(() => {
		el.focus()
		const p = s + e.length
		el.setSelectionRange(p, p)
		autoGrow()
	})
}

function autoGrow() {
	const el = textareaEl.value
	if (!el) return
	el.style.height = 'auto'
	// Компактний старт (~1 рядок), плавно росте до максимуму; скрол — лише коли переросло
	el.style.height = Math.min(Math.max(el.scrollHeight, 40), 96) + 'px'
	el.style.overflowY = el.scrollHeight > 96 ? 'auto' : 'hidden'
}

function scrollBottom() {
	nextTick(() => {
		if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
	})
}

async function onSend() {
	if (!canSend.value) return
	const text = draft.value.trim()
	const file = pendingFile.value
	sending.value = true
	draft.value = ''
	pendingFile.value = null
	pendingPreview.value = ''
	if (fileInputEl.value) fileInputEl.value.value = ''
	nextTick(autoGrow)

	const ok = await chat.send(text, file)
	sending.value = false

	if (!ok) {
		notify('error', t('chat.sendError'))
		if (!draft.value) draft.value = text
		if (!pendingFile.value && file) {
			pendingFile.value = file
			pendingPreview.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
		}
		nextTick(autoGrow)
	}
	scrollBottom()
}

// Надіслати контакти оператору окремим повідомленням (API приймає їх лише у /start)
async function saveContacts() {
	const n = name.value.trim()
	const p = phone.value.trim()
	chat.markContactsProvided() // одразу ховаємо блок
	if (!n && !p) return
	const parts: string[] = []
	if (n) parts.push(`${t('chat.lblName')}: ${n}`)
	if (p) parts.push(`${t('chat.lblPhone')}: ${p}`)
	await chat.send(`${t('chat.contactsPrefix')}\n${parts.join('\n')}`, null)
	scrollBottom()
}

// Автоскрол на нові повідомлення / індикатор друку / відкриття
watch(() => chat.messages.value.length, scrollBottom)
watch(() => chat.aiTyping.value, (v: boolean) => v && scrollBottom())
watch(
	() => chat.open.value,
	(v: boolean) => {
		if (v) {
			scrollBottom()
			nextTick(() => textareaEl.value?.focus())
		} else {
			emojiOpen.value = false
		}
	}
)

// Закриття попапа емодзі кліком поза ним
function onDocClick(e: MouseEvent) {
	if (emojiOpen.value && emojiWrapEl.value && !emojiWrapEl.value.contains(e.target as Node)) emojiOpen.value = false
}

function onKey(e: KeyboardEvent) {
	if (e.key !== 'Escape') return
	if (lightbox.value) lightbox.value = null
	else if (emojiOpen.value) emojiOpen.value = false
	else if (chat.open.value) chat.closeChat()
}

onMounted(() => {
	chat.init()
	document.addEventListener('mousedown', onDocClick)
	window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
	chat.stopPolling()
	document.removeEventListener('mousedown', onDocClick)
	window.removeEventListener('keydown', onKey)
	if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value)
})
</script>

<style scoped>
.chat {
	position: fixed;
	right: 20px;
	bottom: 20px;
	bottom: calc(20px + env(safe-area-inset-bottom));
	z-index: 1090;
}

/* ---------- FAB ---------- */
.chat__fab {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 58px;
	height: 58px;
	border-radius: 50%;
	background: var(--accent);
	color: var(--on-accent);
	box-shadow: 0 8px 24px var(--accent-glow);
	transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.chat__fab:hover {
	background: var(--accent-hover);
	transform: translateY(-2px);
	box-shadow: 0 12px 30px var(--accent-glow);
}

.chat__fab:active {
	background: var(--accent-active);
	transform: translateY(0);
}

/* Пульсуюче кільце привертання уваги */
.chat__fab::before {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background: var(--accent);
	z-index: -1;
	animation: chat-fab-ring 2.6s ease-out infinite;
}

/* Періодичне похитування іконки */
.chat__fab :deep(svg) {
	transform-origin: center;
	animation: chat-fab-wiggle 4.5s ease-in-out infinite;
}

.chat__fab:hover :deep(svg) {
	animation: none;
}

@keyframes chat-fab-ring {
	0% {
		transform: scale(1);
		opacity: 0.45;
	}
	70%, 100% {
		transform: scale(1.7);
		opacity: 0;
	}
}

@keyframes chat-fab-wiggle {
	0%, 82%, 100% {
		transform: rotate(0);
	}
	86% {
		transform: rotate(-13deg);
	}
	90% {
		transform: rotate(11deg);
	}
	94% {
		transform: rotate(-7deg);
	}
	97% {
		transform: rotate(3deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.chat__fab::before,
	.chat__fab :deep(svg) {
		animation: none;
	}
}

.chat__badge {
	position: absolute;
	top: -3px;
	right: -3px;
	min-width: 20px;
	height: 20px;
	padding: 0 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius-pill);
	background: var(--danger);
	color: var(--on-overlay);
	font-size: 11px;
	font-weight: 700;
	border: 2px solid var(--bg);
}

/* ---------- Панель ---------- */
.chat__panel {
	position: absolute;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	width: min(352px, calc(100vw - 36px));
	height: min(500px, calc(100vh - 130px));
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-pop);
	overflow: hidden;
}

/* Шапка */
.chat__head {
	display: flex;
	align-items: center;
	gap: 11px;
	padding: 11px 14px;
	background: var(--bg-soft);
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.chat__head-avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent);
	flex-shrink: 0;
}

.chat__head-info {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-right: auto;
	min-width: 0;
}

.chat__head-info strong {
	font-size: 15px;
	font-weight: 700;
}

.chat__status {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	color: var(--text-muted);
}

.chat__dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--success);
	box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.18);
	flex-shrink: 0;
}

.chat__dot.is-off {
	background: var(--text-muted);
	box-shadow: none;
}

.chat__icon-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 7px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
	transition: background 0.14s, color 0.14s;
	flex-shrink: 0;
}

.chat__icon-btn:hover,
.chat__icon-btn.is-active {
	background: var(--bg-elevated);
	color: var(--accent);
}

.chat__icon-btn--sm {
	padding: 4px;
}

/* Стрічка повідомлень */
.chat__body {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 14px;
	overflow-y: auto;
	overscroll-behavior: contain;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

/* Привітання */
.chat__greeting {
	display: flex;
	align-self: flex-start;
	align-items: flex-start;
	gap: 8px;
	max-width: 92%;
	margin-bottom: 2px;
}

.chat__greeting-avatar {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent);
}

.chat__greeting p {
	margin: 0;
	padding: 8px 12px;
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	border-radius: var(--radius) var(--radius) var(--radius) 4px;
	font-size: 14px;
	line-height: 1.45;
	color: var(--text-soft);
}

/* Індикатор «бот друкує» */
.chat__typing {
	display: flex;
	align-self: flex-start;
	align-items: flex-end;
	gap: 8px;
}

.chat__typing-avatar {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent);
}

.chat__typing-bubble {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 12px;
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	border-radius: var(--radius) var(--radius) var(--radius) 4px;
}

.chat__typing-bubble span {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--text-muted);
	animation: chat-typing 1.2s infinite ease-in-out;
}

.chat__typing-bubble span:nth-child(2) {
	animation-delay: 0.2s;
}

.chat__typing-bubble span:nth-child(3) {
	animation-delay: 0.4s;
}

@keyframes chat-typing {
	0%, 60%, 100% {
		opacity: 0.3;
		transform: translateY(0);
	}
	30% {
		opacity: 1;
		transform: translateY(-3px);
	}
}

/* Інтро (привітання + месенджери + контакти) */
.chat__intro {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-bottom: 4px;
}

/* Месенджери */
.chat__messengers {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding-left: 36px;
}

.chat__messengers-label {
	font-size: 12px;
	color: var(--text-muted);
}

.chat__messengers-row {
	display: flex;
	gap: 8px;
}

.chat__messenger {
	display: grid;
	place-items: center;
	width: 38px;
	height: 38px;
	border-radius: 50%;
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	color: var(--text-soft);
	transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
}

.chat__messenger:hover {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
	transform: translateY(-2px);
}

/* Контакти (необов'язкові) — з'являються після першого повідомлення, смуга над полем вводу */
.chat__contacts {
	display: flex;
	flex-direction: column;
	gap: 7px;
	padding: 9px 10px;
	background: var(--bg-soft);
	border-top: 1px solid var(--border);
	flex-shrink: 0;
}

.chat__contacts-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.chat__contacts-label {
	font-size: 12px;
	color: var(--text-muted);
}

.chat__contacts-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.chat__contacts-save {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	flex-shrink: 0;
	border-radius: var(--radius-sm);
	background: var(--accent);
	color: var(--on-accent);
	transition: background 0.15s;
}

.chat__contacts-save:hover:not(:disabled) {
	background: var(--accent-hover);
}

.chat__contacts-save:disabled {
	background: var(--bg-elevated);
	color: var(--text-muted);
	cursor: default;
}

/* Прибираємо подвійну лінію між контактами/прев'ю та полем вводу */
.chat__contacts + .chat__foot,
.chat__attach + .chat__foot {
	border-top: 0;
}

.chat__contact-input {
	flex: 1;
	min-width: 0;
	padding: 8px 11px;
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	font-size: 13px;
	outline: none;
	transition: border-color 0.15s;
}

.chat__contact-input:focus {
	border-color: var(--accent);
}

.chat__contact-input:focus {
	border-color: var(--accent);
}

/* Прев'ю прикріпленого файлу */
.chat__attach {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 10px 10px 0;
	padding: 8px 10px;
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	flex-shrink: 0;
}

.chat__attach-thumb {
	width: 36px;
	height: 36px;
	object-fit: cover;
	border-radius: var(--radius-sm);
	background: var(--img-bg);
}

.chat__attach-ico {
	color: var(--accent);
}

.chat__attach-name {
	flex: 1;
	min-width: 0;
	font-size: 13px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Поле вводу */
.chat__foot {
	display: flex;
	align-items: flex-end;
	gap: 4px;
	padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
	border-top: 1px solid var(--border);
	background: var(--bg-soft);
	flex-shrink: 0;
}

.chat__input {
	flex: 1;
	min-width: 0;
	min-height: 40px;
	max-height: 96px;
	padding: 9px 12px;
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	border-radius: var(--radius);
	font-size: 14px;
	line-height: 1.4;
	resize: none;
	outline: none;
	overflow-y: hidden;
	transition: border-color 0.15s;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

.chat__input:focus {
	border-color: var(--accent);
}

/* Тонкий скрол без нативних стрілок (перебиваємо глобальний ::-webkit-scrollbar) */
.chat__input::-webkit-scrollbar {
	width: 6px;
}

.chat__input::-webkit-scrollbar-button {
	display: none;
	width: 0;
	height: 0;
}

.chat__input::-webkit-scrollbar-track {
	background: transparent;
}

.chat__input::-webkit-scrollbar-thumb {
	background: var(--border-light);
	border-radius: 6px;
}

.chat__send {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: var(--accent);
	color: var(--on-accent);
	flex-shrink: 0;
	transition: background 0.15s, transform 0.12s;
}

.chat__send:hover:not(:disabled) {
	background: var(--accent-hover);
}

.chat__send:active:not(:disabled) {
	transform: scale(0.92);
}

.chat__send:disabled {
	background: var(--bg-elevated);
	color: var(--text-muted);
	cursor: default;
}

/* Гліф літачка тяжіє вгору-праворуч — невеликий нудж донизу-ліворуч для оптичного центрування */
.chat__send :deep(svg) {
	transform: translate(-1px, 1px);
}

/* Попап емодзі */
.chat__emoji-wrap {
	position: relative;
}

.chat__emoji-pop {
	position: absolute;
	bottom: calc(100% + 8px);
	left: 0;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 2px;
	padding: 8px;
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	border-radius: var(--radius);
	box-shadow: var(--shadow-pop);
}

.chat__emoji {
	width: 34px;
	height: 34px;
	font-size: 20px;
	line-height: 1;
	border-radius: var(--radius-sm);
	transition: background 0.12s;
}

.chat__emoji:hover {
	background: var(--bg-card);
}

/* Оверлей перетягування */
.chat__drop {
	position: absolute;
	inset: 0;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	background: rgba(13, 13, 16, 0.9);
	border: 2px dashed var(--accent);
	border-radius: var(--radius-lg);
	color: var(--accent);
	font-size: 14px;
	font-weight: 600;
	pointer-events: none;
}

/* Лайтбокс */
.chat__lightbox {
	position: fixed;
	inset: 0;
	z-index: 1300;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	background: rgba(0, 0, 0, 0.85);
	backdrop-filter: blur(3px);
	cursor: zoom-out;
}

.chat__lightbox img {
	max-width: 100%;
	max-height: 100%;
	border-radius: var(--radius-sm);
	box-shadow: var(--shadow-pop);
}

.chat__lb-close {
	position: absolute;
	top: 18px;
	right: 18px;
	display: flex;
	padding: 8px;
	color: var(--on-overlay);
	border-radius: var(--radius-sm);
	background: rgba(255, 255, 255, 0.12);
}

/* ---------- Анімації ---------- */
.chat-fab-enter-active,
.chat-fab-leave-active {
	transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s;
}

.chat-fab-enter-from,
.chat-fab-leave-to {
	transform: scale(0.5);
	opacity: 0;
}

.chat-panel-enter-active,
.chat-panel-leave-active {
	transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
	transform-origin: bottom right;
}

.chat-panel-enter-from,
.chat-panel-leave-to {
	transform: translateY(16px) scale(0.94);
	opacity: 0;
}

.chat-pop-enter-active,
.chat-pop-leave-active {
	transition: transform 0.16s ease, opacity 0.16s ease;
	transform-origin: bottom left;
}

.chat-pop-enter-from,
.chat-pop-leave-to {
	transform: translateY(6px) scale(0.95);
	opacity: 0;
}

.chat-lb-enter-active,
.chat-lb-leave-active {
	transition: opacity 0.2s ease;
}

.chat-lb-enter-from,
.chat-lb-leave-to {
	opacity: 0;
}

/* ---------- Мобільні: панель на весь екран ---------- */
@media (max-width: 480px) {
	.chat {
		right: 14px;
		bottom: 14px;
		bottom: calc(14px + env(safe-area-inset-bottom));
	}

	.chat__panel {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		height: 100dvh;
		border: none;
		border-radius: 0;
	}
}
</style>
