<template>
	<!-- Картка товару C2: біла, фото на світлій підкладці, темна плашка «N принтів», біле кругле сердечко (порівняння —
	     при наведенні), назва у два рядки, темна ціна (зі знижкою — акцентна) і темна кнопка «В кошик» на всю ширину,
	     що при наведенні стає помаранчевою. Логіка — useProductCard (рушій), пропси — як у рушійної картки -->
	<article class="p-card c2-card" :class="stockCardClass(stock)">
		<div class="p-card__media c2-card__media">
			<NuxtLink
				:to="cardLink"
				class="p-card__img-link c2-card__img-link"
				:class="{ 'c2-card__img-link--fill': isAlphaprint(product) }"
			>
				<AppImage
					:src="cardImage.src"
					:fallback="cardImage.fallback"
					:alt="cardTitle"
					:width="280"
					:height="280"
					:loading="eager || priority ? 'eager' : 'lazy'"
					:fetchpriority="priority ? 'high' : undefined"
					:preload="priority"
				/>
			</NuxtLink>

			<!-- Або промо (принти, HIT, знижка), або наявність — ніколи разом (як у рушії) -->
			<div class="p-card__badges c2-card__badges">
				<template v-if="stock === 'in'">
					<span v-if="prints > 1" class="c2-card__plate">{{ t(`product.prints.${pluralForm(prints)}`, { n: prints }) }}</span>
					<span v-if="product.mark === 'hit'" class="c2-card__badge">HIT</span>
					<span v-if="discount > 0" class="c2-card__badge">−{{ discount }}%</span>
				</template>
				<span v-else-if="stock === 'pre_order'" class="badge badge-pre-order">{{ t('product.preOrder') }}</span>
				<span v-else class="badge badge-out">{{ t('product.notStock') }}</span>
			</div>

			<div class="c2-card__actions">
				<button
					type="button"
					class="c2-card__icon"
					:class="{ 'is-active': wishlist.has(product.id) }"
					:aria-label="t('other.wishlist')"
					:aria-pressed="wishlist.has(product.id)"
					@click.prevent="toggleWishlist"
				>
					<AppIcon name="heart" :size="19" :stroke-width="2.2" :filled="wishlist.has(product.id)" />
				</button>
				<button
					type="button"
					class="c2-card__icon c2-card__icon--compare"
					:class="{ 'is-active': compare.has(product.id) }"
					:aria-label="t('other.comparison')"
					:aria-pressed="compare.has(product.id)"
					@click.prevent="toggleCompare"
				>
					<AppIcon name="compare" :size="18" />
				</button>
			</div>
		</div>

		<div class="p-card__body c2-card__body">
			<NuxtLink :to="cardLink" class="p-card__title c2-card__title">
				{{ cardTitle }}
			</NuxtLink>

			<!-- Рейтинг — лише товарам із відгуками (дублює aggregateRating у розмітці, як у рушії) -->
			<div v-if="product.reviews_count" class="c2-card__rating">
				<RatingStars :value="product.rating" :size="13" />
				<span class="text-muted">({{ product.reviews_count }})</span>
			</div>

			<div class="c2-card__prices">
				<span class="c2-card__price" :class="{ 'is-sale': discount > 0 }">{{ formatPrice(product.price) }}</span>
				<span v-if="discount > 0" class="c2-card__price-old">{{ formatPrice(product.price_old) }}</span>
			</div>

			<!-- Три стани: у кошик / передзамовлення / неактивна, коли товару немає й не буде -->
			<button
				type="button"
				class="c2-card__buy"
				:class="{ 'is-pre-order': stock === 'pre_order' }"
				:disabled="stock === 'out'"
				@click.prevent="buy"
			>
				<AppIcon v-if="stock !== 'out'" :name="stock === 'pre_order' ? 'clock' : 'cart'" :size="18" :stroke-width="2.2" />
				{{ stock === 'in' ? t('product.toCart') : buyTitle }}
			</button>
		</div>
	</article>
</template>

<script setup lang="ts">
import { pluralForm } from '#brand/plural'

// attribute — картка-варіант (сторінки фільтрів); eager — картка першого екрана (фото без lazy);
// priority — найімовірніший LCP (fetchpriority=high і preload)
const props = defineProps<{ product: any; attribute?: any; eager?: boolean; priority?: boolean }>()

const { t } = useI18n()
const { wishlist, compare, cardImage, cardTitle, cardLink, discount, stock, buyTitle, buy, toggleWishlist, toggleCompare } =
	useProductCard(props)

// Скільки принтів у дизайну (альфапринти — тип alpha_print) — плашкою на фото (прототип C2) замість кружечків
// кольорів рушія; у картки-варіанта (сторінки фільтрів) — 0: принт уже в назві. Кольорових товарів у Sota немає
const prints = computed(() => (props.attribute ? 0 : (props.product.attributes || []).filter(isPrintAttribute).length))
</script>

