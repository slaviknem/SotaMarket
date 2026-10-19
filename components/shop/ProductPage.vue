<template>
	<div v-if="product" class="container">
		<Breadcrumbs :items="breadcrumbs" />

		<div class="product">
			<!-- Галерея (гортання фото = вибір принта/кольору) -->
			<ShopProductGallery
				ref="galleryEl"
				:slides="slides"
				:active-index="activeIndex"
				class="product__gallery"
				@select="onGallerySelect"
			/>

			<!-- Інфо -->
			<div class="product__info">
				<h1 class="product__title">{{ pageTitle }}</h1>

				<div class="product__meta">
					<!-- Зведений рейтинг біля H1. Google показує зірочки лише тоді, коли оцінка
					     з мікророзмітки видима на сторінці — таб «Відгуки» нижче для цього
					     недостатньо очевидний. Клік веде саме туди. -->
					<button v-if="stats.ratedCount" class="product__rating" @click="openReviews()">
						<RatingStars :value="stats.avg" :size="15" />
						<span class="product__rating-val">{{ stats.avg }}</span>
						<span class="text-muted">({{ stats.ratedCount }})</span>
					</button>
					<span class="product__code">{{ t('product.codeProduct') }}: {{ product.id }}{{ selectedAttributeId ? '-' + selectedAttributeId : '' }}</span>
					<span class="product__stock" :class="stockClass">{{ stockLabel }}</span>
				</div>

				<p v-if="product.description_short" class="product__short">{{ product.description_short }}</p>

				<!-- Атрибути (кольори / принти) -->
				<div v-if="attributes.length" ref="attrsEl" class="product__attrs">
					<div id="product-attrs-label" class="product__attrs-label">
						{{ attrsLabel }}:
						<b v-if="selectedAttribute">{{ selectedAttribute.title }}</b>
					</div>

					<!-- Чіпи — справжні посилання на /attr/{alias}: сусідні варіанти перелінковані
						 прямо зі сторінки товару (анкор = назва принта). Звичайний клік лишається
						 JS-перемиканням без перемонтування сторінки (як і переписування URL нижче),
						 .exact — щоб Ctrl/⌘-клік відкривав варіант у новій вкладці, як у будь-якого посилання -->
					<div class="product__attrs-list" role="group" aria-labelledby="product-attrs-label">
						<a
							v-for="attr in attributes"
							:key="attr.id"
							class="attr-chip"
							:class="{
								'is-active': attr.id === selectedAttributeId,
								'is-unavailable': !isAttrInStock(product, attr),
								'attr-chip--img': isPrintAttribute(attr),
							}"
							:href="url.product(product, attr.alias)"
							:title="attr.title"
							@click.exact.prevent="selectAttribute(attr)"
						>
							<AppImage
								v-if="isPrintAttribute(attr)"
								:src="attrImageSrc(attr)"
								:alt="attr.title"
								:width="56"
								:height="56"
							/>
							<template v-else>
								<span class="attr-chip__dot" :style="url.attrDot(attr)" aria-hidden="true" />
								<span class="attr-chip__name">{{ attr.title }}</span>
							</template>
						</a>
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
							<!-- Три стани: у кошик / передзамовлення (товар зроблять) /
							     неактивна кнопка, коли товару немає й не буде -->
							<button
								v-if="stock === 'in'"
								class="btn btn-primary btn-lg product__cart-btn"
								@click="addToCart"
							>
								<AppIcon name="cart" :size="19" />
								{{ t('product.inCart') }}
							</button>
							<button
								v-else-if="stock === 'pre_order'"
								class="btn btn-primary btn-lg product__cart-btn"
								@click="preOrder"
							>
								<AppIcon name="clock" :size="19" />
								{{ t('quick.quickPreOrder') }}
							</button>
							<button v-else class="btn btn-primary btn-lg product__cart-btn" disabled>
								{{ t('product.notStock') }}
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
							v-if="stock === 'in'"
							:product="product"
							:attribute-id="selectedAttributeId"
							:image="currentImageFile"
							:attrib-title="selectedAttribute?.title || ''"
							class="product__quick"
						/>
					</div>
				</div>

				<!-- Конструктор чохлів для моделі (на всю ширину колонки).
					 Тільки на чохлах: на склі/плівках та іншій техніці для цієї ж моделі пропозиція недоречна.
					 Модель, яку зняли з друку (not_available), у конструктор не веде — там нічого замовити -->
				<NuxtLink
					v-if="product.type === 'chekhly' && printState !== 'out' && (modelCategory?.alphaprint_available === 'available' || modelCategory?.printcase)"
					:to="url.printcase(modelCategory.alias)"
					class="product__printcase"
				>
					✦ {{ t('printcase.constructor') }}
				</NuxtLink>

				<!-- Спеціальна пропозиція (дешевше разом) — у правій колонці, після гідрації -->
				<LazyShopPromotionalItems
					v-if="stock === 'in'"
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
				<!-- Сторінка варіанта отримує ВЛАСНИЙ текст замість спільного опису товару:
					 однаковий опис на десятках принтів робив би їх near-duplicate. Повний опис —
					 за посиланням на канонічну сторінку товару (вона ж батько в крихтах). -->
				<div v-show="activeTab === 'description'" class="typography">
					<template v-if="isVariant">
						<p>{{ variantLead(selectedAttribute) }}</p>
						<div v-if="selectedAttribute.description" v-html="contentHtml(selectedAttribute.description)" />
						<p><NuxtLink :to="url.product(product)">{{ t('product.lead.full') }} →</NuxtLink></p>
					</template>
					<template v-else>
						<div v-if="product.description" v-html="contentHtml(url.alphaprintHtml(product.description))" />
						<p v-else class="text-muted">—</p>
						<div v-if="product.linked_text" v-html="contentHtml(product.linked_text)" />
					</template>
				</div>

				<div v-show="activeTab === 'specification'" class="typography">
					<div v-if="product.characteristics" v-html="contentHtml(product.characteristics)" />
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
import type { IGallerySlide } from '~/composables/useProductGallery'

