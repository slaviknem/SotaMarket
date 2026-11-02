<template>
	<!-- Шапка SotaMARKET (дизайн C2 «Вітрина+», PLAN-SITE-SOTAMARKET §4): смужка контактів → синя панель
	     (лого з підписом, «Каталог», пошук, обране й кошик) → смуга брендів «Твій телефон:» з мегаменю.
	     Поведінка мегаменю й «Каталогу» — як у шапці рушія (components/AppHeader.vue), пропси й подія ті самі -->
	<header class="header">
		<!-- Смужка контактів (лише десктоп). Телефону в магазину немає — на його місці чат -->
		<div class="header__topbar">
			<div class="container header__topbar-inner">
				<span v-if="placeLine" class="topbar-place">{{ placeLine }}</span>
				<nav class="topbar-links" :aria-label="t('header.topbar.info')">
					<NuxtLink v-for="link in infoLinks" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
				</nav>
				<a v-if="phone" :href="telHref(phone)" class="topbar-contact">{{ phone }}</a>
				<button v-else class="topbar-contact" type="button" @click="openChat">
					<AppIcon name="chat" :size="15" />
					{{ t('header.chat') }}
				</button>
				<LangSwitcher />
			</div>
		</div>

		<!-- Синя панель — прибита до верху на всіх ширинах. На телефоні й планшеті: меню, лого, (пошук), обране, кошик -->
		<div class="header__main" :class="{ 'is-stuck': stuck }">
			<div class="container header__main-inner">
				<button class="burger" type="button" :aria-label="t('header.catalog')" @click="mobileOpen = true">
					<AppIcon name="menu" :size="24" />
				</button>

				<NuxtLink :to="localePath('/')" class="logo" :aria-label="siteBrand.name">
					<AppLogo />
					<span class="logo__tagline" aria-hidden="true">{{ t('header.tagline') }}</span>
				</NuxtLink>

				<!-- «Каталог»: бренди ліворуч, моделі наведеного праворуч, унизу — розділи магазину.
				     v-show, а не v-if: бренди й розділи — у HTML кожної сторінки (наскрізні посилання);
				     моделі — з дерева меню, яке довантажується на клієнті (app.vue) -->
				<div class="departments" @mouseenter="emit('needMenu')" @mouseleave="closeDeps">
					<button
						class="departments__toggle"
						:class="{ 'is-open': depsOpen }"
						type="button"
						:aria-expanded="depsOpen"
						@mouseenter="openDepsDelayed"
						@click="toggleDeps"
					>
						<AppIcon name="menu" :size="20" />
						{{ t('header.catalog') }}
					</button>

					<Transition name="drop">
						<div v-show="depsOpen" class="departments__panel" @mouseenter="openDeps">
							<div class="departments__body">
								<ul class="departments__brands">
									<li v-for="(brand, i) in brands" :key="brand.url">
										<NuxtLink
											:to="toPath(brand.url)"
											class="departments__brand"
											:class="{ 'is-active': catalogIndex === i }"
											@mouseenter="catalogIndex = i"
											@focus="catalogIndex = i"
											@click="depsOpen = false"
										>
											{{ brand.title }}
											<AppIcon name="chevron-right-sm" :size="11" />
										</NuxtLink>
									</li>
								</ul>
	
								<div v-if="catalogBrand" class="departments__models">
									<NuxtLink :to="toPath(catalogBrand.url)" class="departments__all" @click="depsOpen = false">
										{{ t('header.allCases', { brand: catalogBrand.title }) }}
										<AppIcon name="arrow-right" :size="16" />
									</NuxtLink>
									<div class="departments__series">
										<div v-for="serie in catalogSeries" :key="serie.url" class="serie" :style="{ '--cols': serie.cols }">
											<div class="serie__title">{{ serieTitle(serie.title) }}</div>
											<ul>
												<li v-for="model in serie.children" :key="model.url">
													<NuxtLink :to="toPath(model.url)" @click="depsOpen = false">{{ model.title }}</NuxtLink>
												</li>
											</ul>
										</div>
									</div>
								</div>
							</div>

							<nav class="departments__foot" :aria-label="t('footer.catalog')">
								<NuxtLink v-for="cat in categories" :key="cat.url" :to="toPath(cat.url)" @click="depsOpen = false">
									<AppIcon :name="cat.url === '/printcase' ? 'spark' : 'smartphone'" :size="17" />
									{{ cat.title }}
								</NuxtLink>
							</nav>
						</div>
					</Transition>
				</div>

				<!-- Пошук рушія — один на застосунок (useSearch); вигляд C2 — :deep нижче. На телефоні прихований:
				     замість нього рядок .header__search-row, а повноекранний пошук SearchBar малює через Teleport -->
				<SearchBar class="header__search" />

				<div class="header__actions">
					<NuxtLink v-for="a in actions" :key="a.key" :to="a.to" custom>
						<template #default="{ href, navigate }">
							<a :href="href" class="action-btn" :class="`action-btn--${a.key}`" :aria-label="a.title" @click="onAction($event, a.key, navigate)">
								<span class="action-btn__icon">
									<AppIcon :name="a.icon" :size="22" />
									<span v-if="a.count" class="action-btn__count">{{ a.count }}</span>
								</span>
								<span class="action-btn__label" aria-hidden="true">{{ a.title }}</span>
							</a>
						</template>
					</NuxtLink>
				</div>
			</div>
		</div>

		<!-- Телефон: поле пошуку окремим рядком (не прибите) — вхід у повноекранний пошук SearchBar -->
		<div class="header__search-row">
			<button class="search-field" type="button" @click="openSearch()">
				<AppIcon name="search" :size="19" />
				<span class="search-field__text">{{ t('header.topbar.searchPlaceholder') }}</span>
			</button>
		</div>

		<!-- Смуга брендів. Десктоп: мегаменю моделей; телефон і планшет — прокрутка пальцем.
		     mouseenter: дерево моделей довантажується на клієнті (app.vue) -->
		<nav class="header__nav" :aria-label="t('header.allBrands')">
			<div ref="navInnerRef" class="container header__nav-inner" @mouseenter="emit('needMenu')" @mouseleave="closeBrand">
				<span class="brands-nav__lead">{{ t('header.yourPhone') }}</span>
				<div class="brands-nav">
					<div
						v-for="(brand, i) in brands"
						:key="brand.url"
						:ref="(el) => setBrandRef(el, i)"
						class="brands-nav__item"
						@mouseenter="openBrand(i)"
						@mouseleave="cancelOpen"
					>
						<NuxtLink :to="toPath(brand.url)" class="brands-nav__link" :class="{ 'is-open': openedBrand === i }" @click="closeBrand">
							{{ brand.title }}
						</NuxtLink>
					</div>
				</div>
				<!-- Поза рядком брендів: ті, що не вмістилися, ховаються, а «Усі бренди» видно завжди -->
				<NuxtLink v-if="allBrands" :to="toPath(allBrands.url)" class="brands-nav__all" @mouseenter="closeBrand">
					{{ t('header.allBrands') }}
				</NuxtLink>

				<!-- Мегаменю бренда: центрується під кнопкою, ширина під кількість моделей -->
				<Transition name="mega">
					<div v-if="activeSeries.length" ref="menuRef" class="brand-menu" :style="{ left: menuLeft + 'px' }" @mouseenter="cancelClose">
						<div class="brand-menu__scroll">
							<Transition name="tab">
								<div :key="activeBrand.url" class="brand-menu__series">
									<div v-for="serie in activeSeries" :key="serie.url" class="serie" :style="{ '--cols': serie.cols }">
										<div class="serie__title">{{ serieTitle(serie.title) }}</div>
										<ul>
											<li v-for="model in serie.children" :key="model.url">
												<NuxtLink :to="toPath(model.url)" @click="closeBrand">{{ model.title }}</NuxtLink>
											</li>
										</ul>
									</div>
								</div>
							</Transition>
						</div>

						<NuxtLink :to="toPath(activeBrand.url)" class="brand-menu__foot" @click="closeBrand">
							<span>{{ t('header.viewAll') }} {{ activeBrand.title }}</span>
							<AppIcon name="arrow-right" :size="16" />
						</NuxtLink>
					</div>
				</Transition>
			</div>
		</nav>
	</header>
