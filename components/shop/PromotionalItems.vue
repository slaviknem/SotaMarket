<template>
	<!-- Підвантажується вже після гідрації (onMounted) — не блокує SSR/LCP -->
	<section v-if="ready && rows.length > 1" class="promo card">
		<div class="card-body">
			<h3 class="promo__title">{{ t('product.promotionalItems.promotionalSet') }}</h3>

			<div class="promo__body">
				<!-- Товари в рядок: великі картинки без назв, «+» між ними -->
				<div class="promo__items">
					<template v-for="(row, i) in rows" :key="row.id">
						<span v-if="i" class="promo__plus" aria-hidden="true">+</span>

						<label class="promo__item" :class="{ 'is-off': !row.selected }" :title="row.title">
							<input
								type="checkbox"
								class="promo__input"
								:checked="row.selected"
								:disabled="row.main"
								@change="toggle(row.id)"
							/>
							<span class="promo__media">
								<span class="promo__check"><AppIcon name="check" :size="13" :stroke-width="3" /></span>
								<AppImage :src="row.image" :fallback="row.fallback" :alt="row.title" :width="160" :height="160" />
							</span>
							<span class="promo__prices">
								<!-- Стара ціна завжди займає рядок (спейсер), щоб картки були однакової висоти -->
								<span class="promo__old" :class="{ 'is-empty': !row.discount }">{{ formatPrice(row.price) }}</span>
								<span class="promo__new">{{ formatPrice(row.price - row.discount) }}</span>
							</span>
						</label>
					</template>
				</div>

				<div class="promo__summary">
					<span class="promo__saving">
						{{ t('product.promotionalItems.saving') }} <b>{{ formatPrice(savingSum) }}</b>
					</span>
					<button class="btn btn-primary btn-lg promo__btn" :disabled="buying" @click="buy">
						{{ t('product.promotionalItems.buyTogetherFor') }} {{ formatPrice(totalSum) }}
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
// Блок «Спеціальна пропозиція (дешевше разом)»: товар + супутні аксесуари зі знижкою.
// Аксесуари захардкоджені (бекенд окремого ендпоінта не має) — як на старому сайті.
const props = defineProps<{
	product: any
	attributeId: number
	image: string | null
	attribTitle: string
	categoryId?: number
}>()

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const url = useUrl()
const cart = useCart()
const { notify } = useNotify()
const router = useRouter()
const localePath = useLocalePath()

const storage = config.public.urlStorage
const isCase = computed(() => props.product?.type === 'chekhly')
const modelName = computed(() => props.product?.categories?.[0]?.name_full || props.product?.categories?.[0]?.name || '')

// Каталог акційних аксесуарів — з конфігу бренду (brand/site.config.ts → promoAccessories):
// ціна, знижка, чи обраний за замовчуванням. {model} у назві — модель з картки товару
const ACCESSORIES = computed(() =>
	useBrand().promoAccessories.map((a) => ({
		...a,
		title_uk: a.title.uk.replace('{model}', modelName.value),
		title_ru: a.title.ru.replace('{model}', modelName.value),
		image: storage + a.image,
	}))
)

// Видимі аксесуари (скло — лише для чохлів)
const accessories = computed(() => ACCESSORIES.value.filter((a: any) => !a.onlyCase || isCase.value))

// Стан вибору (id → обраний). Головний товар завжди в наборі.
const selectedIds = ref(new Set<number>())
watchEffect(() => {
	const next = new Set<number>()
	accessories.value.forEach((a: any) => a.default && next.add(a.id))
	selectedIds.value = next
})

function toggle(id: number) {
	const next = new Set(selectedIds.value)
	next.has(id) ? next.delete(id) : next.add(id)
	selectedIds.value = next
}

// Головний товар (завжди обраний, без знижки) + аксесуари
const rows = computed(() => {
	// В альфапринта — кадр на льоту, файл сховища — fallback
	const thumb = url.productThumbImage(props.image, props.product)
	const main = {
		id: props.product?.id,
		main: true,
		selected: true,
		title: props.product?.title || '',
		image: thumb.src,
		fallback: thumb.fallback,
		price: props.product?.price || 0,
		discount: 0,
	}
	const list = accessories.value.map((a: any) => ({
		id: a.id,
		main: false,
		selected: selectedIds.value.has(a.id),
		title: locale.value === 'uk' ? a.title_uk : a.title_ru,
		image: a.image,
		fallback: undefined,
		price: a.price,
		discount: a.discount,
	}))
	return [main, ...list]
})

const savingSum = computed(() =>
	rows.value.filter((r: any) => r.selected).reduce((s: number, r: any) => s + r.discount, 0)
)
const totalSum = computed(() =>
	rows.value.filter((r: any) => r.selected).reduce((s: number, r: any) => s + (r.price - r.discount), 0)
)

const buying = ref(false)

