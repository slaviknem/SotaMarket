<template>
	<div class="app">
		<AppHeader :menu="menu" @need-menu="loadMenuTree" />

		<main class="app-main">
			<NuxtPage />
		</main>

		<!-- Футер у HTML повністю (SSR), а гідратується лише коли до нього доскролили:
		     його посилання й контакти статичні, а JS-робота на старті сторінки — ні -->
		<LazyAppFooter hydrate-on-visible />

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
// посилаються всі Offer (seller, повернення, доставка), тож пошуковики й AI зшивають товар
// з продавцем, його контактами, соцпрофілями та умовами покупки.
const config = useRuntimeConfig()
const localePath = useLocalePath()
const { contacts, social, phone, delivery } = useSiteSettings()

// Умова доставки Новою поштою по Україні для діапазону суми замовлення. Тариф і поріг
// безкоштовної доставки — з налаштувань адмінки, тих самих, що рахує кошик: Google звіряє
// розмітку з ціною на оформленні.
const npConditions = (orderValue: object, rate: number) => ({
	'@type': 'ShippingConditions',
	shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' },
	orderValue: { '@type': 'MonetaryAmount', currency: 'UAH', ...orderValue },
	shippingRate: { '@type': 'MonetaryAmount', value: rate, currency: 'UAH' },
	transitTime: {
		'@type': 'ServicePeriod',
		duration: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
	},
})

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
		// Повернення (підтверджено магазином): 14 днів поштою, пересилку назад оплачує покупець,
		// а брак чи наша помилка — за наш рахунок. Індивідуальний друк перекриває це на своєму
		// Offer (PrintcasePage) — його не повертають.
		hasMerchantReturnPolicy: {
			'@type': 'MerchantReturnPolicy',
			...returnPolicyId(config.public.siteUrl as string),
			applicableCountry: 'UA',
			returnPolicyCountry: 'UA',
			returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
			merchantReturnDays: 14,
			returnMethod: 'https://schema.org/ReturnByMail',
			returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
			itemDefectReturnFees: 'https://schema.org/FreeReturn',
			merchantReturnLink: config.public.siteUrl + localePath('/povernennya'),
		},
		// Доставка — лише Новою поштою: у Укрпошти до порогу «за тарифом», точної ціни немає,
		// а за порогом обидві безкоштовні (Google однаково показує найдешевший і найшвидший варіант)
		hasShippingService: {
			'@type': 'ShippingService',
			...shippingServiceId(config.public.siteUrl as string),
			name: t('cart.titleNovaPochta'),
			shippingConditions: [
				npConditions(
					{ minValue: 0, maxValue: delivery.value.free_delivery_from - 0.01 },
					delivery.value.n_pochta.delivery
				),
				npConditions({ minValue: delivery.value.free_delivery_from }, 0),
			],
		},
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

// Меню. У SSR (а отже, в payload КОЖНОЇ сторінки) — лише верхній рівень: бренди й категорії.
// Повне дерево бренд → серії → моделі (880 моделей, ~90 КБ) малюють тільки мегаменю при
// наведенні й мобільне меню після відкриття — у HTML його й раніше не було, воно лише
// роздувало payload. Тож дерево дотягуємо на клієнті (loadMenuTree), коли браузер простоює.
// categories лишаються повністю — їх читає ще й useProductTags через useNuxtData
const shopApi = useShopApi()
const { data: menuShell } = await useAsyncData('menu-' + locale.value, () => shopApi.getMenu(10), {
	watch: [locale],
	default: () => ({ brends: [], categories: [] }),
	transform: (m: any) => ({
		categories: m?.categories || [],
		brends: (m?.brends || []).map((b: any) => ({ title: b.title, url: b.url, hasChildren: !!b.children?.length })),
	}),
})

const menuTree = shallowRef<any[] | null>(null)
let menuTreeRequest: Promise<void> | null = null

function loadMenuTree() {
	if (!import.meta.client || menuTree.value || menuTreeRequest) return
	const lang = locale.value
	menuTreeRequest = shopApi
		.getMenu(10)
		.then((m: any) => {
			// Поки йшов запит, мову могли перемкнути — чуже дерево не підставляємо
			if (lang === locale.value && Array.isArray(m?.brends)) menuTree.value = m.brends
		})
		.catch(() => {})
		.finally(() => (menuTreeRequest = null))
}

// Назви серій і моделей локалізовані — після зміни мови дерево вантажимо заново
watch(locale, () => {
	menuTree.value = null
	menuTreeRequest = null
	loadMenuTree()
})

const menu = computed(() => (menuTree.value ? { ...menuShell.value, brends: menuTree.value } : menuShell.value))

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
	if (!v) return
	mobileMenuMounted.value = true
	loadMenuTree() // якщо ще не встигло підтягнутись у простої
})

// Дерево меню — коли браузер простоює після завантаження (до наведення на бренд воно,
// як правило, вже є; якщо ні — шапка й мобільне меню попросять його самі)
onMounted(() => {
	if ('requestIdleCallback' in window) (window as any).requestIdleCallback(loadMenuTree, { timeout: 4000 })
	else setTimeout(loadMenuTree, 3000)
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
