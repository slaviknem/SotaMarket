<template>
	<ShopCategoryPage :category-alias="categoryAlias" />
</template>

<script setup lang="ts">
const route = useRoute()
const categoryAlias = computed(() => String(route.params.category))
</script>
