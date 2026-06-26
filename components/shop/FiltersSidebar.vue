<template>
	<aside class="filters">
		<div class="filters__head">
			<span class="filters__title">
				<AppIcon name="filter" :size="16" />
				{{ t('filters.filters') }}
			</span>
		</div>

		<div class="filters__body">
			<div v-for="group in filters" :key="group.id" class="filter-group">
				<button class="filter-group__head" @click="toggleGroup(group.id)">
					{{ group.title }}
					<svg
						width="11"
						height="11"
						viewBox="0 0 12 8"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						:style="{ transform: isOpen(group) ? 'rotate(180deg)' : '' }"
					>
						<path d="M1 1l5 5 5-5" />
					</svg>
				</button>

				<div v-if="isOpen(group)" class="filter-group__body">
					<label
						v-for="item in group.items || []"
						:key="item.id"
						class="filter-item"
						:class="{ 'is-checked': isSelected(group.alias, item.alias) }"
					>
						<input
							type="checkbox"
							:checked="isSelected(group.alias, item.alias)"
							@change="$emit('toggle', { group: group.alias, alias: item.alias })"
						/>
						<span class="filter-item__box">
							<svg width="10" height="8" viewBox="0 0 12 9" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4.5l3.5 3.5L11 1"/></svg>
						</span>
						<span class="filter-item__label">{{ item.title }}</span>
						<span class="filter-item__count">{{ item.count }}</span>
					</label>
				</div>
			</div>
		</div>

		<div class="filters__foot">
			<button class="filters__foot-reset" :disabled="!hasSelected" @click="$emit('reset')">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
				{{ t('filters.rezetFilters') }}
			</button>
		</div>
	</aside>
</template>

<script setup lang="ts">
const props = defineProps<{
	filters: any[]
	selected: Record<string, string[]> // { parentAlias: [childAlias, ...] }
}>()

defineEmits<{
	toggle: [payload: { group: string; alias: string }]
	reset: []
}>()

const { t } = useI18n()

// Стан розгорнутих груп (теми за замовчуванням закриті — open=false з API)
const openOverride = ref<Record<number, boolean>>({})

const isOpen = (group: any) => openOverride.value[group.id] ?? !!group.open

const toggleGroup = (id: number) => {
	const group = props.filters.find((f) => f.id === id)
	openOverride.value[id] = !(openOverride.value[id] ?? !!group?.open)
}

const isSelected = (groupAlias: string, alias: string) =>
	props.selected[groupAlias]?.includes(alias) ?? false

const hasSelected = computed(() => Object.values(props.selected).some((v) => v.length))
</script>

<style scoped>
.filters {
	display: flex;
	flex-direction: column;
	/* top:5px у обгортці + 5px знизу = картка не впритул до країв вікна */
	max-height: calc(100vh - 10px);
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

/* Шапка — зафіксована зверху, не прокручується; трохи світліший фон, щоб не зливалась */
.filters__head {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 15px 18px;
	background: var(--bg-elevated);
	border-bottom: 1px solid var(--border);
}

.filters__title {
	display: inline-flex;
	align-items: center;
	gap: 9px;
	font-weight: 700;
	font-size: 14.5px;
}

.filters__title svg {
	color: var(--accent);
}

/* Прокручується лише середня частина */
.filters__body {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

.filters__body::-webkit-scrollbar {
	width: 8px;
}

.filters__body::-webkit-scrollbar-thumb {
	background: var(--border-light);
	border-radius: var(--radius-pill);
}

.filters__body::-webkit-scrollbar-thumb:hover {
	background: var(--text-muted);
}

/* Невеликий футер — зафіксований знизу */
.filters__foot {
	flex-shrink: 0;
	padding: 10px 12px;
	border-top: 1px solid var(--border);
}

.filters__foot-reset {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	width: 100%;
	padding: 9px;
	border-radius: var(--radius-sm);
	font-size: 13px;
	font-weight: 600;
	color: var(--accent);
	background: var(--accent-soft);
	transition: background 0.15s, color 0.15s, opacity 0.15s;
}

.filters__foot-reset:hover:not(:disabled) {
	background: var(--accent);
	color: var(--on-accent);
}

.filters__foot-reset:disabled {
	color: var(--text-muted);
	background: var(--bg-elevated);
	cursor: default;
	opacity: 0.7;
}

.filter-group {
	border-bottom: 1px solid var(--border);
}

.filter-group:last-child {
	border-bottom: none;
}

.filter-group__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 13px 18px;
	font-weight: 600;
	font-size: 13.5px;
	text-align: left;
	color: var(--text);
	transition: color 0.15s;
}

.filter-group__head:hover {
	color: var(--accent);
}

.filter-group__head svg {
	transition: transform 0.2s;
	color: var(--text-muted);
	flex-shrink: 0;
}

.filter-group__body {
	padding: 2px 10px 12px;
	max-height: 320px;
	overflow-y: auto;
}

.filter-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 8px;
	border-radius: var(--radius-sm);
	cursor: pointer;
	transition: background 0.12s;
}

.filter-item:hover {
	background: var(--bg-elevated);
}

.filter-item input {
	position: absolute;
	opacity: 0;
	pointer-events: none;
}

.filter-item__box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border-radius: 5px;
	border: 1.5px solid var(--border-light);
	color: transparent;
	transition: all 0.15s;
	flex-shrink: 0;
}

.filter-item.is-checked .filter-item__box {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
}

.filter-item__label {
	flex: 1;
	font-size: 13.5px;
	color: var(--text-soft);
}

.filter-item.is-checked .filter-item__label {
	color: var(--text);
	font-weight: 500;
}

.filter-item__count {
	font-size: 11.5px;
	color: var(--text-muted);
	background: var(--bg-elevated);
	padding: 1px 7px;
	border-radius: var(--radius-pill);
}

/* На мобільному сайдбар — оверлей на всю висоту: картка заповнює панель */
@media (max-width: 1023px) {
	.filters {
		max-height: none;
		height: 100%;
	}
}
</style>
