<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('other.wishlist') }]" />

		<h1>{{ t('other.wishlist') }}</h1>

		<!-- Список живе лише в localStorage → на SSR він порожній. Без ClientOnly Vue гідратує
		     гілку «є товари» поверх серверної гілки «порожньо» (обидві — div) і на контейнері
		     лишається клас .list-empty замість сітки товарів. -->
		<ClientOnly>
			<div v-if="!wishlist.items.value.length" class="list-empty">
				<AppIcon name="heart" :size="60" :stroke-width="1.2" />
				<p>{{ t('other.wishListEmpty') }}</p>
				<NuxtLink :to="localePath('/')" class="btn btn-primary">{{ t('cart.continueShopping') }}</NuxtLink>
			</div>

			<div v-else class="products-grid list-grid products-grid--wide">
				<ProductCard v-for="p in wishlist.items.value" :key="p.id" :product="p" />
			</div>

			<template #fallback>
				<div class="products-grid list-grid products-grid--wide">
					<div v-for="i in 4" :key="i" class="skeleton list-skeleton" />
				</div>
			</template>
		</ClientOnly>
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

/* Каркас до монтування клієнта (візуал — глобальний .skeleton у main.css) */
.list-skeleton {
	height: 340px;
	border-radius: var(--radius);
}
</style>