</template>

<script setup lang="ts">
import type { ScheduleRow } from '~/composables/useSiteSettings'

const props = defineProps<{ menu: any }>()
const emit = defineEmits<{ needMenu: [] }>()

const { t } = useI18n()
const localePath = useLocalePath()
const siteBrand = useBrand()
const { phone, contacts, schedule } = useSiteSettings()
const { infoLinks } = useSiteMenus()
const { openSearch } = useSearch()

const cart = useCart()
const { openCart } = useCartDrawer()
const wishlist = useWishlist()
const route = useRoute()

// «м. Львів · Пн – Сб 9:00 – 18:00»: адреса й робочі дні з налаштувань (вихідні — лише у футері)
const placeLine = computed(() =>
	[contacts.value.address, ...schedule.value.filter((r: ScheduleRow) => r.time).map((r: ScheduleRow) => `${t(`footer.${r.days}`)} ${r.time}`)]
		.filter(Boolean)
		.join(' · ')
)

// Чат — віджет рушія (ChatWidget) відкривається цим станом; клік — перша взаємодія, тож віджет
// змонтується одразу (app.vue) і побачить уже відкритий стан
const chatOpen = useState('chat_open', () => false)
const openChat = () => (chatOpen.value = true)

// Обране й кошик (порівняння — у футері: для чохлів з картинками воно рідкість)
const actions = computed(() => [
	{ key: 'wishlist', to: localePath('/shop/wishlist'), icon: 'heart', title: t('other.wishlist'), count: wishlist.items.value.length },
	{ key: 'cart', to: localePath('/shop/cart'), icon: 'cart', title: t('cart.cart'), count: cart.quantity.value },
])

