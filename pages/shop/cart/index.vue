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
						<NuxtLink :to="url.cartItem(item)" class="cart-item__img">
							<img
								:src="item.printcase ? (item.product.image || '/images/no-photo.svg') : url.productThumb(item.product.image)"
								:alt="item.product.title"
								width="84"
								height="84"
								loading="lazy"
							/>
						</NuxtLink>

						<div class="cart-item__info">
							<NuxtLink :to="url.cartItem(item)" class="cart-item__title">
								{{ item.product.title }}
							</NuxtLink>
							<div v-if="item.product.attrib_title" class="cart-item__attr">
								{{ item.product.attrib_title }}
							</div>

							<!-- Індивідуальний макет можна доробити перед оформленням -->
							<NuxtLink v-if="item.printcaseDir" :to="url.cartItem(item)" class="cart-item__edit">
								<AppIcon name="edit" :size="12" />
								{{ t('printcase.editDesign') }}
							</NuxtLink>
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
						<!-- «від» доречне лише поки перевізник не обраний: тоді це найдешевший
						     з варіантів. Після вибору сума точна — саме її виставить адмінка. -->
						<div class="cart-summary__row">
							<span>{{ t('cart.shipping') }}</span>
							<b v-if="freeShipping">{{ t('cart.freeDelivery') }}</b>
							<b v-else>
								<template v-if="!order.delivery">{{ t('cart.from') }} </template>{{ formatPrice(shipping.delivery) }}
							</b>
						</div>
						<div v-if="codFee" class="cart-summary__row">
							<span>{{ t('cart.nalogka') }}</span>
							<b>{{ formatPrice(codFee) }}</b>
						</div>
						<div class="cart-summary__row cart-summary__row--total">
							<span>{{ t('cart.total') }}</span>
							<b>≈ {{ formatPrice(grandTotal) }}</b>
						</div>
						<!-- Розбиття підсумку на «наперед» і «при отриманні». Аванс за друк клієнт має
						     побачити ДО кнопки «Оформити», а не вперше на сторінці подяки; при перед-
						     і онлайн-оплаті так само видно, що доставка лишається на пошту -->
						<template v-if="payNow">
							<div class="cart-summary__row cart-summary__row--prepay">
								<span>{{ prepay ? t('cart.prepayLabel') : t('cart.payNowFull') }}</span>
								<b>{{ formatPrice(payNow) }}</b>
							</div>
							<div class="cart-summary__row">
								<span>{{ t('cart.dueOnDelivery') }}</span>
								<b v-if="dueOnDelivery">≈ {{ formatPrice(dueOnDelivery) }}</b>
								<b v-else>{{ t('cart.dueNothing') }}</b>
							</div>
						</template>
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
									v-for="method in DELIVERY_METHODS"
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

						<!-- Нова Пошта: місто → куди саме. Відділення, поштомати й пункти видачі НП
						     віддає одним списком, тож це одне поле, а не окремі способи доставки.
						     Кур'єр — не «третій варіант», а опція поверх адреси, звідси галочка. -->
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

							<!-- Точка призначення має сенс лише в контексті міста — до його вибору полів немає -->
							<AutocompleteField
								v-if="selectedCity && !isCourier"
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

							<!-- Кур'єр — рідкісний сценарій, тож галочка стоїть після відділення (основний
							     шлях) і перед коментарем. Вибору міста НЕ чекає: інакше клієнт, який шукає
							     адресну доставку, просто не побачить, що вона є. -->
							<label class="checkbox checkout-reveal courier-toggle">
								<input v-model="courierDelivery" type="checkbox" />
								<span class="checkbox__box"><AppIcon name="check" :size="10" /></span>
								{{ t('cart.courierCheckbox') }}
								<b
									v-if="courierExtra"
									class="courier-toggle__price"
									:class="{ 'courier-toggle__price--active': courierDelivery }"
								>+{{ formatPrice(courierExtra) }}</b>
							</label>
							<p v-if="isCourier" class="field-hint courier-toggle__note">{{ t('cart.courierNote') }}</p>

							<template v-if="selectedCity && isCourier">
								<!-- Вулиці з довідника НП. Якщо потрібної немає — введений текст
								     теж приймаємо: адресу підтвердить менеджер (див. hint). -->
								<AutocompleteField
									id="co-street"
									v-model="streetQuery"
									class="checkout-reveal"
									:options="streetOptions"
									:label="t('cart.street')"
									:placeholder="t('cart.streetPlaceholder')"
									:hint="streetHint"
									:loading="isSearchingStreets"
									:show-empty="streetSearched"
									:selected="!!selectedStreet"
									@search="searchStreets"
									@select="selectStreet"
								/>

								<!-- Будинок і квартира — це одна адреса, а не два кроки: тримаємо в рядок -->
								<div class="form-group checkout-reveal house-row">
									<div>
										<label for="co-house">{{ t('cart.house') }}</label>
										<input
											id="co-house"
											v-model="house"
											class="form-control"
											:class="{ 'is-ok': !!house.trim() }"
											type="text"
											name="address-line1"
											:placeholder="t('cart.housePlaceholder')"
										/>
									</div>
									<div>
										<label for="co-flat">{{ t('cart.flat') }}</label>
										<input
											id="co-flat"
											v-model="flat"
											class="form-control"
											type="text"
											name="address-line2"
											:placeholder="t('cart.flatPlaceholder')"
										/>
									</div>
								</div>
							</template>
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
										<!-- Аванс стосується лише накладеного: при перед-/онлайн-оплаті
										     клієнт і так платить усе наперед -->
										<span v-if="payment.key === 'nal_plateg' && prepayIfCod" class="radio__note">
											{{ prepayNote }}
										</span>
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

						<!-- 5. Підтвердження: сума поруч із кнопкою, а не лише вгорі сторінки.
						     Головне число — те, що клієнт заплатить найближчим платежем (аванс,
						     онлайн-оплата чи вся сума на пошті), решта розкладки — приміткою -->
						<div class="checkout-total">
							<span>{{ payNow ? t('cart.toPayNow') : t('cart.toPayOnDelivery') }}</span>
							<b v-if="payNow">{{ formatPrice(payNow) }}</b>
							<b v-else>≈ {{ formatPrice(grandTotal) }}</b>
						</div>
						<p v-if="payNow" class="checkout-total__hint">{{ totalHint }}</p>

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
const { prices: sitePrices } = useSiteSettings()
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

