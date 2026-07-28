<template>
	<!-- Готові файли (SVG-плейсхолдери, стиснені webp-прев'ю) віддаємо як є, повз IPX -->
	<img
		v-if="isRaw"
		:src="rawSrc"
		:alt="alt"
		:title="title"
		:width="width"
		:height="height"
		:loading="loading"
		:fetchpriority="fetchpriority"
		decoding="async"
		@error="onRawError"
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

// .svg — плейсхолдери, .webp — уже стиснені прев'ю зі сховища: IPX для них лише зайвий крок
const isRaw = computed(() => /\.(svg|webp)(\?|$)/i.test(props.src))

// Прев'ю-webp може бути ще не згенероване в адмінці — разово падаємо назад на вихідний jpg
const fallback = ref(false)
watch(() => props.src, () => (fallback.value = false))

const rawSrc = computed(() =>
	fallback.value ? props.src.replace(/\.webp(\?|$)/i, '.jpg$1') : props.src
)

function onRawError() {
	if (/\.webp(\?|$)/i.test(props.src)) fallback.value = true
}

// NuxtImg робить preload сам; для raw-гілки додаємо його вручну (LCP-зображення)
if (props.preload && isRaw.value) {
	useHead({ link: [{ rel: 'preload', as: 'image', href: props.src }] })
}
</script>