// Кошик відкриває шторку замість переходу (на сторінці кошика — нічого); решта — звичайний перехід.
// Модифікатори (Ctrl/⌘/Shift) чи не-ліва кнопка → браузер сам відкриває нову вкладку
function onAction(e: MouseEvent, key: string, navigate: (e?: MouseEvent) => unknown) {
	if (key !== 'cart') return navigate(e)
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
	e.preventDefault()
	if (route.path !== localePath('/shop/cart')) openCart(false)
}

const mobileOpen = useState('mobileMenuOpen', () => false)

const toPath = (url: string) => localePath(url.startsWith('/') ? url : `/${url}`)

// Хвостовий пункт меню «ВСІ» — каталог усіх брендів /chekhly: окремим посиланням «Усі бренди», без мегаменю
const isAllBrands = (b: any) => b.url === 'chekhly'
const brands = computed(() => (props.menu?.brends || []).filter((b: any) => !isAllBrands(b)))
const allBrands = computed(() => (props.menu?.brends || []).find(isAllBrands))
const categories = computed<{ title: string; url: string }[]>(() => props.menu?.categories || [])

// Серії бренда без порожніх + к-ть колонок під довгі списки (1–3)
const seriesOf = (brand: any, perCol: number) =>
	(brand?.children || [])
		.filter((s: any) => s.children?.length)
		.map((s: any) => ({ ...s, cols: Math.min(3, Math.ceil(s.children.length / perCol)) }))

// «Каталог»: активний бренд — наведений (за замовчуванням перший)
const catalogIndex = ref(0)
const catalogBrand = computed(() => brands.value[catalogIndex.value] || brands.value[0])
const catalogSeries = computed(() => seriesOf(catalogBrand.value, 12))

