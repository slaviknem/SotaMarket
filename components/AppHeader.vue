<template>
	<header class="header">
		<!-- Верхня смуга -->
		<div class="header__topbar">
			<div class="container header__topbar-inner">
				<nav class="topbar-links">
					<NuxtLink :to="localePath('/about')">{{ t('header.topbar.about') }}</NuxtLink>
					<NuxtLink :to="localePath('/dostavka')">{{ t('header.topbar.dostavka') }}</NuxtLink>
					<NuxtLink :to="localePath('/povernennya')">{{ t('header.topbar.povernennya') }}</NuxtLink>
					<NuxtLink :to="localePath('/otzyvy-klientov')">{{ t('header.topbar.otzyvy') }}</NuxtLink>
					<NuxtLink :to="localePath('/shop/track-order')">{{ t('header.topbar.trackOrder') }}</NuxtLink>
					<NuxtLink :to="localePath('/article')">{{ t('header.topbar.blog') }}</NuxtLink>
				</nav>

				<div class="topbar-right">
					<a :href="`tel:+38${phoneClean}`" class="topbar-phone">
						<AppIcon name="phone" :size="14" />
						{{ config.public.phone }}
					</a>
					<LangSwitcher />
				</div>
			</div>
		</div>

		<!-- Основна смуга: лого + пошук + дії -->
		<div class="header__main" :class="{ 'is-sticky': isSticky }">
			<div class="container header__main-inner">
				<button class="burger" :aria-label="t('header.topbar.categories')" @click="mobileOpen = true">
					<span /><span /><span />
				</button>

				<NuxtLink :to="localePath('/')" class="logo" aria-label="FLOY">
					<LogoFloy />
				</NuxtLink>

				<SearchBar class="header__search" />

				<div class="header__actions">
					<NuxtLink :to="localePath('/shop/compare')" class="action-btn" :title="$t('other.comparison')">
						<AppIcon name="compare" />
						<span v-if="compare.items.value.length" class="action-btn__count">{{ compare.items.value.length }}</span>
					</NuxtLink>

					<NuxtLink :to="localePath('/shop/wishlist')" class="action-btn" :title="$t('other.wishlist')">
						<AppIcon name="heart" />
						<span v-if="wishlist.items.value.length" class="action-btn__count">{{ wishlist.items.value.length }}</span>
					</NuxtLink>

					<NuxtLink :to="localePath('/shop/cart')" class="action-btn action-btn--cart" :title="$t('cart.cart')">
						<AppIcon name="cart" />
						<span v-if="cartQty" class="action-btn__count">{{ cartQty }}</span>
					</NuxtLink>
				</div>
			</div>
		</div>

		<!-- Навігація: «Категорії» (вертикальний список) + бренди з випадаючими меню -->
		<nav class="header__nav">
			<div ref="navInnerRef" class="container header__nav-inner" @mouseleave="closeBrand">
				<!-- Категорії (departments) -->
				<div class="departments" @mouseleave="closeDeps">
					<button class="departments__toggle" :class="{ 'is-open': depsOpen }" @mouseenter="openDepsDelayed" @click="toggleDeps">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
						{{ t('other.catalog') }}
						<svg class="departments__caret" width="10" height="10" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5 5-5"/></svg>
					</button>

					<Transition name="drop">
						<ul v-if="depsOpen" class="departments__list" @mouseenter="openDeps">
							<li v-for="cat in menu?.categories || []" :key="cat.url">
								<NuxtLink :to="catLink(cat)" class="departments__item" @click="depsOpen = false">
									<span class="departments__dot" aria-hidden="true" />
									<span class="departments__label">{{ cat.title }}</span>
									<svg v-if="cat.url === '/printcase'" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="departments__spark"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>
								</NuxtLink>
							</li>
						</ul>
					</Transition>
				</div>

				<!-- Бренди з випадаючими списками серій/моделей -->
				<div class="brands-nav">
					<div
						v-for="(brand, i) in brands"
						:key="brand.url"
						:ref="(el) => setBrandRef(el, i)"
						class="brands-nav__item"
						@mouseenter="openBrand(i)"
						@mouseleave="cancelOpen"
					>
						<NuxtLink
							:to="brandLink(brand)"
							class="brands-nav__link"
							:class="{ 'is-open': openedBrand === i }"
							@click="closeBrand"
						>
							{{ brand.title }}
							<svg v-if="brand.children?.length" width="9" height="9" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5 5-5"/></svg>
						</NuxtLink>
					</div>
				</div>

				<!-- Випадаюче меню бренда: центрується під кнопкою, ширина під кількість моделей -->
				<Transition name="mega">
					<div
						v-if="activeSeries.length"
						ref="menuRef"
						class="brand-menu"
						:style="{ left: menuLeft + 'px' }"
						@mouseenter="cancelClose"
					>
						<div class="brand-menu__scroll">
							<Transition name="tab">
								<div :key="activeBrand.url" class="brand-menu__series">
									<div
										v-for="serie in activeSeries"
										:key="serie.url"
										class="brand-menu__serie"
										:style="{ '--cols': serie.cols }"
									>
										<div class="brand-menu__serie-title">{{ serie.title.replace(' - Serie', '') }}</div>
										<ul>
											<li v-for="model in serie.children" :key="model.url">
												<NuxtLink :to="localePath(`/${model.url}`)" @click="closeBrand">
													{{ model.title }}
												</NuxtLink>
											</li>
										</ul>
									</div>
								</div>
							</Transition>
						</div>

						<!-- Футер: посилання на всі моделі бренда + охайний край під скролбар -->
						<NuxtLink :to="brandLink(activeBrand)" class="brand-menu__foot" @click="closeBrand">
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
const props = defineProps<{ menu: any }>()

