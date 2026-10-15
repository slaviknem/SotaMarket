<template>
	<div class="error-page">
		<div class="container">
			<div class="error-page__num">{{ error?.statusCode || 500 }}</div>
			<h1 class="error-page__title">
				{{ error?.statusCode === 404 ? t('error404.pageNotFound') : t('error404.error') }}
			</h1>
			<p class="text-muted">{{ t('error404.message') }}</p>
			<button class="btn btn-primary btn-lg" @click="handleError">
				{{ t('error404.home') }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t, locale } = useI18n()

// error.vue замінює app.vue цілком, тож lang із useLocaleHead сюди не доходив — <html> без мови
useHead({ htmlAttrs: { lang: locale } })

// Сторінки помилок теж мають осмислений title (інакше — запасний з app.vue) і не індексуються
usePageSeo({
	title: () => (props.error?.statusCode === 404 ? t('error404.pageNotFound') : t('error404.error')),
	description: () => t('error404.message'),
	noindex: true,
})

const handleError = () => clearError({ redirect: '/' })
</script>

<style scoped>
.error-page {
	display: flex;
	align-items: center;
	min-height: 70vh;
	text-align: center;
	padding: 60px 0;
}

.error-page__num {
	font-size: 120px;
	font-weight: 800;
	line-height: 1;
	background: linear-gradient(135deg, var(--accent), var(--accent-hover));
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
	margin-bottom: 12px;
}

.error-page__title {
	font-size: 26px;
}

.error-page .btn {
	margin-top: 18px;
}
</style>
