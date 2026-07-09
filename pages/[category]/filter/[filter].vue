<template>
	<ShopCategoryPage :category-alias="categoryAlias" :filter-alias="filterAlias" />
</template>

<script setup lang="ts">
// Ремаунт при зміні шляху (перехід між фільтр-сторінками), але не при зміні query (?filter_* — плавно)
definePageMeta({ key: (route) => route.path })

const route = useRoute()
const categoryAlias = computed(() => String(route.params.category))
const filterAlias = computed(() => String(route.params.filter))
</script>
