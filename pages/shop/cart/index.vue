<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('cart.checkoutTitle') }]" />

		<h1>{{ t('cart.checkoutTitle') }}</h1>

		<!-- Вміст кошика живе лише в localStorage, тож на SSR він завжди порожній.
		     Без ClientOnly Vue гідратує гілку «є товари» поверх серверної гілки «кошик порожній»:
		     обидві гілки — div, тому вузол не підміняється і на ньому лишається клас .cart-empty
		     (column + align-items: center) → форма стискається й лягає поверх товарів. -->
		<ClientOnly>
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
						<div v-if="codFee" class="cart-summary__row">
							<span>{{ t('cart.nalogka') }}</span>
							<b>{{ formatPrice(codFee) }}</b>
						</div>
						<div class="cart-summary__row cart-summary__row--total">
							<span>{{ t('cart.total') }}</span>
							<b>≈ {{ formatPrice(grandTotal) }}</b>
						</div>
						<p class="cart-summary__note">{{ t('cart.deliveryNote') }}</p>
					</div>
				</div>

				<!-- Форма замовлення. Порядок кроків: хто → куди → чим платить → підтвердження.
				     Поля доставки залежать від перевізника, тож показуємо їх лише після його вибору. -->
				<form class="card checkout-card" novalidate @submit.prevent="sendOrder">
					<div class="card-body">
						<!-- 1. Контакти -->
						<h2 class="checkout-step">{{ t('cart.contacts') }}</h2>

						<div class="form-group">
							<label for="co-phone">{{ t('cart.phone') }} <b class="required-star">*</b></label>
							<div class="phone-field">
								<span class="phone-field__code">+38</span>
								<input
									id="co-phone"
									v-model="order.phone"
									class="form-control"
									:class="fieldClass('phone', isValidPhone(order.phone))"
									type="tel"
									inputmode="tel"
									name="phone"
									autocomplete="tel-national"
									placeholder="099-999-99-99"
									maxlength="13"
									@input="onPhoneInput"
									@blur="touch('phone')"
								/>
							</div>
							<p v-if="errors.phone" class="field-error">{{ errors.phone }}</p>
						</div>

						<div class="form-group">
							<label for="co-fio">{{ t('cart.fio') }} <b class="required-star">*</b></label>
							<input
								id="co-fio"
								v-model="order.fio"
								class="form-control"
								:class="fieldClass('fio', fioValid)"
								type="text"
								name="name"
								autocomplete="name"
								placeholder="Іванов Іван Іванович"
								@blur="touch('fio')"
							/>
							<p v-if="errors.fio" class="field-error">{{ errors.fio }}</p>
						</div>

						<!-- 2. Доставка. Перевізник не вибраний наперед — поля з'являються після вибору,
						     тож стартова форма коротка. Усе тут не обов'язкове: замовлення можна
						     оформити лише з контактами, адресу узгодить менеджер. -->
						<h2 class="checkout-step">{{ t('cart.deliveryTitle') }}</h2>
						<p class="checkout-step__note">{{ t('cart.deliveryOptional') }}</p>

						<div class="form-group">
							<div class="radio-group radio-group--row">
								<label
									v-for="method in deliveries"
									:key="method.key"
									class="radio"
									:class="{ 'is-active': order.delivery === method.key }"
								>
									<input v-model="order.delivery" type="radio" name="delivery" :value="method.key" />
									<span class="radio__dot" />
									{{ t('cart.' + method.title) }}
								</label>
							</div>
						</div>

						<!-- Нова Пошта: місто з довідника → відділення цього міста -->
						<template v-if="isNovaPochta">
							<AutocompleteField
								id="co-city"
								v-model="cityQuery"
								class="checkout-reveal"
								:options="cityOptions"
								:label="t('cart.city')"
								:placeholder="t('cart.cityPlaceholder')"
								:hint="selectedCity ? '' : t('cart.cityHint')"
								:loading="isSearchingCities"
								:show-empty="citySearched"
								:selected="!!selectedCity"
								@search="searchCities"
								@select="selectCity"
							/>

							<!-- Відділення має сенс лише в контексті міста — до вибору міста поля немає -->
							<AutocompleteField
								v-if="selectedCity"
								id="co-warehouse"
								v-model="warehouseQuery"
								class="checkout-reveal"
								:options="warehouseOptions"
								:label="t('cart.warehouseNovaPochta')"
								:placeholder="t('cart.warehousePlaceholder')"
								:loading="isLoadingWarehouses"
								:show-empty="!!warehouseQuery"
								:selected="!!selectedWarehouse"
								@search="onWarehouseSearch"
								@select="selectWarehouse"
							/>
						</template>

						<!-- Укрпошта: індекс — єдине, що вводить користувач. Місто й адресу відділення
						     підтягуємо з класифікатора адрес Укрпошти; вручну — лише як запасний шлях. -->
						<template v-else-if="order.delivery === 'ukrpochta'">
							<div class="form-group checkout-reveal">
								<label for="co-zip">{{ t('cart.zipcode') }}</label>
								<input
									id="co-zip"
									v-model="order.zipcode"
									class="form-control"
									:class="{ 'is-ok': !!selectedOffice }"
									type="text"
									inputmode="numeric"
									maxlength="5"
									name="postal-code"
									autocomplete="postal-code"
									placeholder="01001"
									@input="onZipInput"
								/>
								<p v-if="zipHint" class="field-hint">
									<span v-if="isLoadingOffices" class="spinner" />
									{{ zipHint }}
								</p>
								<button v-if="!showUkrAddress" type="button" class="link-btn" @click="manualUkrAddress = true">
									{{ t('cart.enterManually') }}
								</button>
							</div>

							<!-- Один індекс іноді має кілька відділень — тоді потрібен вибір -->
							<div v-if="officeOptions.length > 1" class="form-group checkout-reveal">
								<label for="co-office">{{ t('cart.officeSelect') }}</label>
								<select id="co-office" class="form-control" @change="onOfficeChange">
									<option value="">{{ t('cart.officeSelect') }}</option>
									<option v-for="(office, i) in officeOptions" :key="office.label" :value="i">
										{{ office.label }}
									</option>
								</select>
							</div>

							<template v-if="showUkrAddress">
								<div class="form-group checkout-reveal">
									<label for="co-city-manual">{{ t('cart.city') }}</label>
									<input
										id="co-city-manual"
										v-model="cityQuery"
										class="form-control"
										type="text"
										name="city"
										autocomplete="address-level2"
										:placeholder="t('cart.cityUkrPlaceholder')"
									/>
								</div>

								<div class="form-group checkout-reveal">
									<label for="co-address">{{ selectedOffice ? t('cart.officeAddress') : t('cart.address') }}</label>
									<input
										id="co-address"
										v-model="order.address"
										class="form-control"
										type="text"
										name="address"
										autocomplete="street-address"
										:placeholder="t('cart.addressPlaceholder')"
									/>
								</div>
							</template>
						</template>

						<!-- 3. Оплата — коли в доставки з'явилася точка призначення (див. hasDestination).
						     Описи показуємо для всіх варіантів одразу, щоб їх можна було порівняти. -->
						<template v-if="paymentShown">
							<h2 class="checkout-step checkout-reveal">{{ t('cart.paymentTitle') }}</h2>

							<div class="form-group checkout-reveal">
								<div class="radio-group">
									<label
										v-for="payment in payments"
										:key="payment.key"
										class="radio radio--col"
										:class="{ 'is-active': order.payment === payment.key }"
									>
										<span class="radio__head">
											<input v-model="order.payment" type="radio" name="payment" :value="payment.key" />
											<span class="radio__dot" />
											{{ t('cart.' + payment.title) }}
										</span>
										<span class="radio__desc">{{ t('cart.' + payment.description) }}</span>
									</label>
								</div>
							</div>
						</template>

						<!-- 4. Коментар — за замовчуванням прихований, щоб не подовжувати форму -->
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
							<textarea
								v-model="order.comments"
								class="form-control"
								rows="3"
								:placeholder="t('cart.commentPlaceholder')"
							/>
						</div>

						<!-- 5. Підтвердження: сума поруч із кнопкою, а не лише вгорі сторінки -->
						<div class="checkout-total">
							<span>{{ t('cart.toPay') }}</span>
							<b>≈ {{ formatPrice(grandTotal) }}</b>
						</div>

						<button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="sending">
							<span v-if="sending" class="spinner" />
							{{ sending ? t('cart.sendingOrder') : t('cart.placeOrder') }}
						</button>
					</div>
				</form>
			</div>

			<!-- До монтування показуємо каркас у тій самій сітці — без стрибка розмітки -->
			<template #fallback>
				<div class="cart-layout">
					<div class="cart-items">
						<div class="skeleton cart-skeleton cart-skeleton--item" />
						<div class="skeleton cart-skeleton cart-skeleton--summary" />
					</div>
					<div class="skeleton cart-skeleton cart-skeleton--form" />
				</div>
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const url = useUrl()
const router = useRouter()
const cart = useCart()
const shopApi = useShopApi()
const novaPochta = useNovaPochta()
const ukrPoshta = useUkrPoshta()
const { maskPhone, isValidPhone } = usePhone()
const { notify } = useNotify()

