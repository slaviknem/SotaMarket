<template>
	<section class="filter-links">
		<div class="section-title">
			<h2>{{ t('filters.popular') }}</h2>
		</div>

		<div class="filter-links__groups">
			<div v-for="group in expandedGroups" :key="group.alias" class="filter-links__group">
				<!-- Заголовок групи. Тема має власну SEO-сторінку → посилання; синтетична — простий текст. -->
				<NuxtLink
					v-if="!group.synthetic"
					class="filter-links__group-title"
					:class="{ 'is-active': group.alias === activeAlias }"
					:to="url.category(categoryAlias, group.alias)"
				>
					{{ group.title }}
				</NuxtLink>
				<span v-else class="filter-links__group-title filter-links__group-title--plain">{{ group.title }}</span>

				<div class="filter-links__chips">
					<NuxtLink
						v-for="item in group.items || []"
						:key="item.alias"
						class="chip"
						:class="{ 'is-active': item.alias === activeAlias }"
						:to="url.category(categoryAlias, item.alias)"
					>
						{{ item.title }}
						<span v-if="item.count" class="chip__count">{{ item.count }}</span>
					</NuxtLink>
				</div>
			</div>

			<!-- Інші теми — лише посилання на сторінки-хаби тем (без дітей): вага не розмивається,
			     а діти доступні з хаба теми та з повного блоку на сторінці категорії -->
			<div v-if="themeHubs.length" class="filter-links__group">
				<span class="filter-links__group-title filter-links__group-title--plain">{{ t('filters.type.theme') }}</span>
				<div class="filter-links__chips">
					<NuxtLink
						v-for="theme in themeHubs"
						:key="theme.alias"
						class="chip"
						:to="url.category(categoryAlias, theme.alias)"
					>
						{{ theme.title }}
						<span v-if="theme.count" class="chip__count">{{ theme.count }}</span>
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { IFilterNode } from '~/composables/useFilters'

const props = defineProps<{
	groups: IFilterNode[]
	categoryAlias: string
	activeAlias?: string
}>()

const { t } = useI18n()
const url = useUrl()

// Група активного фільтра: сама тема (її сторінка) або група, що містить фільтр
const isCurrentGroup = (g: IFilterNode) =>
	g.alias === props.activeAlias || !!g.items?.some((i) => i.alias === props.activeAlias)

// Блок — посилання на сторінки фільтрів, тож групи без сторінок («Тип чохла») сюди не йдуть
const linkGroups = computed(() => props.groups.filter((g: IFilterNode) => !g.pageless))

// Сторінка категорії (без activeAlias) — повний блок: категорія є хабом для всіх фільтрів.
// Сторінка фільтра — тематичний силос: розгорнуто лише синтетичні групи (топ-фасети,
// їх мало) і групу активного фільтра (сусіди за темою — релевантні анкори).
const expandedGroups = computed(() =>
	props.activeAlias ? linkGroups.value.filter((g: IFilterNode) => g.synthetic || isCurrentGroup(g)) : linkGroups.value
)

// Решта тем на сторінці фільтра — згорнуті до посилань-хабів
const themeHubs = computed(() =>
	props.activeAlias ? linkGroups.value.filter((g: IFilterNode) => !g.synthetic && !isCurrentGroup(g)) : []
)
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
	color: var(--accent-text);
}

.filter-links__group-title--plain {
	color: var(--text-muted);
}

.filter-links__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

</style>
