<template>
	<!-- Хіти SotaMARKET (C2 «Хіти · Для {модель}»): вкладки-теми сегментами, сітка карток, під нею —
	     «Усі дизайни … для {модель} →» (сторінка моделі або її теми). Логіка вкладок — useProductTabs рушія,
	     пропси — як у рушійного ProductsCarousel (вкладки-теми дає pages/index.vue з home.themeTabs) -->
	<section class="block" :aria-labelledby="titleId">
		<div class="container">
			<SectionHead :title-id="titleId" :title="title" :eyebrow="t('index.eyebrow.hits')">
				<div v-if="tabs && tabs.length > 1" class="seg" role="group" :aria-label="title">
					<button
						v-for="tab in tabs"
						:key="tabKey(tab)"
						class="seg__item"
						:class="{ 'is-active': tabKey(tab) === activeTab }"
						type="button"
						:aria-pressed="tabKey(tab) === activeTab"
						@click="changeTab(tab)"
					>
						{{ tab.name }}
					</button>
				</div>
			</SectionHead>

			<div v-if="loading" class="products-grid products-grid--wide">
				<div v-for="i in limit || 10" :key="i" class="skeleton skeleton--card" />
			</div>

			<div v-else class="products-grid products-grid--wide">
				<ProductCard v-for="p in products" :key="p.id" :product="p" />
			</div>

			<div v-if="allLink" class="hits-more">
				<NuxtLink :to="allLink.to" class="hits-more__btn">
					{{ allLink.label }}
					<AppIcon name="arrow-right" :size="18" />
				</NuxtLink>
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

const { t } = useI18n()
const url = useUrl()
const titleId = useId()

const { activeTab, products, loading, changeTab } = useProductTabs(props)

// «Усі дизайни для моделі» — лише у вкладок моделі (теми): сторінка моделі або сторінка її теми
const allLink = computed(() => {
	const tab = props.tabs?.find((x: ProductTab) => tabKey(x) === activeTab.value)
	if (!tab?.theme || !tab.categoryTitle) return null
	const model = tab.categoryTitle
	return tab.theme.alias
		? { to: url.category(tab.categoryAlias, tab.theme.alias), label: t('index.hitsAllTheme', { theme: tab.name, model }) }
		: { to: url.category(tab.categoryAlias), label: t('index.hitsAll', { model }) }
})
</script>

<style scoped>
/* Вкладки — сегменти в білій рамці, активна — на синьому шапки */
.seg {
	display: flex;
	gap: 2px;
	max-width: 100%;
	padding: 4px;
	overflow-x: auto;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: calc(var(--radius-sm) + 4px);
	scrollbar-width: none;
}

.seg::-webkit-scrollbar {
	display: none;
}

.seg__item {
	flex-shrink: 0;
	height: 44px;
	padding: 0 16px;
	border-radius: var(--radius-sm);
	font-size: 15px;
	font-weight: 800;
	color: var(--text-soft);
	white-space: nowrap;
	transition: background 0.15s, color 0.15s;
}

.seg__item:hover {
	background: var(--bg-elevated);
	color: var(--text);
}

.seg__item.is-active {
	background: var(--bg-deep);
	color: var(--on-deep);
	font-weight: 900;
}

.hits-more {
	display: flex;
	justify-content: center;
	margin-top: 22px;
}

.hits-more__btn {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 50px;
	padding: 0 26px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: calc(var(--radius-sm) + 4px);
	font-weight: 900;
	color: var(--text);
	text-align: center;
	transition: border-color 0.15s, box-shadow 0.15s;
}

.hits-more__btn:hover {
	border-color: var(--accent);
	box-shadow: var(--shadow-card);
}

@media (max-width: 640px) {
	/* Вкладки — на всю ширину під заголовком, гортаються пальцем */
	.seg {
		width: 100%;
	}

	.seg__item {
		height: 40px;
		padding: 0 13px;
		font-size: 14px;
	}

	.hits-more__btn {
		width: 100%;
		justify-content: center;
		padding: 10px 16px;
	}
}
</style>
