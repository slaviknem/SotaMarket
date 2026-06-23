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
								placeholder="099-999-99-99"
								maxlength="13"
								@input="maskPhone"
							/>
						</div>

						<button class="btn btn-primary btn-block btn-lg" :disabled="sending" @click="send">
							{{ t('cart.placeOrder') }}
						</button>
					</template>

					<p v-else class="preorder__done">{{ t('quick.quickPreOrderSendMsg') }}</p>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
	product: any
	attributeId: number
	image: string | null
	attribTitle: string
}>()

// Видимість модалки керується ззовні (кнопка «Передзамовлення» в товарі)
const open = defineModel<boolean>({ default: false })

const { t, locale } = useI18n()
const shopApi = useShopApi()
const { notify } = useNotify()

const phone = ref('')
const sending = ref(false)
const isSent = ref(false)

// При кожному відкритті — чистий стан
watch(open, (v) => {
	if (v) {
		isSent.value = false
		phone.value = ''
	}
})

function close() {
	open.value = false
}

// Маска 0XX-XXX-XX-XX
function maskPhone() {
	const digits = phone.value.replace(/\D/g, '').slice(0, 10)
	const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
	phone.value = parts.filter(Boolean).join('-')
}

async function send() {
	if (phone.value.length < 13 || phone.value.startsWith('038')) {
		notify('error', t('cart.phoneNoCorrect'))
		return
	}

	sending.value = true
	try {
		const order = {
			phone: phone.value,
			fio: '',
			type: 'pre_order', // Тип замовлення — передзамовлення
			lang: locale.value,
			suma_order: props.product.price,
			order_items: [
				{
					product_id: props.product.id,
					title: props.product.title,
					attribute_id: props.attributeId,
					count: 1,
					price: props.product.price,
					discount: 0,
					image_file: props.image,
					category_id: props.product.categories?.[0]?.id,
				},
			],
		}

		await shopApi.sendOrder(order)
		isSent.value = true
		notify('success', t('quick.quickPreOrderSendMsg'))
	} catch {
		notify('error', 'Error')
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
