<template>
	<div class="gallery">
		<!-- Головне фото: на мобільному гортається пальцем (свайп), клік відкриває лайтбокс -->
		<Swiper
			v-if="slides.length"
			:modules="mainModules"
			:slides-per-view="1"
			:thumbs="{ swiper: thumbsSwiper }"
			:navigation="slides.length > 1"
			:observer="true"
			:observe-parents="true"
			class="gallery__main"
			@swiper="onMain"
			@slide-change="onSlide"
		>
			<SwiperSlide v-for="(slide, i) in slides" :key="slide.id">
				<figure class="gallery__figure" @click="openLightbox(i)">
					<AppImage
						:src="url.productBig(slide.file)"
						:alt="slide.alt"
						:title="slide.alt"
						:fetchpriority="i === 0 ? 'high' : 'auto'"
						:loading="i === 0 ? 'eager' : 'lazy'"
						:preload="i === 0"
						:width="600"
						:height="600"
						sizes="(max-width: 768px) 96vw, (max-width: 900px) 460px, 650px"
					/>
					<figcaption class="visually-hidden">{{ slide.alt }}</figcaption>
				</figure>
			</SwiperSlide>
		</Swiper>

		<!-- Товар без фото -->
		<div v-else class="gallery__main">
			<figure class="gallery__figure">
				<AppImage :src="url.productBig(null)" :alt="t('product.image')" :width="600" :height="600" />
			</figure>
		</div>

		<!-- Стрічка мініатюр (синхронізована зі Swiper).
		     Для товарів з одним фото на атрибут це вітрина всіх принтів: клік = вибір принта -->
		<Swiper
			v-if="slides.length > 1"
			:slides-per-view="'auto'"
			:space-between="8"
			:watch-slides-progress="true"
			class="gallery__thumbs"
			@swiper="(s) => (thumbsSwiper = s)"
		>
			<SwiperSlide
				v-for="(slide, i) in slides"
				:key="slide.id"
				class="gallery__thumb"
				role="button"
				tabindex="0"
				:title="slide.label"
				:aria-label="slide.label"
				:aria-current="i === current"
				@keydown.enter="goTo(i)"
				@keydown.space.prevent="goTo(i)"
			>
				<AppImage :src="url.productThumb(slide.file)" :alt="slide.alt" :width="72" :height="72" />
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
						<span class="lb__counter">{{ current + 1 }} / {{ slides.length }}</span>
						<Swiper
							:modules="lbModules"
							:slides-per-view="1"
							:initial-slide="current"
							:zoom="true"
							:navigation="slides.length > 1"
							:pagination="{ clickable: true }"
							class="lb__swiper"
							@slide-change="onSlide"
						>
							<SwiperSlide v-for="slide in slides" :key="slide.id">
								<div class="swiper-zoom-container">
									<AppImage
										:src="url.productBig(slide.file)"
										:alt="slide.alt"
										:title="slide.alt"
										:width="1000"
										:height="1000"
										sizes="(max-width: 900px) 100vw, 900px"
									/>
								</div>
							</SwiperSlide>
						</Swiper>
						<span v-if="currentSlide" class="lb__caption">{{ currentSlide.label }}</span>
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
import type { IGallerySlide } from '~/composables/useProductGallery'
// Базовий swiper/css — глобальний (nuxt.config), див. коментар там
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/thumbs'
import 'swiper/css/zoom'

// Слайди готує useProductGallery: кожен знає свій атрибут і власний опис (alt/title).
// Галерея лише показує їх і повідомляє сторінку, який атрибут зараз на екрані.
const props = defineProps<{ slides: IGallerySlide[]; activeIndex: number }>()

const emit = defineEmits<{ select: [slide: IGallerySlide] }>()

const url = useUrl()
const { t } = useI18n()

const mainModules = [Thumbs, Navigation]
const lbModules = [Navigation, Pagination, Zoom]

const thumbsSwiper = ref<SwiperClass | null>(null)
const mainSwiper = ref<SwiperClass | null>(null)
const current = ref(props.activeIndex)
const lightbox = ref(false)

const currentSlide = computed(() => props.slides[current.value])

const onMain = (s: SwiperClass) => (mainSwiper.value = s)

// Свайп, клік по мініатюрі, стрілки, гортання в лайтбоксі — усе веде сюди:
// показане фото задає обраний атрибут (інакше на екрані один принт, а в кошик іде інший)
const onSlide = (s: SwiperClass) => {
	current.value = s.activeIndex
	if (currentSlide.value) emit('select', currentSlide.value)
}

const goTo = (i: number) => mainSwiper.value?.slideTo(i)

const openLightbox = (i: number) => {
	current.value = i
	lightbox.value = true
}

