<template>
	<div class="app">
		<AppHeader :menu="menu" />

		<main class="app-main">
			<NuxtPage />
		</main>

		<AppFooter />

		<AppNotifications />

		<!-- Разова підказка про українську версію — лише тим, хто ще не обирав мову -->
		<LazyLangBanner v-if="langPromptMounted" />

		<!-- Оверлеї монтуємо лениво — лише коли їх уперше відкрили (не тягнемо в стартовий JS) -->
		<LazyMobileMenu v-if="mobileMenuMounted" :menu="menu" />
		<LazyCartDrawer v-if="cartMounted" />
		<LazyShopPreOrder v-if="preOrderMounted" />

		<!-- Онлайн-чат: відкладений клієнтський віджет.
		     Lazy-чанк вантажиться ПІСЛЯ завантаження сайту (коли браузер простоює)
		     або на першу взаємодію — щоб не додавати ваги в критичний JS. -->
		<ClientOnly>
			<LazyChatWidget v-if="chatReady" />
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
// canonicalQueries — білий список query, які лишаються в hreflang/og:url. Тримаємо його
// однаковим із canonical у usePageSeo: сторінки пагінації самопосилальні (?page збережено),
// а комбінації фільтрів (?filter_*, ?sort) канонізуються на базову адресу.
const head = useLocaleHead({
	identifierAttribute: 'id',
	seo: { canonicalQueries: ['page'] },
	lang: true,
	dir: true,
})

useHead(() => ({
	htmlAttrs: { lang: head.value.htmlAttrs?.lang || locale.value },
	link: head.value.link || [],
	meta: head.value.meta || [],
	// Бренд-суфікс у title не додаємо: домен Google і так показує окремим рядком над заголовком,
	// а назва магазину є в og:site_name та Organization — весь бюджет довжини йде на ключі.
	// Запасний title — лише для сторінок, які не викликали usePageSeo.
	titleTemplate: (chunk?: string) => chunk || `FLOY — ${t('metaTitle.index')}`,
}))

// Магазин як сутність — на КОЖНІЙ сторінці (а не лише на головній): за @id на цей вузол
// посилаються всі Offer (seller), тож пошуковики й AI зшивають товар з продавцем, його
// контактами, соцпрофілями та політикою повернення. Вузол компактний і статичний.
const config = useRuntimeConfig()
const localePath = useLocalePath()
const { contacts, social, phone } = useSiteSettings()

useJsonLd(() => [
	{
		'@context': 'https://schema.org',
		'@type': 'OnlineStore',
		...orgId(config.public.siteUrl as string),
		url: config.public.siteUrl + localePath('/'),
		name: config.public.siteName,
		description: t('metaDescription.index'),
		logo: config.public.siteUrl + '/images/logo.svg',
		image: config.public.siteUrl + '/images/logo.svg',
		email: contacts.value.email,
		telephone: phone.value,
		address: {
			'@type': 'PostalAddress',
			streetAddress: contacts.value.address_street,
			addressLocality: contacts.value.address_city,
			addressCountry: 'UA',
		},
		areaServed: 'UA',
		currenciesAccepted: 'UAH',
		// Соцпрофілі: зв'язують сайт із тими самими акаунтами в графі знань
		// (той самий список, що й в іконках футера — SocialLinks)
		sameAs: [
			social.value.instagram,
			social.value.facebook,
			social.value.telegram,
			social.value.youtube,
		].filter(Boolean),
		// TODO: hasMerchantReturnPolicy (термін повернення, хто платить за пересилку) —
		// Google показує ці умови покупцям, тож вносити їх можна лише з підтверджених
		// даних магазину, а не з тексту статті /povernennya «на око».
	},
	{
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': config.public.siteUrl + '/#website',
		url: config.public.siteUrl + localePath('/'),
		name: config.public.siteName,
		inLanguage: locale.value,
		publisher: orgId(config.public.siteUrl as string),
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${config.public.siteUrl}${localePath('/search')}?q={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	},
])

// Меню вантажиться один раз на SSR і шариться між сторінками
const shopApi = useShopApi()
const { data: menu } = await useAsyncData('menu-' + locale.value, () => shopApi.getMenu(10), {
	watch: [locale],
	default: () => ({ brends: [], categories: [] }),
})

// Оверлеї (кошик-слайдер, мобільне меню) монтуємо лениво — лише коли їх уперше відкрили,
// щоб їхній JS не потрапляв у стартовий бандл.
const { open: cartOpen } = useCartDrawer()
const cartMounted = ref(false)
watch(cartOpen, (v: boolean) => {
	if (v) cartMounted.value = true
})

const { open: preOrderOpen } = usePreOrder()
const preOrderMounted = ref(false)
watch(preOrderOpen, (v: boolean) => {
	if (v) preOrderMounted.value = true
})

const mobileMenuOpen = useState('mobileMenuOpen', () => false)
const mobileMenuMounted = ref(false)
watch(mobileMenuOpen, (v: boolean) => {
	if (v) mobileMenuMounted.value = true
})

// Підказка про мову: чанк вантажиться лише для тих, хто ще не робив вибір і зайшов на ru-версію.
// З паузою — щоб не конкурувати з LCP і не смикати сторінку одразу після відкриття.
const { needsPrompt } = useLocalePref()
const langPromptMounted = ref(false)
onMounted(() => {
	if (needsPrompt.value) setTimeout(() => (langPromptMounted.value = true), 1500)
})

// Відкладений монтаж онлайн-чату: не тягнемо його JS у критичний шлях.
// Активуємо, коли браузер простоює, або на першу взаємодію користувача.
const chatReady = ref(false)
onMounted(() => {
	const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
	const activate = () => {
		if (chatReady.value) return
		chatReady.value = true
		events.forEach((e) => window.removeEventListener(e, activate))
	}
	events.forEach((e) => window.addEventListener(e, activate, { passive: true }))
	if ('requestIdleCallback' in window) (window as any).requestIdleCallback(activate, { timeout: 3000 })
	else setTimeout(activate, 2500)
})
</script>

<style>
.app {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
}

.app-main {
	flex: 1;
	min-height: 50vh;
}
</style>