const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const cart = useCart()
const cartQty = cart.quantity
const wishlist = useWishlist()
const compare = useCompare()

const mobileOpen = useState('mobileMenuOpen', () => false)

const phoneClean = computed(() => config.public.phone.replace(/\D/g, ''))

const catLink = (cat: any) =>
	localePath(cat.url.startsWith('/') ? cat.url : `/${cat.url}`)

const brandLink = (brand: any) =>
	localePath(brand.url.startsWith('/') ? brand.url : `/${brand.url}`)

// Меню брендів (бренди з menu.brends; останній «ВСІ» теж лишаємо як посилання)
const brands = computed(() => props.menu?.brends || [])

const depsOpen = ref(false)
const openedBrand = ref<number | null>(null)
let brandTimer: ReturnType<typeof setTimeout> | null = null
let openTimer: ReturnType<typeof setTimeout> | null = null
let depsTimer: ReturnType<typeof setTimeout> | null = null
const OPEN_DELAY = 160 // мс «hover intent» — щоб меню не відкривалося при випадковому проведенні мишкою

const activeBrand = computed(() =>
	openedBrand.value !== null ? brands.value[openedBrand.value] : null
)

// Серії активного бренда: без порожніх + к-ть колонок під довгі списки (1–3)
const activeSeries = computed(() =>
	(activeBrand.value?.children || [])
		.filter((s: any) => s.children?.length)
		.map((s: any) => ({ ...s, cols: Math.min(3, Math.ceil(s.children.length / 11)) }))
)

// Центрування меню під активною кнопкою бренда (з обмеженням у межах смуги)
const navInnerRef = ref<HTMLElement>()
const menuRef = ref<HTMLElement>()
const brandRefs = ref<HTMLElement[]>([])
const menuLeft = ref(0)
const setBrandRef = (el: any, i: number) => { if (el) brandRefs.value[i] = el }

function positionMenu(i: number) {
	const nav = navInnerRef.value, item = brandRefs.value[i], menu = menuRef.value
	if (!nav || !item || !menu) return
	const navBox = nav.getBoundingClientRect()
	const itemBox = item.getBoundingClientRect()
	const center = itemBox.left - navBox.left + itemBox.width / 2
	menuLeft.value = Math.max(0, Math.min(center - menu.offsetWidth / 2, navBox.width - menu.offsetWidth))
}

// Наведення на бренд: якщо меню вже відкрите — перемикаємось одразу;
// інакше відкриваємо з невеликою затримкою (hover intent), щоб не спрацьовувало випадково
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
	depsOpen.value = false // закриваємо меню «Каталог», щоб не накладалися
	openedBrand.value = i
	await nextTick()
	positionMenu(i)
}

// Скасувати відкладене відкриття (курсор пішов з бренда, не дочекавшись затримки)
function cancelOpen() {
	if (openTimer) {
		clearTimeout(openTimer)
		openTimer = null
	}
}

