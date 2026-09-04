<template>
	<div class="quick-order">
		<button class="btn btn-outline btn-block" @click="open = true">
			<AppIcon name="bolt" :size="19" />
			{{ t('quick.quickOrder') }}
		</button>

		<Teleport to="body">
			<Transition name="modal">
				<div v-if="open" class="modal" @click.self="open = false">
					<div class="modal__panel">
						<button class="modal__close" :aria-label="t('other.close')" @click="open = false">
							<AppIcon name="close" :size="18" />
						</button>

						<h3>{{ t('quick.quickOrder') }}</h3>
						<p class="text-muted modal__msg">{{ t('quick.quickOrderMsg') }}</p>

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
							{{ t('cart.placeOrder') }}
						</button>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	product: any
	attributeId: number
	image: string | null
	attribTitle: string
}>()

const { t, locale } = useI18n()
const url = useUrl()
const shopApi = useShopApi()
const { maskPhone, isValidPhone } = usePhone()
const { notify } = useNotify()
const router = useRouter()
const localePath = useLocalePath()

const open = ref(false)
const phone = ref('')
const sending = ref(false)

function onPhoneInput() {
	phone.value = maskPhone(phone.value)
}

async function send() {
	// Подвійний клік по кнопці не має створювати два замовлення
	if (sending.value) return

	if (!isValidPhone(phone.value)) {
		notify('error', t('cart.phoneNoCorrect'))
		return
	}

	sending.value = true
	try {
		const order = {
			phone: phone.value,
			fio: '',
			type: 'quick_order',
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
					image_file: url.orderImage(props.image),
					category_id: props.product.categories?.[0]?.id,
				},
			],
		}

		const newOrder = await shopApi.sendOrder(order)
		open.value = false
		notify('success', t('quick.quickOrderSendMsg'))

		if (newOrder?.id) {
			// Сторінці подяки потрібні лише номер, дата й сума (див. кошик)
			router.push({
				path: localePath('/shop/cart/success'),
				query: { id: newOrder.id, date: newOrder.date, suma_order: newOrder.suma_order },
			})
		}
	} catch {
		notify('error', t('message.orderFailed'))
	}
	sending.value = false
}
</script>

<style scoped>
/* Базові стилі модалки — глобальні (.modal*) у main.css */
</style>
