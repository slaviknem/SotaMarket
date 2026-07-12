<template>
	<!-- Перелінковка товару: принти → фасети → модель → бренд (SSR, crawlable) -->
	<nav v-if="tags.length > 1" class="product-tags" :aria-label="t('productTags.aria')">
		<NuxtLink v-for="tag in tags" :key="tag.to" class="chip" :to="tag.to">{{ tag.title }}</NuxtLink>
	</nav>
</template>

<script setup lang="ts">
const props = defineProps<{ product: any }>()

const { t } = useI18n()
const tags = useProductTags(toRef(props, 'product'))
</script>

<style scoped>
.product-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 20px;
	padding-top: 18px;
	border-top: 1px solid var(--border);
}
</style>
