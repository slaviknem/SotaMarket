<template>
	<div class="np-gallery">
		<!-- Головне фото: на мобільному гортається пальцем (свайп), на десктопі — стрілками.
		     Кожен слайд — окремий дизайн теми (композиція «принт + маска» через NeoPrintImage). -->
		<Swiper
			:modules="modules"
			:slides-per-view="1"
			:navigation="slides.length > 1"
			:observer="true"
			:observe-parents="true"
			:initial-slide="activeIndex"
			class="np-gallery__main"
			@swiper="onSwiper"
			@slide-change="onSlide"
		>
			<SwiperSlide v-for="(slide, i) in slides" :key="slide.id">
				<NeoPrintImage
					:alias="slide.alias"
					:category-alias="categoryAlias"
					:alt="slide.alt"
					big
					:eager="i === initialIndex"
					class="np-gallery__img"
				/>
			</SwiperSlide>
		</Swiper>

		<span v-if="slides.length > 1" class="np-gallery__counter" aria-live="polite">
			{{ current + 1 }} / {{ slides.length }}
		</span>
	</div>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules'
import type { Swiper as SwiperClass } from 'swiper'
// Базовий swiper/css — глобальний (nuxt.config), див. коментар там
import 'swiper/css/navigation'

// Галерея дизайнів теми. Дзеркалить логіку ShopProductGallery, але малює композицію
// неопрінту (NeoPrintImage), а не готове фото зі сховища. Гортання/стрілки = вибір дизайну:
// показане на екрані стає активним товаром сторінки (@select), рівно як на сторінці товару.
export interface INeoPrintSlide {
	id: number
	alias: string | number
	title: string
	alt: string
}

const props = defineProps<{ slides: INeoPrintSlide[]; activeIndex: number; categoryAlias: string }>()
const emit = defineEmits<{ select: [index: number] }>()

const modules = [Navigation]
const swiper = ref<SwiperClass | null>(null)
const current = ref(props.activeIndex)
// Слайд, що рендериться eager (LCP), — активний на першому рендері
const initialIndex = props.activeIndex

const onSwiper = (s: SwiperClass) => (swiper.value = s)

const onSlide = (s: SwiperClass) => {
	current.value = s.activeIndex
	emit('select', s.activeIndex)
}

// Вибір ззовні (клік по мініатюрі в рейлі) — перемотуємо галерею на його слайд
watch(
	() => props.activeIndex,
	(i) => {
		if (swiper.value && swiper.value.activeIndex !== i) swiper.value.slideTo(i)
		current.value = i
	}
)

// Зміна набору слайдів (перехід на іншу модель) — перерахувати Swiper,
// інакше новий слайд інколи лишається порожнім
watch(
	() => props.slides,
	async () => {
		await nextTick()
		swiper.value?.update()
		swiper.value?.slideTo(props.activeIndex, 0)
		current.value = props.activeIndex
	}
)
</script>

<style scoped>
/* min-width:0 дозволяє галереї стискатись у grid-колонці (інакше .swiper-wrapper
   роздуває колонку за ширину екрана — фото вилазить на мобільному) */
.np-gallery {
	position: relative;
	min-width: 0;
	max-width: 100%;
}

.np-gallery__main {
	background: var(--img-bg);
	border-radius: var(--radius-lg);
	overflow: hidden;
	box-shadow: var(--shadow-card);
	padding: 14px;
	width: 100%;
	min-width: 0;
}

.np-gallery__main :deep(.swiper-slide) {
	height: auto;
}

/* Стрілки навігації — лише десктоп (на тач-екранах гортаємо свайпом) */
.np-gallery__main :deep(.swiper-button-next),
.np-gallery__main :deep(.swiper-button-prev) {
	color: var(--accent);
	transform: scale(0.7);
}

@media (max-width: 768px) {
	.np-gallery__main :deep(.swiper-button-next),
	.np-gallery__main :deep(.swiper-button-prev) {
		display: none;
	}
}

/* Лічильник «поточний / усього» — орієнтир, скільки ще дизайнів попереду */
.np-gallery__counter {
	position: absolute;
	right: 14px;
	bottom: 14px;
	z-index: 2;
	padding: 4px 11px;
	border-radius: var(--radius-pill);
	background: var(--bg-card);
	border: 1px solid var(--border);
	color: var(--text-soft);
	font-size: 12.5px;
	font-weight: 600;
}
</style>
