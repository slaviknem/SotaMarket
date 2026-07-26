<template>
	<div ref="rootRef" class="search" :class="{ 'is-open': open }">
		<!-- Десктопний інпут -->
		<form class="search__form" role="search" @submit.prevent="submit">
			<input
				ref="inputRef"
				v-model="query"
				class="search__input"
				type="search"
				role="combobox"
				aria-autocomplete="list"
				:aria-expanded="open"
				:placeholder="t('header.topbar.searchPlaceholder')"
				autocomplete="off"
				@input="onInput"
				@focus="openSearch"
				@keydown="onKeydown"
			/>
			<button
				v-if="query"
				class="search__clear"
				type="button"
				:aria-label="t('search.clear')"
				@click="clearInput(inputRef)"
			>
				<AppIcon name="close" :size="14" />
			</button>
			<button class="search__btn" type="submit" :aria-label="t('header.topbar.search')">
				<AppIcon name="search" :size="19" />
			</button>
		</form>

		<!-- Мобільний тригер: відкриває той самий пошук на весь екран -->
		<button class="search__mobile" :aria-label="t('header.topbar.search')" @click="openMobile">
			<AppIcon name="search" :size="20" />
		</button>

		<!-- Десктопна випадайка -->
		<Transition name="search-drop">
			<div v-if="open && !isMobile" class="search__drop">
				<LazySearchResults />
			</div>
		</Transition>

		<!-- Мобільний повноекранний пошук -->
		<Teleport to="body">
			<Transition name="search-full">
				<div v-if="open && isMobile" class="search-full">
					<div class="search-full__bar">
						<form class="search__form" role="search" @submit.prevent="submit">
							<input
								ref="mobileInputRef"
								v-model="query"
								class="search__input"
								type="search"
								inputmode="search"
								:placeholder="t('header.topbar.searchPlaceholder')"
								autocomplete="off"
								@input="onInput"
								@keydown="onKeydown"
							/>
							<button
								v-if="query"
								class="search__clear"
								type="button"
								:aria-label="t('search.clear')"
								@click="clearInput(mobileInputRef)"
							>
								<AppIcon name="close" :size="14" />
							</button>
							<button class="search__btn" type="submit" :aria-label="t('header.topbar.search')">
								<AppIcon name="search" :size="19" />
							</button>
						</form>
						<button class="search-full__close" :aria-label="t('other.close')" @click="close">
							<AppIcon name="close" :size="20" />
						</button>
					</div>
					<div class="search-full__body">
						<LazySearchResults />
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const { query, open, openSearch, close, submit, move, onInput, reset } = useSearch()

const rootRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()
const mobileInputRef = ref<HTMLInputElement>()
const isMobile = ref(false)

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'ArrowDown') {
		e.preventDefault()
		move(1)
	} else if (e.key === 'ArrowUp') {
		e.preventDefault()
		move(-1)
	} else if (e.key === 'Escape') {
		close()
		;(e.target as HTMLElement).blur()
	}
}

// Фокус ставить watch нижче — щоб працювало й коли пошук відкрили з мобільного меню
const openMobile = () => openSearch()

// Хрестик: чистимо поле й повертаємо курсор в інпут (панель лишається відкритою)
function clearInput(el?: HTMLInputElement) {
	reset()
	el?.focus()
}

// Клік поза пошуком закриває випадайку (у результатах стоїть mousedown.prevent,
// тож перехід по посиланню встигає спрацювати)
function onDocMouseDown(e: MouseEvent) {
	if (isMobile.value) return
	if (!rootRef.value?.contains(e.target as Node)) close()
}

// Гарячі клавіші: Ctrl/⌘+K або «/» — відкрити пошук
function onDocKeydown(e: KeyboardEvent) {
	const tag = (e.target as HTMLElement)?.tagName
	const typing = tag === 'INPUT' || tag === 'TEXTAREA'

	if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
		e.preventDefault()
		if (isMobile.value) openMobile()
		else {
			openSearch()
			nextTick(() => inputRef.value?.focus())
		}
	}
}

