<template>
	<article class="p-card np-card" :class="stockCardClass(stock)">
		<div class="p-card__media">
			<NuxtLink :to="link" class="p-card__img-link">
				<NeoPrintImage :alias="neoprint.alias" :category-alias="category.alias" :alt="cardTitle" />
			</NuxtLink>

			<div class="p-card__badges">
				<!-- Рівно одна плашка (як у ProductCard): знижка — лише коли друк доступний,
				     інакше на її місці стан друку на цю модель. Що це готовий дизайн, каже
				     заголовок секції над сіткою, тож окремий значок тут зайвий. -->
				<span v-if="stock === 'in' && discount > 0" class="badge badge-sale">-{{ discount }}%</span>
				<span v-else-if="stock === 'pre_order'" class="badge badge-pre-order">{{ t('product.preOrder') }}</span>
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
import type { IThemeDesign } from '~/composables/useThemeDesigns'

// Картка готового дизайну в сітці: сторінка теми, модель без товарів, конструктор.
// Веде на /neoprint/{модель}/{дизайн} — повноцінну SSR-сторінку варіанта.
// Тип — короткий дизайн (id/alias/назва/тема): саме такі об'єкти приходять із кешу дизайнів
// сайту (server/utils/siteDesigns.ts); повний INeoPrint з apisite теж підходить
const props = defineProps<{ neoprint: IThemeDesign; category: any }>()

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
</style>
