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
