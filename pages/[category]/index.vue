<template>
	<ShopCategoryPage :category-alias="categoryAlias" />
</template>

<script setup lang="ts">
// Ремаунт при зміні шляху (перехід між категоріями), але не при зміні query (?filter_* — плавно)
definePageMeta({ key: (route) => route.path })

const route = useRoute()
const categoryAlias = computed(() => String(route.params.category))
</script>
