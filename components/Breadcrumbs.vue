<template>
	<nav :aria-label="t('header.bread.nav')">
		<ol class="breadcrumbs" itemscope itemtype="https://schema.org/BreadcrumbList">
			<li
				v-for="(item, i) in allItems"
				:key="i"
				itemprop="itemListElement"
				itemscope
				itemtype="https://schema.org/ListItem"
			>
				<NuxtLink
					v-if="item.url"
					:to="item.url"
					:aria-label="i === 0 ? t('header.topbar.home') : undefined"
					itemprop="item"
				>
					<AppIcon v-if="i === 0" name="home" :size="14" class="crumb-home" />
					<span itemprop="name">{{ item.title }}</span>
				</NuxtLink>
				<span v-else itemprop="name">{{ item.title }}</span>
				<meta itemprop="position" :content="String(i + 1)" />
				<span v-if="i < allItems.length - 1" class="sep">/</span>
			</li>
		</ol>
	</nav>
</template>

<script setup lang="ts">
export interface Crumb {
	title: string
	url?: string
}

// items необов'язковий: коли setup сторінки обривається на createError({ fatal: true })
// (немає категорії/моделі → 404), її `breadcrumbs` лишається неініціалізованим, хоча
// render-функція на нього вже посилається. Сторінку однаково замінює error.vue, тож
// єдиним наслідком був Vue-warn у логах на кожен 404. Порожній список тут — валідний
// стан: крихту з назвою магазину компонент додає сам.
const props = withDefaults(defineProps<{ items?: Crumb[] }>(), {
	items: () => [],
})

const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

// Перший крихт — назва бренду (а не «Головна»): брендовий анкор на головну
// і збіг із BreadcrumbList у JSON-LD.
const allItems = computed<Crumb[]>(() => [
	{ title: config.public.siteName as string, url: localePath('/') },
	...props.items,
])
</script>

<style scoped>
li {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

a {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.crumb-home {
	flex: none;
	opacity: 0.75;
}
</style>