const depsOpen = ref(false)
const openedBrand = ref<number | null>(null)
let brandTimer: ReturnType<typeof setTimeout> | null = null
let openTimer: ReturnType<typeof setTimeout> | null = null
let depsTimer: ReturnType<typeof setTimeout> | null = null
const OPEN_DELAY = 160 // мс «hover intent» — щоб меню не відкривалося при випадковому проведенні мишкою

const activeBrand = computed(() => (openedBrand.value !== null ? brands.value[openedBrand.value] : null))
const activeSeries = computed(() => seriesOf(activeBrand.value, 11))

// Центрування мегаменю під активною кнопкою бренда (з обмеженням у межах смуги)
const navInnerRef = ref<HTMLElement>()
const menuRef = ref<HTMLElement>()
const brandRefs = ref<HTMLElement[]>([])
const menuLeft = ref(0)
const setBrandRef = (el: any, i: number) => {
	if (el) brandRefs.value[i] = el
}

function positionMenu(i: number) {
	const nav = navInnerRef.value,
		item = brandRefs.value[i],
		menu = menuRef.value
	if (!nav || !item || !menu) return
	const navBox = nav.getBoundingClientRect()
	const itemBox = item.getBoundingClientRect()
	const center = itemBox.left - navBox.left + itemBox.width / 2
	menuLeft.value = Math.max(0, Math.min(center - menu.offsetWidth / 2, navBox.width - menu.offsetWidth))
}

// Наведення на бренд: якщо меню вже відкрите — перемикаємось одразу; інакше — з затримкою (hover intent)
function openBrand(i: number) {
	if (brandTimer) clearTimeout(brandTimer)
	cancelDeps()
	if (openedBrand.value !== null) return showBrand(i)
	cancelOpen()
	openTimer = setTimeout(() => showBrand(i), OPEN_DELAY)
}

async function showBrand(i: number) {
	cancelOpen()
	if (brandTimer) clearTimeout(brandTimer)
	depsOpen.value = false // «Каталог» і мегаменю не накладаються
	openedBrand.value = i
	await nextTick()
	positionMenu(i)
}

// Дерево моделей прийшло, коли курсор уже на бренді, — меню з'являється саме, ставимо його під кнопку
watch(
	() => activeSeries.value.length,
	async (count: number, prev: number | undefined) => {
		if (!count || prev || openedBrand.value === null) return
		await nextTick()
		positionMenu(openedBrand.value)
	}
)

function cancelOpen() {
	if (openTimer) {
		clearTimeout(openTimer)
		openTimer = null
	}
}

// «Каталог» і меню брендів — взаємовиключні
function openDeps() {
	if (brandTimer) clearTimeout(brandTimer)
	cancelOpen()
	cancelDeps()
	openedBrand.value = null
	depsOpen.value = true
}

function openDepsDelayed() {
	if (openedBrand.value !== null) return openDeps()
	cancelDeps()
	depsTimer = setTimeout(openDeps, OPEN_DELAY)
}

function cancelDeps() {
	if (depsTimer) {
		clearTimeout(depsTimer)
		depsTimer = null
	}
}

function closeDeps() {
	cancelDeps()
	depsOpen.value = false
}

function toggleDeps() {
	if (depsOpen.value) depsOpen.value = false
	else openDeps()
}

function cancelClose() {
	if (brandTimer) clearTimeout(brandTimer)
}

function closeBrand() {
	if (brandTimer) clearTimeout(brandTimer)
	brandTimer = setTimeout(() => (openedBrand.value = null), 120)
}

watch(
	() => route.fullPath,
	() => {
		depsOpen.value = false
		openedBrand.value = null
	}
)

// Тінь під прибитою панеллю — після першого скролу
const stuck = ref(false)

onMounted(() => {
	const onScroll = () => (stuck.value = window.scrollY > 36)
	window.addEventListener('scroll', onScroll, { passive: true })
	onScroll()
	onUnmounted(() => window.removeEventListener('scroll', onScroll))
})
</script>

