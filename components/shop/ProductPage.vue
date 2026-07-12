<template>
	<div v-if="product" class="container">
		<Breadcrumbs :items="breadcrumbs" />

		<div class="product">
			<!-- Галерея -->
			<ShopProductGallery :images="galleryImages" :alt="pageTitle" class="product__gallery" />

			<!-- Інфо -->
			<div class="product__info">
				<h1 class="product__title">{{ pageTitle }}</h1>

				<div class="product__meta">
					<span class="product__code">{{ t('product.codeProduct') }}: {{ product.id }}{{ selectedAttributeId ? '-' + selectedAttributeId : '' }}</span>
					<span class="product__stock" :class="available ? 'is-in' : 'is-out'">
						{{ available ? t('product.inStock') : t('product.notStock') }}
					</span>
				</div>

				<p v-if="product.description_short" class="product__short">{{ product.description_short }}</p>

				<!-- Атрибути (кольори / принти) -->
				<div v-if="attributes.length" class="product__attrs">
					<div class="product__attrs-label">
						{{ t('product.selectAttribute') }}:
						<b v-if="selectedAttribute">{{ selectedAttribute.title }}</b>
					</div>

					<div class="product__attrs-list">
						<button
							v-for="attr in attributes"
							:key="attr.id"
							class="attr-chip"
							:class="{
								'is-active': attr.id === selectedAttributeId,
								'is-unavailable': !isAttrInStock(product, attr),
								'attr-chip--img': isPrintAttr(attr),
							}"
							:title="attr.title"
							@click="selectAttribute(attr)"
						>
							<AppImage
								v-if="isPrintAttr(attr)"
								:src="attrImageSrc(attr)"
								:alt="attr.title"
								:width="56"
								:height="56"
							/>
							<template v-else>
								<span class="attr-chip__dot" :style="url.attrDot(attr)" aria-hidden="true" />
								<span class="attr-chip__name">{{ attr.title }}</span>
							</template>
						</button>
					</div>
				</div>

				<!-- Ціна та кнопки -->
				<div class="product__buy card">
					<div class="card-body">
						<div class="product__prices">
							<span v-if="discount" class="product__price-old">{{ formatPrice(product.price_old) }}</span>
							<span class="product__price">{{ formatPrice(product.price) }}</span>
							<span v-if="discount" class="badge badge-sale">-{{ discount }}%</span>
						</div>

						<div class="product__actions">
							<button
								v-if="available"
								class="btn btn-primary btn-lg product__cart-btn"
								@click="addToCart"
							>
								<AppIcon name="cart" :size="19" />
								{{ t('product.inCart') }}
							</button>
							<button
								v-else
								class="btn btn-primary btn-lg product__cart-btn"
								@click="preOrderOpen = true"
							>
								{{ t('quick.quickPreOrder') }}
							</button>

							<button
								class="action-square"
								:class="{ 'is-active': wishlist.has(product.id) }"
								:title="t('other.wishlist')"
								@click="wishlist.toggle(product)"
							>
								<AppIcon name="heart" :size="20" :filled="wishlist.has(product.id)" />
							</button>

							<button
								class="action-square"
								:class="{ 'is-active': compare.has(product.id) }"
								:title="t('other.comparison')"
								@click="compare.toggle(product)"
							>
								<AppIcon name="compare" :size="20" />
							</button>
						</div>

						<ShopQuickOrder
							v-if="available"
							:product="product"
							:attribute-id="selectedAttributeId"
							:image="currentImageFile"
							:attrib-title="selectedAttribute?.title || ''"
							class="product__quick"
						/>

						<ShopPreOrder
							v-model="preOrderOpen"
							:product="product"
							:attribute-id="selectedAttributeId"
							:image="currentImageFile"
							:attrib-title="selectedAttribute?.title || ''"
						/>
					</div>
				</div>

				<!-- Конструктор чохлів для моделі (на всю ширину колонки) -->
				<NuxtLink
					v-if="modelCategory?.alphaprint_available === 'available' || modelCategory?.printcase"
					:to="url.printcase(modelCategory.alias)"
					class="product__printcase"
				>
					✦ {{ t('printcase.constructor') }}
				</NuxtLink>

				<!-- Спеціальна пропозиція (дешевше разом) — у правій колонці, після гідрації -->
				<LazyShopPromotionalItems
					v-if="available"
					:product="product"
					:attribute-id="selectedAttributeId"
					:image="currentImageFile"
					:attrib-title="selectedAttribute?.title || ''"
					:category-id="modelCategory?.id"
				/>
			</div>
		</div>

		<!-- Перелінковка: принти/фасети товару → модель → бренд (або характеристики → категорія) -->
		<ShopProductTags :product="product" />

		<!-- Таби: опис / характеристики / відгуки -->
		<div class="product-tabs">
			<div class="product-tabs__nav">
				<button
					v-for="tab in tabs"
					:key="tab.key"
					class="product-tabs__btn"
					:class="{ 'is-active': activeTab === tab.key }"
					@click="activeTab = tab.key"
				>
					{{ tab.title }}
				</button>
			</div>

			<div class="product-tabs__body">
				<div v-show="activeTab === 'description'" class="typography">
					<div v-if="product.description" v-html="product.description" />
					<p v-else class="text-muted">—</p>
					<div v-if="product.linked_text" v-html="product.linked_text" />
				</div>

				<div v-show="activeTab === 'specification'" class="typography">
					<div v-if="product.characteristics" v-html="product.characteristics" />
					<p v-else class="text-muted">—</p>
					<p class="text-muted product-tabs__disclaimer">{{ t('product.specificationDisclaimer') }}</p>
				</div>

				<div v-show="activeTab === 'reviews'">
					<ShopReviewsBlock :reviews="product.reviews || []" type="product" :target-id="product.id" />
				</div>
			</div>
		</div>

		<!-- Супутні товари -->
		<BlocksProductsCarousel
			v-if="relatedProducts?.length"
			:title="t('product.relatedProducts')"
			:initial-products="relatedProducts"
		/>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	categoryAlias: string
	productAlias: string
	attributeAlias?: string
}>()

