<template>
	<!-- Мобільне меню SotaMARKET (C2, PLAN-SITE-SOTAMARKET §4): каталог у дві колонки «бренди | моделі»
	     з пошуком моделі зверху; унизу — конструктор та інфо-сторінки. Пропси й стан відкриття — як у меню
	     рушія (components/MobileMenu.vue); дерево моделей довантажує app.vue, щойно меню відкрили -->
	<Teleport to="body">
		<Transition name="drawer">
			<div v-if="open" class="mobile-menu">
				<div class="mobile-menu__backdrop" @click="open = false" />

				<div class="mobile-menu__panel" role="dialog" aria-modal="true" :aria-label="t('header.catalog')">
					<div class="mm-head">
						<div class="mm-head__row">
							<strong class="mm-head__title">{{ t('header.catalog') }}</strong>
							<!-- Мова — угорі: у нижньому куті її закрила б кнопка чату (у рушії чат вище за шторки) -->
							<LangSwitcher />
							<button class="mm-head__close" type="button" :aria-label="t('other.close')" @click="open = false">
								<AppIcon name="close" :size="24" />
							</button>
						</div>
						<label class="mm-find">
							<AppIcon name="search" :size="18" />
							<input v-model="query" class="mm-find__input" type="search" :placeholder="t('header.findModel')" autocomplete="off" />
							<button v-if="query" class="mm-find__clear" type="button" :aria-label="t('search.clear')" @click="query = ''">
								<AppIcon name="close" :size="14" />
							</button>
						</label>
					</div>

					<!-- Пошук моделі — по всьому дереву меню, без запиту: «a17», «16e», «redmi 15» -->
					<div v-if="needle" class="mm-found">
						<NuxtLink v-for="m in found" :key="m.url" :to="toPath(m.url)" class="mm-model" @click="open = false">
							<span>{{ m.title }} <span class="mm-found__brand">{{ m.brand }}</span></span>
							<AppIcon name="chevron-right-sm" :size="12" />
						</NuxtLink>
						<p v-if="!found.length" class="mm-found__empty">{{ t('header.notFound') }}</p>
					</div>

					<div v-else class="mm-body">
						<nav class="mm-brands" :aria-label="t('header.allBrands')">
							<button
								v-for="brand in brands"
								:key="brand.url"
								class="mm-brands__item"
								:class="{ 'is-active': brand.url === activeBrand?.url }"
								type="button"
								:aria-pressed="brand.url === activeBrand?.url"
								@click="activeUrl = brand.url"
							>
								{{ brand.title }}
							</button>
							<NuxtLink v-if="allBrands" :to="toPath(allBrands.url)" class="mm-brands__item mm-brands__item--all" @click="open = false">
								{{ t('header.allBrands') }}
							</NuxtLink>
						</nav>

						<div v-if="activeBrand" class="mm-models">
							<NuxtLink :to="toPath(activeBrand.url)" class="mm-models__all" @click="open = false">
								{{ t('header.allCases', { brand: activeBrand.title }) }}
								<AppIcon name="arrow-right" :size="18" />
							</NuxtLink>
							<template v-for="serie in activeSeries" :key="serie.url">
								<span class="mm-models__serie">{{ serieTitle(serie.title) }}</span>
								<NuxtLink v-for="model in serie.children" :key="model.url" :to="toPath(model.url)" class="mm-model" @click="open = false">
									{{ model.title }}
									<AppIcon name="chevron-right-sm" :size="12" />
								</NuxtLink>
							</template>
							<!-- Дерево ще йде — місце під моделі -->
							<template v-if="!activeSeries.length && activeBrand.hasChildren">
								<span v-for="i in 6" :key="i" class="mm-models__stub skeleton" />
							</template>
						</div>
					</div>

					<div class="mm-foot">
						<NuxtLink :to="localePath('/printcase')" class="mm-foot__create" @click="open = false">
							<AppIcon name="upload" :size="19" />
							{{ t('header.createCase') }}
						</NuxtLink>
						<nav class="mm-foot__links" :aria-label="t('header.topbar.info')">
							<NuxtLink v-for="link in infoLinks" :key="link.to" :to="link.to" @click="open = false">{{ link.label }}</NuxtLink>
						</nav>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ menu: any }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { infoLinks } = useSiteMenus()

