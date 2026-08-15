<template>
	<Teleport to="body">
		<Transition name="cart-drawer">
			<div v-if="open" class="cart-drawer" role="dialog" aria-modal="true" :aria-label="t('cart.cart')">
				<div class="cart-drawer__backdrop" @click="close" />

				<aside class="cart-drawer__panel">
					<!-- Шапка -->
					<header class="cart-drawer__head">
						<AppIcon :name="justAdded ? 'check' : 'cart'" :size="20" class="cart-drawer__head-icon"
							:class="{ 'cart-drawer__head-icon--neutral': !justAdded }" />
						<div class="cart-drawer__head-text">
							<strong>{{ justAdded ? t('cart.added') : t('cart.cart') }}</strong>
							<span v-if="cart.quantity.value" class="text-muted">
								{{ t('cart.inCart') }}: {{ cart.quantity.value }}
							</span>
						</div>
						<button class="cart-drawer__close" :aria-label="t('other.close')" @click="close">
							<AppIcon name="close" :size="20" />
						</button>
					</header>

					<!-- Порожній кошик -->
					<div v-if="!items.length" class="cart-drawer__empty">
						<AppIcon name="cart" :size="52" :stroke-width="1.2" />
						<p>{{ t('cart.cartEmpty') }}</p>
						<button class="btn btn-primary" @click="close">{{ t('cart.continueShopping') }}</button>
					</div>

					<template v-else>
						<!-- Список товарів -->
						<div class="cart-drawer__body">
							<div v-for="item in items" :key="item.id" class="cart-drawer__item">
								<NuxtLink :to="url.product(item.product)" class="cart-drawer__item-img" @click="close">
									<img :src="itemImage(item)" :alt="item.product.title" width="64" height="64"
										loading="lazy" />
								</NuxtLink>

								<div class="cart-drawer__item-main">
									<NuxtLink :to="url.product(item.product)" class="cart-drawer__item-title" @click="close">
										{{ item.product.title }}
									</NuxtLink>
									<div v-if="item.product.attrib_title" class="cart-drawer__item-attr">
										{{ item.product.attrib_title }}
									</div>

									<div class="cart-drawer__item-row">
										<div class="qty-stepper">
											<button :aria-label="t('cart.qtyMinus')"
												@click="cart.updateQuantity(item.id, item.quantity - 1)">−</button>
											<span>{{ item.quantity }}</span>
											<button :aria-label="t('cart.qtyPlus')"
												@click="cart.updateQuantity(item.id, item.quantity + 1)">+</button>
										</div>
										<span class="cart-drawer__item-total">{{ formatPrice(item.total) }}</span>
									</div>
								</div>

								<button class="cart-drawer__item-remove" :title="t('cart.delete')"
									@click="cart.remove(item.id)">
									<AppIcon name="close" :size="15" />
								</button>
							</div>
						</div>

						<!-- Підсумок + дії -->
						<footer class="cart-drawer__foot">
							<div class="cart-drawer__sum">
								<span>{{ t('cart.subtotal') }}</span>
								<b>{{ formatPrice(cart.subtotal.value) }}</b>
							</div>
							<div v-if="cart.state.value.discount" class="cart-drawer__sum cart-drawer__sum--discount">
								<span>{{ t('cart.discount') }}</span>
								<b>−{{ formatPrice(cart.state.value.discount) }}</b>
							</div>
							<div class="cart-drawer__sum">
								<span>{{ t('cart.shipping') }}</span>
								<b>{{ t('cart.from') }} {{ formatPrice(cart.shipping.value.delivery) }}</b>
							</div>
							<div class="cart-drawer__sum">
								<span>{{ t('cart.nalogka') }}</span>
								<b>{{ formatPrice(cart.shipping.value.nalogka) }}</b>
							</div>
							<div class="cart-drawer__sum cart-drawer__sum--total">
								<span>{{ t('cart.total') }}</span>
								<b>≈ {{ formatPrice(cart.grandTotal.value) }}</b>
							</div>

							<NuxtLink :to="localePath('/shop/cart')" class="btn btn-primary btn-lg btn-block" @click="close">
								{{ t('cart.checkout') }}
							</NuxtLink>
							<button class="btn btn-outline btn-block" @click="close">
								{{ t('cart.continueShopping') }}
							</button>
						</footer>
					</template>
				</aside>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const url = useUrl()
const cart = useCart()
const { open, justAdded, closeCart } = useCartDrawer()
const route = useRoute()

const items = computed(() => cart.state.value.items)

const close = () => closeCart()

// Картинка товару: для конструктора — готове прев'ю, інакше — мініатюра зі сховища
const itemImage = (item: CartItem) =>
	item.printcase ? item.product.image || '/images/no-photo.svg' : url.productThumb(item.product.image)

