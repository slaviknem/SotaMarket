<template>
	<article class="p-card np-card" :class="stockCardClass(stock)">
		<div class="p-card__media">
			<NuxtLink :to="link" class="p-card__img-link">
				<NeoPrintImage :alias="neoprint.alias" :category-alias="category.alias" :alt="cardTitle" />
			</NuxtLink>

			<div class="p-card__badges">
				<span v-if="discount > 0" class="badge badge-sale">-{{ discount }}%</span>
				<span class="np-card__badge" :title="t('neoprint.badge')" :aria-label="t('neoprint.badge')">
					<AppIcon name="printer" :size="15" />
				</span>
				<!-- Друк на цю модель зараз недоступний: стан видно одразу в сітці -->
				<span v-if="stock === 'pre_order'" class="badge badge-pre-order">{{ t('product.preOrder') }}</span>
				<span v-else-if="stock === 'out'" class="badge badge-out">{{ t('product.notStock') }}</span>
			</div>
		</div>

		<div class="p-card__body">
			<NuxtLink :to="link" class="p-card__title">
				{{ cardTitle }}
			</NuxtLink>

			<div class="p-card__bottom">
				<div class="p-card__prices">
					<span v-if="discount > 0" class="p-card__price-old">{{ formatPrice(priceOld) }}</span>
					<span class="p-card__price">{{ formatPrice(price) }}</span>
				</div>

				<button
					class="p-card__cart-btn"
					:class="{ 'is-pre-order': stock === 'pre_order' }"
					:disabled="stock === 'out'"
					:title="buyTitle"
					@click.prevent="buy(neoprint, category)"
				>
					<AppIcon :name="stock === 'pre_order' ? 'clock' : 'cart'" :size="18" />
				</button>
			</div>
		</div>
	</article>
</template>

<script setup lang="ts">
// Картка готового дизайну в сітці товарів (сторінка фільтра-теми).
// Веде на /neoprint/{модель}/{дизайн} — повноцінну SSR-сторінку варіанта.
const props = defineProps<{ neoprint: INeoPrint; category: any }>()

const { t } = useI18n()
const url = useUrl()
const { price, priceOld, title, stock: npStock, buy } = useNeoPrint()

const cardTitle = computed(() => title(props.neoprint, props.category))
const link = computed(() => url.neoprint(props.category.alias, props.neoprint.id))
const discount = computed(() => discountPercent(price.value, priceOld.value))

// Наявність дизайну = статус друку на цю модель
const stock = computed(() => npStock(props.category))

const buyTitle = computed(() =>
	stock.value === 'in'
		? t('product.inCart')
		: stock.value === 'pre_order'
			? t('quick.quickPreOrder')
			: t('product.notStock')
)
</script>

<style scoped>
/* База .p-card — у assets/css/main.css. Тут лише специфіка картки дизайну.
   Квадратний кадр базової картки скасовуємо: висоту задає саме зображення (.np-img,
   4:5 + width/height у розмітці), тож картка виходить вертикальною, як чохол, без CLS. */
.p-card__img-link {
	padding: 14px;
	aspect-ratio: auto;
}

/* Компактний значок «готовий дизайн»: лише іконка принтера (сенс — у title/aria-label) */
.np-card__badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border-radius: var(--radius-pill);
	background: var(--accent);
	color: var(--on-accent);
}

</style>