// Меню «Каталог товарів» і меню брендів — взаємовиключні
function openDeps() {
	if (brandTimer) clearTimeout(brandTimer)
	cancelOpen()
	cancelDeps()
	openedBrand.value = null
	depsOpen.value = true
}

// Наведення на кнопку «Каталог»: відкриваємо з тією ж затримкою (hover intent).
// Якщо вже відкрите меню бренда — перемикаємось одразу.
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

// Курсор пішов із зони «Каталогу» — скасувати відкладене відкриття і закрити список
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

// Закриваємо все при зміні роута
const route = useRoute()
watch(
	() => route.fullPath,
	() => {
		depsOpen.value = false
		openedBrand.value = null
	}
)

// Стіки шапка з тінню при скролі
const isSticky = ref(false)

onMounted(() => {
	const onScroll = () => (isSticky.value = window.scrollY > 8)
	window.addEventListener('scroll', onScroll, { passive: true })
	onScroll()
	onUnmounted(() => window.removeEventListener('scroll', onScroll))
})
</script>

<style scoped>
/* <header> не утворює власний бокс — топбар, панель і нав стають flex-дітьми .app.
   Завдяки цьому sticky-панель (.header__main) прибивається відносно всієї сторінки, а не
   висоти шапки: прибивається ЛИШЕ панель з логотипом, а верхня смуга й смуга навігації
   (вона йде після панелі) спокійно йдуть під скрол. */
.header {
	display: contents;
}

.header__topbar {
	background: var(--bg-deep);
	border-bottom: 1px solid var(--border);
	font-size: 12.5px;
}

.header__topbar-inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 36px;
	gap: 12px;
}

.topbar-links {
	display: flex;
	gap: 18px;
	overflow-x: auto;
	scrollbar-width: none;
}

.topbar-links::-webkit-scrollbar {
	display: none;
}

.topbar-links a {
	color: var(--text-muted);
	white-space: nowrap;
	transition: color 0.15s;
}

.topbar-links a:hover {
	color: var(--accent);
}

.topbar-right {
	display: flex;
	align-items: center;
	gap: 16px;
	flex-shrink: 0;
}

.topbar-phone {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: var(--text-soft);
	font-weight: 600;
	white-space: nowrap;
}

.topbar-phone:hover {
	color: var(--accent);
}

.topbar-phone svg {
	color: var(--accent);
}

/* Main bar — єдина прибита до верху панель (логотип + пошук + дії) */
.header__main {
	position: sticky;
	top: 0;
	z-index: 100;
	background: rgba(13, 13, 16, 0.92);
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
	border-bottom: 1px solid var(--border);
	transition: box-shadow 0.2s;
}

.header__main.is-sticky {
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
}

.header__main-inner {
	display: flex;
	align-items: center;
	gap: 26px;
	height: var(--header-h);
}

.logo {
	flex-shrink: 0;
	display: flex;
}

/* Пошук — на всю доступну ширину */
.header__search {
	flex: 1;
	min-width: 0;
}

.header__actions {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-shrink: 0;
}

.action-btn {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	border-radius: var(--radius-sm);
	color: var(--text-soft);
	transition: all 0.15s;
}

.action-btn:hover {
	background: var(--bg-elevated);
	color: var(--accent);
}

.action-btn__count {
	position: absolute;
	top: 2px;
	right: 0;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--accent);
	color: var(--on-accent);
	border-radius: var(--radius-pill);
	font-size: 11px;
	font-weight: 700;
}

/* ---------- Навігація ---------- */
.header__nav {
	background: var(--bg-elevated);
	border-bottom: 1px solid var(--border);
}

.header__nav-inner {
	position: relative;
	display: flex;
	align-items: stretch;
	gap: 10px;
}

/* Категорії (вертикальний випадаючий список) */
.departments {
	position: relative;
	flex-shrink: 0;
}

.departments__toggle {
	position: relative;
	z-index: 96;
	display: inline-flex;
	align-items: center;
	gap: 9px;
	height: 44px;
	padding: 0 22px;
	margin: 5px 0;
	background: var(--accent);
	color: var(--on-accent);
	font-weight: 700;
	font-size: 14px;
	border-radius: var(--radius-sm);
	box-shadow: 0 4px 16px var(--accent-glow);
	transition: background 0.18s, box-shadow 0.18s, border-radius 0.18s;
	min-width: 270px; /* збігається з шириною сайдбара фільтрів (.cat-layout) */
}

