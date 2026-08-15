<template>
	<Teleport to="body">
		<Transition name="drawer">
			<div v-if="open" class="mobile-menu">
				<div class="mobile-menu__backdrop" @click="open = false" />

				<div class="mobile-menu__panel">
					<div class="mobile-menu__head">
						<NuxtLink :to="localePath('/')" class="mobile-menu__logo" aria-label="FLOY" @click="open = false">
							<LogoFloy />
						</NuxtLink>
						<LangSwitcher />
						<button class="mobile-menu__close" :aria-label="t('other.close')" @click="open = false">
							<AppIcon name="close" :size="20" />
						</button>
					</div>

					<!-- Не другий SearchBar (він один на застосунок), а вхід у той самий
					     повноекранний пошук: закриваємо меню й відкриваємо пошук -->
					<button class="mobile-menu__search" @click="openSearchFromMenu">
						<AppIcon name="search" :size="17" />
						<span>{{ t('header.topbar.searchPlaceholder') }}</span>
					</button>

					<div class="mobile-menu__body">
						<!-- Категорії -->
						<div class="mobile-menu__section">{{ t('header.topbar.categories') }}</div>
						<NuxtLink
							v-for="cat in menu?.categories || []"
							:key="cat.url"
							:to="localePath(cat.url.startsWith('/') ? cat.url : `/${cat.url}`)"
							class="mobile-menu__link"
							@click="open = false"
						>
							{{ cat.title }}
						</NuxtLink>

						<!-- Бренди (акордеон) -->
						<div class="mobile-menu__section">{{ t('other.catalog') }}</div>
						<div v-for="(brand, i) in menu?.brends || []" :key="brand.url">
							<button class="mobile-menu__link mobile-menu__link--btn" @click="toggleBrand(i)">
								{{ brand.title }}
								<svg v-if="brand.children?.length" width="11" height="11" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2" :style="{ transform: openedBrand === i ? 'rotate(180deg)' : '' }"><path d="M1 1l5 5 5-5"/></svg>
							</button>

							<div v-if="openedBrand === i && brand.children?.length" class="mobile-menu__sub">
								<template v-for="serie in brand.children" :key="serie.url">
									<div class="mobile-menu__serie">{{ serie.title.replace(' - Serie', '') }}</div>
									<NuxtLink
										v-for="model in serie.children || []"
										:key="model.url"
										:to="localePath(`/${model.url}`)"
										class="mobile-menu__sub-link"
										@click="open = false"
									>
										{{ model.title }}
									</NuxtLink>
								</template>
							</div>
						</div>

						<!-- Інфо-посилання -->
						<div class="mobile-menu__section">{{ t('footer.information') }}</div>
						<NuxtLink v-for="link in infoLinks" :key="link.to" :to="localePath(link.to)" class="mobile-menu__link" @click="open = false">
							{{ link.title }}
						</NuxtLink>

						<a :href="`tel:+38${phoneDigits}`" class="mobile-menu__phone">
							{{ phone }}
						</a>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
defineProps<{ menu: any }>()

const { t } = useI18n()
const localePath = useLocalePath()
const { phone, phoneDigits } = useSiteSettings()

const open = useState('mobileMenuOpen', () => false)
const openedBrand = ref<number | null>(null)

const { openSearch } = useSearch()

function openSearchFromMenu() {
	open.value = false
	openSearch()
}

const toggleBrand = (i: number) => {
	openedBrand.value = openedBrand.value === i ? null : i
}

const infoLinks = computed(() => [
	{ to: '/about', title: t('header.topbar.about') },
	{ to: '/dostavka', title: t('header.topbar.dostavka') },
	{ to: '/povernennya', title: t('header.topbar.povernennya') },
	{ to: '/otzyvy-klientov', title: t('header.topbar.otzyvy') },
	{ to: '/shop/track-order', title: t('header.topbar.trackOrder') },
	{ to: '/article', title: t('header.topbar.blog') },
])

// Блокуємо скрол сторінки коли меню відкрите
watch(open, (v: boolean) => {
	if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})
</script>

<style scoped>
.mobile-menu {
	position: fixed;
	inset: 0;
	z-index: 1000;
}

.mobile-menu__backdrop {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	backdrop-filter: blur(2px);
}

.mobile-menu__panel {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	width: min(340px, 88vw);
	background: var(--bg-card);
	display: flex;
	flex-direction: column;
	box-shadow: var(--shadow-pop);
}

.mobile-menu__head {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 16px;
	border-bottom: 1px solid var(--border);
}

.mobile-menu__logo {
	display: flex;
	margin-right: auto;
}

.mobile-menu__logo :deep(.logo-floy) {
	height: 26px;
}

.mobile-menu__close {
	display: flex;
	padding: 8px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
}

.mobile-menu__close:hover {
	background: var(--bg-elevated);
	color: var(--text);
}

/* Виглядає як поле пошуку, але це кнопка — відкриває повноекранний пошук */
.mobile-menu__search {
	display: flex;
	align-items: center;
	gap: 10px;
	width: calc(100% - 32px);
	margin: 12px 16px;
	padding: 11px 16px;
	background: var(--bg-soft);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-pill);
	color: var(--text-muted);
	font-size: 14px;
	text-align: left;
}

.mobile-menu__search:hover {
	border-color: var(--accent);
	color: var(--text-soft);
}

.mobile-menu__search svg {
	color: var(--accent);
	flex-shrink: 0;
}

.mobile-menu__body {
	flex: 1;
	overflow-y: auto;
	padding: 8px 0 24px;
}

.mobile-menu__section {
	padding: 16px 16px 7px;
	font-size: 11.5px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.07em;
	color: var(--accent);
}

.mobile-menu__link {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 11px 16px;
	font-size: 14.5px;
	font-weight: 500;
	color: var(--text-soft);
	text-align: left;
}

.mobile-menu__link:active,
.mobile-menu__link:hover {
	background: var(--bg-elevated);
	color: var(--accent);
}

.mobile-menu__link--btn svg {
	transition: transform 0.2s;
}

.mobile-menu__sub {
	background: var(--bg-soft);
	padding: 4px 0;
}

/* Заголовок серії — помаранчевий з нижнім роздільником (як у десктопному мегаменю),
   щоб чітко відділяти групи моделей, а не зливатися зі списком. */
.mobile-menu__serie {
	margin: 6px 16px 4px;
	padding: 0 8px 6px;
	font-size: 11.5px;
	font-weight: 700;
	color: var(--accent);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	border-bottom: 1px solid var(--border);
}

/* Перший заголовок у розкритому бренді — без зайвого відступу зверху */
.mobile-menu__sub > .mobile-menu__serie:first-child {
	margin-top: 2px;
}

.mobile-menu__sub-link {
	display: block;
	padding: 8px 24px;
	font-size: 14px;
	color: var(--text-soft);
}

.mobile-menu__sub-link:hover {
	color: var(--accent);
}

.mobile-menu__phone {
	display: block;
	margin: 18px 16px 0;
	padding: 12px;
	text-align: center;
	background: var(--accent-soft);
	color: var(--accent);
	font-weight: 700;
	border-radius: var(--radius-sm);
}

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