const payments = [
	{ key: 'nal_plateg', title: 'titleNalogka', description: 'descriptionNalogka' },
	{ key: 'predoplata', title: 'titlePredoplata', description: 'descriptionPredoplata' },
	{ key: 'online_payment', title: 'titleOnlinePayment', description: 'descriptionOnlinePayment' },
]

const isComment = ref(false)
const sending = ref(false)

const isNovaPochta = computed(() => order.delivery === 'n_pochta')

// Кур'єр — не окремий перевізник і не третій тип точки, а опція поверх Нової Пошти
const courierDelivery = ref(false)
const isCourier = computed(() => isNovaPochta.value && courierDelivery.value)

// Підсумок залежить від перевізника (точка НП, кур'єр НП і Укрпошта мають різні тарифи)
// і від способу оплати: комісія накладеного платежу є лише при оплаті при отриманні.
// Поки перевізник не обраний — показуємо найдешевший варіант із приміткою «від».
const tariffKey = computed(() => deliveryTariffKey(order.delivery, courierDelivery.value))
// «Безкоштовно» в підсумку — лише коли доставка справді безкоштовна: кур'єра поріг не покриває
const freeShipping = computed(() => cart.isFreeFor(tariffKey.value))
const shipping = computed(() => cart.shippingFor(tariffKey.value))
const codFee = computed(() => cart.codFee(order.payment, tariffKey.value))
const grandTotal = computed(() => cart.grandTotalFor(order.payment, tariffKey.value))

