<template>
	<article class="p-card np-card">
		<div class="p-card__media">
			<NuxtLink :to="link" class="p-card__img-link">
				<NeoPrintImage :alias="neoprint.alias" :category-alias="category.alias" :alt="cardTitle" />
			</NuxtLink>

			<div class="p-card__badges">
				<span v-if="discount > 0" class="badge badge-sale">-{{ discount }}%</span>
				<span class="np-card__badge" :title="t('neoprint.badge')" :aria-label="t('neoprint.badge')">
					<AppIcon name="printer" :size="15" />
				</span>
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

				<button class="p-card__cart-btn" :title="t('product.inCart')" @click.prevent="addToCart(neoprint, category)">
					<AppIcon name="cart" :size="18" />
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
const { price, priceOld, title, addToCart } = useNeoPrint()

const cardTitle = computed(() => title(props.neoprint, props.category))
const link = computed(() => url.neoprint(props.category.alias, props.neoprint.id))
const discount = computed(() => discountPercent(price.value, priceOld.value))
</script>

<style scoped>
/* База .p-card — у assets/css/main.css. Тут лише специфіка картки дизайну.
   Симетричний padding робить область фото квадратом — рівно під .np-img (aspect-ratio: 1). */
.p-card__img-link {
	padding: 14px;
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

.p-card__cart-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 12px;
	background: var(--accent-soft);
	color: var(--accent);
	transition: all 0.15s;
	flex-shrink: 0;
}

.p-card__cart-btn:hover {
	background: var(--accent);
	color: var(--on-accent);
}
</style>
