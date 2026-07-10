<template>
	<section class="prices">
		<div class="section-title">
			<h2>{{ title }}</h2>
		</div>

		<div class="prices__wrap">
			<table class="prices__table">
				<thead>
					<tr>
						<th scope="col">{{ t('faq.prices.name') }}</th>
						<th scope="col" class="prices__price">{{ t('faq.prices.price') }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="row.id">
						<td>
							<NuxtLink :to="row.to">{{ row.title }}</NuxtLink>
						</td>
						<td class="prices__price">{{ formatPrice(row.price) }}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Сигнал свіжості цін для пошуковиків/AI (SSR — дата рендера сторінки) -->
		<p class="prices__actual text-muted">
			{{ t('faq.prices.actual') }} <time :datetime="isoDate">{{ humanDate }}</time>
		</p>
	</section>
</template>

<script setup lang="ts">
// Таблиця цін (як на старому сайті): семантична <table> під запити «… ціна»
// + перелінковка на картки товарів/варіантів. Рядки формує батьківський компонент
// з уже завантажених даних — без додаткових запитів до API.
export interface IPriceRow {
	id: string | number
	title: string
	to: string
	price: number
}

defineProps<{
	title: string
	rows: IPriceRow[]
}>()

const { t, locale } = useI18n()

const now = new Date()
const isoDate = now.toISOString().slice(0, 10)
const humanDate = computed(() =>
	now.toLocaleDateString(locale.value === 'uk' ? 'uk-UA' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
)
</script>

<style scoped>
.prices {
	margin-top: 34px;
	padding-top: 22px;
	border-top: 1px solid var(--border);
}

.prices__wrap {
	overflow-x: auto;
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
}

.prices__table {
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;
}

.prices__table th {
	padding: 11px 16px;
	background: var(--bg-elevated);
	font-size: 12.5px;
	font-weight: 700;
	text-align: left;
	color: var(--text-muted);
}

.prices__table td {
	padding: 10px 16px;
	border-top: 1px solid var(--border);
}

.prices__table td a {
	color: var(--text-soft);
	transition: color 0.15s;
}

.prices__table td a:hover {
	color: var(--accent);
}

.prices__price {
	width: 1%;
	text-align: right;
	white-space: nowrap;
	font-weight: 600;
}

.prices__actual {
	margin: 8px 2px 0;
	font-size: 12.5px;
}
</style>