definePageMeta({ name: 'shop-cart' })

usePageSeo({ title: () => t('cart.checkoutTitle'), noindex: true })

// ---------- Форма ----------
// delivery порожній навмисно: перевізник не вибраний наперед, поля доставки з'являються після вибору
const order = reactive<Record<string, any>>({
	phone: '',
	fio: '',
	delivery: '',
	payment: 'nal_plateg',
	address: '',
	zipcode: '',
	comments: '',
})

const deliveries = [
	{ key: 'n_pochta', title: 'titleNovaPochta' },
	{ key: 'ukrpochta', title: 'titleUkrPochta' },
]

const payments = [
	{ key: 'nal_plateg', title: 'titleNalogka', description: 'descriptionNalogka' },
	{ key: 'predoplata', title: 'titlePredoplata', description: 'descriptionPredoplata' },
	{ key: 'online_payment', title: 'titleOnlinePayment', description: 'descriptionOnlinePayment' },
]

const isComment = ref(false)
const sending = ref(false)

const isNovaPochta = computed(() => order.delivery === 'n_pochta')

// Підсумок залежить від способу оплати: комісія накладеного платежу є лише при оплаті при отриманні
const codFee = computed(() => cart.codFee(order.payment))
const grandTotal = computed(() => cart.grandTotalFor(order.payment))

