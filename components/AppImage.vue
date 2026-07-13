<template>
	<!-- SVG-плейсхолдери (no-photo) не проганяємо через IPX -->
	<img
		v-if="isSvg"
		:src="src"
		:alt="alt"
		:title="title"
		:width="width"
		:height="height"
		:loading="loading"
		decoding="async"
	/>
	<NuxtImg
		v-else
		:src="src"
		:alt="alt"
		:title="title"
		:width="width"
		:height="height"
		:sizes="sizes"
		format="webp"
		:loading="loading"
		:fetchpriority="fetchpriority"
		:preload="preload"
		decoding="async"
	/>
</template>

<script setup lang="ts">
// Єдина точка для зображень товарів: WebP + адаптивний srcset через @nuxt/image (IPX),
// з коректним fallback для SVG-плейсхолдерів. Налаштування формату/якості — у nuxt.config.
const props = withDefaults(
	defineProps<{
		src: string
		alt?: string
		title?: string
		width?: number | string
		height?: number | string
		sizes?: string
		loading?: 'lazy' | 'eager'
		fetchpriority?: 'high' | 'low' | 'auto'
		preload?: boolean
	}>(),
	{ alt: '', loading: 'lazy' }
)

const isSvg = computed(() => /\.svg(\?|$)/i.test(props.src))
</script>
