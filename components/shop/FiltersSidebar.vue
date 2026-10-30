<template>
	<aside class="filters">
		<div class="filters__head">
			<span class="filters__title">
				<AppIcon name="filter" :size="16" />
				{{ t('filters.filters') }}
			</span>
		</div>

		<div class="filters__body">
			<div v-for="group in groups" :key="group.alias" class="filter-group">
				<!-- Заголовок групи — завжди тогл-акордеон (клік по всьому рядку розгортає/згортає).
				     Пряме посилання на SEO-сторінку теми — окремим рядком «Всі …» усередині блоку. -->
				<button
					class="filter-group__head"
					type="button"
					:aria-expanded="isOpen(group)"
					@click="toggleGroup(group.alias)"
				>
					<span class="filter-group__title" :class="{ 'is-active': !group.synthetic && group.alias === activeAlias }">{{ group.title }}</span>
					<AppIcon name="caret-down" :size="11" :style="{ transform: isOpen(group) ? 'rotate(180deg)' : '' }" />
				</button>

				<div v-if="isOpen(group)" class="filter-group__body">
					<!-- Тема має власну сторінку (агрегат усіх підфільтрів) — прямий crawlable-вхід.
					     На самій сторінці теми (is-active) — це поточна сторінка, робимо неактивним. -->
					<NuxtLink
						v-if="!group.synthetic"
						class="filter-group__all"
						:class="{ 'is-active': group.alias === activeAlias }"
						:to="url.category(categoryAlias, group.alias)"
					>
						{{ t('filters.viewAll', { theme: group.title }) }}
						<AppIcon name="arrow-right" :size="13" />
					</NuxtLink>

					<div
						v-for="item in group.items || []"
						:key="item.alias"
						class="filter-item"
						:class="{ 'is-checked': isSelected(group.alias, item.alias) }"
					>
						<!-- Квадратик: перемикає фільтр на місці (мультивибір, лишаємось на сторінці) -->
						<button
							class="filter-item__box"
							type="button"
							role="checkbox"
							:aria-checked="isSelected(group.alias, item.alias)"
							:aria-label="item.title"
							@click="$emit('toggle', { group: group.alias, alias: item.alias })"
						>
							<AppIcon name="check-sm" :width="10" :height="8" :stroke-width="2.5" />
						</button>
						<!-- Назва: посилання на окрему SEO-сторінку фільтра (crawlable для індексації).
						     У групи без сторінок («Тип чохла») назва перемикає фільтр, як і квадратик -->
						<button
							v-if="group.pageless"
							type="button"
							class="filter-item__label filter-item__label--btn"
							@click="$emit('toggle', { group: group.alias, alias: item.alias })"
						>
							{{ item.title }}
						</button>
						<NuxtLink
							v-else
							class="filter-item__label"
							:class="{ 'is-active': item.alias === activeAlias }"
							:to="url.category(categoryAlias, item.alias)"
						>
							{{ item.title }}
						</NuxtLink>
						<span v-if="item.count" class="filter-item__count">{{ item.count }}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="filters__foot">
			<button class="filters__foot-reset" :disabled="!hasSelected" @click="$emit('reset')">
				<AppIcon name="reset" :size="14" />
				{{ t('filters.rezetFilters') }}
			</button>
		</div>
	</aside>
</template>

<script setup lang="ts">
import type { IFilterNode } from '~/composables/useFilters'

const props = defineProps<{
	groups: IFilterNode[]
	selected: Record<string, string[]> // { groupAlias: [childAlias, ...] }
	categoryAlias: string
	activeAlias?: string // alias фільтра поточної сторінки (для підсвітки + авто-розгортання)
}>()

defineEmits<{
	toggle: [payload: { group: string; alias: string }]
	reset: []
}>()

const { t } = useI18n()
const url = useUrl()

// Стан розгорнутих груп (синтетичні відкриті, теми закриті — за замовчуванням з API)
const openOverride = ref<Record<string, boolean>>({})

const isOpen = (group: IFilterNode) => {
	if (openOverride.value[group.alias] !== undefined) return openOverride.value[group.alias]
	// Авто-розгортання групи активного фільтра (сама тема або її дитина)
	if (props.activeAlias) {
		if (group.alias === props.activeAlias) return true
		if (group.items?.some((i) => i.alias === props.activeAlias)) return true
	}
	return !!group.open
}

const toggleGroup = (alias: string) => {
	const group = props.groups.find((g) => g.alias === alias)
	openOverride.value[alias] = !(openOverride.value[alias] ?? (group ? isOpen(group) : false))
}

const isSelected = (groupAlias: string, alias: string) =>
	props.selected[groupAlias]?.includes(alias) ?? false

const hasSelected = computed(() => Object.values(props.selected).some((v) => v.length))
</script>

<style scoped>
.filters {
	display: flex;
	flex-direction: column;
	/* Доступна висота = вікно мінус прибита шапка мінус повітря згори (5px у sticky-обгортці)
	   і знизу (5px). Інакше футер із «Скинути фільтри» виїжджає за нижній край екрана. */
	max-height: calc(100vh - var(--header-stuck-h) - 10px);
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
	color: var(--accent-text);
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

/* Заголовок групи — кнопка-тогл на всю ширину (клік будь-де розгортає/згортає) */
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
	color: var(--accent-text);
}

.filter-group__head svg {
	transition: transform 0.2s;
	color: var(--text-muted);
	flex-shrink: 0;
}

/* Назва теми поточної сторінки — підсвічуємо акцентом (стан «ви тут») */
.filter-group__title.is-active {
	color: var(--accent-text);
}

/* Прямий вхід на агрегатну сторінку теми — окремим рядком угорі розкритого блоку */
.filter-group__all {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	margin: 2px 8px 4px;
	padding: 4px 8px;
	font-size: 12.5px;
	font-weight: 600;
	color: var(--accent-text);
	transition: gap 0.15s;
}

.filter-group__all:hover {
	gap: 8px;
}

/* На самій сторінці теми посилання веде «в себе» — гасимо і робимо неактивним */
.filter-group__all.is-active {
	color: var(--text-muted);
	pointer-events: none;
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
	transition: background 0.12s;
}

.filter-item:hover {
	background: var(--bg-elevated);
}

.filter-item__box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border-radius: calc(var(--radius-sm) - 3px);
	border: 1.5px solid var(--border-light);
	color: transparent;
	transition: all 0.15s;
	flex-shrink: 0;
	cursor: pointer;
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
	cursor: pointer;
	transition: color 0.15s;
}

/* Назва-кнопка (група без сторінок) — вигляд як у посилання */
.filter-item__label--btn {
	padding: 0;
	font-size: 13.5px;
	line-height: inherit;
	text-align: left;
}

.filter-item__label:hover,
.filter-item__label.is-active {
	color: var(--accent-text);
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