// ---------- Нова Пошта ----------
const cityQuery = ref('')
const cityOptions = ref<NPOption[]>([])
const selectedCity = ref<NPOption | null>(null)
const isSearchingCities = ref(false)
const citySearched = ref(false)

const warehouseQuery = ref('')
const warehouses = ref<NPOption[]>([])
const selectedWarehouse = ref<NPOption | null>(null)
const isLoadingWarehouses = ref(false)

let cityTimer: ReturnType<typeof setTimeout> | null = null

function searchCities(query: string) {
	selectedCity.value = null
	resetWarehouse()
	if (cityTimer) clearTimeout(cityTimer)

	if (query.trim().length < 2) {
		cityOptions.value = []
		citySearched.value = false
		isSearchingCities.value = false
		return
	}

	isSearchingCities.value = true
	cityTimer = setTimeout(async () => {
		cityOptions.value = await novaPochta.getCities(query.trim())
		isSearchingCities.value = false
		citySearched.value = true
	}, 350)
}

async function selectCity(opt: NPOption) {
	selectedCity.value = opt
	citySearched.value = false
	resetWarehouse()

	isLoadingWarehouses.value = true
	warehouses.value = await novaPochta.getWarehouses(opt.code)
	isLoadingWarehouses.value = false
}

function resetWarehouse() {
	selectedWarehouse.value = null
	warehouseQuery.value = ''
	warehouses.value = []
}

