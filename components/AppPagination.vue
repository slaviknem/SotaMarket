<template>
	<nav v-if="totalPages > 1" class="pagination" :aria-label="t('category.pagination')">
		<!-- Назад.
		     aria-label дублює підпис: на планшеті й вужче він ховається, а без нього
		     лишається сама стрілка — кнопка без імені для скрінрідерів і AI-агентів.
		     aria-current-value: сторінки пагінації різняться лише query, тож роутер
		     вважає всі ці посилання «точно активними» й вішає aria-current="page" -->
		<NuxtLink
			v-if="current > 1 && to"
			:to="to(current - 1)"
			class="pagination__btn"
			:rel="current - 1 === 1 ? undefined : 'prev'"
			:aria-label="t('category.prev')"
			aria-current-value="false"
			@click="scrollTop"
		>
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 1L2 6l5 5"/></svg>
			<span class="pagination__btn-text">{{ t('category.prev') }}</span>
		</NuxtLink>
		<button
			v-else-if="current > 1"
			type="button"
			class="pagination__btn"
			:aria-label="t('category.prev')"
			@click="emit('change', current - 1)"
		>
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 1L2 6l5 5"/></svg>
			<span class="pagination__btn-text">{{ t('category.prev') }}</span>
		</button>
		<span v-else class="pagination__btn is-disabled" aria-disabled="true">
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 1L2 6l5 5"/></svg>
			<span class="pagination__btn-text">{{ t('category.prev') }}</span>
		</span>

		<div class="pagination__pages">
			<template v-for="p in pages" :key="p.key">
				<span v-if="!p.num" class="pagination__page is-dots">…</span>
				<span v-else-if="p.num === current" class="pagination__page is-current" aria-current="page">{{ p.num }}</span>
				<NuxtLink v-else-if="to" :to="to(p.num)" class="pagination__page" :class="{ 'is-loaded': isLoaded(p.num) }" aria-current-value="false" @click="scrollTop">{{ p.num }}</NuxtLink>
				<button v-else type="button" class="pagination__page" @click="emit('change', p.num)">{{ p.num }}</button>
			</template>
		</div>

		<!-- Вперед -->
		<NuxtLink
			v-if="current < totalPages && to"
			:to="to(current + 1)"
			class="pagination__btn"
			rel="next"
			:aria-label="t('category.next')"
			aria-current-value="false"
			@click="scrollTop"
		>
			<span class="pagination__btn-text">{{ t('category.next') }}</span>
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5-5 5"/></svg>
		</NuxtLink>
		<button
			v-else-if="current < totalPages"
			type="button"
			class="pagination__btn"
			:aria-label="t('category.next')"
			@click="emit('change', current + 1)"
		>
			<span class="pagination__btn-text">{{ t('category.next') }}</span>
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5-5 5"/></svg>
		</button>
		<span v-else class="pagination__btn is-disabled" aria-disabled="true">
			<span class="pagination__btn-text">{{ t('category.next') }}</span>
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5-5 5"/></svg>
		</span>
	</nav>
</template>

<script setup lang="ts">
const props = defineProps<{
	current: number
	totalPages: number
	// Білдер посилання на сторінку — рендеримо crawlable <a> (пагінація завжди має бути для ботів).
	// Без `to` — режим кнопок: клієнтська пагінація всередині блоку (подія `change`)
	to?: (page: number) => any
	// Номери вже підвантажених (видимих) сторінок — позначаємо їх крапкою
	loaded?: number[]
}>()

const emit = defineEmits<{ (e: 'change', page: number): void }>()

const { t } = useI18n()

const isLoaded = (page: number) => !!props.loaded?.includes(page)

const scrollTop = () => {
	if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Розмір рухомого вікна номерів (на телефоні менше). Перша/остання + «…» додаються окремо.
const windowSize = ref(5)
let mq: MediaQueryList | null = null
const applyMq = () => {
	if (mq) windowSize.value = mq.matches ? 3 : 5
}
onMounted(() => {
	mq = window.matchMedia('(max-width: 480px)')
	applyMq()
	mq.addEventListener('change', applyMq)
})
onBeforeUnmount(() => mq?.removeEventListener('change', applyMq))

// Рухоме вікно навколо поточної, зсунуте від країв (тож на початку — «1 2 3 4 5 … N»);
// перша/остання завжди видимі, проміжні ховаються за «…».
const pages = computed(() => {
	const result: { key: string; num: number | null }[] = []
	const total = props.totalPages
	const cur = props.current
	const n = windowSize.value
	const add = (num: number | null, key?: string) => result.push({ key: key ?? String(num), num })

	if (total <= n + 2) {
		for (let i = 1; i <= total; i++) add(i)
		return result
	}

	const end = Math.min(total, Math.max(cur + Math.floor(n / 2), n))
	const start = Math.max(1, end - n + 1)

	add(1)
	if (start > 2) add(null, 'dots-l')
	for (let i = Math.max(2, start); i <= Math.min(total - 1, end); i++) add(i)
	if (end < total - 1) add(null, 'dots-r')
	add(total)

	return result
})
</script>

<style scoped>
.pagination {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	flex-wrap: nowrap;
}

.pagination__btn {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: 9px 16px;
	border-radius: var(--radius-sm);
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	font-size: 13.5px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.15s;
}

.pagination__btn:hover:not(.is-disabled) {
	border-color: var(--accent);
	color: var(--accent);
}

.pagination__btn.is-disabled {
	opacity: 0.4;
	cursor: default;
	pointer-events: none;
}

.pagination__pages {
	display: flex;
	gap: 4px;
}

.pagination__page {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 38px;
	height: 38px;
	padding: 0 6px;
	border-radius: var(--radius-sm);
	font-size: 14px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.15s;
}

.pagination__page:hover:not(.is-current):not(.is-dots) {
	background: var(--bg-elevated);
	color: var(--accent);
}

.pagination__page.is-current {
	background: var(--accent);
	color: var(--on-accent);
}

/* Вже підвантажені (видимі) сторінки — акцентний текст + крапка знизу */
.pagination__page.is-loaded {
	position: relative;
	color: var(--accent);
}

.pagination__page.is-loaded::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: 5px;
	transform: translateX(-50%);
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background: var(--accent);
}

.pagination__page.is-dots {
	cursor: default;
	color: var(--text-muted);
}

/* Планшет і вужче: стрілки без тексту — більше місця під номери сторінок */
@media (max-width: 860px) {
	.pagination__btn {
		padding: 9px 11px;
	}

	.pagination__btn-text {
		display: none;
	}
}

/* Телефон: компактніші клітинки/відступи, щоб усе влізло в один рядок */
@media (max-width: 480px) {
	.pagination {
		gap: 6px;
	}

	.pagination__pages {
		gap: 3px;
	}

	.pagination__page {
		min-width: 32px;
		height: 34px;
		font-size: 13px;
	}
}
</style>