// Аванс за індивідуальний друк. prepay — за обраним способом оплати (0, якщо не накладений),
// prepayIfCod — скільки це було б при накладеному: потрібен для примітки в самому радіо,
// яка має бути видимою ще ДО того, як клієнт цей варіант обере.
const prepay = computed(() => cart.prepayFor(order.payment))
const prepayIfCod = computed(() => cart.prepayFor('nal_plateg'))
const prepayPerCase = computed(() => sitePrices.value.prepay_printcase)

// На один чохол сума «за кожен» і загальна збігаються, і «50 грн за кожен — разом 50 грн»
// читається як помилка. Тому для одного — коротке формулювання без «разом»
const prepayNote = computed(() =>
	t(cart.printcaseQty.value > 1 ? 'cart.prepayNoteMany' : 'cart.prepayNote', {
		sum: formatPrice(prepayIfCod.value),
		one: formatPrice(prepayPerCase.value),
	})
)
const dueOnDelivery = computed(() => cart.dueOnDeliveryFor(order.payment, tariffKey.value))

// Сума найближчого платежу + примітка з рештою розкладки під кнопкою
const payNow = computed(() => cart.payNowFor(order.payment))
const totalHint = computed(() =>
	t(dueOnDelivery.value ? 'cart.toPayHint' : 'cart.toPayHintNothing', {
		total: formatPrice(grandTotal.value),
		due: formatPrice(dueOnDelivery.value),
	})
)

// Доплата за адресну доставку — показуємо прямо в галочці, щоб вона не спливала
// несподівано в підсумку. Понад поріг безкоштовної доставки різниці немає — тоді 0.
const courierExtra = computed(
	() => cart.shippingFor('n_pochta_kur').delivery - cart.shippingFor('n_pochta').delivery
)

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
	resetDestination()
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
	resetDestination()

	// Для кур'єра список відділень не потрібен — вулиці шукаються за запитом користувача
	if (isCourier.value) return

	isLoadingWarehouses.value = true
	warehouses.value = await novaPochta.getWarehouses(opt.code)
	isLoadingWarehouses.value = false
}

function resetWarehouse() {
	selectedWarehouse.value = null
	warehouseQuery.value = ''
	warehouses.value = []
}