// Блокуємо скрол сторінки під час відкритого слайдера
watch(open, (v) => {
	if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})

// Закриваємо при зміні роута (перехід у кошик / на товар)
watch(() => route.fullPath, close)

// Закриття по Escape
function onKey(e: KeyboardEvent) {
	if (e.key === 'Escape') close()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
	window.removeEventListener('keydown', onKey)
	if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.cart-drawer {
	position: fixed;
	inset: 0;
	z-index: 1100;
}

.cart-drawer__backdrop {
	position: absolute;
	inset: 0;
	background: var(--overlay);
	backdrop-filter: blur(2px);
}

.cart-drawer__panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: min(420px, 92vw);
	display: flex;
	flex-direction: column;
	background: var(--bg-card);
	border-left: 1px solid var(--border-light);
	box-shadow: var(--shadow-pop);
}

/* Шапка */
.cart-drawer__head {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 16px 18px;
	border-bottom: 1px solid var(--border);
}

.cart-drawer__head-icon {
	color: var(--success);
	flex-shrink: 0;
}

/* Перегляд із шапки (не «додано») — нейтральний акцентний колір */
.cart-drawer__head-icon--neutral {
	color: var(--accent);
}

.cart-drawer__head-text {
	display: flex;
	flex-direction: column;
	gap: 1px;
	margin-right: auto;
	min-width: 0;
}

.cart-drawer__head-text strong {
	font-size: 15px;
	font-weight: 700;
}

.cart-drawer__head-text span {
	font-size: 12.5px;
}

.cart-drawer__close {
	display: flex;
	padding: 8px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
	transition: background 0.14s, color 0.14s;
}

.cart-drawer__close:hover {
	background: var(--bg-elevated);
	color: var(--text);
}

/* Порожній стан */
.cart-drawer__empty {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 40px 20px;
	color: var(--text-muted);
}

/* Список товарів */
.cart-drawer__body {
	flex: 1;
	overflow-y: auto;
	padding: 8px 18px;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

.cart-drawer__item {
	display: grid;
	grid-template-columns: 64px 1fr auto;
	gap: 12px;
	align-items: start;
	padding: 14px 0;
	border-bottom: 1px solid var(--border);
}

.cart-drawer__item-img img {
	width: 64px;
	height: 64px;
	object-fit: contain;
	background: var(--img-bg);
	border-radius: var(--radius-sm);
}

.cart-drawer__item-main {
	min-width: 0;
}

.cart-drawer__item-title {
	display: block;
	font-size: 13.5px;
	font-weight: 600;
	line-height: 1.35;
}

.cart-drawer__item-title:hover {
	color: var(--accent);
}

.cart-drawer__item-attr {
	margin-top: 3px;
	font-size: 12px;
	color: var(--text-muted);
}

.cart-drawer__item-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	margin-top: 10px;
}

.cart-drawer__item-total {
	font-weight: 800;
	font-size: 15px;
	color: var(--accent);
	white-space: nowrap;
}

.cart-drawer__item-remove {
	display: flex;
	padding: 6px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
	transition: background 0.13s, color 0.13s;
}

.cart-drawer__item-remove:hover {
	background: rgba(255, 71, 87, 0.12);
	color: var(--danger);
}

/* Підсумок + дії */
.cart-drawer__foot {
	padding: 16px 18px calc(16px + env(safe-area-inset-bottom));
	border-top: 1px solid var(--border);
	background: var(--bg-soft);
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.cart-drawer__sum {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	font-size: 14px;
	color: var(--text-soft);
}

.cart-drawer__sum b {
	color: var(--accent);
	font-weight: 700;
}

.cart-drawer__sum--discount b {
	color: var(--success);
}

.cart-drawer__sum--total {
	font-size: 16px;
	color: var(--text);
}

.cart-drawer__sum--total b {
	font-size: 20px;
	font-weight: 800;
	color: var(--accent);
}

.cart-drawer__foot .btn:first-of-type {
	margin-top: 4px;
}

/* Анімація: затемнення + виїзд панелі справа */
.cart-drawer-enter-active,
.cart-drawer-leave-active {
	transition: opacity 0.24s ease;
}

.cart-drawer-enter-active .cart-drawer__panel,
.cart-drawer-leave-active .cart-drawer__panel {
	transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.cart-drawer-enter-from,
.cart-drawer-leave-to {
	opacity: 0;
}

.cart-drawer-enter-from .cart-drawer__panel,
.cart-drawer-leave-to .cart-drawer__panel {
	transform: translateX(100%);
}
</style>
