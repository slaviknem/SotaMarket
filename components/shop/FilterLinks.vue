<template>
	<section class="filter-links">
		<div class="section-title">
			<h2>{{ t('filters.popular') }}</h2>
		</div>

		<div class="filter-links__groups">
			<div v-for="group in groups" :key="group.alias" class="filter-links__group">
				<!-- Заголовок групи. Тема має власну SEO-сторінку → посилання; синтетична — простий текст. -->
				<NuxtLink
					v-if="!group.synthetic"
					class="filter-links__group-title"
					:to="url.category(categoryAlias, group.alias)"
				>
					{{ group.title }}
				</NuxtLink>
				<span v-else class="filter-links__group-title filter-links__group-title--plain">{{ group.title }}</span>

				<div class="filter-links__chips">
					<NuxtLink
						v-for="item in group.items || []"
						:key="item.alias"
						class="filter-links__chip"
						:class="{ 'is-active': item.alias === activeAlias }"
						:to="url.category(categoryAlias, item.alias)"
					>
						{{ item.title }}
						<span v-if="item.count" class="filter-links__chip-count">{{ item.count }}</span>
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { IFilterNode } from '~/composables/useFilters'

defineProps<{
	groups: IFilterNode[]
	categoryAlias: string
	activeAlias?: string
}>()

const { t } = useI18n()
const url = useUrl()
</script>

<style scoped>
.filter-links {
	margin-top: 34px;
	padding-top: 22px;
	border-top: 1px solid var(--border);
}

.filter-links__groups {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.filter-links__group {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 8px 10px;
}

.filter-links__group-title {
	flex-shrink: 0;
	min-width: 96px;
	font-size: 13px;
	font-weight: 700;
	color: var(--text);
	transition: color 0.15s;
}

a.filter-links__group-title:hover {
	color: var(--accent);
}

.filter-links__group-title--plain {
	color: var(--text-muted);
}

.filter-links__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.filter-links__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	border-radius: var(--radius-pill);
	font-size: 13px;
	color: var(--text-soft);
	transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.filter-links__chip:hover {
	background: var(--accent-soft);
	border-color: var(--accent);
	color: var(--accent);
}

.filter-links__chip.is-active {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
}

.filter-links__chip-count {
	font-size: 11px;
	color: var(--text-muted);
}

.filter-links__chip:hover .filter-links__chip-count,
.filter-links__chip.is-active .filter-links__chip-count {
	color: inherit;
}
</style>