const { t, locale } = useI18n()
const url = useUrl()
const shopApi = useShopApi()
const config = useRuntimeConfig()
const cart = useCart()
const { openCart } = useCartDrawer()
const wishlist = useWishlist()
const compare = useCompare()
const { notify } = useNotify()

// ---------- Дані ----------
const { data: product } = await useAsyncData(
	`product-${props.productAlias}-${locale.value}`,
	async () => (await shopApi.getProductByAlias(props.productAlias)) ?? false
)

// Товар не знайдено — 301 на категорію (як на старому сайті)
if (!product.value) {
	await navigateTo(url.category(props.categoryAlias), { redirectCode: 301 })
}

const { data: relatedProducts } = await useAsyncData(
	`product-related-${props.productAlias}-${locale.value}`,
	() => shopApi.getRelatedProducts(props.productAlias),
	{ server: false, lazy: true, default: () => [] }
)

// ---------- Атрибути ----------
const attributes = computed(() => sortedAttributes(product.value?.attributes))

const initialAttribute = () => {
	if (props.attributeAlias) {
		const byAlias = getAttributeByAlias(attributes.value, props.attributeAlias)
		if (byAlias) return byAlias.id
	}
	const avail = attributes.value.find((a: any) => isAttrInStock(product.value, a))
	return avail?.id || attributes.value[0]?.id || 0
}

const selectedAttributeId = ref<number>(initialAttribute())

const selectedAttribute = computed(() =>
	attributes.value.find((a: any) => a.id === selectedAttributeId.value)
)

function selectAttribute(attr: any) {
	selectedAttributeId.value = attr.id
}

// Принти/альфапринти показуємо картинкою; кольори — текстом із кружечком кольору
const PRINT_TYPES = ['alpha_print', 'alpha_print_gen', 'neo_print', 'alpha_vdmt']
const isPrintAttr = (attr: any) =>
	attr.type !== 'color' && (PRINT_TYPES.includes(attr.type) || !!attr.image_file)

const attrImageSrc = (attr: any) =>
	attr.image_file ? url.img('attributes/' + attr.image_file) : url.attributeImg(attr.alias)

// Кружечок кольору: завантажений свотч → явний колір (поле «Колір») → превʼю за alias

// ---------- Галерея ----------
const galleryImages = computed(() => getImagesByAttribute(product.value, selectedAttributeId.value))

const currentImageFile = computed(() => getImageByAttribute(product.value, selectedAttributeId.value))

// ---------- Наявність ----------
const available = computed(() => isProductInStock(product.value, selectedAttribute.value))

// Модалка передзамовлення (коли обраний атрибут не в наявності)
const preOrderOpen = ref(false)

