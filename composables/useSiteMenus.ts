// Меню сайта — єдине джерело пунктів: інфо-сторінки (топбар шапки, мобільне меню, футер, бокове
// меню інфо-сторінок), колонка футера «Покупцям», розділи блогу (<BlocksSideMenu> і стрічка блогу).

export interface SideMenuItem {
	to: string
	label: string
	active: boolean
}

export interface SideMenu {
	title: string
	titleTo?: string
	items: SideMenuItem[]
}

// Категорії блогу — єдиний перелік типів статей, які мають сторінку /article/{тип}.
// Решта типів у таблиці articles службові (main, template, printcase): їх беруть за alias,
// лістингу в них немає, тож /article/{такий тип} має віддавати 404, а не порожню сторінку.
export const BLOG_TYPES = ['new', 'akcii', 'review', 'info']

// Інфо-сторінки — порядок однаковий скрізь. footer: false — пункт показує колонка «Покупцям», а не
// «Інформація» (відстеження замовлення)
const INFO_PAGES: { path: string; label: string; footer?: false }[] = [
	{ path: '/about', label: 'header.topbar.about' },
	{ path: '/dostavka', label: 'header.topbar.dostavka' },
	{ path: '/povernennya', label: 'header.topbar.povernennya' },
	{ path: '/otzyvy-klientov', label: 'header.topbar.otzyvy' },
	{ path: '/shop/track-order', label: 'header.topbar.trackOrder', footer: false },
	{ path: '/article', label: 'header.topbar.blog' },
]

// Колонка футера «Покупцям»
const BUYER_PAGES = [
	{ path: '/shop/cart', label: 'cart.cart' },
	{ path: '/shop/wishlist', label: 'other.wishlist' },
	{ path: '/shop/compare', label: 'other.comparison' },
	{ path: '/shop/track-order', label: 'header.topbar.trackOrder' },
	{ path: '/printcase', label: 'printcase.constructor' },
]

export function useSiteMenus() {
	const { t } = useI18n()
	const localePath = useLocalePath()
	const route = useRoute()

	const link = (p: { path: string; label: string }) => ({ to: localePath(p.path), label: t(p.label) })
	const infoLinks = computed(() => INFO_PAGES.map(link))
	const footerInfoLinks = computed(() => INFO_PAGES.filter((p) => p.footer !== false).map(link))
	const buyerLinks = computed(() => BUYER_PAGES.map(link))

	const blogTypes = BLOG_TYPES

	// Меню розділів блогу: активний — і на сторінці категорії, і на статті всередині неї
	const blogMenu = computed<SideMenu>(() => ({
		title: t('header.topbar.blog'),
		titleTo: localePath('/article'),
		items: blogTypes.map((type) => {
			const to = localePath(`/article/${type}`)
			return { to, label: t('blogCategory.' + type), active: route.path === to || route.path.startsWith(to + '/') }
		}),
	}))

	// Бокове меню інфо-сторінок (той самий набір, що в топбарі)
	const infoMenu = computed<SideMenu>(() => {
		const blogTo = localePath('/article')
		return {
			title: t('header.topbar.info'),
			items: infoLinks.value.map((i) => ({
				...i,
				// Блог активний на всіх сторінках блогу (/article та вкладені)
				active: route.path === i.to || (i.to === blogTo && route.path.startsWith(blogTo + '/')),
			})),
		}
	})

	return { blogMenu, infoMenu, infoLinks, footerInfoLinks, buyerLinks }
}
