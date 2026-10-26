<template>
	<article class="p-card" :class="stockCardClass(stock)">
		<div class="p-card__media">
			<NuxtLink
				:to="cardLink"
				class="p-card__img-link"
				:class="{ 'p-card__img-link--fill': isAlphaprint(product) }"
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

			<div class="p-card__badges">
				<!-- Або промо (HIT/знижка), або наявність — ніколи разом: купити зараз усе одно
				     не можна, а стос із двох плашок перекриває фото. Разом із приглушеним превʼю
				     видно, що товар не в кошик, ще до переходу на його сторінку. -->
				<template v-if="stock === 'in'">
					<span v-if="product.mark === 'hit'" class="badge badge-hit">HIT</span>
					<span v-if="discount > 0" class="badge badge-sale">-{{ discount }}%</span>
				</template>
				<span v-else-if="stock === 'pre_order'" class="badge badge-pre-order">{{ t('product.preOrder') }}</span>
				<span v-else class="badge badge-out">{{ t('product.notStock') }}</span>
			</div>

			<div class="p-card__quick-actions">
				<button
					class="icon-btn"
					:class="{ 'is-active': wishlist.has(product.id) }"
					:title="t('other.wishlist')"
					@click.prevent="toggleWishlist"
				>
					<AppIcon name="heart" :size="17" :filled="wishlist.has(product.id)" />
				</button>
				<button
					class="icon-btn"
					:class="{ 'is-active': compare.has(product.id) }"
					:title="t('other.comparison')"
					@click.prevent="toggleCompare"
				>
					<AppIcon name="compare" :size="17" />
				</button>
			</div>
		</div>

		<div class="p-card__body">
			<NuxtLink :to="cardLink" class="p-card__title">
				{{ cardTitle }}
			</NuxtLink>

			<!-- Рейтинг: дублює aggregateRating позиції в ItemList сторінки — Google зараховує
			     оцінку в розмітці лише тоді, коли вона видима. Малюємо лише тим товарам,
			     у яких відгуки реально є, тож у сітці це майже не додає вузлів. -->
			<div v-if="product.reviews_count" class="p-card__rating">
				<RatingStars :value="product.rating" :size="13" />
				<span class="text-muted">({{ product.reviews_count }})</span>
			</div>

			<!-- Кольори/атрибути (у режимі картки-варіанта не показуємо — колір уже в назві) -->
			<div v-if="colorAttributes.length" class="p-card__attrs">
				<NuxtLink
					v-for="attr in colorAttributes.slice(0, MAX_DOTS)"
					:key="attr.id"
					:to="url.product(product, attr.alias)"
					class="p-card__attr"
					:class="{ 'is-out': !isAttrInStock(product, attr) }"
					:title="attr.title"
					:style="url.attrDot(attr)"
				/>
				<span v-if="colorAttributes.length > MAX_DOTS" class="p-card__attr-more">
					+{{ colorAttributes.length - MAX_DOTS }}
				</span>
			</div>

			<div class="p-card__bottom">
				<div class="p-card__prices">
					<span v-if="discount > 0" class="p-card__price-old">{{ formatPrice(product.price_old) }}</span>
					<span class="p-card__price">{{ formatPrice(product.price) }}</span>
				</div>

				<!-- Немає й не буде — кнопка неактивна; передзамовлення — та сама кнопка,
				     але веде в модалку замовлення, а не в кошик -->
				<button
					class="p-card__cart-btn"
					:class="{ 'is-pre-order': stock === 'pre_order' }"
					:disabled="stock === 'out'"
					:title="buyTitle"
					@click.prevent="buy"
				>
					<AppIcon :name="stock === 'pre_order' ? 'clock' : 'cart'" :size="18" />
				</button>
			</div>
		</div>
	</article>
</template>

