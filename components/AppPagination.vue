<template>
	<nav v-if="totalPages > 1" class="pagination" aria-label="Pagination">
		<button class="pagination__btn" :disabled="current <= 1" @click="go(current - 1)">
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 1L2 6l5 5"/></svg>
			{{ t('category.prev') }}
		</button>

		<div class="pagination__pages">
			<button
				v-for="p in pages"
				:key="p.key"
				class="pagination__page"
				:class="{ 'is-current': p.num === current, 'is-dots': !p.num }"
				:disabled="!p.num"
				@click="p.num && go(p.num)"
			>
				{{ p.num || '…' }}
			</button>
		</div>

		<button class="pagination__btn" :disabled="current >= totalPages" @click="go(current + 1)">
			{{ t('category.next') }}
			<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5-5 5"/></svg>
		</button>
	</nav>
</template>

<script setup lang="ts">
const props = defineProps<{
	current: number
	totalPages: number
}>()

const emit = defineEmits<{ change: [page: number] }>()

const { t } = useI18n()

const go = (page: number) => emit('change', page)

// Вікно сторінок: 1 … 4 5 [6] 7 8 … 20
const pages = computed(() => {
	const result: { key: string; num: number | null }[] = []
	const total = props.totalPages
	const cur = props.current

	const add = (num: number | null, key?: string) =>
		result.push({ key: key || String(num), num })

	if (total <= 9) {
		for (let i = 1; i <= total; i++) add(i)
		return result
	}

	add(1)
	if (cur > 4) add(null, 'dots-l')

	for (let i = Math.max(2, cur - 2); i <= Math.min(total - 1, cur + 2); i++) add(i)

	if (cur < total - 3) add(null, 'dots-r')
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
	flex-wrap: wrap;
	margin-top: 28px;
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

.pagination__btn:hover:not(:disabled) {
	border-color: var(--accent);
	color: var(--accent);
}

.pagination__btn:disabled {
	opacity: 0.4;
	cursor: default;
}

.pagination__pages {
	display: flex;
	gap: 4px;
}

.pagination__page {
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

.pagination__page.is-dots {
	cursor: default;
	color: var(--text-muted);
}
</style>
