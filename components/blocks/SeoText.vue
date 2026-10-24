<template>
	<!-- SEO-текст головної: h1 сторінки + стаття адмінки (alias index). Окремим блоком, щоб бренд міг
	     перекрити його своїм (brand/components/blocks/SeoText.vue) — напр. коли h1 у першому екрані -->
	<section class="block">
		<div class="container">
			<h1 class="seo-title">{{ t('pageTitle.index') }}</h1>
			<div v-if="article?.text" class="typography seo-text" v-html="contentHtml(article.text)" />
		</div>
	</section>
</template>

<script setup lang="ts">
// Стаття адмінки; false/null — статті немає (лишається лише h1)
defineProps<{ article: any }>()

const { t } = useI18n()
</script>

<style scoped>
.seo-title {
	font-size: 22px;
	margin-bottom: 16px;
}

.seo-text {
	font-size: 14px;
	color: var(--text-muted);
}

.seo-text :deep(h2),
.seo-text :deep(h3) {
	font-size: 17px;
}
</style>