const props = defineProps<{
	categoryAlias: string
	productAlias: string
	attributeAlias?: string
}>()

const { t, locale } = useI18n()
const url = useUrl()
const shopApi = useShopApi()
const cart = useCart()
const { openCart } = useCartDrawer()
const { openPreOrder } = usePreOrder()
const wishlist = useWishlist()
const compare = useCompare()
const { notify } = useNotify()

// ---------- Дані ----------
const route = useRoute()

const { data: product, error: productError } = await useAsyncData(
	`product-${props.productAlias}-${locale.value}`,
	async () => (await shopApi.getProductByAlias(props.productAlias)) ?? false
)

// API не відповів — 503, а не 301 нижче: постійний редирект КОЖНОГО товару на категорію
// Google запам'ятав би надовго (див. throwIfApiDown)
throwIfApiDown(productError.value, 'Product')

// Товар не знайдено — 301 на категорію (як на старому сайті)
if (!product.value) {
	await navigateTo(url.category(props.categoryAlias), { redirectCode: 301 })
} else {
	// Адреса — рівно та, що в БД. Товар шукається лише за alias, тож /samsung/{товар} чи інший
	// регістр віддавали повну сторінку (canonical рятував, але бот обходив дублі). Атрибут
	// /attr/… шукаємо без урахування регістру; якщо такого немає — ведемо на сам товар,
	// а не показуємо під цією адресою підставлений перший варіант
	const p = product.value
	const wanted = props.attributeAlias
		? (getAttributeByAlias(p.attributes, props.attributeAlias) ??
			p.attributes?.find((a: any) => String(a.alias).toLowerCase() === props.attributeAlias!.toLowerCase()))
		: null
	const canonicalUrl = url.product(p, wanted?.alias)
	const requestedUrl = url.product({ alias: props.productAlias, alias_cat: props.categoryAlias }, props.attributeAlias)

	if (p.alias && p.alias_cat && canonicalUrl !== requestedUrl) {
		await navigateTo({ path: canonicalUrl, query: route.query, hash: route.hash }, { redirectCode: 301 })
	}
}

const { data: relatedProducts } = await useAsyncData(
	`product-related-${props.productAlias}-${locale.value}`,
	() => shopApi.getRelatedProducts(props.productAlias),
	{ server: false, lazy: true, default: () => [] }
)

// Назва та лід варіанта — єдина формула з галереєю і schema.org
const { variantTitle, variantLead } = useProductNaming(product)

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
	revealGallery()
}

// На мобільному (одна колонка) чіпи стоять далеко під фото: перемкнувши принт, юзер може
// не побачити, що чохол на фото змінився. Підтягуємо галерею у вʼюпорт, вирівнюючи чіпи
// по нижньому краю — так видно і нове фото, і сам ряд чіпів, щоб перебирати далі без скролу назад.
const galleryEl = ref<any>(null)
const attrsEl = ref<HTMLElement | null>(null)

