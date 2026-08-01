<template>
	<!-- Готові файли (SVG-плейсхолдери, стиснені webp-прев'ю) віддаємо як є, повз IPX -->
	<img
		v-if="isRaw"
		:src="finalSrc"
		:srcset="srcset"
		:alt="alt"
		:title="title"
		:width="width"
		:height="height"
		:loading="loading"
		:fetchpriority="fetchpriority"
		decoding="async"
		@error="onError"
	/>
	<NuxtImg
		v-else
		:src="finalSrc"
		:alt="alt"
		:title="title"
		:width="width"
		:height="height"
		:sizes="sizes"
		format="webp"
		:loading="loading"
		:fetchpriority="fetchpriority"
		:preload="preloadOptions"
		decoding="async"
		@error="onError"
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
		// Готовий srcset для файлів повз IPX (кадри чохла 1x/2x із /img/neoprint)
		srcset?: string
		loading?: 'lazy' | 'eager'
		fetchpriority?: 'high' | 'low' | 'auto'
		preload?: boolean
		// webp-джерело, яке все одно треба зменшити (повнорозмірний шаблон принта
		// 1100×2100) — пускаємо через IPX попри розширення
		resize?: boolean
	}>(),
	{ alt: '', loading: 'lazy' }
)

// .svg — плейсхолдери, .webp — уже стиснені прев'ю зі сховища: IPX для них лише зайвий крок
const isRaw = computed(
	() => /\.svg(\?|$)/i.test(props.src) || (/\.webp(\?|$)/i.test(props.src) && !props.resize)
)

// Стиснений webp може бути ще не згенерований в адмінці — разово падаємо назад на вихідний jpg.
// Сховище на неіснуючий файл віддає HTML зі статусом 200, тож ловимо саме помилку декодування
const fallback = ref(false)
watch(() => props.src, () => (fallback.value = false))

const finalSrc = computed(() =>
	fallback.value ? props.src.replace(/\.webp(\?|$)/i, '.jpg$1') : props.src
)

function onError() {
	if (/\.webp(\?|$)/i.test(props.src)) fallback.value = true
}

// Preload зображення БЕЗ fetchpriority браузер ставить у чергу з низьким пріоритетом —
// і саме він виграє гонку, а `fetchpriority="high"` на самому <img> вже нічого не піднімає
// (запит один і той самий). Тому preload завжди йде з високим пріоритетом.
const preloadOptions = computed(() =>
	props.preload ? { fetchPriority: props.fetchpriority || 'high' } : false
)

// NuxtImg робить preload сам (preloadOptions вище); для raw-гілки додаємо його вручну.
// imagesrcset обов'язковий за наявності srcset — інакше на retina браузер завантажить
// і preload-кандидата 1x, і потрібний йому 2x
if (props.preload && isRaw.value) {
	useHead({
		link: [
			{
				rel: 'preload',
				as: 'image',
				href: props.src,
				fetchpriority: props.fetchpriority || 'high',
				...(props.srcset ? { imagesrcset: props.srcset } : {}),
			},
		],
	})
}
</script>