<style scoped>
/* <header> не утворює власний бокс — смужка, панель, рядок пошуку й смуга брендів стають flex-дітьми .app,
   тож sticky прибиває синю панель відносно всієї сторінки, а не висоти шапки */
.header {
	display: contents;
}

/* ---------- Смужка контактів ---------- */
.header__topbar {
	background: var(--bg-deepest);
	color: var(--on-deep-muted);
	font-size: 13px;
}

.header__topbar-inner {
	display: flex;
	align-items: center;
	gap: 22px;
	height: 36px;
}

.topbar-place {
	white-space: nowrap;
}

.topbar-links {
	display: flex;
	gap: 18px;
	min-width: 0;
	margin-left: auto;
	overflow-x: auto;
	scrollbar-width: none;
}

.topbar-links::-webkit-scrollbar {
	display: none;
}

.topbar-links a,
.topbar-contact {
	white-space: nowrap;
	transition: color 0.15s;
}

.topbar-links a:hover,
.topbar-links a.router-link-active {
	color: var(--on-deep-hover);
}

.topbar-contact {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	flex-shrink: 0;
	padding: 0;
	font-size: inherit;
	font-weight: 800;
	color: var(--on-deep);
}

.topbar-contact:hover {
	color: var(--on-deep-hover);
}

/* Мова — сегментами «Укр | Рус», активна — на тоні смуги брендів (C2) */
.header__topbar :deep(.lang) {
	gap: 2px;
	padding: 0;
	background: transparent;
}

.header__topbar :deep(.lang__item) {
	padding: 2px 8px;
	border-radius: calc(var(--radius-sm) - 4px);
	font-size: 13px;
	color: var(--on-deep-muted);
}

.header__topbar :deep(.lang__item:hover) {
	color: var(--on-deep-hover);
}

.header__topbar :deep(.lang__item.is-active) {
	background: var(--bg-deep-2);
	color: var(--on-deep);
	font-weight: 800;
}

/* ---------- Синя панель ---------- */
.header__main {
	position: sticky;
	top: 0;
	z-index: var(--z-header);
	background: var(--bg-deep);
	color: var(--on-deep);
	transition: box-shadow 0.2s;
}

.header__main.is-stuck {
	box-shadow: 0 6px 20px rgba(var(--shade-rgb), 0.28);
}

/* position: relative — від неї відкривається панель «Каталогу» на всю ширину контейнера */
.header__main-inner {
	position: relative;
	display: flex;
	align-items: center;
	gap: 22px;
	height: var(--header-h);
}

/* align-items: flex-start — інакше svg лого розтягується на ширину колонки й малюється посередині */
.logo {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6px;
	flex-shrink: 0;
}

.logo :deep(.app-logo) {
	height: 20px;
	color: var(--logo-on-deep);
}

.logo__tagline {
	font-size: 10.5px;
	font-weight: 800;
	line-height: 1;
	letter-spacing: 0.21em;
	text-transform: uppercase;
	color: var(--on-deep-muted);
	white-space: nowrap;
}

/* «Каталог» — помаранчева кнопка (головна дія). Обгортка — на всю висоту панелі: курсор іде від кнопки
   до «Каталогу» під панеллю, не виходячи з неї (інакше mouseleave закрив би його дорогою) */
.departments {
	display: flex;
	align-items: center;
	align-self: stretch;
	flex-shrink: 0;
}

.departments__toggle {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 52px;
	padding: 0 20px;
	border-radius: calc(var(--radius-sm) + 4px);
	background: var(--accent);
	color: var(--on-accent);
	font-size: 15px;
	font-weight: 900;
	white-space: nowrap;
	transition: background 0.15s;
}

.departments__toggle:hover,
.departments__toggle.is-open {
	background: var(--accent-hover);
}

/* Панель «Каталогу» під синьою панеллю на всю ширину контейнера (left/right — його поля):
   колонка брендів на синьому, моделі на білому, унизу розділи. Висота обмежена — колонки гортаються */
