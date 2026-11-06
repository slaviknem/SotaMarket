<template>
	<!-- Картка конструктора в сітці моделі (C2): будова — як у картки товару бренду (ProductCard.vue), щоб стояти з
	     сусідами врівень: біла, одна квадратна картинка «твоє фото → на чохлі» з сотами (brand/public/images/printcase/
	     sota-card.webp), плашка «Конструктор», «Своє фото на …», ціна й помаранчева «Відкрити
	     конструктор» на всю ширину (у товарів — темна «В кошик»). Картинка 500×500 уже на --bg-soft (без прозорості —
	     удвічі легша; файл з brand/public IPX не бачить, тож віддається як є). Пропси — як у рушійної; клас .p-card
	     лишається — за ним сітка моделі рахує ширину плитки -->
	<article class="p-card pc-card" :class="stockCardClass(stock)">
		<div class="p-card__media pc-card__media">
			<div class="p-card__img-link pc-card__img">
				<AppImage
					src="/images/printcase/sota-card.webp"
					alt=""
					:width="280"
					:height="280"
					:loading="eager ? 'eager' : 'lazy'"
					:fetchpriority="eager ? 'high' : undefined"
					:preload="eager"
				/>
			</div>

			<div class="p-card__badges pc-card__badges">
				<span class="pc-card__badge">{{ t('printcase.card.badge') }}</span>
				<!-- Друк на цю модель — лише під передзамовлення -->
				<span v-if="stock === 'pre_order'" class="badge badge-pre-order">{{ t('product.preOrder') }}</span>
			</div>
		</div>

		<div class="p-card__body pc-card__body">
			<!-- Єдине посилання картки: накладка ::after робить клікабельною всю її площу (і «кнопку» нижче) -->
			<NuxtLink :to="link" class="p-card__title pc-card__title">{{ title }}</NuxtLink>

			<div class="pc-card__prices">
				<span class="pc-card__price" :class="{ 'is-sale': isSale }">{{ formatPrice(prices.printcase) }}</span>
				<span v-if="isSale" class="pc-card__price-old">{{ formatPrice(prices.printcase_old) }}</span>
			</div>

			<!-- На телефоні (картка ~170 px) — коротший підпис, щоб не переносився -->
			<span class="pc-card__go" aria-hidden="true">
				<AppIcon name="upload" :size="18" :stroke-width="2.3" />
				<span class="pc-card__go-full">{{ t('printcase.card.open') }}</span>
				<span class="pc-card__go-short">{{ t('printcase.card.openShort') }}</span>
			</span>
		</div>
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
/* База .p-card — у main.css; розміри, скруглення й підкладка фото — ті самі, що в ProductCard бренду */
.pc-card {
	position: relative;
	gap: 10px;
	padding: 10px;
	border-radius: calc(var(--radius) + 2px);
	transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.pc-card:hover {
	border-color: var(--border-light);
	box-shadow: 0 12px 28px rgba(var(--shade-rgb), 0.12);
	transform: translateY(-2px);
}

.pc-card__media {
	border-radius: calc(var(--radius) - 3px);
	overflow: hidden;
}

/* Підкладка та сама, що під фото товарів (і в самій картинці) */
.pc-card__img {
	background: var(--bg-soft);
}

.pc-card:hover .pc-card__img img {
	transform: scale(1.03);
}

.pc-card__badges {
	top: 10px;
	left: 10px;
}

/* Помаранчева, як «HIT» і знижка на картках товарів */
.pc-card__badge {
	padding: 4px 10px;
	border-radius: var(--radius-pill);
	background: var(--accent);
	color: var(--on-accent);
	font-size: 11.5px;
	font-weight: 900;
	line-height: 1.2;
}

.pc-card__body {
	gap: 8px;
	padding: 0 4px;
}

.pc-card__title {
	min-height: 2.7em;
	font-size: 14.5px;
	font-weight: 800;
	line-height: 1.35;
	color: var(--text);
}

.pc-card__title:hover {
	color: var(--link);
	text-decoration: underline;
}

/* Накладка посилання на всю картку — клік будь-де веде в конструктор */
.pc-card__title::after {
	content: '';
	position: absolute;
	inset: 0;
	z-index: 1;
}

.pc-card__prices {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 2px 8px;
}

.pc-card__price {
	font-size: 22px;
	font-weight: 900;
	line-height: 1.2;
	color: var(--text);
}

.pc-card__price.is-sale {
	color: var(--accent-text);
}

.pc-card__price-old {
	font-size: 14px;
	color: var(--text-muted);
	text-decoration: line-through;
}

/* Помаранчева на всю ширину (у товарів — темна «В кошик»): дія тут — «створити», притиснута до низу картки */
.pc-card__go {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	height: 46px;
	margin-top: auto;
	padding: 0 10px;
	border-radius: calc(var(--radius-sm) + 2px);
	background: var(--accent);
	color: var(--on-accent);
	font-size: 15px;
	font-weight: 900;
	transition: background 0.15s;
}

.pc-card:hover .pc-card__go {
	background: var(--accent-hover);
}

.pc-card__go-short {
	display: none;
}

@media (max-width: 640px) {
	.pc-card {
		gap: 8px;
		padding: 8px;
	}

	.pc-card__body {
		gap: 6px;
		padding: 0 2px;
	}

	.pc-card__title {
		font-size: 13.5px;
	}

	.pc-card__price {
		font-size: 19px;
	}

	.pc-card__go {
		height: 42px;
		font-size: 14px;
	}

	/* Картка ~170 px: з іконкою «Створити чохол» переноситься */
	.pc-card__go :deep(svg),
	.pc-card__go-full {
		display: none;
	}

	.pc-card__go-short {
		display: inline;
	}
}
</style>
