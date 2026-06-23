<template>
	<ShopCategoryPage category-alias="chekhly" :filter-alias="filterAlias" />
</template>

<script setup lang="ts">
const route = useRoute()
const filterAlias = computed(() => String(route.params.filter))
</script>