function revealGallery() {
	if (!import.meta.client) return
	// Ширше 900px — дві колонки, фото й чіпи і так поруч (див. стилі нижче)
	if (window.matchMedia('(min-width: 901px)').matches) return

	// Міряємо саме головне фото, а не всю галерею: смуга мініатюр показує набір,
	// а не вибраний дизайн великим планом — коли з галереї видно лише її, скрол потрібен
	const photo = galleryEl.value?.$el?.querySelector('.gallery__main') as HTMLElement | null
	if (!photo || !attrsEl.value) return

	// Скролимо, тільки коли фото видно менше ніж наполовину — інакше сторінка смикалась би на кожен клік
	const rect = photo.getBoundingClientRect()
	const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
	if (visible > rect.height / 2) return

	attrsEl.value.scrollIntoView({
		block: 'end',
		behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
	})
}

// Підпис за суттю варіантів: усі принти → «принт», усі кольори → «колір», мішані → нейтральне «варіант»
const attrsLabel = computed(() => {
	const list = attributes.value
	if (list.every(isPrintAttribute)) return t('product.selectPrint')
	if (!list.some(isPrintAttribute)) return t('product.selectColor')
	return t('product.selectAttribute')
})

// Принти/альфапринти показуємо картинкою; кольори — текстом із кружечком кольору
// (кружечок: завантажений свотч → явний колір → превʼю за alias — див. url.attrDot)
const attrImageSrc = (attr: any) => url.attributeImg(attr)

// ---------- Галерея ----------
const { slides, activeIndex, seoImages, variantImages } = useProductGallery(product, selectedAttributeId)

// Гортання галереї / клік по мініатюрі = вибір атрибута: те, що на екрані, і те, що в кошику, — одне й те саме
function onGallerySelect(slide: IGallerySlide) {
	if (slide.attributeId && slide.attributeId !== selectedAttributeId.value) {
		selectedAttributeId.value = slide.attributeId
	}
}

const currentImageFile = computed(() => getImageByAttribute(product.value, selectedAttributeId.value))

// ---------- Наявність ----------
// Стан обраного варіанта: в наявності / передзамовлення / немає й не буде.
// В альфапринтів його визначає статус друку моделі, тож на моделі pre_order кнопка
// «Купити» поступається місцем «Передзамовленню» — крім принтів із живим залишком.
const stock = computed(() => productStockState(product.value, selectedAttribute.value))

const stockLabel = computed(() =>
	stock.value === 'in'
		? t('product.inStock')
		: stock.value === 'pre_order'
			? t('product.preOrder')
			: t('product.notStock')
)

const stockClass = computed(() =>
	stock.value === 'in' ? 'is-in' : stock.value === 'pre_order' ? 'is-pre-order' : 'is-out'
)

const discount = computed(() => discountPercent(product.value?.price, product.value?.price_old))

// ---------- Категорія (для breadcrumbs та printcase) ----------
const modelCategory = computed(() => product.value?.categories?.[0])

// Статус друку моделі — ним живе пропозиція конструктора під товаром
const printState = computed(() => printStockState(modelCategory.value))

const breadcrumbs = computed(() => {
	const crumbs: { title: string; url?: string }[] = []
	const cat = modelCategory.value

	if (cat) {
		if (cat.brend_alias) {
			crumbs.push({ title: cat.brend_name, url: url.category(cat.brend_alias) })
		}
		crumbs.push({ title: cat.name_full || cat.name, url: url.category(cat.alias) })
	}

	// Сторінка варіанта: товар — окрема крихта з посиланням, тож кожен принт лінкує на
	// канонічного «батька», а BreadcrumbList показує реальну ієрархію Бренд → Модель → Товар → Принт
	if (isVariant.value) {
		crumbs.push({ title: product.value.title, url: url.product(product.value) })
		crumbs.push({ title: selectedAttribute.value.title })
	} else {
		crumbs.push({ title: pageTitle.value })
	}

	return crumbs
})

// ---------- Глибоке посилання на варіант ----------
// Вибір принта/кольору переписує URL на /attr/{alias}, і сторінка стає сторінкою цього варіанта
// (заголовок, canonical, og, schema.org) — рівно такою, яку віддасть SSR при перезавантаженні.
// Тому посилання можна скопіювати, зберегти в закладки чи переслати.
//
// history.replaceState, а не роутер: навігація перемонтувала б сторінку (повторні запити, стрибок
// скролу), а pushState засмічував би історію новим записом на кожен свайп галереї.
const attributeInUrl = ref(!!props.attributeAlias)

// Сторінка варіанта: свій H1, свій текст, своя крихта, свій Product у schema.org
const isVariant = computed(() => attributeInUrl.value && !!selectedAttribute.value)

