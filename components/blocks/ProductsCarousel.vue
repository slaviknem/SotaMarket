<template>
	<section class="block">
		<div class="container">
			<div class="section-title section-title--with-tabs">
				<h2>{{ title }}</h2>

				<div v-if="tabs?.length" class="tabs">
					<button
						v-for="tab in tabs"
						:key="tab.categoryAlias"
						class="tabs__item"
						:class="{ 'is-active': tab.categoryAlias === activeTab }"
						@click="changeTab(tab.categoryAlias)"
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
const props = defineProps<{
	title: string
	initialProducts: any[] | null
	tabs?: { name: string; categoryAlias: string }[]
	limit?: number
}>()

const shopApi = useShopApi()

const activeTab = ref(props.tabs?.[0]?.categoryAlias || 'all')
const products = ref<any[]>(props.initialProducts || [])
const loading = ref(false)

watch(
	() => props.initialProducts,
	(v) => {
		if (v && activeTab.value === (props.tabs?.[0]?.categoryAlias || 'all')) products.value = v
	}
)

async function changeTab(alias: string) {
	if (alias === activeTab.value) return
	activeTab.value = alias
	loading.value = true
	try {
		products.value = await shopApi.getLatestProducts({ category: alias, limit: props.limit || 10 })
	} catch {
		products.value = []
	}
	loading.value = false
}
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
