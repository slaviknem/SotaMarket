// Бокові меню сайта (блог + інфо-сторінки) — єдине джерело пунктів і активного стану.
// Використовують <BlocksSideMenu> (сайдбар статті/інфо) та горизонтальна стрічка блогу.

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

export function useSiteMenus() {
	const { t } = useI18n()
	const localePath = useLocalePath()
	const route = useRoute()

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

	// Меню статичних інфо-сторінок (той самий набір, що в топбарі)
	const blogTo = localePath('/article')
	const infoMenu = computed<SideMenu>(() => {
		const items: { to: string; label: string; active?: boolean }[] = [
			{ to: localePath('/about'), label: t('header.topbar.about') },
			{ to: localePath('/dostavka'), label: t('header.topbar.dostavka') },
			{ to: localePath('/povernennya'), label: t('header.topbar.povernennya') },
			{ to: localePath('/otzyvy-klientov'), label: t('header.topbar.otzyvy') },
			{ to: localePath('/shop/track-order'), label: t('header.topbar.trackOrder') },
			// Блог активний на всіх сторінках блогу (/article та вкладені)
			{ to: blogTo, label: t('header.topbar.blog'), active: route.path === blogTo || route.path.startsWith(blogTo + '/') },
		]
		return {
			title: t('header.topbar.info'),
			items: items.map((i) => ({ ...i, active: i.active ?? route.path === i.to })),
		}
	})

	return { blogMenu, infoMenu }
}