// Блокування прокрутки сторінки під лайтбоксом; після закриття головне фото
// лишається на тому, до якого догортали в лайтбоксі
watch(lightbox, (open) => {
	if (!import.meta.client) return
	document.body.style.overflow = open ? 'hidden' : ''
	if (!open) mainSwiper.value?.slideTo(current.value, 0)
})

// Вибір атрибута ззовні (чипси) — перемотуємо на його фото
watch(
	() => props.activeIndex,
	(i) => {
		if (mainSwiper.value && mainSwiper.value.activeIndex !== i) mainSwiper.value.slideTo(i)
	}
)

// При зміні набору слайдів (інший атрибут у режимі фотосесії або перехід на інший товар) —
// перерахувати Swiper; без update() новий слайд інколи лишається порожнім («фото не підвантажується»)
watch(
	() => props.slides,
	async () => {
		await nextTick()
		mainSwiper.value?.update()
		if (thumbsSwiper.value && !thumbsSwiper.value.destroyed) thumbsSwiper.value.update()
		mainSwiper.value?.slideTo(props.activeIndex, 0)
		current.value = props.activeIndex
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
/* min-width:0 дозволяє галереї стискатись у grid-колонці (інакше внутрішній
   .swiper-wrapper роздуває колонку за ширину екрана — фото вилазить на мобільному) */
.gallery {
	min-width: 0;
	max-width: 100%;
}

.gallery__main {
	background: var(--img-bg);
	border-radius: var(--radius);
	overflow: hidden;
	border: 1px solid var(--border);
	padding: 5px;
	/* На всю ширину колонки/екрана */
	width: 100%;
	min-width: 0;
}

/* Слайди тягнуться на повну висоту сцени, щоб фото центрувалось */
.gallery__main :deep(.swiper-slide) {
	height: auto;
}

.gallery__figure {
	margin: 0;
	cursor: zoom-in;
	/* Детермінований квадрат (фото зі сховища — 700×700): висота не «стрибає»,
	   не залежить від JS-виміру Swiper і завжди влазить у ширину */
	aspect-ratio: 1;
	width: 100%;
}

.gallery__main :deep(img) {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
	border-radius: var(--radius-sm);
}

/* Стрілки навігації — лише десктоп (на тач-екранах гортаємо свайпом) */
.gallery__main :deep(.swiper-button-next),
.gallery__main :deep(.swiper-button-prev) {
	color: var(--accent);
	transform: scale(0.7);
}

@media (max-width: 768px) {
	.gallery__main :deep(.swiper-button-next),
	.gallery__main :deep(.swiper-button-prev) {
		display: none;
	}
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
.gallery__thumb:focus-visible,
.gallery__thumb.swiper-slide-thumb-active {
	border-color: var(--accent);
	outline: none;
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
	/* Поля сцени: зверху лічильник, з боків стрілки, знизу підпис + пагінація.
	   Решту простору віддаємо фото */
	padding: 56px 76px 84px;
}

.lb__swiper {
	width: 100%;
	height: 100%;
}

.lb__swiper :deep(.swiper-zoom-container) {
	width: 100%;
	height: 100%;
}

/* Фото тягнеться на всю сцену і саме впирається або в її ширину, або у висоту
   (object-fit: contain). Розмір задає контейнер, а не intrinsic-розмір файлу —
   інакше 2x-кандидат зі srcset рендериться вдвічі меншим */
.lb__swiper :deep(img) {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

/* На мобільному гортаємо свайпом — стрілки ховаємо, поля мінімальні */
@media (max-width: 768px) {
	.lb {
		padding: 52px 10px 76px;
	}

	.lb :deep(.swiper-button-next),
	.lb :deep(.swiper-button-prev) {
		display: none;
	}
}

.lb__close {
	position: absolute;
	top: 14px;
	right: 16px;
	z-index: 2;
	display: flex;
	padding: 8px;
	color: var(--on-overlay);
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
	color: var(--on-overlay);
	font-size: 14px;
	opacity: 0.8;
}

/* Назва принта/кольору під фото — у лайтбоксі немає іншого контексту */
.lb__caption {
	position: absolute;
	bottom: 34px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 2;
	max-width: 80vw;
	padding: 7px 16px;
	border-radius: var(--radius-pill);
	background: rgba(0, 0, 0, 0.55);
	color: var(--on-overlay);
	font-size: 14px;
	font-weight: 600;
	text-align: center;
}

.lb :deep(.swiper-button-next),
.lb :deep(.swiper-button-prev) {
	color: var(--on-overlay);
}

.lb :deep(.swiper-pagination-bullet) {
	background: var(--on-overlay);
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
