<template>
	<div class="app">
		<AppHeader :menu="menu" />

		<main class="app-main">
			<NuxtPage />
		</main>

		<AppFooter />

		<AppNotifications />
		<MobileMenu :menu="menu" />
		<CartDrawer />

		<!-- Онлайн-чат: відкладений клієнтський віджет.
		     Lazy-чанк вантажиться ПІСЛЯ завантаження сайту (коли браузер простоює)
		     або на першу взаємодію — щоб не додавати ваги в критичний JS. -->
		<ClientOnly>
			<LazyChatWidget v-if="chatReady" />
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
const { locale } = useI18n()
const head = useLocaleHead({ identifierAttribute: 'id', seo: true, lang: true, dir: true })

useHead(() => ({
	htmlAttrs: { lang: head.value.htmlAttrs?.lang || locale.value },
	link: head.value.link || [],
	meta: head.value.meta || [],
	titleTemplate: (chunk?: string) => (chunk ? `${chunk} — floy.com.ua` : 'floy.com.ua'),
}))

// Меню вантажиться один раз на SSR і шариться між сторінками
const shopApi = useShopApi()
const { data: menu } = await useAsyncData('menu-' + locale.value, () => shopApi.getMenu(10), {
	watch: [locale],
	default: () => ({ brends: [], categories: [] }),
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