// Відділень у великому місті сотні — показуємо перші 60, решту користувач звужує пошуком
const warehouseOptions = computed(() => {
	const q = warehouseQuery.value.trim().toLowerCase()
	const list = selectedWarehouse.value || !q
		? warehouses.value
		: warehouses.value.filter((w) => w.label.toLowerCase().includes(q))
	return list.slice(0, 60)
})

function onWarehouseSearch() {
	selectedWarehouse.value = null
}

function selectWarehouse(opt: NPOption) {
	selectedWarehouse.value = opt
}

// Довідник НП діє лише для Нової Пошти. Якщо перемкнулися на Укрпошту, місто далі
// редагується вручну — інакше в замовлення потрапило б старе обране місто, а не введене.
watch(isNovaPochta, (viaNovaPochta: boolean) => {
	if (viaNovaPochta) return
	selectedCity.value = null
	cityOptions.value = []
	citySearched.value = false
	resetWarehouse()
})

// ---------- Укрпошта: адреса за поштовим індексом ----------
const officeOptions = ref<UPOffice[]>([])
const selectedOffice = ref<UPOffice | null>(null)
const isLoadingOffices = ref(false)
const officeSearched = ref(false)
const manualUkrAddress = ref(false)

let zipTimer: ReturnType<typeof setTimeout> | null = null

// Місто й адресу показуємо, коли є що показати: знайдене відділення, вже заповнена
// адреса, невдалий пошук або явний вибір «ввести вручну».
// Заповнену адресу тримаємо на екрані навіть після правки індексу — інакше поля
// зникали б з-під користувача разом із введеним текстом.
const showUkrAddress = computed(
	() =>
		manualUkrAddress.value ||
		!!selectedOffice.value ||
		!!order.address ||
		(officeSearched.value && !officeOptions.value.length)
)

const zipHint = computed(() => {
	if (isLoadingOffices.value) return t('category.loading')
	if (officeSearched.value && !officeOptions.value.length) return t('cart.zipNotFound')

	const office = selectedOffice.value
	// Знайшли кілька відділень — далі говорить список вибору, підказка зайва
	if (!office) return officeSearched.value ? '' : t('cart.zipHint')

	// Для міст обласного значення (Київ) область і район дублюють назву міста — не повторюємось
	return [
		office.region && office.region !== office.city ? `${office.region} ${t('cart.regionShort')}` : '',
		office.district && office.district !== office.city && office.district !== office.region
			? `${office.district} ${t('cart.districtShort')}`
			: '',
	]
		.filter(Boolean)
		.join(', ')
})

function onZipInput() {
	order.zipcode = order.zipcode.replace(/\D/g, '').slice(0, 5)
	if (zipTimer) clearTimeout(zipTimer)

	selectedOffice.value = null
	officeOptions.value = []
	officeSearched.value = false

	if (order.zipcode.length < 5) return
	zipTimer = setTimeout(lookupOffices, 400)
}

async function lookupOffices() {
	const index = order.zipcode
	isLoadingOffices.value = true

	const offices = await ukrPoshta.getOfficesByIndex(index)
	isLoadingOffices.value = false

	// Поки чекали відповідь, індекс могли змінити — застарілий результат ігноруємо
	if (order.zipcode !== index) return

	officeOptions.value = offices
	officeSearched.value = true

	// Один варіант підставляємо самі, кілька — лишаємо вибір користувачу
	if (offices.length === 1) applyOffice(offices[0])
}

function onOfficeChange(e: Event) {
	const index = Number((e.target as HTMLSelectElement).value)
	const office = officeOptions.value[index]
	if (office) applyOffice(office)
}

