<template>
	<!-- SEO-текст головної SotaMARKET (C2): біла панель — заголовок ліворуч, стаття адмінки праворуч.
	     h1 сторінки — у першому екрані (blocks/BannerSlider.vue бренду), тут — h2. Стаття довга: показуємо
	     початок, решта — «Читати далі»; уся вона в HTML (SSR), згортання — лише стилями -->
	<section v-if="article?.text" class="block" :aria-labelledby="titleId">
		<div class="container">
			<div class="seo-box">
				<h2 :id="titleId" class="seo-box__title">{{ t('index.seoTitle', { brand: brand.name }) }}</h2>
				<div class="seo-box__body">
					<div :id="textId" class="typography seo-box__text" :class="{ 'is-open': open }" v-html="contentHtml(article.text)" />
					<button class="seo-box__toggle" type="button" :aria-expanded="open" :aria-controls="textId" @click="open = !open">
						{{ open ? t('index.readLess') : t('index.readMore') }}
						<AppIcon name="chevron-down" :size="18" class="seo-box__caret" />
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
// Пропси — як у рушійного SeoText
defineProps<{ article: any }>()

const { t } = useI18n()
const brand = useBrand()
const titleId = useId()
const textId = useId()
const open = ref(false)
</script>

<style scoped>
.seo-box {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
	gap: 16px 48px;
	padding: 36px 40px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-lg);
}

.seo-box__title {
	margin: 0;
	font-size: 26px;
	font-weight: 900;
	line-height: 1.2;
}

.seo-box__body {
	min-width: 0;
}

/* Згорнуто — перші ~12 рядків із розтанням донизу */
.seo-box__text {
	max-height: 300px;
	overflow: hidden;
	color: var(--text-soft);
	-webkit-mask-image: linear-gradient(to bottom, var(--bg-card) 70%, transparent);
	mask-image: linear-gradient(to bottom, var(--bg-card) 70%, transparent);
}

.seo-box__text.is-open {
	max-height: none;
	-webkit-mask-image: none;
	mask-image: none;
}

.seo-box__toggle {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-top: 10px;
	padding: 0;
	font-size: inherit;
	font-weight: 900;
	color: var(--link);
}

.seo-box__toggle:hover {
	text-decoration: underline;
}

.seo-box__caret {
	transition: transform 0.2s;
}

.seo-box__toggle[aria-expanded='true'] .seo-box__caret {
	transform: rotate(180deg);
}

@media (max-width: 900px) {
	.seo-box {
		grid-template-columns: minmax(0, 1fr);
		padding: 26px 24px;
	}
}

@media (max-width: 640px) {
	.seo-box {
		padding: 20px 16px;
	}

	.seo-box__title {
		font-size: 22px;
	}
}
</style>