onMounted(() => {
	const mq = window.matchMedia('(max-width: 640px)')
	isMobile.value = mq.matches
	const onMq = (e: MediaQueryListEvent) => (isMobile.value = e.matches)
	mq.addEventListener('change', onMq)

	document.addEventListener('mousedown', onDocMouseDown)
	document.addEventListener('keydown', onDocKeydown)

	onUnmounted(() => {
		mq.removeEventListener('change', onMq)
		document.removeEventListener('mousedown', onDocMouseDown)
		document.removeEventListener('keydown', onDocKeydown)
	})
})

// Повноекранний режим: блокуємо скрол сторінки під ним і ставимо фокус в інпут
watch([open, isMobile], async ([isOpen, mobile]: [boolean, boolean]) => {
	if (!import.meta.client) return

	const full = isOpen && mobile
	document.body.style.overflow = full ? 'hidden' : ''

	if (full) {
		await nextTick()
		mobileInputRef.value?.focus()
	}
})

watch(() => route.fullPath, close)
</script>

<style scoped>
.search {
	position: relative;
}

.search__form {
	display: flex;
	background: var(--bg-soft);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-pill);
	overflow: hidden;
	transition: border-color 0.15s, box-shadow 0.15s;
}

.search__form:focus-within {
	border-color: var(--accent);
	box-shadow: 0 0 0 3px var(--accent-soft);
}

.search__input {
	flex: 1;
	min-width: 0;
	padding: 11px 20px;
	background: transparent;
	border: none;
	outline: none;
	font-size: 14px;
	color: var(--text);
}

.search__input::placeholder {
	color: var(--text-muted);
}

/* Нативний хрестик Chrome/Safari прибираємо — рендеримо свій, вирівняний із лупою */
.search__input::-webkit-search-cancel-button,
.search__input::-webkit-search-decoration {
	-webkit-appearance: none;
	appearance: none;
}

.search__clear {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	margin: auto 0;
	border-radius: var(--radius-pill);
	background: var(--bg-elevated);
	color: var(--text-muted);
	flex-shrink: 0;
	transition: background 0.14s, color 0.14s;
}

.search__clear:hover {
	background: var(--border-light);
	color: var(--text);
}

.search__btn {
	display: flex;
	align-items: center;
	padding: 0 18px 0 14px;
	color: var(--accent);
	transition: color 0.15s;
}

.search__btn:hover {
	color: var(--accent-hover);
}

/* Мобільний тригер — показуємо замість інпута на вузьких екранах */
.search__mobile {
	display: none;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	border-radius: var(--radius-sm);
	color: var(--text-soft);
	transition: background 0.15s, color 0.15s;
}

.search__mobile:hover {
	background: var(--bg-elevated);
	color: var(--accent);
}

/* Десктопна випадайка. container-* — щоб результати самі вирішували, чи є місце
   на дві колонки (див. @container search-panel у SearchResults). */
.search__drop {
	container-type: inline-size;
	container-name: search-panel;
	position: absolute;
	top: calc(100% + 8px);
	left: 0;
	right: 0;
	z-index: 110;
	max-height: min(72vh, 620px);
	overflow-y: auto;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius);
	box-shadow: var(--shadow-pop);
	padding: 6px;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

/* Повноекранний пошук на мобільному */
.search-full {
	position: fixed;
	inset: 0;
	z-index: 1200;
	display: flex;
	flex-direction: column;
	background: var(--bg);
}

.search-full__bar {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 12px;
	background: var(--bg-elevated);
	border-bottom: 1px solid var(--border);
}

.search-full__bar .search__form {
	flex: 1;
	min-width: 0;
}

.search-full__close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	border-radius: var(--radius-sm);
	color: var(--text-soft);
}

.search-full__close:hover {
	background: var(--bg-card);
	color: var(--accent);
}

.search-full__body {
	container-type: inline-size;
	container-name: search-panel;
	flex: 1;
	overflow-y: auto;
	padding: 6px 10px 24px;
}

.search-drop-enter-active,
.search-drop-leave-active {
	transition: opacity 0.15s, transform 0.15s;
}

.search-drop-enter-from,
.search-drop-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}

.search-full-enter-active,
.search-full-leave-active {
	transition: opacity 0.18s;
}

.search-full-enter-from,
.search-full-leave-to {
	opacity: 0;
}

@media (max-width: 640px) {
	.search__form {
		display: none;
	}

	.search__mobile {
		display: flex;
	}

	/* всередині повноекранного пошуку форма потрібна завжди */
	.search-full .search__form {
		display: flex;
	}
}
</style>
