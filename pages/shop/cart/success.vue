<template>
	<div class="container">
		<div class="success">
			<div class="success__icon" :class="{ 'is-paid': isOrderPaid }">
				<svg v-if="!isOrderPaid" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.5 3.5L17 9"/></svg>
				<svg v-else width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>
			</div>

			<h1>{{ headline }}</h1>
			<p class="text-muted">{{ headlineNote }}</p>

			<!-- Аванс отримано: головне тут — сказати, що на пошті ще доведеться доплатити,
			     інакше клієнт вирішить, що замовлення оплачене повністю -->
			<p v-if="prepayPaid && leftToPay" class="success__left">
				{{ t('success.prepayLeft', { sum: leftToPay }) }}
			</p>

			<!-- prepayPaid перевіряємо окремо від isOrderPaid: клієнт міг заплатити й повернутись
			     на сторінку без ?orderpaid — пропонувати оплату вдруге не можна -->
			<template v-if="!isOrderPaid && !prepayPaid && orderId">
				<!-- Аванс: клієнт може внести тільки його або одразу закрити все замовлення.
				     Обидві кнопки видно завжди — вибір «доплачу на пошті / не хочу возитись
				     з готівкою» клієнт має зробити тут, а не писати про це менеджеру -->
				<template v-if="payable && prepay && total > prepay">
					<p class="success__pay-title">{{ t('success.payChoiceTitle') }}</p>

					<div class="success__pay">
						<div class="success__pay-option">
							<button class="btn btn-primary btn-lg btn-block" :disabled="payLoading" @click="payOnline(false)">
								{{ payMode === 'prepay' ? t('success.payProcessing') : t('success.payPrepay', { sum: prepay }) }}
							</button>
							<span class="success__pay-hint">
								{{ leftToPay ? t('success.payPrepayHintSum', { sum: leftToPay }) : t('success.payPrepayHint') }}
							</span>
						</div>

						<div class="success__pay-option">
							<button class="btn btn-outline btn-lg btn-block" :disabled="payLoading" @click="payOnline(true)">
								{{ payMode === 'full' ? t('success.payProcessing') : t('success.payFull', { sum: total }) }}
							</button>
							<span class="success__pay-hint">{{ t('success.payFullHint') }}</span>
						</div>
					</div>
				</template>

				<!-- Звичайна онлайн-оплата, або аванс без відомої повної суми (порожній
				     suma_order в URL) — тоді вибору не даємо, беремо як і раніше аванс -->
				<button v-else-if="payable" class="btn btn-primary btn-lg" :disabled="payLoading" @click="payOnline(false)">
					{{ prepay ? t('success.payPrepay', { sum: prepay }) : t('success.payOnline') }}
				</button>
				<!-- Заготовок під друк немає — оплату не беремо. Раніше пояснення бачив лише той,
				     хто обрав онлайн-оплату; тепер і той, з кого чекали аванс -->
				<p v-else-if="isOnlinePayment || prepay" class="success__nopay text-muted">
					{{ t('success.payUnavailable') }}
				</p>
				<p v-if="payable && prepay" class="success__nopay text-muted">
					{{ t('success.prepayByRequisites') }}
				</p>
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

// Клієнт обрав саме онлайн-оплату (ключ той самий, що в кошику)
const isOnlinePayment = computed(() => route.query.payment === 'online_payment')

// ---------- Аванс за індивідуальний друк ----------
// Суму знаємо одразу з URL: кошик кладе її з відповіді бекенда, а MonoPay повертає клієнта
// на посилання, у яке бекенд її вже дописав. Тому напис не «блимає», поки йде printCheck.
// Той запит лишається джерелом правди й уточнює стан (напр. після перезавантаження сторінки).
const prepayFromUrl = Number(route.query.prepay || 0) || 0
const prepay = ref(prepayFromUrl)
const prepayPaid = ref(isOrderPaid.value && prepayFromUrl > 0)
const leftToPay = ref(0)

// Повна сума замовлення — її бере кнопка «сплатити всю суму». З URL вона є одразу,
// printCheck нижче лише підтверджує те саме значення, тож напис на кнопці не стрибає
const total = ref(Number(route.query.suma_order || 0) || 0)

const headline = computed(() => {
	if (prepayPaid.value) return t('success.prepayReceived')
	return isOrderPaid.value ? t('success.orderPaid') : t('success.thankYou')
})

const headlineNote = computed(() => {
	if (prepayPaid.value) return t('success.prepayReceivedMessage')
	return isOrderPaid.value ? t('success.orderPaidMessage') : t('success.youOrderReceived')
})

const payLoading = ref(false)

// Яку саме кнопку натиснули: поки йде запит, обидві заблоковані, але «Зачекайте…»
// показуємо лише на натиснутій - інакше не видно, який варіант обрано
const payMode = ref<'prepay' | 'full' | null>(null)

