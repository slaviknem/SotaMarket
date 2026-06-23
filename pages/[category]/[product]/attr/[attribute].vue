<template>
	<ShopProductPage
		:category-alias="categoryAlias"
		:product-alias="productAlias"
		:attribute-alias="attributeAlias"
	/>
</template>

<script setup lang="ts">
const route = useRoute()
const categoryAlias = computed(() => String(route.params.category))
const productAlias = computed(() => String(route.params.product))
const attributeAlias = computed(() => String(route.params.attribute))
</script>
