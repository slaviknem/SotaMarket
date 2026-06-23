<template>
	<div v-if="article" class="container">
		<Breadcrumbs :items="[{ title: article.title }]" />

		<article class="info-page">
			<h1>{{ article.title }}</h1>
			<div class="typography" v-html="article.text" />

			<slot />
		</article>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{ alias: string }>()

const { locale } = useI18n()
const shopApi = useShopApi()

const { data: article } = await useAsyncData(
	`info-${props.alias}-${locale.value}`,
	async () => (await shopApi.getArticleByAlias(props.alias)) ?? false
)

if (!article.value) {
	throw createError({ statusCode: 404, fatal: true })
}

usePageSeo({
	title: () => article.value?.meta_title || article.value?.title || '',
	description: () => article.value?.meta_description || '',
})
</script>

<style scoped>
.info-page {
	max-width: 920px;
	margin: 0 auto;
	padding-bottom: 50px;
}
</style>