.departments__panel {
	position: absolute;
	top: 100%;
	left: 20px;
	right: 20px;
	z-index: var(--z-dropdown);
	display: flex;
	flex-direction: column;
	max-height: min(72vh, 600px);
	overflow: hidden;
	background: var(--bg-card);
	border-radius: 0 0 var(--radius) var(--radius);
	box-shadow: var(--shadow-pop);
	color: var(--text);
	transform-origin: top center;
}

.departments__body {
	display: flex;
	flex: 1 1 auto;
	min-height: 0;
}

.departments__brands {
	flex-shrink: 0;
	width: 230px;
	margin: 0;
	padding: 8px 0;
	list-style: none;
	overflow-y: auto;
	background: var(--bg-deep-2);
	scrollbar-width: thin;
}

.departments__brand {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-height: 44px;
	padding: 0 16px 0 20px;
	font-size: 15px;
	font-weight: 800;
	color: var(--on-deep);
	transition: background 0.12s, color 0.12s;
}

.departments__brand :deep(svg) {
	color: var(--on-deep-muted);
}

.departments__brand.is-active {
	background: var(--bg-card);
	color: var(--text);
	box-shadow: inset 4px 0 0 var(--accent);
}

.departments__brand.is-active :deep(svg) {
	color: var(--text-muted);
}

.departments__models {
	flex: 1;
	min-width: 0;
	padding: 14px 24px 20px;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

.departments__all {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	margin: 0 0 12px 10px;
	font-size: 15px;
	font-weight: 900;
	color: var(--link);
}

.departments__all:hover {
	text-decoration: underline;
}

.departments__series {
	display: flex;
	flex-wrap: wrap;
	gap: 16px 22px;
	align-items: flex-start;
}

.departments__foot {
	flex-shrink: 0;
	display: flex;
	gap: 8px 26px;
	flex-wrap: wrap;
	padding: 12px 20px;
	background: var(--bg-soft);
	border-top: 1px solid var(--border);
}

.departments__foot a {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 32px;
	font-size: 14px;
	font-weight: 800;
	color: var(--text);
	transition: color 0.15s;
}

.departments__foot a :deep(svg) {
	color: var(--accent);
}

.departments__foot a:hover {
	color: var(--accent-text);
}

/* Серія з моделями — і в «Каталозі», і в мегаменю бренда */
.serie {
	width: calc(var(--cols, 1) * 184px);
}

.serie__title {
	margin: 2px 0 6px;
	padding: 0 10px 7px;
	font-size: 11.5px;
	font-weight: 900;
	letter-spacing: 0.11em;
	text-transform: uppercase;
	color: var(--accent-text);
	border-bottom: 1px solid var(--border);
}

.serie ul {
	margin: 0;
	padding: 0;
	list-style: none;
	column-count: var(--cols, 1);
	column-gap: 8px;
}

.serie li {
	break-inside: avoid;
}

.serie li a {
	display: block;
	padding: 6px 10px;
	border-radius: var(--radius-sm);
	font-size: 14px;
	font-weight: 600;
	color: var(--text-soft);
	transition: background 0.16s ease, color 0.16s ease;
}

.serie li a:hover {
	background: var(--accent-soft);
	color: var(--accent-text);
}

/* Пошук рушія у вигляді C2: біле поле без рамки, синя кнопка-лупа всередині */
.header__search {
	flex: 1;
	min-width: 0;
}

.header__search :deep(.search__form) {
	height: 52px;
	background: var(--bg-card);
	border: 0;
	border-radius: calc(var(--radius-sm) + 4px);
}

.header__search :deep(.search__form:focus-within) {
	box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.5);
}

.header__search :deep(.search__input) {
	padding: 0 18px;
	font-size: 15.5px;
}

.header__search :deep(.search__clear) {
	margin-right: 8px;
}

.header__search :deep(.search__btn) {
	justify-content: center;
	width: 52px;
	margin: 5px;
	padding: 0;
	border-radius: var(--radius-sm);
	background: var(--bg-deep);
	color: var(--on-deep);
	transition: background 0.15s, color 0.15s;
}