<script setup lang="ts">
// Логіка картки (фото, назва, наявність, купівля, обране й порівняння) — useProductCard;
// тут лише вигляд, і бренд може перекрити його своїм (brand/components/ProductCard.vue).
// attribute — режим картки-варіанта (сторінки фільтрів): назва з кольором, фото
// і посилання ведуть на сторінку атрибута /attr/{alias}
// eager — картка першого екрана: фото без lazy (інакше чекає розкладки).
// priority — найімовірніший LCP: ще й fetchpriority=high і preload у <head>
const props = defineProps<{ product: any; attribute?: any; eager?: boolean; priority?: boolean }>()

const { t } = useI18n()
const url = useUrl()
const { wishlist, compare, cardImage, cardTitle, cardLink, discount, colorAttributes, stock, buyTitle, buy, toggleWishlist, toggleCompare } =
	useProductCard(props)

// Скільки кольорів показуємо крапками: 5 × 24px (крок зони дотику) + «+N» вміщуються
// в найвужчу картку сітки (2 колонки на телефоні)
const MAX_DOTS = 5
</script>

<style scoped>
/* База .p-card (+ hover-обводка) винесена в assets/css/main.css — тут лише специфіка цієї картки */
.p-card__img-link {
	padding: 16px 14px;
}

/* Темне фото на всю ширину кадру (плівки, скло) інакше читається гострим прямокутником
   серед скруглених блоків. Радіус той самий, що й у фото на сторінці товару (ProductGallery).
   Фото зі своїми білими полями всередині файлу він просто не зачіпає. */
.p-card__img-link img {
	border-radius: var(--radius-sm);
}

/* Фото alphaprint зібране бекендом: чохол по центру квадратного полотна, з боків ~27%
   порожнього білого, згори/знизу ~5%. Через ці власні поля він у картці виглядав дрібнішим
   за сусідів, тож віддаємо йому ще й поля картки — картка лишається квадратною, а чохол
   стає на ~9% більшим. Далі збільшувати можна лише обрізанням (частина шаблонів
   доходить до самого низу кадру — див. перевірку в коментарі до isAlphaprint). */
.p-card__img-link--fill {
	padding: 0;
}

/* Тут фото займає всю плитку, тож його кути — це кути картки, і ріже їх сама картка
   (overflow + --radius). Власне скруглення дало б темні зазубрини по кутах. */
.p-card__img-link--fill img {
	border-radius: 0;
}

.p-card__quick-actions {
	position: absolute;
	top: 10px;
	right: 10px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	opacity: 0;
	transform: translateX(6px);
	transition: opacity 0.18s, transform 0.18s;
}

.p-card:hover .p-card__quick-actions {
	opacity: 1;
	transform: translateX(0);
}

.icon-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	background: rgba(var(--on-photo-rgb), 0.85);
	color: var(--on-overlay);
	border-radius: calc(var(--radius-sm) + 2px);
	backdrop-filter: blur(4px);
	transition: all 0.15s;
}

.icon-btn:hover,
.icon-btn.is-active {
	background: var(--accent);
	color: var(--on-accent);
}

.p-card__rating {
	display: flex;
	align-items: center;
	gap: 5px;
	margin-top: 6px;
	font-size: 12px;
}

.p-card__attrs {
	display: flex;
	align-items: center;
	/* 16px крапка + 8px проміжок = крок 24px між центрами: зони дотику сусідніх
	   кольорів стикаються, але не перекриваються (WCAG 2.5.8) */
	gap: 8px;
	margin-top: 8px;
	min-height: 16px;
}

.p-card__attr {
	position: relative;
	flex: none;
	width: 16px;
	height: 16px;
	border-radius: var(--radius-pill);
	border: 1.5px solid var(--border-light);
	background-color: var(--img-bg);
	background-size: cover;
	background-position: center;
	transition: transform 0.12s, border-color 0.12s, opacity 0.12s;
}

/* Зона дотику 24×24 — пальцю, не змінюючи розмір самої крапки */
.p-card__attr::before {
	content: '';
	position: absolute;
	inset: -4px;
}

.p-card__attr:hover {
	transform: scale(1.25);
	border-color: var(--accent);
}

.p-card__attr.is-out {
	opacity: 0.4;
	filter: grayscale(0.85);
}

.p-card__attr-more {
	font-size: 11px;
	color: var(--text-muted);
}
</style>
