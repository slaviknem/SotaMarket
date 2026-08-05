<template>
	<Teleport to="body">
		<Transition name="modal">
			<div v-if="open" class="modal" @click.self="close">
				<div class="modal__panel">
					<button class="modal__close" :aria-label="t('other.close')" @click="close">
						<AppIcon name="close" :size="18" />
					</button>

					<h3>{{ t('quick.quickPreOrder') }}</h3>

					<template v-if="!isSent">
						<p class="text-muted modal__msg">{{ t('quick.quickPreOrderMsg') }}</p>

						<div class="form-group">
							<label>{{ t('cart.phone') }} <b class="required-star">*</b></label>
							<input
								v-model="phone"
								class="form-control"
								type="tel"
								inputmode="tel"
								autocomplete="tel-national"
								placeholder="099-999-99-99"
								maxlength="13"
								@input="onPhoneInput"
							/>
						</div>

						<button class="btn btn-primary btn-block btn-lg" :disabled="sending" @click="send">
							{{ sending ? t('cart.sendingOrder') : t('cart.placeOrder') }}
						</button>
					</template>

					<p v-else class="preorder__done">{{ t('quick.quickPreOrderSendMsg') }}</p>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
// Модалка передзамовлення — одна на застосунок; що саме замовляють, приносить заявка
// з usePreOrder (ціна + функція збору позиції). Форма та сама, що у швидкого замовлення,
// різниця лише в типі замовлення (pre_order) і текстах.
const { t, locale } = useI18n()
const shopApi = useShopApi()
const { maskPhone, isValidPhone } = usePhone()
const { notify } = useNotify()
const { open, request, closePreOrder } = usePreOrder()

const phone = ref('')
const sending = ref(false)
const isSent = ref(false)

// При кожному відкритті — чистий стан
watch(open, (v: boolean) => {
	if (v) {
		isSent.value = false
		phone.value = ''
	}
})

function close() {
	closePreOrder()
}

function onPhoneInput() {
	phone.value = maskPhone(phone.value)
}

async function send() {
	if (!isValidPhone(phone.value)) {
		notify('error', t('cart.phoneNoCorrect'))
		return
	}

	const req = request.value
	if (!req) return

	sending.value = true
	try {
		const item = await req.buildItem()

		await shopApi.sendOrder({
			phone: phone.value,
			fio: '',
			type: 'pre_order', // Тип замовлення — передзамовлення
			lang: locale.value,
			suma_order: req.price,
			order_items: [item],
		})

		isSent.value = true
		notify('success', t('quick.quickPreOrderSendMsg'))
	} catch {
		notify('error', t('message.orderFailed'))
	}
	sending.value = false
}
</script>

<style scoped>
/* Базові стилі модалки — глобальні (.modal*) у main.css */
.preorder__done {
	margin-top: 6px;
	font-size: 14px;
	font-weight: 600;
	color: var(--success);
}
</style>
