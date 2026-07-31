// Пам'ять обраної мови.
// Тримаємо в cookie (а не в localStorage), бо вибір потрібен уже на SSR —
// інакше сторінка встигла б відрендеритися «не тією» мовою і блимнула б при заміні.

export type SiteLocale = 'uk' | 'ru'

const UK_PREFIX = '/uk'
const COOKIE = 'floy_lang'
const YEAR = 60 * 60 * 24 * 365

// Локаль, зашита в самому URL (стратегія prefix_except_default: ru — без префікса)
export function localeOfPath(path: string): SiteLocale {
	return path === UK_PREFIX || path.startsWith(UK_PREFIX + '/') ? 'uk' : 'ru'
}

// Той самий шлях в іншій локалі (локалізованих аліасів немає — різниця лише в префіксі)
export function pathForLocale(path: string, code: SiteLocale): string {
	const bare = localeOfPath(path) === 'uk' ? path.slice(UK_PREFIX.length) || '/' : path
	return code === 'uk' ? (bare === '/' ? UK_PREFIX : UK_PREFIX + bare) : bare
}

// Сира cookie — потрібна й поза setup (глобальний middleware)
export function useLocaleCookie() {
	return useCookie<SiteLocale | null>(COOKIE, {
		maxAge: YEAR,
		path: '/',
		sameSite: 'lax',
		default: () => null,
	})
}

export function useLocalePref() {
	const route = useRoute()
	const pref = useLocaleCookie()

	// Записуємо ЛИШЕ явний вибір (перемикач або підказка).
	// Просто перехід із пошуку на /uk вибором не вважаємо — інакше випадковий клік
	// назавжди зафіксував би мову.
	const remember = (code: SiteLocale) => {
		pref.value = code
	}

	// Вибору ще не було, а людина потрапила на російську версію — можна разово запропонувати українську
	const needsPrompt = computed(() => !pref.value && localeOfPath(route.path) === 'ru')

	return { pref, remember, needsPrompt }
}