<style scoped>
/* База .p-card — у main.css (на ній тримаються сітки товарів); тут вигляд C2 */
.c2-card {
	gap: 10px;
	padding: 10px;
	border-radius: calc(var(--radius) + 2px);
	transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.c2-card:hover {
	border-color: var(--border-light);
	box-shadow: 0 12px 28px rgba(var(--shade-rgb), 0.12);
	transform: translateY(-2px);
}

.c2-card__media {
	border-radius: calc(var(--radius) - 3px);
	overflow: hidden;
}

/* Світла холодна підкладка: знімки на білому, multiply «прибирає» білий фон (як у плитках моделей) */
.c2-card__img-link {
	padding: 10px;
	background: var(--bg-soft);
}

.c2-card__img-link img {
	border-radius: var(--radius-sm);
	mix-blend-mode: multiply;
}

/* Альфапринт — чохол уже на квадратному полотні з полями: на всю плитку (як у рушії) */
.c2-card__img-link--fill {
	padding: 0;
}

.c2-card__img-link--fill img {
	border-radius: 0;
}

.c2-card:hover .p-card__img-link img {
	transform: scale(1.03);
}

.c2-card__badges {
	top: 10px;
	left: 10px;
}

.c2-card__plate,
.c2-card__badge {
	padding: 4px 10px;
	border-radius: var(--radius-pill);
	font-size: 11.5px;
	font-weight: 900;
	line-height: 1.2;
}

.c2-card__plate {
	background: var(--bg-deep);
	color: var(--on-deep);
}

.c2-card__badge {
	background: var(--accent);
	color: var(--on-accent);
}

/* Сердечко — завжди; порівняння — при наведенні (і коли вже додане). Кнопки — білі соти (--hex-mask, як обране й
   порівняння на сторінці товару). Тінь і кільце фокуса маска зрізала б: тінь — drop-shadow обгортки (повторює
   контур сот), фокус з клавіатури — синя сота */
.c2-card__actions {
	position: absolute;
	top: 6px;
	right: 6px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	filter: drop-shadow(0 2px 5px rgba(var(--shade-rgb), 0.16));
}

.c2-card__icon {
	display: grid;
	place-items: center;
	width: 44px;
	height: 51px;
	background: var(--bg-card);
	color: var(--text);
	-webkit-mask: var(--hex-mask) center / 100% 100% no-repeat;
	mask: var(--hex-mask) center / 100% 100% no-repeat;
	transition: color 0.15s, background 0.15s, opacity 0.15s;
}

.c2-card__icon:hover,
.c2-card__icon.is-active {
	color: var(--accent-text);
}

.c2-card__icon:focus-visible {
	outline: 0;
	background: var(--bg-deep);
	color: var(--on-deep);
}

.c2-card__icon--compare {
	opacity: 0;
}

.c2-card:hover .c2-card__icon--compare,
.c2-card__icon--compare:focus-visible,
.c2-card__icon--compare.is-active {
	opacity: 1;
}

/* Сенсорні екрани без наведення — порівняння лише на сторінці товару */
@media (hover: none) {
	.c2-card__icon--compare:not(.is-active) {
		display: none;
	}
}

.c2-card__body {
	gap: 8px;
	padding: 0 4px;
}

.c2-card__title {
	min-height: 2.7em;
	font-size: 14.5px;
	font-weight: 700;
	line-height: 1.35;
	color: var(--text);
}

.c2-card__title:hover {
	color: var(--link);
	text-decoration: underline;
}

.c2-card__rating {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
}

.c2-card__prices {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 2px 8px;
}

.c2-card__price {
	font-size: 22px;
	font-weight: 900;
	line-height: 1.2;
	color: var(--text);
}

.c2-card__price.is-sale {
	color: var(--accent-text);
}

.c2-card__price-old {
	font-size: 14px;
	color: var(--text-muted);
	text-decoration: line-through;
}

/* «В кошик» — темна на всю ширину, помаранчева при наведенні (головна дія); притиснута до низу картки */
.c2-card__buy {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: auto;
	gap: 8px;
	height: 46px;
	padding: 0 10px;
	border-radius: calc(var(--radius-sm) + 2px);
	background: var(--bg-deep);
	color: var(--on-deep);
	font-size: 15px;
	font-weight: 900;
	transition: background 0.15s, color 0.15s;
}

.c2-card__buy:hover:not(:disabled) {
	background: var(--accent);
	color: var(--on-accent);
}

.c2-card__buy.is-pre-order {
	background: var(--warning-soft);
	color: var(--warning);
}

.c2-card__buy.is-pre-order:hover {
	background: var(--warning);
	color: var(--on-accent);
}

.c2-card__buy:disabled {
	background: var(--bg-elevated);
	color: var(--text-muted);
	cursor: not-allowed;
}

@media (max-width: 640px) {
	.c2-card {
		gap: 8px;
		padding: 8px;
	}

	.c2-card__body {
		gap: 6px;
		padding: 0 2px;
	}

	.c2-card__title {
		font-size: 13.5px;
	}

	.c2-card__price {
		font-size: 19px;
	}

	.c2-card__buy {
		height: 42px;
		font-size: 14px;
	}
}
</style>