// Місто змінилося — і відділення, і вулиця більше не дійсні (вони прив'язані до міста)
function resetDestination() {
	resetWarehouse()
	resetStreet()
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

// ---------- Нова Пошта: адресна доставка ----------
const streetQuery = ref('')
const streetOptions = ref<NPOption[]>([])
const selectedStreet = ref<NPOption | null>(null)
const isSearchingStreets = ref(false)
const streetSearched = ref(false)
const house = ref('')
const flat = ref('')

let streetTimer: ReturnType<typeof setTimeout> | null = null

// Вулиць у місті тисячі, тож фільтруємо не список, а сам запит до НП — від 2 літер, як і з містами
function searchStreets(query: string) {
	selectedStreet.value = null
	if (streetTimer) clearTimeout(streetTimer)

	const cityRef = selectedCity.value?.code
	if (!cityRef || query.trim().length < 2) {
		streetOptions.value = []
		streetSearched.value = false
		isSearchingStreets.value = false
		return
	}

	isSearchingStreets.value = true
	streetTimer = setTimeout(async () => {
		streetOptions.value = await novaPochta.getStreets(cityRef, query.trim())
		isSearchingStreets.value = false
		streetSearched.value = true
	}, 350)
}

function selectStreet(opt: NPOption) {
	selectedStreet.value = opt
	streetSearched.value = false
}

function resetStreet() {
	selectedStreet.value = null
	streetQuery.value = ''
	streetOptions.value = []
	streetSearched.value = false
}

// Вулиці немає в довіднику — це не тупик: беремо введений текст, адресу підтвердить менеджер
const streetHint = computed(() =>
	streetSearched.value && !streetOptions.value.length && !selectedStreet.value ? t('cart.streetNotFound') : ''
)

// Адреса одним рядком — такою її побачить менеджер і кур'єр НП, тому підписи
// українською незалежно від мови інтерфейсу (документи НП теж українською)
const courierAddress = computed(() =>
	[
		selectedStreet.value?.label || streetQuery.value.trim(),
		house.value.trim() && `буд. ${house.value.trim()}`,
		flat.value.trim() && `кв. ${flat.value.trim()}`,
	]
		.filter(Boolean)
		.join(', ')
)

// Довідник НП діє лише для Нової Пошти. Якщо перемкнулися на Укрпошту, місто далі
// редагується вручну — інакше в замовлення потрапило б старе обране місто, а не введене.
watch(isNovaPochta, (viaNovaPochta: boolean) => {
	if (viaNovaPochta) return
	selectedCity.value = null
	cityOptions.value = []
	citySearched.value = false
	resetDestination()
})

// Вмикання/вимикання кур'єра: місто спільне й лишається, скидається лише точка
// призначення — інакше в замовлення поїхали б і відділення, і адреса одночасно.
watch(courierDelivery, async () => {
	resetDestination()

	if (isCourier.value || !selectedCity.value) return

	isLoadingWarehouses.value = true
	warehouses.value = await novaPochta.getWarehouses(selectedCity.value.code)
	isLoadingWarehouses.value = false
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
const hasDestination = computed(() => {
	// Кур'єру потрібні і вулиця, і будинок: сама лише вулиця — ще не адреса
	if (isCourier.value) return !!(streetQuery.value.trim() && house.value.trim())

	return isNovaPochta.value ? !!selectedWarehouse.value : !!selectedOffice.value || !!order.address.trim()
})

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
		courierDelivery.value = !!saved.courier
		house.value = saved.house || ''
		flat.value = saved.flat || ''

		// Вулицю беремо зі збереженого без запиту: довідник вулиць шукається за текстом,
		// перезавантажувати його (як список відділень) немає сенсу
		if (saved.street) {
			streetQuery.value = saved.street
			if (saved.streetRef) selectedStreet.value = { code: saved.streetRef, label: saved.street }
		}

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

	// Кур'єру список відділень не потрібен — адреса вже відновлена вище
	if (isCourier.value) return

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
	[order, cityQuery, selectedCity, selectedWarehouse, courierDelivery, streetQuery, selectedStreet, house, flat],
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
			courier: courierDelivery.value,
			street: selectedStreet.value?.label || streetQuery.value,
			streetRef: selectedStreet.value?.code || '',
			house: house.value,
			flat: flat.value,
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

	// Порожній кошик не оформлюємо: саме так у адмінку прилітали замовлення без товару
	// (кошик уже очищено попередньою відправкою, а форма ще на екрані)
	if (!cart.state.value.items.length) {
		notify('error', t('cart.cartEmpty'))
		return
	}

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
			image_file: url.orderImage(item.product.image),
			category_id: item.category_id,
		})),
	}

	// Спосіб отримання НП і, для кур'єра, адреса окремими полями — з них адмінка робить ТТН
	if (isNovaPochta.value) orderData.delivery_type = isCourier.value ? 'courier' : 'warehouse'

	if (isCourier.value) {
		Object.assign(orderData, {
			street: selectedStreet.value?.label || streetQuery.value.trim(),
			street_ref: selectedStreet.value?.code || '',
			house: house.value.trim(),
			flat: flat.value.trim(),
			address: courierAddress.value,
		})
	}

	if (orderData.discount) orderData.type = 'discount'
	if (!isComment.value) delete orderData.comments

	sending.value = true

	let newOrder: any = null
	try {
		newOrder = await shopApi.sendOrder(orderData)
	} catch {
		// Не відправилось — кнопку розблоковуємо, кошик лишається цілим
		notify('error', t('message.orderFailed'))
		sending.value = false
		return
	}

	// Замовлення прийняте: sending лишаємо true до кінця життя сторінки, щоб зайвий клік
	// (поки браузер переходить на «дякуємо») не створив дубль
	cart.removeAll()

	// Сторінці подяки потрібні лише номер, дата й сума. Тягти в URL усе замовлення разом
	// із позиціями — це довжелезний рядок, на якому перехід може зірватись
	// payment потрібен, щоб на «дякуємо» показати повідомлення про недоступну онлайн-оплату
	// лише тому, хто її й обрав.
	// prepay беремо з ВІДПОВІДІ бекенда, а не зі свого розрахунку: суму авансу визначає він,
	// і показати клієнту треба саме те, що реально записано в замовленні
	// delivery потрібен сторінці подяки, щоб назвати комісію за накладений платіж:
	// вона в кожного перевізника своя (НП 20, Укрпошта 15), а саме на неї клієнт
	// економить, якщо обере там «сплатити всю суму»
	const query: Record<string, any> = {
		id: newOrder?.id,
		date: newOrder?.date,
		suma_order: newOrder?.suma_order,
		payment: order.payment,
		delivery: order.delivery,
	}

	if (newOrder?.suma_predoplata) query.prepay = newOrder.suma_predoplata

	try {
		await router.push({ path: localePath('/shop/cart/success'), query })
	} catch {
		// Перехід зірвався — але замовлення вже прийняте, тож кажемо про це на місці,
		// а не показуємо помилку, після якої клієнт тисне «Оформити» ще раз
		notify('success', t('success.youOrderReceived'))
	}
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
	/* Блочне: інакше наступні рядки (атрибут, правка макета) липнуть до назви в один рядок */
	display: block;
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