function buy() {
	buying.value = true

	// 1) Головний товар — з реальним атрибутом/зображенням
	cart.add({
		product: props.product,
		attribute: props.attributeId,
		image: props.image,
		attribTitle: props.attribTitle,
		categoryId: props.categoryId,
	})

	// 2) Обрані аксесуари
	accessories.value
		.filter((a: any) => selectedIds.value.has(a.id))
		.forEach((a: any) => {
			cart.add({
				product: {
					id: a.id,
					alias: a.alias,
					alias_cat: a.alias_cat,
					title: locale.value === 'uk' ? a.title_uk : a.title_ru,
					price: a.price,
					discount: a.discount,
				},
				attribute: 1,
				image: a.image,
			})
		})

	notify('success', t('message.productAddedCart'))
	router.push(localePath('/shop/cart'))
}

// Рендеримо лише після гідрації — щоб блок підвантажувався після завантаження сторінки
const ready = ref(false)
onMounted(() => {
	ready.value = true
})
</script>

<style scoped>
.promo {
	margin-top: 24px;
	/* Реагуємо на ширину самого блоку (а не екрана) — блок живе в колонці змінної ширини */
	container-type: inline-size;
}

.promo__title {
	font-size: 16px;
	font-weight: 700;
	color: var(--text-soft);
	margin-bottom: 14px;
}

/* Товари в рядок | підсумок справа */
.promo__body {
	display: flex;
	align-items: center;
	gap: 24px;
	flex-wrap: wrap;
}

/* Завжди один рядок: картки ділять ширину порівну, залишок (коли вперлись у max) — у проміжки */
.promo__items {
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	justify-content: space-between;
}

.promo__plus {
	color: var(--text-muted);
	font-size: 20px;
	font-weight: 300;
}

/* Картка-товар (клік по всій картці = вибір) */
.promo__item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	flex: 1 1 0;
	min-width: 0;
	max-width: 160px;
	padding: 6px;
	border-radius: var(--radius-sm);
	cursor: pointer;
	transition: opacity 0.15s;
}

.promo__item.is-off {
	opacity: 0.4;
}

.promo__input {
	position: absolute;
	opacity: 0;
	width: 0;
	height: 0;
}

.promo__media {
	position: relative;
	width: 100%;
	max-width: 80px;
	aspect-ratio: 1;
	border-radius: var(--radius-sm);
	overflow: hidden;
	background: var(--img-bg);
}

.promo__media :deep(img) {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

/* Бейдж-галочка в кутку картинки */
.promo__check {
	position: absolute;
	top: 5px;
	left: 5px;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: var(--radius-pill);
	background: var(--bg-card);
	border: 1.5px solid var(--border-light);
	color: transparent;
	transition: all 0.14s;
}

.promo__input:checked + .promo__media .promo__check {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
}

.promo__prices {
	display: flex;
	flex-direction: column;
	align-items: center;
	white-space: nowrap;
	line-height: 1.2;
}

.promo__old {
	font-size: 11.5px;
	color: var(--text-muted);
	text-decoration: line-through;
}

/* Порожня «стара ціна» — лише резервує висоту рядка для рівних карток */
.promo__old.is-empty {
	visibility: hidden;
}

.promo__new {
	font-size: 14px;
	font-weight: 700;
	color: var(--text);
}

/* Підсумок (саме економія + кнопка) */
.promo__summary {
	flex: 0 0 auto;
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding-left: 24px;
	border-left: 1px solid var(--border);
	text-align: center;
}

.promo__saving {
	font-size: 13px;
	color: var(--text-muted);
}

.promo__saving b {
	display: block;
	color: var(--danger);
	font-size: 21px;
	margin-top: 1px;
}

.promo__btn {
	min-width: 230px;
}

/* Вузький блок: підсумок переходить під рядок товарів */
@container (max-width: 760px) {
	.promo__summary {
		flex: 1 1 100%;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-left: 0;
		padding-top: 16px;
		border-left: none;
		border-top: 1px solid var(--border);
		text-align: left;
	}

	.promo__saving b {
		display: inline;
		margin-left: 6px;
		font-size: 18px;
	}

	.promo__btn {
		flex: 1;
		min-width: 0;
		max-width: 320px;
	}
}

@container (max-width: 440px) {
	.promo__item {
		max-width: 78px;
		padding: 4px 2px;
	}

	.promo__media {
		max-width: 66px;
	}

	.promo__plus {
		font-size: 15px;
	}

	/* Галочка пропорційна меншій картинці */
	.promo__check {
		top: 3px;
		left: 3px;
		width: 19px;
		height: 19px;
	}

	.promo__prices {
		max-width: 100%;
	}

	.promo__old {
		font-size: 10.5px;
	}

	.promo__new {
		font-size: 12.5px;
	}

	.promo__summary {
		flex-direction: column;
		align-items: stretch;
		text-align: center;
	}

	.promo__btn {
		max-width: none;
	}
}
</style>
