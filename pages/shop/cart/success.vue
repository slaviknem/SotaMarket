<template>
	<div class="container">
		<div class="success">
			<div class="success__icon" :class="{ 'is-paid': isOrderPaid }">
				<svg v-if="!isOrderPaid" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.5 3.5L17 9"/></svg>
				<svg v-else width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>
			</div>

			<h1>{{ isOrderPaid ? t('success.orderPaid') : t('success.thankYou') }}</h1>
			<p class="text-muted">
				{{ isOrderPaid ? t('success.orderPaidMessage') : t('success.youOrderReceived') }}
			</p>

			<template v-if="!isOrderPaid && orderId">
				<button v-if="payable" class="btn btn-primary btn-lg" :disabled="payLoading || checking" @click="payOnline">
					{{ t('success.payOnline') }}
				</button>
				<p v-else class="success__nopay text-muted">{{ t('success.payUnavailable') }}</p>
			</template>

			<div v-if="orderId" class="success__meta">
				<div class="success__meta-item">
					<span>{{ t('success.numOrder') }}</span>
					<b>{{ orderId }}</b>
				</div>
				<div v-if="orderDate" class="success__meta-item">
					<span>{{ t('success.date') }}</span>
					<b>{{ orderDate }}</b>
				</div>
				<div v-if="orderSum" class="success__meta-item">
					<span>{{ t('success.sum') }}</span>
					<b>{{ orderSum }} грн</b>
				</div>
			</div>

			<NuxtLink :to="localePath('/')" class="btn btn-secondary success__home">
				{{ t('error404.home') }}
			</NuxtLink>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const shopApi = useShopApi()
const { notify } = useNotify()

usePageSeo({ title: () => t('success.thankYou'), noindex: true })

const isOrderPaid = computed(() => 'orderpaid' in route.query)
const orderId = computed(() => route.query.id || route.query.order_id || '')
const orderDate = computed(() => route.query.date || '')
const orderSum = computed(() => route.query.suma_order || '')

const payLoading = ref(false)

// Онлайн-оплата доступна не завжди: якщо в замовленні є друк (індивідуальний, неопринт,
// альфапринт), а порожніх чохлів під нього в постачальників немає, платити наперед не можна -
// гроші довелося б повертати. Ховаємо кнопку лише за ЯВНОЇ відмови бекенда: збій перевірки
// не привід не брати оплату
const payable = ref(true)
const checking = ref(true)

onMounted(async () => {
	if (isOrderPaid.value || !orderId.value) {
		checking.value = false
		return
	}
	try {
		const res = await shopApi.printCheck(String(orderId.value))
		if (res?.payable === false) payable.value = false
	} catch { /* не знаємо - лишаємо кнопку */ }
	checking.value = false
})

async function payOnline() {
	if (!orderId.value) return
	payLoading.value = true
	try {
		const data = await shopApi.genMonopayLink(String(orderId.value))
		if (data?.payment_link) {
			window.open(data.payment_link, '_blank')
		} else {
			notify('error', (data as any)?.message || 'Error')
		}
	} catch (e: any) {
		// Бекенд відмовляє з поясненням (напр. на модель немає заготовок під друк, а вкладка
		// зі старою перевіркою лишилась відкритою) - показуємо саме його, а не «Error»
		notify('error', e?.data?.message || 'Error')
		if (e?.status === 409) payable.value = false
	}
	payLoading.value = false
}
</script>

<style scoped>
.success {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 60px 16px 80px;
}

.success__icon {
	color: var(--success);
	margin-bottom: 18px;
}

.success__icon.is-paid {
	color: var(--accent);
}

.success .btn-primary {
	margin-top: 10px;
}

.success__nopay {
	max-width: 460px;
	margin-top: 10px;
}

.success__meta {
	display: flex;
	gap: 14px;
	flex-wrap: wrap;
	justify-content: center;
	margin-top: 30px;
}

.success__meta-item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 150px;
	padding: 16px 22px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.success__meta-item span {
	font-size: 12.5px;
	color: var(--text-muted);
}

.success__meta-item b {
	font-size: 16px;
	color: var(--accent);
}

.success__home {
	margin-top: 26px;
}
</style>
