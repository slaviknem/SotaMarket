<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('cart.cart') }]" />

		<h1>{{ t('cart.cart') }}</h1>

		<!-- Порожній кошик -->
		<div v-if="!cart.state.value.items.length" class="cart-empty">
			<AppIcon name="cart" :size="64" :stroke-width="1.2" />
			<p>{{ t('cart.cartEmpty') }}</p>
			<NuxtLink :to="localePath('/')" class="btn btn-primary">{{ t('cart.continueShopping') }}</NuxtLink>
		</div>

		<div v-else class="cart-layout">
			<!-- Товари -->
			<div class="cart-items">
				<div v-for="item in cart.state.value.items" :key="item.id" class="cart-item">
					<NuxtLink :to="url.product(item.product)" class="cart-item__img">
						<img
							:src="item.printcase ? (item.product.image || '/images/no-photo.svg') : url.productThumb(item.product.image)"
							:alt="item.product.title"
							width="84"
							height="84"
							loading="lazy"
						/>
					</NuxtLink>

					<div class="cart-item__info">
						<NuxtLink :to="url.product(item.product)" class="cart-item__title">
							{{ item.product.title }}
						</NuxtLink>
						<div v-if="item.product.attrib_title" class="cart-item__attr">
							{{ item.product.attrib_title }}
						</div>
						<div v-if="item.discount" class="cart-item__discount">
							−{{ formatPrice(item.discount) }}
						</div>
					</div>

					<div class="cart-item__unit">
						{{ formatPrice(item.total / item.quantity) }}
						<span class="cart-item__unit-x">×</span>
					</div>

					<div class="qty-stepper cart-item__qty">
						<button :aria-label="'−'" @click="cart.updateQuantity(item.id, item.quantity - 1)">−</button>
						<span>{{ item.quantity }}</span>
						<button :aria-label="'+'" @click="cart.updateQuantity(item.id, item.quantity + 1)">+</button>
					</div>

					<div class="cart-item__total">{{ formatPrice(item.total) }}</div>

					<button class="cart-item__remove" :title="t('cart.delete')" @click="cart.remove(item.id)">
						<AppIcon name="close" :size="16" />
					</button>
				</div>

				<div class="cart-summary">
					<div class="cart-summary__row">
						<span>{{ t('cart.subtotal') }}</span>
						<b>{{ formatPrice(cart.subtotal.value) }}</b>
					</div>
					<div v-if="cart.state.value.discount" class="cart-summary__row cart-summary__row--discount">
						<span>{{ t('cart.discount') }}</span>
						<b>−{{ formatPrice(cart.state.value.discount) }}</b>
					</div>
					<div class="cart-summary__row">
						<span>{{ t('cart.shipping') }}</span>
						<b>{{ t('cart.from') }} {{ formatPrice(cart.shipping.delivery) }}</b>
					</div>
					<div class="cart-summary__row">
						<span>{{ t('cart.nalogka') }}</span>
						<b>{{ formatPrice(cart.shipping.nalogka) }}</b>
					</div>
					<div class="cart-summary__row cart-summary__row--total">
						<span>{{ t('cart.total') }}</span>
						<b>≈ {{ formatPrice(cart.grandTotal.value) }}</b>
					</div>
				</div>
			</div>

			<!-- Форма замовлення -->
			<div class="card checkout-card">
				<div class="card-body">
					<h3>{{ t('cart.orderRecipient') }}</h3>

					<div class="form-group">
						<label>{{ t('cart.phone') }} <b class="required-star">*</b></label>
						<input
							v-model="order.phone"
							class="form-control"
							:class="phoneState"
							type="tel"
							placeholder="099-999-99-99"
							maxlength="13"
							@input="maskPhone"
						/>
					</div>

					<div class="form-group">
						<label>{{ t('cart.fio') }} <b class="required-star">*</b></label>
						<input
							v-model="order.fio"
							class="form-control"
							:class="fioState"
							type="text"
							placeholder="Іванов Іван Іванович"
						/>
					</div>

					<!-- Місто (пошук Нова Пошта) -->
					<div class="form-group np-select">
						<label>{{ t('cart.city') }}</label>
						<input
							v-model="cityQuery"
							class="form-control"
							type="text"
							autocomplete="off"
							@input="searchCities"
							@focus="cityOptions.length && (showCityList = true)"
						/>
						<ul v-if="showCityList && cityOptions.length" class="np-select__list">
							<li v-for="opt in cityOptions" :key="opt.code">
								<button type="button" @mousedown.prevent="selectCity(opt)">{{ opt.label }}</button>
							</li>
						</ul>
					</div>

					<!-- Спосіб доставки -->
					<div class="form-group">
						<label>{{ t('cart.shippingMethod') }}</label>
						<div class="radio-group">
							<label class="radio" :class="{ 'is-active': order.delivery === 'n_pochta' }">
								<input v-model="order.delivery" type="radio" value="n_pochta" />
								<span class="radio__dot" />
								{{ t('cart.titleNovaPochta') }}
							</label>
							<label class="radio" :class="{ 'is-active': order.delivery === 'ukrpochta' }">
								<input v-model="order.delivery" type="radio" value="ukrpochta" />
								<span class="radio__dot" />
								{{ t('cart.titleUkrPochta') }}
							</label>
						</div>
					</div>

					<!-- Відділення НП -->
					<div v-if="order.delivery === 'n_pochta'" class="form-group np-select">
						<label>{{ t('cart.warehouseNovaPochta') }}</label>
						<input
							v-model="warehouseQuery"
							class="form-control"
							type="text"
							autocomplete="off"
							:placeholder="isLoadingWarehouses ? t('category.loading') : ''"
							@focus="showWarehouseList = true"
							@input="showWarehouseList = true"
						/>
						<ul v-if="showWarehouseList && filteredWarehouses.length" class="np-select__list">
							<li v-for="opt in filteredWarehouses.slice(0, 60)" :key="opt.code">
								<button type="button" @mousedown.prevent="selectWarehouse(opt)">{{ opt.label }}</button>
							</li>
						</ul>
					</div>

					<!-- Адреса для Укрпошти -->
					<template v-if="order.delivery === 'ukrpochta'">
						<div class="form-group">
							<label>{{ t('cart.address') }}</label>
							<input v-model="order.address" class="form-control" type="text" />
						</div>
						<div class="form-group">
							<label>{{ t('cart.zipcode') }}</label>
							<input v-model="order.zipcode" class="form-control" type="text" />
						</div>
					</template>

					<!-- Оплата -->
					<div class="form-group">
						<div class="radio-group">
							<label
								v-for="payment in payments"
								:key="payment.key"
								class="radio radio--col"
								:class="{ 'is-active': order.payment === payment.key }"
							>
								<span class="radio__head">
									<input v-model="order.payment" type="radio" :value="payment.key" />
									<span class="radio__dot" />
									{{ t('cart.' + payment.title) }}
								</span>
								<span v-if="order.payment === payment.key" class="radio__desc">
									{{ t('cart.' + payment.description) }}
								</span>
							</label>
						</div>
					</div>

					<!-- Коментар -->
					<div class="form-group">
						<label class="checkbox">
							<input v-model="isComment" type="checkbox" />
							<span class="checkbox__box">
								<svg width="10" height="8" viewBox="0 0 12 9" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4.5l3.5 3.5L11 1"/></svg>
							</span>
							{{ t('cart.isComment') }}
						</label>
					</div>

					<div v-if="isComment" class="form-group">
						<textarea v-model="order.comments" class="form-control" rows="3" />
					</div>

					<button class="btn btn-primary btn-lg btn-block" :disabled="sending" @click="sendOrder">
						{{ t('cart.placeOrder') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const url = useUrl()
const router = useRouter()
const cart = useCart()
const shopApi = useShopApi()
const novaPochta = useNovaPochta()
const { notify } = useNotify()

definePageMeta({ name: 'shop-cart' })

usePageSeo({ title: () => t('cart.cart'), noindex: true })

// ---------- Форма ----------
const order = reactive<Record<string, any>>({
	phone: '',
	fio: '',
	delivery: 'n_pochta',
	payment: 'nal_plateg',
	address: '',
	zipcode: '',
	comments: '',
})

const payments = [
	{ key: 'nal_plateg', title: 'titleNalogka', description: 'descriptionNalogka' },
	{ key: 'predoplata', title: 'titlePredoplata', description: 'descriptionPredoplata' },
	{ key: 'online_payment', title: 'titleOnlinePayment', description: 'descriptionOnlinePayment' },
]

const isComment = ref(false)
const sending = ref(false)

const phoneTouched = ref(false)
const fioTouched = ref(false)

const phoneValid = computed(() => order.phone.length >= 13 && !order.phone.startsWith('038'))
const fioValid = computed(() => order.fio.trim().length >= 3)

const phoneState = computed(() => {
	if (!phoneTouched.value) return ''
	return phoneValid.value ? 'is-ok' : 'is-error'
})

const fioState = computed(() => {
	if (!fioTouched.value) return ''
	return fioValid.value ? 'is-ok' : 'is-error'
})

function maskPhone() {
	phoneTouched.value = true
	let digits = order.phone.replace(/\D/g, '').slice(0, 10)
	const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
	order.phone = parts.filter(Boolean).join('-')
}

watch(() => order.fio, () => (fioTouched.value = true))

// ---------- Нова Пошта ----------
const cityQuery = ref('')
const cityOptions = ref<NPOption[]>([])
const showCityList = ref(false)
const selectedCity = ref<NPOption | null>(null)

const warehouseQuery = ref('')
const warehouses = ref<NPOption[]>([])
const showWarehouseList = ref(false)
const selectedWarehouse = ref<NPOption | null>(null)
const isLoadingWarehouses = ref(false)

let cityTimer: ReturnType<typeof setTimeout> | null = null

function searchCities() {
	selectedCity.value = null
	if (cityTimer) clearTimeout(cityTimer)
	if (cityQuery.value.trim().length < 2) {
		cityOptions.value = []
		showCityList.value = false
		return
	}
	cityTimer = setTimeout(async () => {
		cityOptions.value = await novaPochta.getCities(cityQuery.value.trim())
		showCityList.value = true
	}, 350)
}

async function selectCity(opt: NPOption) {
	selectedCity.value = opt
	cityQuery.value = opt.label
	showCityList.value = false

	// Завантажуємо відділення
	selectedWarehouse.value = null
	warehouseQuery.value = ''
	isLoadingWarehouses.value = true
	warehouses.value = await novaPochta.getWarehouses(opt.code)
	isLoadingWarehouses.value = false
}

const filteredWarehouses = computed(() => {
	if (selectedWarehouse.value) return warehouses.value
	const q = warehouseQuery.value.toLowerCase()
	if (!q) return warehouses.value
	return warehouses.value.filter((w) => w.label.toLowerCase().includes(q))
})

function selectWarehouse(opt: NPOption) {
	selectedWarehouse.value = opt
	warehouseQuery.value = opt.label
	showWarehouseList.value = false
}

// ---------- Відправлення ----------
async function sendOrder() {
	phoneTouched.value = true
	fioTouched.value = true

	if (!order.phone) {
		notify('error', t('cart.phoneNot'))
		return
	}
	if (!phoneValid.value) {
		notify('error', t('cart.phoneNoCorrect'))
		return
	}
	if (!order.fio) {
		notify('error', t('cart.fioNot'))
		return
	}
	if (!fioValid.value) {
		notify('error', t('cart.fioNoCorrect'))
		return
	}

	const orderData: Record<string, any> = {
		...order,
		city: selectedCity.value?.label || cityQuery.value,
		city_ref: selectedCity.value?.code || '',
		warehouse: selectedWarehouse.value?.label || '',
		warehouse_ref: selectedWarehouse.value?.code || '',
		suma_order: cart.subtotal.value,
		discount: cart.state.value.discount,
		order_items: cart.state.value.items.map((item) => ({
			product_id: item.product.id,
			title: item.product.title,
			attribute_id: item.attribute,
			count: item.quantity,
			price: item.product.price,
			discount: item.discount,
			printcase: item.printcase,
			image_file: item.product.image,
			category_id: item.category_id,
		})),
	}

	if (orderData.discount) orderData.type = 'discount'
	if (!isComment.value) delete orderData.comments

	sending.value = true
	try {
		const newOrder = await shopApi.sendOrder(orderData)
		cart.removeAll()
		router.push({ path: localePath('/shop/cart/success'), query: newOrder || {} })
	} catch {
		notify('error', 'Error')
	}
	sending.value = false
}
</script>

<style scoped>
.cart-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	padding: 60px 20px 80px;
	color: var(--text-muted);
}

.cart-layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 460px;
	gap: 22px;
	align-items: start;
	padding-bottom: 36px;
}

