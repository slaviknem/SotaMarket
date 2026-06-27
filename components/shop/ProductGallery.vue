<template>
	<div class="gallery">
		<!-- Головне фото: на мобільному гортається пальцем (свайп), клік відкриває лайтбокс -->
		<Swiper
			:modules="mainModules"
			:slides-per-view="1"
			:auto-height="true"
			:thumbs="{ swiper: thumbsSwiper }"
			:pagination="{ clickable: true }"
			:navigation="images.length > 1"
			class="gallery__main"
			@swiper="onMain"
			@slide-change="onSlide"
		>
			<SwiperSlide v-for="(img, i) in images" :key="img.id">
				<figure class="gallery__figure" @click="openLightbox(i)">
					<AppImage
						:src="url.productBig(img.image_file)"
						:alt="captionFor(i)"
						:fetchpriority="i === 0 ? 'high' : 'auto'"
						:loading="i === 0 ? 'eager' : 'lazy'"
						:preload="i === 0"
						:width="600"
						:height="600"
					/>
					<figcaption class="visually-hidden">{{ captionFor(i) }}</figcaption>
				</figure>
			</SwiperSlide>
		</Swiper>

		<!-- Стрічка мініатюр (синхронізована зі Swiper) -->
		<Swiper
			v-if="images.length > 1"
			:slides-per-view="'auto'"
			:space-between="8"
			:watch-slides-progress="true"
			class="gallery__thumbs"
			@swiper="(s) => (thumbsSwiper = s)"
		>
			<SwiperSlide v-for="(img, i) in images" :key="img.id" class="gallery__thumb">
				<AppImage :src="url.productThumb(img.image_file)" :alt="captionFor(i)" :width="72" :height="72" />
			</SwiperSlide>
		</Swiper>

		<!-- Лайтбокс: повноекранний перегляд зі свайпом + зумом (тільки на клієнті) -->
		<ClientOnly>
			<Teleport to="body">
				<Transition name="lb">
					<div v-if="lightbox" class="lb" @click.self="lightbox = false">
						<button class="lb__close" :aria-label="t('other.close')" @click="lightbox = false">
							<AppIcon name="close" :size="22" />
						</button>
						<span class="lb__counter">{{ current + 1 }} / {{ images.length }}</span>
						<Swiper
							:modules="lbModules"
							:slides-per-view="1"
							:initial-slide="current"
							:zoom="true"
							:navigation="images.length > 1"
							:pagination="{ clickable: true }"
							class="lb__swiper"
							@slide-change="onSlide"
						>
							<SwiperSlide v-for="(img, i) in images" :key="img.id">
								<div class="swiper-zoom-container">
									<AppImage
										:src="url.productBig(img.image_file)"
										:alt="captionFor(i)"
										:width="1000"
										:height="1000"
									/>
								</div>
							</SwiperSlide>
						</Swiper>
					</div>
				</Transition>
			</Teleport>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Thumbs, Navigation, Pagination, Zoom } from 'swiper/modules'
import type { Swiper as SwiperClass } from 'swiper'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/thumbs'
import 'swiper/css/zoom'

const props = defineProps<{ images: any[]; alt: string }>()

const url = useUrl()
const { t } = useI18n()

const mainModules = [Thumbs, Navigation, Pagination]
const lbModules = [Navigation, Pagination, Zoom]

const thumbsSwiper = ref<SwiperClass | null>(null)
const mainSwiper = ref<SwiperClass | null>(null)
const current = ref(0)
const lightbox = ref(false)

// Описовий підпис кожного фото — для SEO/доступності та alt
const captionFor = (i: number) => (props.images.length > 1 ? `${props.alt} — фото ${i + 1}` : props.alt)

const onMain = (s: SwiperClass) => (mainSwiper.value = s)
const onSlide = (s: SwiperClass) => (current.value = s.activeIndex)

const openLightbox = (i: number) => {
	current.value = i
	lightbox.value = true
}

// Блокування прокрутки сторінки під лайтбоксом
watch(lightbox, (open) => {
	if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})

// При зміні набору зображень (вибір атрибута) — повертаємось на перше
watch(
	() => props.images,
	() => {
		current.value = 0
		mainSwiper.value?.slideTo(0, 0)
	}
)

const onKey = (e: KeyboardEvent) => {
	if (e.key === 'Escape') lightbox.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKey)
	if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.gallery__main {
	background: var(--img-bg);
	border-radius: var(--radius);
	overflow: hidden;
	border: 1px solid var(--border);
	padding: 5px;
}

.gallery__figure {
	margin: 0;
	cursor: zoom-in;
}

.gallery__main :deep(img) {
	display: block;
	width: 100%;
	height: auto;
	object-fit: contain;
	border-radius: var(--radius-sm);
}

/* Стрілки навігації (десктоп) */
.gallery__main :deep(.swiper-button-next),
.gallery__main :deep(.swiper-button-prev) {
	color: var(--accent);
	transform: scale(0.7);
}

.gallery__main :deep(.swiper-pagination-bullet-active) {
	background: var(--accent);
}

.gallery__thumbs {
	margin-top: 10px;
}

.gallery__thumb {
	width: 70px;
	height: 70px;
	border-radius: var(--radius-sm);
	overflow: hidden;
	background: var(--img-bg);
	border: 2px solid var(--border);
	cursor: pointer;
	transition: border-color 0.15s;
}

.gallery__thumb :deep(img) {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.gallery__thumb:hover,
.gallery__thumb.swiper-slide-thumb-active {
	border-color: var(--accent);
}

/* ---- Лайтбокс ---- */
.lb {
	position: fixed;
	inset: 0;
	z-index: 1200;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.92);
	backdrop-filter: blur(2px);
}

.lb__swiper {
	width: 100%;
	height: 100%;
}

.lb__swiper :deep(.swiper-zoom-container) {
	width: 100%;
	height: 100%;
}

.lb__swiper :deep(img) {
	max-width: 92vw;
	max-height: 88vh;
	width: auto;
	height: auto;
	object-fit: contain;
}

.lb__close {
	position: absolute;
	top: 14px;
	right: 16px;
	z-index: 2;
	display: flex;
	padding: 8px;
	color: #fff;
	background: rgba(255, 255, 255, 0.12);
	border-radius: var(--radius-pill);
}

.lb__close:hover {
	background: rgba(255, 255, 255, 0.22);
}

.lb__counter {
	position: absolute;
	top: 20px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 2;
	color: #fff;
	font-size: 14px;
	opacity: 0.8;
}

.lb :deep(.swiper-button-next),
.lb :deep(.swiper-button-prev) {
	color: #fff;
}

.lb :deep(.swiper-pagination-bullet) {
	background: #fff;
	opacity: 0.5;
}

.lb :deep(.swiper-pagination-bullet-active) {
	background: var(--accent);
	opacity: 1;
}

.lb-enter-active,
.lb-leave-active {
	transition: opacity 0.2s;
}

.lb-enter-from,
.lb-leave-to {
	opacity: 0;
}
</style>