.header__search :deep(.search__btn:hover) {
	background: var(--accent);
	color: var(--on-accent);
}

/* Обране й кошик — іконка з підписом */
.header__actions {
	display: flex;
	gap: 4px;
	flex-shrink: 0;
}

.action-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 3px;
	width: 68px;
	height: 56px;
	border-radius: var(--radius-sm);
	color: var(--on-deep);
	transition: background 0.15s;
}

.action-btn:hover {
	background: rgba(var(--on-overlay-rgb), 0.07);
}

.action-btn__icon {
	position: relative;
	display: flex;
}

.action-btn__label {
	font-size: 12px;
	color: var(--on-deep-muted);
	white-space: nowrap;
}

.action-btn:hover .action-btn__label {
	color: var(--on-deep);
}

.action-btn__count {
	position: absolute;
	top: -6px;
	right: -11px;
	display: grid;
	place-items: center;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	border-radius: var(--radius-pill);
	background: var(--accent);
	color: var(--on-accent);
	font-size: 11px;
	font-weight: 900;
}

/* Мобільні елементи — лише до 1023px / 640px */
.burger,
.header__search-row {
	display: none;
}

/* ---------- Смуга брендів ---------- */
.header__nav {
	background: var(--bg-deep-2);
	color: var(--on-deep);
}

.header__nav-inner {
	position: relative;
	display: flex;
	align-items: stretch;
	height: 52px;
}

.brands-nav__lead {
	align-self: center;
	margin-right: 10px;
	font-weight: 700;
	color: var(--on-deep-muted);
	white-space: nowrap;
}

/* Скільки брендів вміститься — залежить від ширини, мови й самих назв (список — з адмінки), тож без
   лічильників: бренди, що не влазять, переносяться в другий рядок висотою зі смугу, і його не видно.
   Назви не стискаються; решта брендів — в «Усі бренди» */
.brands-nav {
	display: flex;
	flex-wrap: wrap;
	align-items: stretch;
	flex: 0 1 auto;
	min-width: 0;
	overflow: hidden;
}

.brands-nav__item {
	display: flex;
	flex: 0 0 auto;
	height: 100%;
}

.brands-nav__link {
	display: flex;
	align-items: center;
	padding: 0 12px;
	font-size: 15px;
	font-weight: 800;
	color: var(--on-deep);
	white-space: nowrap;
	transition: background 0.15s, color 0.15s;
}

.brands-nav__link:hover,
.brands-nav__link.is-open,
.brands-nav__link.router-link-active {
	color: var(--on-deep-hover);
}

.brands-nav__link.is-open {
	background: rgba(var(--on-overlay-rgb), 0.07);
}

.brands-nav__all {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	margin-left: auto;
	padding-left: 12px;
	font-size: 15px;
	font-weight: 800;
	color: var(--accent);
	white-space: nowrap;
}

.brands-nav__all:hover {
	color: var(--on-deep);
}

/* Мегаменю бренда — прижате до смуги, ширина під кількість моделей.
   left — через :style (центрування під кнопкою), max-width тримає в межах смуги */