const open = useState('mobileMenuOpen', () => false)

const toPath = (url: string) => localePath(url.startsWith('/') ? url : `/${url}`)

// Бренди з меню без хвостового «ВСІ» (каталог усіх брендів /chekhly — окремим пунктом «Усі бренди»)
const isAllBrands = (b: any) => b.url === 'chekhly'
const brands = computed(() => (props.menu?.brends || []).filter((b: any) => !isAllBrands(b)))
const allBrands = computed(() => (props.menu?.brends || []).find(isAllBrands))

// Перший сегмент адреси без мовного префікса: бренд або модель
const segment = computed(() => {
	const parts = route.path.split('/').filter(Boolean)
	return (parts[0] === locale.value ? parts[1] : parts[0]) || ''
})

// Активний бренд: обраний у меню → бренд поточної сторінки (сам бренд або його модель) → перший
const activeUrl = ref<string | null>(null)
const routeBrand = computed(() =>
	brands.value.find(
		(b: any) => b.url === segment.value || b.children?.some((s: any) => s.children?.some((m: any) => m.url === segment.value))
	)
)
const activeBrand = computed(
	() => brands.value.find((b: any) => b.url === activeUrl.value) || routeBrand.value || brands.value[0]
)
const activeSeries = computed(() => (activeBrand.value?.children || []).filter((s: any) => s.children?.length))

// Пошук моделі: без регістру, пробілів і дефісів («a 17» = «A17»), до 60 збігів. Назви в меню бувають
// без серії («17 Air» у серії iPhone), тож шукаємо й за «серія + модель» та «бренд + модель»
const query = ref('')
const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '')
const needle = computed(() => norm(query.value))
const allModels = computed(() =>
	brands.value.flatMap((b: any) =>
		(b.children || []).flatMap((s: any) => {
			const serie = serieTitle(s.title)
			return (s.children || []).map((m: any) => ({
				title: m.title,
				url: m.url,
				brand: serie && serie !== b.title ? `${b.title} · ${serie}` : b.title,
				key: [m.title, serie + m.title, b.title + m.title].map(norm).join('|'),
			}))
		})
	)
)
const found = computed(() => allModels.value.filter((m: { key: string }) => m.key.includes(needle.value)).slice(0, 60))

// Блокуємо скрол сторінки, коли меню відкрите; закрили — наступного разу знову від бренда сторінки
watch(open, (v: boolean) => {
	if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
	if (!v) {
		activeUrl.value = null
		query.value = ''
	}
})
</script>

<style scoped>
.mobile-menu {
	position: fixed;
	inset: 0;
	z-index: var(--z-drawer);
}

.mobile-menu__backdrop {
	position: absolute;
	inset: 0;
	background: rgba(var(--shade-rgb), 0.6);
	backdrop-filter: blur(2px);
}

/* На телефоні — на весь екран, на планшеті — шторка зліва */
.mobile-menu__panel {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	width: min(420px, 100%);
	background: var(--bg-card);
	box-shadow: var(--shadow-pop);
}

/* ---------- Верх: «Каталог», мова, закрити, пошук моделі ---------- */
.mm-head {
	flex-shrink: 0;
	padding: 0 8px 12px 16px;
	background: var(--bg-deep);
	color: var(--on-deep);
}

.mm-head__row {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 58px;
}

.mm-head__title {
	margin-right: auto;
	font-size: 20px;
	font-weight: 900;
}

.mm-head :deep(.lang) {
	gap: 2px;
	padding: 3px;
	background: var(--bg-deep-2);
	border-radius: var(--radius-sm);
}

.mm-head :deep(.lang__item) {
	padding: 4px 10px;
	border-radius: calc(var(--radius-sm) - 3px);
	font-size: 13px;
	color: var(--on-deep-muted);
}

.mm-head :deep(.lang__item.is-active) {
	background: var(--bg-deep);
	color: var(--on-deep);
	font-weight: 800;
}

.mm-head__close {
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	color: var(--on-deep);
}

.mm-find {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 46px;
	margin-right: 8px;
	padding: 0 14px;
	background: var(--bg-card);
	border-radius: calc(var(--radius-sm) + 2px);
	color: var(--text-muted);
}

