<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('other.wishlist') }]" />

		<h1>{{ t('other.wishlist') }}</h1>

		<div v-if="!wishlist.items.value.length" class="list-empty">
			<AppIcon name="heart" :size="60" :stroke-width="1.2" />
			<p>{{ t('other.wishListEmpty') }}</p>
			<NuxtLink :to="localePath('/')" class="btn btn-primary">{{ t('cart.continueShopping') }}</NuxtLink>
		</div>

		<div v-else class="products-grid list-grid products-grid--wide">
			<ProductCard v-for="p in wishlist.items.value" :key="p.id" :product="p" />
		</div>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const wishlist = useWishlist()

usePageSeo({ title: () => t('other.wishlist'), noindex: true })
</script>

<style scoped>
.list-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	padding: 60px 20px 80px;
	color: var(--text-muted);
}

.list-grid {
	padding-bottom: 40px;
}
</style>