.cart-item__edit {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	margin-top: 7px;
	padding: 4px 10px;
	border: 1px solid var(--border-light);
	border-radius: var(--radius-pill);
	font-size: 12.5px;
	font-weight: 600;
	color: var(--text-soft);
	transition: color 0.14s, border-color 0.14s;
}

.cart-item__edit:hover {
	color: var(--accent);
	border-color: var(--accent);
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

/* Аванс іде ПІСЛЯ підсумку: це не доданок до нього, а розбиття вже порахованої
   суми на «зараз» і «при отриманні» */
.cart-summary__row--prepay {
	margin-top: 6px;
	padding-top: 10px;
	border-top: 1px dashed var(--border);
}

.cart-summary__row--prepay b {
	color: var(--accent);
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

/* Галочка кур'єра стоїть між точкою видачі й коментарем, тож їй потрібен той самий
   вертикальний ритм, що й у полів форми (.form-group має margin-bottom) */
.courier-toggle {
	margin-bottom: 14px;
}

/* До вибору доплата за кур'єра — тиха підказка, а не цінник з акцентом.
   Після галочки клієнт свідомо обрав опцію, тож підсвічуємо суму плашкою. */
.courier-toggle__price {
	margin-left: auto;
	padding: 2px 8px;
	border-radius: var(--radius-pill);
	font-size: 11.5px;
	font-weight: 500;
	color: var(--text-muted);
	transition: background 0.15s ease, color 0.15s ease;
}

.courier-toggle__price--active {
	background: var(--accent-soft);
	font-size: 12.5px;
	font-weight: 700;
	color: var(--accent);
}

/* Примітка йде під галочкою, а не під полем — вирівнюємо з її текстом */
.courier-toggle__note {
	margin: -8px 0 14px 28px;
}

/* Будинок і квартира — одна адреса, а не два кроки: тримаємо в рядок.
   Будинку даємо більше місця — там бувають «12А/3», у квартирі майже завжди число. */
.house-row {
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 12px;
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

/* Розкладка решти сум — тихою приміткою: головне число вже стоїть вище */
.checkout-total__hint {
	margin: -6px 0 12px;
	font-size: 12.5px;
	line-height: 1.4;
	color: var(--text-muted);
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

/* Умова, про яку клієнт має дізнатись до вибору, а не після оформлення */
.radio__note {
	margin-top: 6px;
	padding-left: 28px;
	font-size: 12.5px;
	line-height: 1.45;
	color: var(--accent);
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