.mm-find:focus-within {
	box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.5);
}

.mm-find__input {
	flex: 1;
	min-width: 0;
	border: 0;
	outline: none;
	background: transparent;
	font-size: 16px;
	color: var(--text);
}

.mm-find__input::placeholder {
	color: var(--text-muted);
}

/* Нативний хрестик Chrome/Safari прибираємо — свій, як у пошуку рушія */
.mm-find__input::-webkit-search-cancel-button,
.mm-find__input::-webkit-search-decoration {
	-webkit-appearance: none;
	appearance: none;
}

.mm-find__clear {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	width: 26px;
	height: 26px;
	border-radius: var(--radius-pill);
	background: var(--bg-elevated);
	color: var(--text-soft);
}

/* ---------- Каталог у дві колонки ---------- */
.mm-body {
	display: flex;
	flex: 1;
	min-height: 0;
}

.mm-brands {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	width: 132px;
	overflow-y: auto;
	background: var(--bg-deep-2);
	scrollbar-width: none;
}

.mm-brands__item {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	min-height: 48px;
	padding: 0 14px;
	border-bottom: 1px solid var(--border-deep);
	font-size: 15px;
	font-weight: 800;
	color: var(--on-deep);
	text-align: left;
}

.mm-brands__item.is-active {
	background: var(--bg-card);
	color: var(--text);
	font-weight: 900;
	box-shadow: inset 4px 0 0 var(--accent);
}

.mm-brands__item--all {
	color: var(--accent);
}

.mm-models {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	padding: 6px 14px 16px;
	overflow-y: auto;
}

.mm-models__all {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 44px;
	font-weight: 900;
	color: var(--link);
}

.mm-models__serie {
	margin-top: 10px;
	font-size: 11.5px;
	font-weight: 900;
	letter-spacing: 0.11em;
	text-transform: uppercase;
	color: var(--accent-text);
}

.mm-model {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	flex-shrink: 0;
	min-height: 44px;
	border-bottom: 1px solid var(--border);
	font-weight: 700;
	color: var(--text);
}

.mm-model :deep(svg) {
	flex-shrink: 0;
	color: var(--text-muted);
}

.mm-models__stub {
	flex-shrink: 0;
	height: 20px;
	margin: 12px 0;
	border-radius: var(--radius-sm);
}

/* Знайдені моделі — на всю ширину */
.mm-found {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	padding: 6px 16px 16px;
	overflow-y: auto;
}

.mm-found__brand {
	font-weight: 600;
	color: var(--text-muted);
}

.mm-found__empty {
	margin: 16px 0;
	color: var(--text-soft);
}

/* ---------- Низ: конструктор та інфо-сторінки ---------- */
.mm-foot {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex-shrink: 0;
	padding: 12px 14px 8px;
	background: var(--bg-deepest);
	color: var(--on-deep-muted);
}

.mm-foot__create {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	height: 50px;
	border-radius: calc(var(--radius-sm) + 2px);
	background: var(--accent);
	color: var(--on-accent);
	font-size: 16px;
	font-weight: 900;
}

.mm-foot__links {
	display: flex;
	flex-wrap: wrap;
	gap: 0 16px;
	font-size: 14px;
	font-weight: 800;
}

.mm-foot__links a {
	padding: 10px 0;
}

.mm-foot__links a.router-link-active {
	color: var(--on-deep);
}

/* Телефон: меню на весь екран, і кнопка чату (рушій, праворуч унизу) лягає на нижній рядок — лишаємо їй місце */
@media (max-width: 480px) {
	.mm-foot__links {
		padding-right: 64px;
	}
}

/* ---------- Поява ---------- */
.drawer-enter-active,
.drawer-leave-active {
	transition: opacity 0.22s;
}

.drawer-enter-active .mobile-menu__panel,
.drawer-leave-active .mobile-menu__panel {
	transition: transform 0.22s ease;
}

.drawer-enter-from,
.drawer-leave-to {
	opacity: 0;
}

.drawer-enter-from .mobile-menu__panel,
.drawer-leave-to .mobile-menu__panel {
	transform: translateX(-100%);
}
</style>
