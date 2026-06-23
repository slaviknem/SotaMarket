<template>
	<nav :aria-label="t('header.bread.home')">
		<ol class="breadcrumbs" itemscope itemtype="https://schema.org/BreadcrumbList">
			<li
				v-for="(item, i) in allItems"
				:key="i"
				itemprop="itemListElement"
				itemscope
				itemtype="https://schema.org/ListItem"
			>
				<NuxtLink v-if="item.url" :to="item.url" itemprop="item">
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

const props = defineProps<{ items: Crumb[] }>()

const { t } = useI18n()
const localePath = useLocalePath()

const allItems = computed<Crumb[]>(() => [
	{ title: t('header.topbar.home'), url: localePath('/') },
	...props.items,
])
</script>

<style scoped>
li {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
</style>