.brand-menu {
	position: absolute;
	top: 100%;
	z-index: var(--z-dropdown);
	display: flex;
	flex-direction: column;
	width: max-content;
	max-width: 100%;
	transform-origin: top center;
	background: var(--bg-card);
	border-radius: 0 0 var(--radius) var(--radius);
	box-shadow: var(--shadow-pop);
	color: var(--text);
	overflow: hidden;
	transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.brand-menu__scroll {
	position: relative;
	overflow: hidden auto;
	max-height: min(60vh, 520px);
	padding: 20px 24px;
	scrollbar-gutter: stable;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

.brand-menu__series {
	display: flex;
	flex-wrap: wrap;
	gap: 16px 22px;
	align-items: flex-start;
}

.brand-menu__foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 13px 24px;
	background: var(--bg-soft);
	border-top: 1px solid var(--border);
	color: var(--link);
	font-size: 14px;
	font-weight: 800;
	transition: background 0.16s ease;
}

.brand-menu__foot:hover {
	background: var(--bg-elevated);
}

/* Анімації — як у шапці рушія */
.drop-enter-active {
	transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.drop-leave-active {
	transition: opacity 0.14s ease, transform 0.14s ease;
}

.drop-enter-from,
.drop-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}

.mega-enter-active {
	transition: opacity 0.24s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.mega-leave-active {
	transition: opacity 0.16s ease, transform 0.16s ease;
}

.mega-enter-from,
.mega-leave-to {
	opacity: 0;
	transform: translateY(-10px) scaleY(0.98);
}

/* Перемикання бренда — крос-фейд вмісту; вихідний блок виймаємо з потоку, щоб новий одразу задав висоту */
.tab-enter-active {
	transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-leave-active {
	position: absolute;
	inset: 20px auto auto 24px;
	transition: opacity 0.14s ease;
	pointer-events: none;
}

.tab-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.tab-leave-to {
	opacity: 0;
}

/* Вузькі десктопи: тісніші проміжки, щоб у смузі вміщалося більше брендів */
@media (max-width: 1319px) {
	.header__main-inner {
		gap: 16px;
	}

	.brands-nav__link {
		padding: 0 10px;
		font-size: 14.5px;
	}
}

@media (max-width: 1099px) {
	.header__topbar-inner {
		gap: 16px;
	}

	.topbar-links {
		gap: 14px;
	}

	.departments__toggle {
		padding: 0 16px;
	}

	.action-btn {
		width: 58px;
	}
}

/* ---------- Телефон і планшет ---------- */
@media (max-width: 1023px) {
	.header__topbar,
	.departments,
	.action-btn__label,
	.brand-menu {
		display: none;
	}

	.header__main-inner {
		gap: 4px;
		padding: 0 6px;
	}

	.burger {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		color: var(--on-deep);
	}

	.logo {
		gap: 5px;
		margin: 0 10px 0 2px;
	}

	.logo :deep(.app-logo) {
		height: 17px;
	}

	.logo__tagline {
		font-size: 9.5px;
		letter-spacing: 0.18em;
	}

	.header__search :deep(.search__form) {
		height: 44px;
	}

	.header__search :deep(.search__btn) {
		width: 40px;
		margin: 4px;
	}

	.header__actions {
		gap: 0;
		margin-left: 4px;
	}

	.action-btn {
		width: 44px;
		height: 44px;
	}

	.action-btn__count {
		top: -5px;
		right: -9px;
	}

	/* Смуга брендів — прокрутка пальцем; «Усі бренди» — праворуч, поза прокруткою */
	.header__nav-inner {
		height: 46px;
		padding: 0 8px 0 14px;
	}

	.brands-nav {
		flex: 1 1 auto;
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.brands-nav::-webkit-scrollbar {
		display: none;
	}

	.brands-nav__link {
		padding: 0 11px;
		font-size: 14.5px;
	}

	.brands-nav__all {
		padding: 0 6px 0 12px;
		font-size: 14.5px;
	}
}

/* Телефон: пошук — окремим рядком під прибитою панеллю, лого забирає вільне місце */
@media (max-width: 640px) {
	.header__search {
		display: none;
	}

	.logo {
		flex: 1;
		min-width: 0;
	}

	.header__search-row {
		display: block;
		padding: 0 14px 12px;
		background: var(--bg-deep);
	}

	.search-field {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		height: 48px;
		padding: 0 14px;
		background: var(--bg-card);
		border-radius: calc(var(--radius-sm) + 4px);
		color: var(--text-muted);
		text-align: left;
	}

	.search-field__text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-size: 15px;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.brands-nav__lead {
		display: none;
	}

	.header__nav-inner {
		padding-left: 6px;
	}
}
</style>
