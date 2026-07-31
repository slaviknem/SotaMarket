<template>
	<div class="lang">
		<NuxtLink
			v-for="loc in locales"
			:key="loc.code"
			:to="switchLocalePath(loc.code)"
			class="lang__item"
			:class="{ 'is-active': loc.code === locale }"
			@click="remember(loc.code as SiteLocale)"
		>
			{{ loc.name }}
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
// Явний вибір мови запам'ятовуємо — наступні заходи на сайт відкриються нею
const { remember } = useLocalePref()
</script>

<style scoped>
.lang {
	display: flex;
	gap: 2px;
	background: var(--bg-elevated);
	border-radius: var(--radius-pill);
	padding: 2px;
}

.lang__item {
	padding: 3px 11px;
	border-radius: var(--radius-pill);
	font-size: 12px;
	font-weight: 600;
	color: var(--text-muted);
	transition: all 0.15s;
}

.lang__item:hover {
	color: var(--text);
}

.lang__item.is-active {
	background: var(--accent);
	color: var(--on-accent);
}
</style>
