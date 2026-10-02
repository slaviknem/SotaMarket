<template>
	<!-- Кнопки онлайн-оплати опитувальника (OrderConfirm.vue) — на зведенні і на екрані
	     «Підтверджено»: хто обрав накладений чи реквізити, може передумати й сплатити одразу.
	     Лише малює: який стан, чи є на чому друкувати і сам перехід на MonoPay — у батька
	     (payState, useOrderPay).

	     Передоплата — лише за ІНДИВІДУАЛЬНИЙ друк (конструктор): такий чохол нікому
	     іншому не продаси. Неопринт, альфапринт і звичайні товари — без авансу, тоді
	     лишається одна кнопка (Prepay.php). Оплата за товар — суцільна помаранчева:
	     вона вигідніша (без комісії накладеного); аванс — лише рамкою. -->
	<div class="oc-pay">
		<p class="oc-pay__why">{{ why }}</p>

		<div class="oc-pay__grid" :class="{ 'oc-pay__grid--one': kind !== 'prepay' }">
			<div v-if="kind === 'prepay'" class="oc-pay__opt">
				<button type="button" class="btn btn-outline btn-block" :disabled="loading" @click="emit('go', false)">
					{{ mode === 'prepay' ? t('confirm.payWait') : t('confirm.payPrepay', { sum: pay.prepay }) }}
				</button>
				<span class="oc-pay__hint">{{ t('confirm.payPrepayHint') }}</span>
			</div>

			<div class="oc-pay__opt">
				<!-- «За товар», а не «вся сума»: доставку клієнт однаково платить на пошті
				     (так само на сторінці «Дякуємо») -->
				<button type="button" class="btn btn-primary btn-block" :disabled="loading" @click="emit('go', true)">
					{{ mode === 'full' ? t('confirm.payWait') : t(kind === 'prepay' ? 'confirm.payGoods' : 'confirm.payOnline', { sum: pay.full }) }}
				</button>
				<span v-if="gain" class="oc-pay__hint oc-pay__hint--gain">{{ gain }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { IOrderConfirm } from '~/composables/useShopApi'

const props = defineProps<{
	kind: 'prepay' | 'cod' | 'online' // аванс + за товар; накладений; без накладеного
	pay: IOrderConfirm['pay']
	cod: boolean // накладений платіж — за товар ще платять на пошті
	loading: boolean
	mode: 'prepay' | 'full' | null // яку кнопку натиснули — «Зачекайте…» лише на ній
}>()

const emit = defineEmits<{ go: [full: boolean] }>()

const { t } = useI18n()

// Швидке замовлення спосіб оплати не питає (chosen = false): «оплата ще не надійшла» звучало б
// як борг, тож лише пропонуємо. Немає ключа — адмінка старша за нього, текст як раніше
const why = computed(() => {
	if (props.kind === 'prepay') return t('confirm.payWhyPrepay')
	if (props.kind === 'cod') return t('confirm.payWhyCod')
	return props.pay.chosen === false ? t('confirm.payWhyAny') : t('confirm.payWhyOnline')
})

// Під «за товар» — що клієнт виграє, сплативши зараз. Лише для накладеного: комісія, а понад
// поріг безкоштовної доставки — «на пошті нічого». Інакше підпису немає: обіцяти нема чого
const gain = computed(() => {
	if (!props.cod) return ''
	if (props.pay.cod_fee) return t('confirm.payGain', { fee: props.pay.cod_fee })
	return props.pay.post_free ? t('confirm.payNothing') : ''
})
</script>

<style scoped>
.oc-pay {
	margin-top: 14px;
	padding: 13px;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-soft);
}

.oc-pay__why {
	margin: 4px 0 0;
	text-align: center;
	font-size: 12.5px;
	color: var(--text-muted);
}

/* Дві колонки на десктопі, одна на телефоні — як на сторінці «Дякуємо» (success.vue):
   кнопки однакової ваги, бо «сплатити все» це рівноцінний вибір, а не запасний */
.oc-pay__grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
	margin-top: 12px;
}

/* Без авансу — одна кнопка: на всю ширину було б занадто гучно поруч із «підтверджую» */
.oc-pay__grid--one {
	grid-template-columns: minmax(0, 1fr);
	max-width: 320px;
	margin-left: auto;
	margin-right: auto;
}

.oc-pay__opt {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

/* Підпис під кнопкою — головне в блоці: він каже, ЩО буде далі, інакше клієнт
   обирає між двома сумами навмання. По центру — читається як частина саме цієї кнопки */
.oc-pay__hint {
	font-size: 12px;
	line-height: 1.4;
	text-align: center;
	color: var(--text-muted);
}

/* Економія на комісії — єдина реальна різниця між варіантами */
.oc-pay__hint--gain {
	color: var(--success);
}

@media (max-width: 480px) {
	.oc-pay__grid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
