<template>
	<ShopCategoryPage :category-alias="categoryAlias" :filter-alias="filterAlias" />
</template>

<script setup lang="ts">
const route = useRoute()
const categoryAlias = computed(() => String(route.params.category))
const filterAlias = computed(() => String(route.params.filter))
</script>
