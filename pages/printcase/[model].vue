<template>
	<PrintcasePage :model-alias="modelAlias" />
</template>

<script setup lang="ts">
// Конструктор під конкретну модель: /printcase/{модель} — головна індексована адреса.
// Ремаунт при переході між моделями посиланням (усередині сторінки модель перемикається
// без навігації, тож цей key там не спрацьовує і намальоване не втрачається).
definePageMeta({ key: (route) => route.path })

const route = useRoute()
const modelAlias = computed(() => String(route.params.model))
</script>