const discount = computed(() => discountPercent(product.value?.price, product.value?.price_old))

// ---------- Категорія (для breadcrumbs та printcase) ----------
const modelCategory = computed(() => product.value?.categories?.[0])

const breadcrumbs = computed(() => {
	const crumbs: { title: string; url?: string }[] = []
	const cat = modelCategory.value

	if (cat) {
		if (cat.brend_alias) {
			crumbs.push({ title: cat.brend_name, url: url.category(cat.brend_alias) })
		}
		crumbs.push({ title: cat.name_full || cat.name, url: url.category(cat.alias) })
	}

	crumbs.push({ title: pageTitle.value })
	return crumbs
})

// ---------- Заголовок (з атрибутом для attr-сторінок) ----------
const pageTitle = computed(() => {
	const base = product.value?.title || ''
	if (props.attributeAlias && selectedAttribute.value) {
		return `${base} (${selectedAttribute.value.title})`
	}
	return base
})

// ---------- Кошик ----------
function addToCart() {
	if (attributes.value.length && !selectedAttributeId.value) {
		notify('error', t('message.beforeSelectAttribute'))
		return
	}

	cart.add({
		product: product.value,
		attribute: selectedAttributeId.value,
		image: currentImageFile.value,
		attribTitle: selectedAttribute.value?.title || '',
		categoryId: modelCategory.value?.id,
	})

	// Замість тосту — відкриваємо слайдер-кошик зі складом замовлення
	openCart()
}

// ---------- Таби ----------
const tabs = computed(() => [
	{ key: 'description', title: t('product.description') },
	{ key: 'specification', title: t('product.specification') },
	{ key: 'reviews', title: `${t('product.reviews')} (${product.value?.reviews?.length || 0})` },
])

const activeTab = ref('description')

// ---------- SEO ----------
usePageSeo({
	title: () => `${pageTitle.value} — ${formatPrice(product.value?.price)}`,
	description: () =>
		product.value?.description_short ||
		`${pageTitle.value}. ${t('product.inStock')}. ${formatPrice(product.value?.price)}.`,
	image: () => (currentImageFile.value ? url.productBig(currentImageFile.value) : undefined),
})

useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'Product',
	name: pageTitle.value,
	image: galleryImages.value.map((img: any) => url.productBig(img.image_file)),
	description: product.value?.description_short || '',
	sku: String(product.value?.id || ''),
	brand: { '@type': 'Brand', name: modelCategory.value?.brend_name || 'FLOY' },
	offers: {
		'@type': 'Offer',
		// На attr-сторінці URL оферу = її canonical (/attr/…), інакше — базовий товар
		url:
			config.public.siteUrl +
			`/${props.categoryAlias}/${props.productAlias}` +
			(props.attributeAlias ? `/attr/${props.attributeAlias}` : ''),
		priceCurrency: 'UAH',
		price: product.value?.price,
		availability: available.value ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
		itemCondition: 'https://schema.org/NewCondition',
	},
	// Відгуки + зведений рейтинг (лише з реальних даних)
	...reviewsJsonLd(product.value?.reviews),
}))

// JSON-LD: хлібні крихти (Бренд → Модель → Товар) — структура каталогу для пошуковиків/AI
useJsonLd(() => {
	const crumbs = [{ title: 'FLOY', url: '/' }, ...breadcrumbs.value]
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((c, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.title,
			...(c.url ? { item: config.public.siteUrl + c.url } : {}),
		})),
	}
})

// Облік візитів
onMounted(() => {
	shopApi.addVisit(modelCategory.value?.id || 0, product.value?.id || 0, selectedAttributeId.value)
})
</script>

<style scoped>
.product {
	display: grid;
	grid-template-columns: minmax(320px, 560px) 1fr;
	gap: 30px;
	align-items: start;
	padding-bottom: 12px;
}

/* На широких екранах головне фото трохи більше */
@media (min-width: 1300px) {
	.product {
		grid-template-columns: minmax(320px, 610px) 1fr;
	}
}

@media (min-width: 1550px) {
	.product {
		grid-template-columns: minmax(320px, 650px) 1fr;
	}
}

.product__title {
	font-size: 25px;
	font-weight: 800;
	letter-spacing: -0.02em;
	margin-bottom: 14px;
	padding-bottom: 14px;
	position: relative;
}