// Онлайн-оплата доступна не завжди: якщо в замовленні є друк (індивідуальний, неопринт,
// альфапринт), а порожніх чохлів під нього в постачальників немає, платити наперед не можна -
// гроші довелося б повертати.
//
// Кнопку показуємо ОДРАЗУ і НЕ блокуємо на час перевірки: та ходить до постачальників і на
// холодному кеші триває секунди, а раніше весь цей час кнопка стояла сірою - саме на це
// («не натискається», «спочатку не працює, потім працює») і скаржились клієнти.
// Ховаємо її лише за ЯВНОЇ відмови; якщо клієнт устиг натиснути раніше - його зупинить
// перевірка на боці gen_monopay_link, тож заплатити за ненадрукований чохол він не зможе
const payable = ref(true)

onMounted(async () => {
	if (!orderId.value) return
	try {
		// Ліміт часу свій: без нього зависла відповідь тримала б стан «перевіряємо» до таймауту nginx
		const res = await shopApi.printCheck(String(orderId.value), 15000)

		// Стан авансу беремо з бекенда - він знає його точно, на відміну від URL
		if (res?.prepay) prepay.value = res.prepay
		if (res?.total) total.value = res.total

		// left_to_pay потрібен не лише ПІСЛЯ оплати авансу: під кнопкою «сплатити передоплату»
		// він показує, скільки лишиться доплатити на пошті (з доставкою). Поки не приїхав -
		// підпис іде без суми, щоб не показати число, яке потім зміниться
		if (res?.left_to_pay) leftToPay.value = res.left_to_pay
		if (res?.prepay_paid) prepayPaid.value = true

		// Заготовок під друк немає - кнопку ховаємо (для вже оплаченого замовлення
		// бекенд теж віддає payable=false, але там блок і так не показується)
		if (res?.payable === false) payable.value = false
	} catch { /* не знаємо - лишаємо кнопку */ }
})

// full - клієнт обрав закрити всю суму замість авансу. Скільки це в грошах, вирішує
// бекенд за самим замовленням: суму з браузера він не приймає
async function payOnline(full = false) {
	if (!orderId.value) return
	payLoading.value = true
	payMode.value = full ? 'full' : 'prepay'
	try {
		const data = await shopApi.genMonopayLink(String(orderId.value), full)
		if (data?.payment_link) {
			// Переходимо в ЦІЙ самій вкладці. window.open тут викликався вже після await,
			// тобто поза жестом користувача - Safari і Chrome глушили таке вікно мовчки,
			// і для клієнта кнопка просто «не працювала». Та й повертає нас MonoPay
			// на цю ж сторінку (?orderpaid), тож окрема вкладка лишалась би зайвою
			window.location.href = data.payment_link
			return
		}
		notify('error', (data as any)?.message || 'Error')
	} catch (e: any) {
		// Бекенд відмовляє з поясненням (напр. на модель немає заготовок під друк, а вкладка
		// зі старою перевіркою лишилась відкритою) - показуємо саме його, а не «Error»
		notify('error', e?.data?.message || 'Error')
		if (e?.status === 409) payable.value = false
	}
	payLoading.value = false
	payMode.value = null
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
	font-size: 13px;
}

/* ---------- Вибір суми оплати (аванс / усе одразу) ---------- */
.success__pay-title {
	margin-top: 18px;
	font-size: 14px;
	font-weight: 600;
}

/* Дві колонки на десктопі, одна на телефоні. Кнопки однакової ширини — щоб «сплатити
   всю суму» не читалась як другорядне посилання, це рівноцінний варіант, а не запасний */
.success__pay {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 260px));
	gap: 14px;
	margin-top: 12px;
	width: 100%;
	max-width: 540px;
	justify-content: center;
}

.success__pay-option {
	display: flex;
	flex-direction: column;
	gap: 7px;
}

/* Знімаємо відступ одиночної кнопки (.success .btn-primary) — у парі він зсував
   акцентну кнопку вниз відносно сусідньої */
.success__pay .btn {
	margin-top: 0;
}

/* Підпис під кнопкою — головне в цьому блоці: він каже, ЩО буде далі,
   інакше клієнт обирає між двома сумами навмання */
.success__pay-hint {
	font-size: 12.5px;
	line-height: 1.4;
	color: var(--text-muted);
}

@media (max-width: 560px) {
	.success__pay {
		grid-template-columns: minmax(0, 1fr);
		max-width: 340px;
	}
}

/* Скільки лишилось доплатити — після «передоплату отримано» це головне,
   що клієнт має винести зі сторінки, тож помітніше за примітку */
.success__left {
	max-width: 460px;
	margin-top: 4px;
	font-size: 15px;
	font-weight: 600;
	color: var(--accent);
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
