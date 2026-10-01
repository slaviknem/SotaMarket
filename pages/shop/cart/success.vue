<template>
	<div class="container">
		<div class="success">
			<!-- Повернення з MonoPay: про оплату кажемо за адресою повернення, як і раніше —
			     вебхук буває повільніший за клієнта, а «оплачено» він має побачити одразу -->
			<p v-if="justPaid" class="success__paid">
				<AppIcon name="check" :size="16" :stroke-width="3" class="success__paid-ico" />
				<span>
					<b>{{ t(justPaid === 'prepay' ? 'success.prepayReceived' : 'success.orderPaid') }}</b>
					{{ t(justPaid === 'prepay' ? 'success.prepayReceivedMessage' : 'success.orderPaidMessage') }}
				</span>
			</p>

			<!-- Перехід із кошика не чекає відповіді бекенда (lazy) — на цей час каркас картки -->
			<div v-if="status === 'idle' || status === 'pending'" class="card skeleton success__skeleton" />

			<!-- Опитувальник: «Дякуємо! Замовлення №… прийнято», модель, боки, номер, оплата -->
			<template v-else-if="data">
				<h1 class="visually-hidden">{{ t('success.thankYou') }}</h1>
				<!-- Етап 1: відповіді ще не зберігаються. Прибирається разом із появою збереження -->
				<p class="success__test">{{ t('confirm.testMode') }}</p>
				<ShopOrderConfirm :data="data" :just-paid="justPaid" />
			</template>

			<!-- Опитувальника немає (посилання без токена, бекенд ще старий чи недоступний) —
			     замовлення однаково прийняте, тож проста подяка з номером -->
			<div v-else class="success__plain">
				<span class="success__icon"><AppIcon name="check" :size="30" :stroke-width="2.6" /></span>
				<h1>{{ t('success.thankYou') }}</h1>
				<p class="text-muted">{{ t('success.youOrderReceived') }}</p>
				<p v-if="orderId" class="success__num">
					{{ t('success.numOrder') }}: <b>{{ orderId }}</b>
				</p>
				<NuxtLink :to="localePath('/')" class="btn btn-secondary">{{ t('cart.continueShopping') }}</NuxtLink>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
// Сторінка після оформлення замовлення (кошик, швидке замовлення) і після повернення з MonoPay.
// Номер і токен — у query (ocSuccessQuery, а з MonoPay — від genMonoPayLink); за ними
// опитувальник підтвердження бере з бекенда все інше: позиції, питання, суми, оплату
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const shopApi = useShopApi()

usePageSeo({ title: () => t('success.thankYou'), noindex: true })

const orderId = computed(() => String(route.query.id || route.query.order_id || '').replace(/\D/g, ''))
const token = computed(() => String(route.query.t || ''))

// MonoPay повертає на ?orderpaid; prepay у посиланні повернення дописує бекенд, лише коли
// рахунок був на аванс (genMonoPayLink)
const justPaid = computed(() =>
	'orderpaid' in route.query ? (Number(route.query.prepay) > 0 ? 'prepay' : 'full') : null
)

// SSR-first: на прямому відкритті (повернення з MonoPay, перезавантаження) опитувальник
// уже в серверному HTML. lazy — щоб перехід із кошика не чекав відповіді: замовлення вже
// прийняте, і сторінка має з'явитись одразу. Помилку не кидаємо — замість 503 проста подяка.
// false замість null — щоб useAsyncData не повторював запит на клієнті
const { data, status } = await useAsyncData(
	`order-confirm-${orderId.value}-${token.value}-${locale.value}`,
	async () =>
		orderId.value && token.value ? ((await shopApi.getOrderConfirm(orderId.value, token.value)) ?? false) : false,
	{ lazy: true }
)
</script>

<style scoped>
.success {
	padding: 28px 0 60px;
}

/* Службова плашка над карткою — помітна, але не сперечається з питаннями */
.success__test {
	max-width: 620px;
	margin: 0 auto 10px;
	padding: 6px 12px;
	border: 1px dashed var(--warning);
	border-radius: var(--radius-sm);
	background: var(--warning-soft);
	font-size: 12.5px;
	text-align: center;
	color: var(--warning);
}

/* «Оплачено» після MonoPay — над карткою, щоб клієнт побачив це першим */
.success__paid {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	max-width: 620px;
	margin: 0 auto 10px;
	padding: 10px 14px;
	border-left: 3px solid var(--success);
	border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	background: var(--bg-elevated);
	font-size: 14px;
	line-height: 1.45;
}

.success__paid-ico {
	flex: 0 0 auto;
	margin-top: 2px;
	color: var(--success);
}

.success__paid b {
	color: var(--success);
}

.success__skeleton {
	max-width: 620px;
	height: 420px;
	margin: 0 auto;
}

.success__plain {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 32px 0 20px;
	text-align: center;
}

.success__icon {
	display: grid;
	place-items: center;
	width: 60px;
	height: 60px;
	margin-bottom: 6px;
	border-radius: var(--radius-pill);
	background: var(--success);
	color: var(--on-accent);
}

.success__num {
	font-size: 15px;
}

.success__num b {
	color: var(--accent);
}

.success__plain .btn {
	margin-top: 14px;
}
</style>