watch(selectedAttributeId, () => {
	const alias = selectedAttribute.value?.alias
	if (!import.meta.client || !alias || !product.value) return

	attributeInUrl.value = true

	const href = url.product(product.value, alias) + location.search
	history.replaceState({ ...history.state, current: href }, '', href)
})

// ---------- Заголовок ----------
// На варіанті — назва за формулою принт+модель («Чохол з принтом «Маквін 95» для Samsung Galaxy M11»),
// а не «Товар (Маквін 95)»: це і є пошуковий запит, і H1 стає унікальним серед сусідніх варіантів
const pageTitle = computed(() =>
	isVariant.value ? variantTitle(selectedAttribute.value) : product.value?.title || ''
)

// Заголовок для <title>/description: без діагоналі в дужках — «(6.3")» з'їдає 7 знаків
// із ~58 видимих у сніпеті, а в запитах діагональ не пишуть. H1 і крихти лишаються повними.
const seoTitle = computed(() => pageTitle.value.replace(/\s*\(\d+(?:[.,]\d+)?\s*(?:["”″]|''|')\)/g, ''))

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

// Товару зараз немає: замість кошика — модалка передзамовлення (замовлення type=pre_order)
function preOrder() {
	openPreOrder({
		price: product.value.price,
		buildItem: () => ({
			product_id: product.value.id,
			title: pageTitle.value,
			attribute_id: selectedAttributeId.value,
			count: 1,
			price: product.value.price,
			discount: 0,
			image_file: url.orderImage(currentImageFile.value),
			category_id: modelCategory.value?.id,
		}),
	})
}

// ---------- Відгуки ----------
// Зведений рейтинг — те саме джерело, що й aggregateRating у schema.org (useProductJsonLd),
// тож видиме число і число в розмітці ніколи не розходяться
const stats = computed(() => reviewsStats(product.value?.reviews))

// ---------- Таби ----------
const tabs = computed(() => [
	{ key: 'description', title: t('product.description') },
	{ key: 'specification', title: t('product.specification') },
	{ key: 'reviews', title: `${t('product.reviews')} (${product.value?.reviews?.length || 0})` },
])

const activeTab = ref('description')

// Якір #reviews. Блок відгуків тут усередині таба, тобто display:none — браузер до
// прихованого якоря не доскролить, тож таб спершу відкриваємо самі.
async function openReviews() {
	activeTab.value = 'reviews'
	await nextTick()
	document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Зовнішнє посилання з #reviews: і при заході на сторінку, і при зміні хеша вже на ній
watch(() => route.hash, (hash) => {
	if (hash === '#reviews') openReviews()
})

// ---------- SEO ----------
// canonical/og ідуть за URL: на сторінці варіанта (або після вибору принта) це /attr/{alias}
const canonicalPath = computed(() =>
	product.value ? url.product(product.value, isVariant.value ? selectedAttribute.value.alias : undefined) : ''
)

// description_short спільний для всіх варіантів — на сторінці принта беремо шаблон
// із його власною назвою, інакше десятки сніпетів були б однакові
const seoDescription = computed(
	() =>
		(!isVariant.value && product.value?.description_short) ||
		t('metaDescription.product', { title: seoTitle.value, price: formatPrice(product.value?.price) })
)

usePageSeo({
	title: () => `${seoTitle.value} — ${formatPrice(product.value?.price)}`,
	description: () => seoDescription.value,
	image: () => url.productSeoImage(currentImageFile.value, 'og', product.value),
	path: () => canonicalPath.value,
	ogType: 'product',
})

// Product / ProductGroup + hasVariant / Product варіанта + BreadcrumbList
useProductJsonLd({
	product,
	attributes,
	selectedAttribute,
	isVariantPage: isVariant,
	pageTitle,
	description: seoDescription,
	images: seoImages,
	variantImages,
	breadcrumbs,
})

// Облік візитів
onMounted(() => {
	shopApi.addVisit(modelCategory.value?.id || 0, product.value?.id || 0, selectedAttributeId.value)

	// Зайшли одразу за посиланням на відгуки — розкриваємо потрібний таб
	if (route.hash === '#reviews') openReviews()
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

/* Рейтинг у шапці товару — стоїть першим у .product__meta, тому власних відступів не має.
   padding: 0 — глобальний reset кнопки його не чіпає, а типовий UA-відступ збив би
   вирівнювання з рештою рядка (код товару, наявність). */
.product__rating {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 0;
	font-size: 13px;
}

.product__rating-val {
	font-weight: 700;
}

.product__rating:hover {
	text-decoration: underline;
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

.product__stock.is-pre-order {
	color: var(--warning);
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
	cursor: pointer;
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
	border-radius: calc(var(--radius-sm) - 1px);
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