/* Підкреслення у фірмовому стилі (як .section-title::after) */
.product__title::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 2px;
	border-radius: 2px;
	background: linear-gradient(90deg, var(--accent) 0%, transparent 70%);
	opacity: 0.5;
}

.product__meta {
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
	margin-bottom: 12px;
	font-size: 13px;
}

.product__code {
	color: var(--text-muted);
}

.product__stock {
	font-weight: 700;
}

.product__stock.is-in {
	color: var(--success);
}

.product__stock.is-out {
	color: var(--danger);
}

.product__short {
	color: var(--text-soft);
	font-size: 14.5px;
}

.product__attrs {
	margin: 16px 0;
}

.product__attrs-label {
	font-size: 13.5px;
	color: var(--text-soft);
	margin-bottom: 9px;
}

.product__attrs-label b {
	color: var(--accent);
}

.product__attrs-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.attr-chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 14px;
	border-radius: var(--radius-sm);
	border: 1.5px solid var(--border-light);
	background: var(--bg-card);
	font-size: 13px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.14s;
}

/* Кружечок кольору зліва від назви атрибута */
.attr-chip__dot {
	flex: 0 0 auto;
	width: 16px;
	height: 16px;
	border-radius: var(--radius-pill);
	border: 1px solid var(--border-light);
	background-color: var(--img-bg);
	background-size: cover;
	background-position: center;
}

.attr-chip--img {
	gap: 0;
	justify-content: center;
	padding: 3px;
	width: 56px;
	height: 56px;
	overflow: hidden;
}

.attr-chip--img img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 7px;
	filter: brightness(1.12) saturate(1.08);
}

.attr-chip:hover {
	border-color: var(--accent);
	color: var(--text);
}

.attr-chip.is-active {
	border-color: var(--accent);
	background: var(--accent-soft);
	color: var(--accent);
	box-shadow: 0 0 0 2px var(--accent-soft);
}

.attr-chip.is-unavailable {
	opacity: 0.45;
}

.product__buy {
	margin-top: 4px;
}

.product__prices {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
}

.product__price {
	font-size: 30px;
	font-weight: 800;
	color: var(--accent);
}

.product__price-old {
	font-size: 17px;
	color: var(--text-muted);
	text-decoration: line-through;
}

.product__actions {
	display: flex;
	gap: 10px;
	margin-bottom: 12px;
}

.product__cart-btn {
	flex: 1;
}

.action-square {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 50px;
	height: 50px;
	border-radius: var(--radius-sm);
	border: 1.5px solid var(--border-light);
	color: var(--text-soft);
	transition: all 0.15s;
	flex-shrink: 0;
}

.action-square:hover,
.action-square.is-active {
	border-color: var(--accent);
	color: var(--accent);
}

.product__printcase {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 12px;
	padding: 13px 18px;
	border-radius: var(--radius-sm);
	background: var(--accent-soft);
	color: var(--accent);
	font-weight: 700;
	font-size: 14px;
	transition: all 0.15s;
}

.product__printcase:hover {
	background: var(--accent);
	color: var(--on-accent);
}

/* Таби */
.product-tabs {
	margin-top: 30px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.product-tabs__nav {
	display: flex;
	border-bottom: 1px solid var(--border);
	overflow-x: auto;
}

.product-tabs__btn {
	padding: 15px 24px;
	font-size: 14px;
	font-weight: 600;
	color: var(--text-muted);
	border-bottom: 2px solid transparent;
	white-space: nowrap;
	transition: all 0.15s;
}

.product-tabs__btn:hover {
	color: var(--text);
}

.product-tabs__btn.is-active {
	color: var(--accent);
	border-bottom-color: var(--accent);
}

.product-tabs__body {
	padding: 22px 24px;
}

.product-tabs__disclaimer {
	margin-top: 16px;
	font-size: 12.5px;
}

@media (max-width: 900px) {
	.product {
		/* minmax(0,1fr), а не 1fr: інакше внутрішній .swiper-wrapper роздуває
		   колонку за ширину екрана і весь документ їде вправо (overflow) */
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
	}

	/* Одна колонка — не даємо галереї роздуватись на всю ширину на планшетах */
	.product__gallery {
		width: 100%;
		max-width: 460px;
		min-width: 0;
		margin-inline: auto;
	}

	.product__title {
		font-size: 20px;
	}

	.product-tabs__body {
		padding: 16px;
	}
}
</style>
