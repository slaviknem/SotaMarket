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
								placeholder="099-999-99-99"
								maxlength="13"
								@input="maskPhone"
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
const shopApi = useShopApi()
const { notify } = useNotify()
const router = useRouter()
const localePath = useLocalePath()

const open = ref(false)
const phone = ref('')
const sending = ref(false)

// Маска 0XX-XXX-XX-XX
function maskPhone() {
	let digits = phone.value.replace(/\D/g, '').slice(0, 10)
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
					image_file: props.image,
					category_id: props.product.categories?.[0]?.id,
				},
			],
		}

		const newOrder = await shopApi.sendOrder(order)
		open.value = false
		notify('success', t('quick.quickOrderSendMsg'))

		if (newOrder?.id) {
			router.push({ path: localePath('/shop/cart/success'), query: newOrder })
		}
	} catch {
		notify('error', 'Error')
	}
	sending.value = false
}
</script>

<style scoped>
/* Базові стилі модалки — глобальні (.modal*) у main.css */
</style>