// ---------- Момент появи блоку оплати ----------
// Чекаємо не «заповнену доставку» (це розмите поняття), а конкретну точку призначення:
// відділення НП, розпізнане відділення Укрпошти або введену вручну адресу.
const hasDestination = computed(() =>
	isNovaPochta.value ? !!selectedWarehouse.value : !!selectedOffice.value || !!order.address.trim()
)

// Показавши блок один раз, більше не ховаємо: інакше правка міста прибирала б
// з екрана вже зроблений вибір оплати.
const paymentShown = ref(false)
watch(hasDestination, (has: boolean) => {
	if (has) paymentShown.value = true
})

function applyOffice(office: UPOffice) {
	selectedOffice.value = office
	cityQuery.value = office.city
	order.address = office.address
	// Індекс відділення може відрізнятися від введеного — показуємо фактичний.
	// Присвоєння не викликає @input, тож повторного пошуку не буде.
	order.zipcode = office.postcode
}

// ---------- Валідація ----------
// Обов'язкові лише контакти — решту менеджер уточнить при підтвердженні.
// Помилку показуємо після виходу з поля або після спроби відправити,
// а не з першого введеного символу, щоб форма не «червоніла» під час набору.
const touched = reactive<Record<string, boolean>>({})
const submitted = ref(false)

const touch = (field: string) => (touched[field] = true)
const isShown = (field: string) => touched[field] || submitted.value

const fioValid = computed(() => order.fio.trim().length >= 3)

const errors = computed(() => ({
	phone: !isShown('phone') || isValidPhone(order.phone)
		? ''
		: order.phone
			? t('cart.phoneNoCorrect')
			: t('cart.phoneNot'),
	fio: !isShown('fio') || fioValid.value ? '' : order.fio ? t('cart.fioNoCorrect') : t('cart.fioNot'),
}))

// Порядок збігається з порядком полів у формі — до першої помилки і прокручуємо
const fields = computed(() => [
	{ id: 'co-phone', key: 'phone', valid: isValidPhone(order.phone) },
	{ id: 'co-fio', key: 'fio', valid: fioValid.value },
])

function fieldClass(field: string, valid: boolean) {
	if (!isShown(field)) return ''
	return valid ? 'is-ok' : 'is-error'
}

function onPhoneInput() {
	order.phone = maskPhone(order.phone)
}

// ---------- Збереження контактів ----------
// Щоб перезавантаження сторінки або повернення до кошика не змушувало вводити все заново.
const CHECKOUT_KEY = 'floy_checkout'

onMounted(() => {
	try {
		const saved = JSON.parse(localStorage.getItem(CHECKOUT_KEY) || 'null')
		if (!saved) return

		Object.assign(order, {
			phone: saved.phone || '',
			fio: saved.fio || '',
			delivery: saved.delivery || '',
			payment: saved.payment || 'nal_plateg',
			address: saved.address || '',
			zipcode: saved.zipcode || '',
		})
		cityQuery.value = saved.city || ''

		if (saved.cityRef && isNovaPochta.value) {
			restoreCity({ code: saved.cityRef, label: saved.city }, saved.warehouseRef)
		}

		// Для Укрпошти адресу вже маємо — показуємо поля одразу, без повторного пошуку за індексом
		if (order.delivery === 'ukrpochta' && (order.address || cityQuery.value)) {
			manualUkrAddress.value = true
		}
	} catch {
		/* пошкоджені дані — просто починаємо з порожньої форми */
	}
})

// Місто беремо зі збереженого ref (без запиту), відділення перезавантажуємо —
// так список актуальний, а не збережений копією зі старої сесії.
async function restoreCity(city: NPOption, warehouseRef?: string) {
	selectedCity.value = city
	isLoadingWarehouses.value = true
	warehouses.value = await novaPochta.getWarehouses(city.code)
	isLoadingWarehouses.value = false

	const found = warehouseRef ? warehouses.value.find((w) => w.code === warehouseRef) : null
	if (found) {
		selectedWarehouse.value = found
		warehouseQuery.value = found.label
	}
}

