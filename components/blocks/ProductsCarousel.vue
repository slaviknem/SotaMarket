<template>
	<section class="block">
		<div class="container">
			<div class="section-title section-title--with-tabs">
				<h2>{{ title }}</h2>

				<div v-if="tabs?.length" class="tabs">
					<button
						v-for="tab in tabs"
						:key="tabKey(tab)"
						class="tabs__item"
						:class="{ 'is-active': tabKey(tab) === activeTab }"
						@click="changeTab(tab)"
					>
						{{ tab.name }}
					</button>
				</div>
			</div>

			<div v-if="loading" class="products-grid products-grid--wide">
				<div v-for="i in 10" :key="i" class="skeleton skeleton--card" />
			</div>

			<div v-else class="products-grid products-grid--wide">
				<ProductCard v-for="p in products" :key="p.id" :product="p" />
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { ProductTab } from '~/composables/useProductTabs'

const props = defineProps<{
	title: string
	initialProducts: any[] | null
	tabs?: ProductTab[]
	limit?: number
}>()

// Вкладки й товари — логіка в useProductTabs (її бере й карусель бренду)
const { activeTab, products, loading, changeTab } = useProductTabs(props)
</script>

<style scoped>
.section-title--with-tabs {
	flex-wrap: wrap;
}

.tabs {
	display: flex;
	gap: 4px;
	background: var(--bg-card);
	padding: 4px;
	border-radius: var(--radius-pill);
	border: 1px solid var(--border);
}

.tabs__item {
	padding: 7px 16px;
	border-radius: var(--radius-pill);
	font-size: 13px;
	font-weight: 600;
	color: var(--text-muted);
	transition: all 0.15s;
	white-space: nowrap;
}

.tabs__item:hover {
	color: var(--text);
}

.tabs__item.is-active {
	background: var(--accent);
	color: var(--on-accent);
}

@media (max-width: 640px) {
	.tabs {
		overflow-x: auto;
		max-width: 100%;
	}
}
</style>