/* Sticky-колонки: коротша лишається на місці, довша прокручується.
   Мало товарів → стоїть лівий блок; багато → стоїть права форма (CSS перемикає сам). */
.cart-items {
	display: flex;
	flex-direction: column;
	gap: 10px;
	position: sticky;
	top: calc(var(--header-h) + 16px);
}

.checkout-card {
	position: sticky;
	top: calc(var(--header-h) + 16px);
}

.cart-item {
	display: grid;
	grid-template-columns: 84px minmax(0, 1fr) auto auto auto auto;
	align-items: center;
	gap: 18px;
	padding: 14px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.cart-item__img img {
	width: 84px;
	height: 84px;
	object-fit: contain;
	background: var(--img-bg);
	border-radius: var(--radius-sm);
}

.cart-item__title {
	font-weight: 600;
	font-size: 14px;
	line-height: 1.4;
}

.cart-item__title:hover {
	color: var(--accent);
}

.cart-item__attr {
	margin-top: 3px;
	font-size: 12.5px;
	color: var(--text-muted);
}

.cart-item__discount {
	margin-top: 3px;
	font-size: 12.5px;
	color: var(--success);
}

/* Ціна за одиницю: «279 грн ×» перед степером — заповнює простір осмислено */
.cart-item__unit {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 14px;
	color: var(--text-soft);
	white-space: nowrap;
}

.cart-item__unit-x {
	color: var(--text-muted);
}

/* Візуал степера — глобальний .qty-stepper у main.css */

.cart-item__total {
	font-weight: 800;
	font-size: 15.5px;
	color: var(--accent);
	white-space: nowrap;
	min-width: 84px;
	text-align: right;
}

.cart-item__remove {
	display: flex;
	padding: 8px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
	transition: all 0.13s;
}

.cart-item__remove:hover {
	background: rgba(255, 71, 87, 0.12);
	color: var(--danger);
}

.cart-summary {
	margin-top: 8px;
	padding: 18px 20px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.cart-summary__row {
	display: flex;
	justify-content: space-between;
	padding: 5px 0;
	font-size: 14px;
	color: var(--text-soft);
}

.cart-summary__row--discount b {
	color: var(--success);
}

.cart-summary__row--total {
	margin-top: 6px;
	padding-top: 12px;
	border-top: 1px solid var(--border);
	font-size: 17px;
	color: var(--text);
}

.cart-summary__row--total b {
	color: var(--accent);
	font-size: 20px;
}

.checkout-card h3 {
	font-size: 17px;
	margin-bottom: 16px;
}

/* Радіо */
.radio-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.radio {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 11px 14px;
	border: 1.5px solid var(--border-light);
	border-radius: var(--radius-sm);
	font-size: 14px;
	cursor: pointer;
	transition: border-color 0.14s;
}

.radio--col {
	flex-direction: column;
	align-items: stretch;
	gap: 6px;
}

.radio__head {
	display: flex;
	align-items: center;
	gap: 10px;
}

.radio.is-active {
	border-color: var(--accent);
}

.radio input {
	position: absolute;
	opacity: 0;
}

.radio__dot {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 2px solid var(--border-light);
	position: relative;
	flex-shrink: 0;
	transition: border-color 0.14s;
}

.radio.is-active .radio__dot {
	border-color: var(--accent);
}

.radio.is-active .radio__dot::after {
	content: '';
	position: absolute;
	inset: 3px;
	border-radius: 50%;
	background: var(--accent);
}

.radio__desc {
	font-size: 12.5px;
	color: var(--text-muted);
	padding-left: 28px;
}

/* Чекбокс */
.checkbox {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13.5px;
	color: var(--text-soft);
	cursor: pointer;
}

.checkbox input {
	position: absolute;
	opacity: 0;
}

.checkbox__box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border-radius: 5px;
	border: 1.5px solid var(--border-light);
	color: transparent;
	transition: all 0.14s;
	flex-shrink: 0;
}

.checkbox input:checked + .checkbox__box {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
}

/* Автокомпліт НП */
.np-select {
	position: relative;
}

.np-select__list {
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	z-index: 50;
	max-height: 240px;
	overflow-y: auto;
	margin: 4px 0 0;
	padding: 6px;
	list-style: none;
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	box-shadow: var(--shadow-pop);
}

.np-select__list button {
	display: block;
	width: 100%;
	text-align: left;
	padding: 8px 10px;
	font-size: 13.5px;
	color: var(--text-soft);
	border-radius: 6px;
}

.np-select__list button:hover {
	background: var(--accent-soft);
	color: var(--accent);
}

@media (max-width: 900px) {
	.cart-layout {
		grid-template-columns: 1fr;
	}

	/* В один стовпчик sticky не потрібен — блоки стоять звичайно */
	.cart-items,
	.checkout-card {
		position: static;
	}
}

@media (max-width: 640px) {
	.cart-item {
		grid-template-columns: 64px 1fr auto;
		grid-template-areas:
			'img info remove'
			'img qty total';
		gap: 8px 12px;
	}

	.cart-item__img {
		grid-area: img;
	}

	.cart-item__img img {
		width: 64px;
		height: 64px;
	}

	.cart-item__info {
		grid-area: info;
	}

	.cart-item__unit {
		display: none;
	}

	.cart-item__qty {
		grid-area: qty;
		justify-self: start;
	}

	.cart-item__total {
		grid-area: total;
		justify-self: end;
		min-width: 0;
	}

	.cart-item__remove {
		grid-area: remove;
		justify-self: end;
	}
}
</style>
