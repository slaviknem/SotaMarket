<template>
	<!-- Картка конструктора в сітці моделі (C2): синя, віяло з трьох чохлів (одна картинка з прозорим фоном —
	     brand/public/images/printcase/c2-fan.webp), «Своє фото на …», підказка, ціна й помаранчева «Відкрити
	     конструктор». Пропси — як у рушійної; клас .p-card лишається — за ним сітка моделі рахує ширину плитки -->
	<article class="p-card pc-card" :class="stockCardClass(stock)">
		<div class="pc-card__media">
			<AppImage
				src="/images/printcase/c2-fan.webp"
				alt=""
				:width="260"
				:height="200"
				:loading="eager ? 'eager' : 'lazy'"
				:fetchpriority="eager ? 'high' : undefined"
				:preload="eager"
			/>
		</div>

		<!-- Друк на цю модель — лише під передзамовлення -->
		<span v-if="stock === 'pre_order'" class="badge badge-pre-order pc-card__pre">{{ t('product.preOrder') }}</span>

		<!-- Єдине посилання картки: накладка ::after робить клікабельною всю її площу (і «кнопку» нижче) -->
		<NuxtLink :to="link" class="pc-card__title">{{ title }}</NuxtLink>
		<p class="pc-card__note">{{ t('printcase.card.note') }}</p>

		<div class="pc-card__prices">
			<span class="pc-card__price">{{ formatPrice(prices.printcase) }}</span>
			<span v-if="isSale" class="pc-card__price-old">{{ formatPrice(prices.printcase_old) }}</span>
		</div>

		<!-- На телефоні (картка ~170 px) — коротший підпис, щоб не переносився -->
		<span class="pc-card__go" aria-hidden="true">
			<span class="pc-card__go-full">{{ t('printcase.card.open') }}</span>
			<span class="pc-card__go-short">{{ t('printcase.card.openShort') }}</span>
		</span>
	</article>
</template>

<script setup lang="ts">
// eager — картка стоїть першою в сітці: картинка без lazy, з пріоритетом і preload
const props = defineProps<{ category: any; eager?: boolean }>()

const { t } = useI18n()
const url = useUrl()
const { prices } = useSiteSettings()

const link = computed(() => url.printcase(props.category.alias))

// «Своє фото на iPhone 17 Pro» — коротка назва моделі, як у кнопці заголовка сторінки
const title = computed(() => t('printcase.card.titleOwn', { model: props.category.title_full || props.category.title }))

// Стара ціна — лише коли вона справді більша (як знижка на картці товару)
const isSale = computed(() => prices.value.printcase_old > prices.value.printcase)

// Індивідуальний чохол друкують під модель — наявність тут це статус друку моделі
const stock = computed(() => printStockState(props.category))
</script>

<style scoped>
/* База .p-card — у main.css; тут синя картка C2 з тією ж будовою колонкою, що й у картки товару */
.pc-card {
	position: relative;
	gap: 10px;
	padding: 18px;
	border-color: var(--bg-deep-2);
	border-radius: calc(var(--radius) + 2px);
	background: var(--bg-deep-2);
	color: var(--on-deep);
	transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.pc-card:hover {
	border-color: var(--bg-deep-2);
	box-shadow: 0 12px 28px rgba(var(--shade-rgb), 0.22);
	transform: translateY(-2px);
}

.pc-card__media {
	display: block;
	margin: -4px -8px 0;
}

.pc-card__media img {
	display: block;
	width: 100%;
	height: auto;
	transition: transform 0.25s ease;
}

.pc-card:hover .pc-card__media img {
	transform: scale(1.04);
}

.pc-card__pre {
	position: absolute;
	top: 12px;
	left: 12px;
}

.pc-card__title {
	font-size: 19px;
	font-weight: 900;
	line-height: 1.2;
}

/* Накладка посилання на всю картку — клік будь-де веде в конструктор */
.pc-card__title::after {
	content: '';
	position: absolute;
	inset: 0;
}

.pc-card__note {
	margin: 0;
	color: var(--on-deep-muted);
	font-size: 13.5px;
	line-height: 1.45;
}

.pc-card__prices {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin-top: auto;
}

.pc-card__price {
	font-size: 20px;
	font-weight: 900;
}

.pc-card__price-old {
	color: var(--on-deep-muted);
	font-size: 14px;
	text-decoration: line-through;
}

.pc-card__go {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 46px;
	border-radius: calc(var(--radius-sm) + 2px);
	background: var(--accent);
	color: var(--on-accent);
	font-size: 15px;
	font-weight: 900;
	text-align: center;
	transition: background 0.15s;
}

.pc-card:hover .pc-card__go {
	background: var(--accent-hover);
}

.pc-card__go-short {
	display: none;
}

/* Три колонки й вужче — підказку ховаємо, щоб картка не була вищою за сусідні */
@media (max-width: 1180px) {
	.pc-card__note {
		display: none;
	}
}

/* Телефон: дві колонки по ~170 px */
@media (max-width: 640px) {
	.pc-card {
		gap: 8px;
		padding: 10px;
	}

	.pc-card__media {
		margin: 0 -4px;
	}

	.pc-card__title {
		font-size: 15.5px;
	}

	.pc-card__price {
		font-size: 18px;
	}

	.pc-card__go {
		height: 42px;
		font-size: 14px;
	}

	.pc-card__go-full {
		display: none;
	}

	.pc-card__go-short {
		display: inline;
	}
}
</style>
