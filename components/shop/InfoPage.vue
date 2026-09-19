<template>
	<div v-if="article" class="container">
		<Breadcrumbs :items="[{ title: article.title }]" />

		<div class="side-layout">
			<!-- Меню інфо-сторінок зліва (на мобільному ховається — є в шапці) -->
			<aside class="side-layout__aside">
				<div class="side-layout__aside-panel">
					<BlocksSideMenu :menu="infoMenu" />
				</div>
			</aside>

			<article class="side-layout__content info-page">
				<h1>{{ article.title }}</h1>
				<div class="typography" v-html="contentHtml(article.text)" />

				<slot />
			</article>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{ alias: string }>()

const { locale } = useI18n()
const shopApi = useShopApi()
const { infoMenu } = useSiteMenus()

const { data: article, error } = await useAsyncData(
	`info-${props.alias}-${locale.value}`,
	async () => (await shopApi.getArticleByAlias(props.alias)) ?? false
)

// API не відповів — 503, а не 404 (див. throwIfApiDown у useShopApi)
throwIfApiDown(error.value, 'Article')

if (!article.value) {
	throw createError({ statusCode: 404, fatal: true })
}

usePageSeo({
	title: () => article.value?.meta_title || article.value?.title || '',
	description: () => article.value?.meta_description || '',
})

useBreadcrumbsJsonLd(() => (article.value ? [{ title: article.value.title }] : []))
</script>

<style scoped>
.info-page {
	padding-bottom: 30px;
}
</style>