watch(
	[order, cityQuery, selectedCity, selectedWarehouse],
	() => {
		if (!import.meta.client) return
		const data = {
			phone: order.phone,
			fio: order.fio,
			delivery: order.delivery,
			payment: order.payment,
			address: order.address,
			zipcode: order.zipcode,
			city: cityQuery.value,
			cityRef: selectedCity.value?.code || '',
			warehouseRef: selectedWarehouse.value?.code || '',
		}
		try {
			localStorage.setItem(CHECKOUT_KEY, JSON.stringify(data))
		} catch {
			/* приватний режим / переповнене сховище — не критично */
		}
	},
	{ deep: true }
)

// ---------- Відправлення ----------
async function sendOrder() {
	// Enter у полі теж сабмітить форму — захищаємось від повторного відправлення
	if (sending.value) return
	submitted.value = true

	const invalid = fields.value.find((f) => !f.valid)
	if (invalid) {
		notify('error', errors.value[invalid.key as keyof typeof errors.value])
		const el = document.getElementById(invalid.id)
		el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
		el?.focus({ preventScroll: true })
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

/* Каркас до монтування клієнта (візуал — глобальний .skeleton у main.css) */
.cart-skeleton {
	border-radius: var(--radius);
}

.cart-skeleton--item {
	height: 112px;
}

.cart-skeleton--summary {
	height: 180px;
	margin-top: 8px;
}

.cart-skeleton--form {
	height: 620px;
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

.cart-summary__note {
	margin-top: 10px;
	padding-top: 10px;
	border-top: 1px solid var(--border);
	font-size: 12px;
	line-height: 1.4;
	color: var(--text-muted);
}

/* Заголовок кроку форми — ділить довгу форму на «хто / куди / чим платить» */
.checkout-step {
	margin: 22px 0 12px;
	font-size: 15px;
	font-weight: 700;
	color: var(--text);
}

.checkout-step:first-child {
	margin-top: 0;
}

/* Підказка під індексом: спінер стоїть у рядку з текстом */
.field-hint .spinner {
	width: 11px;
	height: 11px;
	margin-right: 5px;
	vertical-align: -1px;
}

.checkout-step__note {
	margin: -6px 0 12px;
	font-size: 12.5px;
	line-height: 1.4;
	color: var(--text-muted);
}

/* Блоки, що з'являються після вибору перевізника — коротка поява,
   щоб було видно, що форма доповнилась, а не «смикнулась» */
.checkout-reveal {
	animation: checkout-reveal 0.22s ease;
}

@keyframes checkout-reveal {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.checkout-reveal {
		animation: none;
	}
}

/* Незмінний код країни перед полем — користувач одразу бачить очікуваний формат */
.phone-field {
	position: relative;
}

.phone-field__code {
	position: absolute;
	top: 50%;
	left: 14px;
	transform: translateY(-50%);
	font-size: 14px;
	color: var(--text-muted);
	pointer-events: none;
}

.phone-field .form-control {
	padding-left: 48px;
}

/* Підсумок над кнопкою — сума поруч із дією, а не лише вгорі сторінки */
.checkout-total {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
	margin: 20px 0 12px;
	padding-top: 14px;
	border-top: 1px solid var(--border);
	font-size: 15px;
	color: var(--text-soft);
}

.checkout-total b {
	font-size: 22px;
	font-weight: 800;
	color: var(--accent);
	white-space: nowrap;
}

/* Радіо */
.radio-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

/* Два варіанти доставки в рядок — коротша форма, менше скролу */
.radio-group--row {
	flex-direction: row;
}

.radio-group--row .radio {
	flex: 1;
	justify-content: center;
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

@media (max-width: 420px) {
	/* На вузькому екрані назви перевізників у рядок не вміщаються */
	.radio-group--row {
		flex-direction: column;
	}

	.radio-group--row .radio {
		justify-content: flex-start;
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