.departments__toggle:hover {
	background: var(--accent-hover);
	box-shadow: 0 6px 20px var(--accent-glow);
}

/* Відкритий стан: кнопка зростається з меню — низ без скруглень, без тіні-зазору */
.departments__toggle.is-open {
	background: var(--accent-hover);
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
	box-shadow: none;
}

.departments__caret {
	margin-left: auto;
	transition: transform 0.2s ease;
}

.departments__toggle.is-open .departments__caret {
	transform: rotate(180deg);
}

.departments__list {
	position: absolute;
	top: calc(100% - 5px);
	left: 0;
	z-index: 95;
	width: 100%;
	margin: 0;
	padding: 6px;
	list-style: none;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-top: none;
	border-radius: 0 0 var(--radius) var(--radius);
	box-shadow: var(--shadow-pop);
	transform-origin: top center;
}

.departments__list li {
	position: relative;
}

/* Малопомітний дільник між пунктами (інсет під відступи пункту), ховається на hover */
.departments__list li:not(:last-child)::after {
	content: '';
	position: absolute;
	left: 14px;
	right: 14px;
	bottom: 0;
	height: 1px;
	background: var(--border);
	pointer-events: none;
	transition: opacity 0.12s;
}

.departments__list li:hover::after {
	opacity: 0;
}

.departments__item {
	display: flex;
	align-items: center;
	gap: 11px;
	padding: 11px 14px;
	border-radius: var(--radius-sm);
	font-size: 14px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.12s;
}

.departments__item:hover {
	background: var(--accent-soft);
	color: var(--accent);
}

/* Кружечок-маркер зліва: ледь помітний, на hover — помаранчевий з ореолом */
.departments__dot {
	flex-shrink: 0;
	width: 7px;
	height: 7px;
	border-radius: var(--radius-pill);
	background: var(--text-muted);
	opacity: 0.45;
	transition: background 0.14s ease, opacity 0.14s ease, box-shadow 0.14s ease;
}

.departments__item:hover .departments__dot {
	background: var(--accent);
	opacity: 1;
	box-shadow: 0 0 0 3px var(--accent-soft);
}

/* Назва тягнеться, відтісняючи spark до правого краю */
.departments__label {
	flex: 1;
	min-width: 0;
}

.departments__spark {
	flex-shrink: 0;
	color: var(--accent);
}

/* Бренди */
.brands-nav {
	display: flex;
	align-items: stretch;
	flex: 1;
	overflow: visible;
}

.brands-nav__item {
	position: relative;
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
}

/* Вертикальний роздільник між кнопками */
.brands-nav__item:not(:last-child)::after {
	content: '';
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 1px;
	height: 22px;
	background: rgba(255, 255, 255, 0.08);
	pointer-events: none;
}

.brands-nav__link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 38px;
	padding: 0 15px;
	font-size: 14px;
	font-weight: 600;
	color: var(--text-soft);
	white-space: nowrap;
	border-radius: 10px;
	transition: background 0.18s, color 0.18s, box-shadow 0.18s;
}

.brands-nav__link svg {
	opacity: 0.55;
	transition: transform 0.18s;
}

.brands-nav__link:hover {
	background: rgba(255, 255, 255, 0.06);
	color: var(--text);
}

.brands-nav__link.is-open,
.brands-nav__link.router-link-active {
	background: var(--accent-soft);
	color: var(--accent);
}

.brands-nav__link.is-open svg,
.brands-nav__link.router-link-active svg {
	opacity: 1;
}

.brands-nav__link.is-open svg {
	transform: rotate(180deg);
}

/* Випадаюче меню бренда — прижате до смуги (моноліт), ширина під кількість моделей.
   left задається через :style (центрування під активною кнопкою), max-width тримає в межах смуги. */
