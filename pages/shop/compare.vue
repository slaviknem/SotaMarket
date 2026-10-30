<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('other.comparison') }]" />

		<h1>{{ t('other.comparison') }}</h1>

		<!-- Список живе лише в localStorage → на SSR він порожній. Без ClientOnly Vue гідратує
		     гілку «є товари» поверх серверної гілки «порожньо» (обидві — div) і на контейнері
		     лишається клас .list-empty замість таблиці порівняння. -->
		<ClientOnly>
			<div v-if="!compare.items.value.length" class="list-empty">
				<AppIcon name="compare" :size="60" :stroke-width="1.2" />
				<p>{{ t('other.compareListEmpty') }}</p>
				<NuxtLink :to="localePath('/')" class="btn btn-primary">{{ t('cart.continueShopping') }}</NuxtLink>
			</div>

			<div v-else class="compare-table-wrap">
				<table class="compare-table">
					<tbody>
						<tr>
							<th>{{ t('product.product') }}</th>
							<td v-for="p in compare.items.value" :key="p.id">
								<button class="remove-btn compare-remove" :title="t('other.remove')" @click="compare.remove(p.id)">
									<AppIcon name="close" :size="13" />
								</button>
								<NuxtLink :to="url.product(p)" class="compare-product">
									<AppImage v-bind="url.productThumbImage(p.image_file, p)" :alt="p.title" :width="110" :height="110" />
									<span>{{ p.title }}</span>
								</NuxtLink>
							</td>
						</tr>
						<tr>
							<th>{{ t('product.price') }}</th>
							<td v-for="p in compare.items.value" :key="p.id" class="compare-price">
								{{ formatPrice(p.price) }}
							</td>
						</tr>
						<tr>
							<th>{{ t('product.stock') }}</th>
							<td v-for="p in compare.items.value" :key="p.id">
								<span :class="productStockState(p) === 'in' ? 'text-accent' : 'text-muted'">
									{{ stockLabel(p) }}
								</span>
							</td>
						</tr>
						<tr>
							<th>{{ t('product.description') }}</th>
							<td v-for="p in compare.items.value" :key="p.id" class="compare-desc">
								{{ p.description_short }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<template #fallback>
				<div class="skeleton compare-skeleton" />
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const url = useUrl()
const compare = useCompare()

// Наявність — та сама логіка, що в картці й на сторінці товару (передзамовлення окремим станом)
const stockLabel = (p: any) => {
	const state = productStockState(p)
	if (state === 'in') return t('product.inStock')
	return t(state === 'pre_order' ? 'product.preOrder' : 'product.notStock')
}

usePageSeo({ title: () => t('other.comparison'), noindex: true })
</script>

<style scoped>
.list-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	padding: 60px 20px 80px;
	color: var(--text-muted);
}

.compare-table-wrap {
	overflow-x: auto;
	padding-bottom: 40px;
}

/* Каркас до монтування клієнта (візуал — глобальний .skeleton у main.css) */
.compare-skeleton {
	height: 420px;
	border-radius: var(--radius);
}

.compare-table {
	width: 100%;
	border-collapse: collapse;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.compare-table th,
.compare-table td {
	position: relative;
	padding: 14px 16px;
	border: 1px solid var(--border);
	vertical-align: top;
	min-width: 180px;
	font-size: 13.5px;
}

.compare-table th {
	text-align: left;
	color: var(--text-muted);
	font-weight: 600;
	min-width: 130px;
	background: var(--bg-soft);
}

.compare-product {
	display: flex;
	flex-direction: column;
	gap: 8px;
	font-weight: 600;
}

.compare-product img {
	background: var(--img-bg);
	border-radius: var(--radius-sm);
	object-fit: contain;
}

.compare-product:hover span {
	color: var(--accent-text);
}

.compare-price {
	font-weight: 800;
	color: var(--accent-text);
	font-size: 15px;
}

.compare-desc {
	color: var(--text-soft);
}

/* База — .remove-btn у main.css */
.compare-remove {
	position: absolute;
	top: 8px;
	right: 8px;
	padding: 6px;
	border-radius: calc(var(--radius-sm) - 2px);
}
</style>