.brand-menu {
	position: absolute;
	top: 100%;
	z-index: 95;
	display: flex;
	flex-direction: column;
	width: max-content;
	max-width: 100%;
	transform-origin: top center;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-top: none;
	border-radius: 0 0 var(--radius) var(--radius);
	box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
	overflow: hidden;
	/* плавне ковзання під нову кнопку при перемиканні (під час появи перекривається mega-анімацією) */
	transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Прокручувана область (скролбар обрізається скругленням, низ ховає футер) */
.brand-menu__scroll {
	position: relative;
	overflow: hidden auto;
	max-height: min(60vh, 520px);
	padding: 20px 24px;
	scrollbar-gutter: stable;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

.brand-menu__scroll::-webkit-scrollbar {
	width: 8px;
}

.brand-menu__scroll::-webkit-scrollbar-track {
	background: transparent;
	margin: 14px 0;
}

.brand-menu__scroll::-webkit-scrollbar-thumb {
	background: var(--border-light);
	border-radius: var(--radius-pill);
}

.brand-menu__scroll::-webkit-scrollbar-thumb:hover {
	background: var(--text-muted);
}

.brand-menu__series {
	display: flex;
	flex-wrap: wrap;
	gap: 16px 22px;
	align-items: flex-start;
}

/* Ширина серії та к-ть колонок списку залежать від --cols (1–3) */
.brand-menu__serie {
	width: calc(var(--cols, 1) * 184px);
}

/* Футер меню — посилання «Усі моделі», дає скролбару охайний нижній край */
.brand-menu__foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 13px 24px;
	background: var(--bg-soft);
	border-top: 1px solid var(--border);
	color: var(--text-soft);
	font-size: 13px;
	font-weight: 600;
	transition: background 0.16s ease, color 0.16s ease;
}

.brand-menu__foot:hover {
	background: var(--accent-soft);
	color: var(--accent);
}

.brand-menu__foot svg {
	transition: transform 0.2s ease;
}

.brand-menu__foot:hover svg {
	transform: translateX(3px);
}

.brand-menu__serie-title {
	font-weight: 700;
	font-size: 12px;
	color: var(--accent);
	margin: 2px 0 7px;
	padding: 0 10px 7px;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	border-bottom: 1px solid var(--border);
}

.brand-menu__serie ul {
	margin: 0;
	padding: 0;
	list-style: none;
	column-count: var(--cols, 1);
	column-gap: 8px;
}

.brand-menu__serie li {
	break-inside: avoid;
}

.brand-menu__serie li a {
	display: block;
	padding: 7px 10px;
	border-radius: 8px;
	font-size: 13.5px;
	color: var(--text-soft);
	transition: background 0.16s ease, color 0.16s ease, padding-left 0.16s ease;
}

.brand-menu__serie li a:hover {
	background: var(--accent-soft);
	color: var(--accent);
	padding-left: 15px;
}

/* Анімація списку «Каталог товарів» (розкривається з-під кнопки) */
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

/* Анімація мегаменю брендів (опускається зі смуги) */
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

/* Перемикання «вкладок» — крос-фейд вмісту без стрибка висоти.
   Вихідний блок виймаємо з потоку (absolute), щоб новий одразу задав висоту. */
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

/* Burger */
.burger {
	display: none;
	flex-direction: column;
	justify-content: center;
	gap: 5px;
	width: 42px;
	height: 42px;
	padding: 8px;
	border-radius: var(--radius-sm);
	background: var(--accent);
	box-shadow: 0 4px 14px var(--accent-glow);
	flex-shrink: 0;
	transition: background 0.15s;
}

.burger span {
	display: block;
	height: 2px;
	border-radius: 2px;
	background: var(--on-accent);
}

.burger:hover {
	background: var(--accent-hover);
}

@media (max-width: 1023px) {
	.header__topbar .topbar-links {
		display: none;
	}

	/* Без верхнього меню розтягуємо праву групу: телефон зліва, мова справа */
	.topbar-right {
		flex: 1;
		justify-content: space-between;
	}

	.header__nav {
		display: none;
	}

	.burger {
		display: flex;
	}

	/* Панель з логотипом — світло-сіра (як десктопна смуга навігації).
	   Прибивання до верху працює глобально через sticky на .header (нав на мобільній прихована,
	   тож лишається тільки ця панель). */
	.header__main {
		background: var(--bg-elevated);
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
	}

	.header__main-inner {
		gap: 12px;
		height: 62px;
	}

	.logo :deep(.logo-floy) {
		height: 26px;
	}
}

@media (max-width: 640px) {
	.header__search {
		display: none;
	}

	/* Без пошуку відсуваємо іконки дій до правого краю */
	.header__actions {
		margin-left: auto;
	}
}
</style>
