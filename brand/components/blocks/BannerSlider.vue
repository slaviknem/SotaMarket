<template>
	<!-- Перший екран головної SotaMARKET (C2, PLAN-SITE-SOTAMARKET §4): синій із ледь помітними сотами — рубрика,
	     h1 сторінки, слайдер банерів адмінки й колонка з підбором моделі та конструктором. h1 головної — тут,
	     тож SEO-блок унизу (blocks/SeoText.vue бренду) — h2. Пропси — як у рушійного BannerSlider -->
	<section class="hero">
		<SotaPattern />

		<div class="container hero__inner">
			<SectionHead tag="h1" class="hero__head" :eyebrow="t('index.eyebrow.hero')" :title="t('pageTitle.index')">
				<p class="hero__lead">{{ t('index.lead') }}</p>
			</SectionHead>

			<div class="hero__grid" :class="{ 'hero__grid--no-slider': !banners?.length }">
				<div v-if="banners?.length" class="hero-slider">
					<Swiper
						:modules="modules"
						:slides-per-view="1"
						:loop="banners.length > 1"
						:autoplay="{ delay: 5000, disableOnInteraction: false }"
						:pagination="{ clickable: true }"
						class="hero-slider__swiper"
						@swiper="onSwiper"
					>
						<SwiperSlide v-for="(banner, i) in banners" :key="banner.id">
							<component :is="banner.url ? 'a' : 'div'" :href="url.bannerLink(banner.url)" class="hero-slide">
								<!-- Перший банер — LCP головної: eager + preload. Висоту не передаємо — кадрує CSS
								     (object-fit: cover), як у рушійному BannerSlider -->
								<AppImage
									:src="url.bannerImg(banner.image_file)"
									:alt="banner.title || brand.name"
									class="hero-slide__img"
									:width="1100"
									sizes="sm:100vw md:100vw lg:65vw 2xl:900px"
									resize
									:fetchpriority="i === 0 ? 'high' : undefined"
									:loading="i === 0 ? 'eager' : 'lazy'"
									:preload="i === 0"
								/>
								<template v-if="banner.title || banner.description">
									<span class="hero-slide__scrim" />
									<div class="hero-slide__content">
										<h2 v-if="banner.title" class="hero-slide__title">{{ banner.title }}</h2>
										<p v-if="banner.description" class="hero-slide__desc">{{ banner.description }}</p>
									</div>
								</template>
							</component>
						</SwiperSlide>
					</Swiper>

					<div v-if="banners.length > 1" class="hero-slider__nav">
						<button type="button" class="hero-slider__btn" :aria-label="t('category.prev')" @click="swiper?.slidePrev()">
							<AppIcon name="arrow-right" :size="18" class="hero-slider__prev" />
						</button>
						<button type="button" class="hero-slider__btn hero-slider__btn--next" :aria-label="t('category.next')" @click="swiper?.slideNext()">
							<AppIcon name="arrow-right" :size="18" />
						</button>
					</div>
				</div>

				<div class="hero__side">
					<!-- Підбір моделі: бренди — з меню в HTML (SSR), моделі — з дерева меню (на клієнті, useMenuTree);
					     поки його немає, «Показати дизайни» веде на сторінку бренду -->
					<form class="picker" @submit.prevent="go" @pointerenter="loadTree" @focusin="loadTree">
						<span class="picker__eyebrow">{{ t('index.picker.title') }}</span>
						<div class="picker__fields">
							<label class="picker__field">
								{{ t('index.picker.brand') }}
								<select v-model="brandUrl" class="picker__select">
									<option v-for="b in brands" :key="b.url" :value="b.url">{{ b.title }}</option>
								</select>
							</label>
							<label class="picker__field picker__field--model">
								{{ t('index.picker.model') }}
								<select v-model="modelUrl" class="picker__select" :disabled="!series.length">
									<option value="">{{ series.length ? t('index.picker.choose') : t('index.picker.loading') }}</option>
									<optgroup v-for="s in series" :key="s.url" :label="serieTitle(s.title)">
										<option v-for="m in s.children" :key="m.url" :value="m.url">{{ m.title }}</option>
									</optgroup>
								</select>
							</label>
						</div>
						<button type="submit" class="picker__submit">
							{{ t('index.picker.submit') }}
							<AppIcon name="arrow-right" :size="19" />
						</button>
						<p v-if="often.length" class="picker__often">
							{{ t('index.picker.often') }}
							<NuxtLink v-for="m in often" :key="m.alias" :to="url.category(m.alias)">{{ catTitle(m) }}</NuxtLink>
						</p>
					</form>

					<NuxtLink :to="localePath('/printcase')" class="promo">
						<svg class="promo__case" aria-hidden="true" width="120" height="210" viewBox="0 0 120 210">
							<rect x="3" y="3" width="114" height="204" rx="26" stroke-dasharray="10 9" />
							<rect x="16" y="16" width="36" height="36" rx="12" />
						</svg>
						<span class="promo__text">
							<span class="promo__price">{{ t('index.printcase.price', { price: prices.printcase }) }}</span>
							<strong class="promo__title">{{ t('index.printcase.title') }}</strong>
						</span>
						<span class="promo__cta">
							{{ t('index.printcase.cta') }}
							<AppIcon name="arrow-right" :size="18" />
						</span>
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination } from 'swiper/modules'
import type { Swiper as SwiperClass } from 'swiper'
// Базовий swiper/css — глобальний (nuxt.config), тут лише модульні стилі
import 'swiper/css/pagination'

defineProps<{ banners: any[] | null }>()

const url = useUrl()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const brand = useBrand()
const { prices } = useSiteSettings()
const modules = [Autoplay, Pagination]

// Бренди — з меню, яке вже завантажив app.vue (кеш useAsyncData 'menu-{мова}'); хвостовий «ВСІ» — не бренд.
// Часті моделі — з популярних, які вже взяла сторінка (кеш 'home-models-{мова}'): без запитів
const menu = useNuxtData<any>('menu-' + locale.value).data
const popular = useNuxtData<any[]>('home-models-' + locale.value).data
const brands = computed<{ title: string; url: string }[]>(() => (menu.value?.brends || []).filter((b: any) => b.url !== 'chekhly'))
const often = computed(() => (popular.value || []).slice(0, 3))

// Моделі обраного бренду — з повного дерева меню (useMenuTree: один запит на всі компоненти; app.vue
// і так тягне його, коли браузер простоює, а тут — щойно курсор чи фокус на формі)
const { tree, load: loadTree } = useMenuTree()
const brandUrl = ref(brands.value[0]?.url || '')
const modelUrl = ref('')
const series = computed(() =>
	(tree.value?.find((b: any) => b.url === brandUrl.value)?.children || []).filter((s: any) => s.children?.length)
)
watch(brandUrl, () => (modelUrl.value = ''))

const go = () => navigateTo(url.category(modelUrl.value || brandUrl.value))

// Стрілки — власні кнопки поверх слайдера: керуємо екземпляром, без модуля Navigation
const swiper = shallowRef<SwiperClass | null>(null)
const onSwiper = (s: SwiperClass) => (swiper.value = s)
</script>

<style scoped>
.hero {
	position: relative;
	overflow: hidden;
	background: var(--bg-deep);
	color: var(--on-deep);
}

.hero__inner {
	position: relative;
	padding-top: 30px;
	padding-bottom: 40px;
}

.hero__head {
	margin-bottom: 20px;
}

.hero__lead {
	margin: 0;
	font-size: 15.5px;
	color: var(--on-deep-muted);
}

.hero__grid {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 380px;
	gap: 16px;
}

/* Без банерів (адмінка їх ще не має) — обидві плитки в ряд на всю ширину (два класи — сильніше за
   колонки .hero__grid у медіазапитах нижче) */
.hero__grid.hero__grid--no-slider {
	grid-template-columns: minmax(0, 1fr);
}

.hero__grid--no-slider .hero__side {
	display: grid;
	grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
}

/* ---- Слайдер ---- */
.hero-slider {
	position: relative;
	min-width: 0;
	height: 430px;
	border-radius: var(--radius-lg);
	overflow: hidden;
	background: var(--bg-deep-2);
}

.hero-slider__swiper {
	position: absolute;
	inset: 0;
}

.hero-slide {
	position: relative;
	display: block;
	height: 100%;
}

.hero-slide__img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.hero-slide__scrim {
	position: absolute;
	inset: 0;
	background: var(--scrim-text);
	pointer-events: none;
}

/* Напис — унизу ліворуч, над крапками */
.hero-slide__content {
	position: absolute;
	left: 44px;
	bottom: 58px;
	max-width: 46%;
	display: flex;
	flex-direction: column;
	gap: 10px;
	text-shadow: var(--text-shadow-on-img);
}

.hero-slide__title {
	margin: 0;
	font-size: clamp(20px, 3vw, 30px);
	font-weight: 900;
	line-height: 1.05;
	letter-spacing: -0.01em;
	color: var(--text-on-img);
}

.hero-slide__desc {
	margin: 0;
	font-size: clamp(13px, 1.4vw, 17px);
	color: var(--text-on-img);
}

/* Крапки — «таблетки» внизу ліворуч, активна — довга помаранчева */
.hero-slider :deep(.swiper-pagination.swiper-pagination-horizontal) {
	left: 44px;
	bottom: 26px;
	width: auto;
	display: flex;
	gap: 6px;
}

.hero-slider :deep(.swiper-pagination-bullet) {
	width: 10px;
	height: 6px;
	margin: 0;
	border-radius: 3px;
	background: var(--text-on-img);
	opacity: 0.55;
	transition: width 0.2s, background 0.2s;
}

.hero-slider :deep(.swiper-pagination-bullet-active) {
	width: 30px;
	background: var(--accent);
	opacity: 1;
}

.hero-slider__nav {
	position: absolute;
	right: 20px;
	bottom: 18px;
	z-index: 2;
	display: flex;
	gap: 8px;
}

.hero-slider__btn {
	display: grid;
	place-items: center;
	width: 46px;
	height: 46px;
	border-radius: 50%;
	border: 1px solid rgba(var(--on-overlay-rgb), 0.3);
	background: rgba(var(--on-photo-rgb), 0.45);
	color: var(--on-overlay);
	transition: background 0.15s;
}

.hero-slider__btn:hover {
	background: rgba(var(--on-photo-rgb), 0.7);
}

.hero-slider__btn--next {
	border-color: transparent;
	background: var(--bg-card);
	color: var(--text);
}

.hero-slider__btn--next:hover {
	background: var(--accent);
	color: var(--on-accent);
}

.hero-slider__prev {
	transform: scaleX(-1);
}

/* ---- Колонка: підбір моделі й конструктор ---- */
.hero__side {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
}

.picker {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 22px;
	background: var(--bg-deep-2);
	border-radius: var(--radius-lg);
}

.picker__eyebrow,
.promo__price {
	font-size: 12px;
	font-weight: 900;
	letter-spacing: 0.11em;
	text-transform: uppercase;
}

.picker__eyebrow {
	color: var(--accent);
}

.picker__fields {
	display: flex;
	gap: 8px;
}

/* Поле — білий «чіп» із підписом над вибраним значенням */
.picker__field {
	position: relative;
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
	padding: 7px 12px;
	background: var(--bg-card);
	border-radius: calc(var(--radius-sm) + 2px);
	font-size: 11px;
	font-weight: 900;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--text-muted);
}

.picker__field--model {
	flex: 1.3;
}

.picker__field:focus-within {
	box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.5);
}

.picker__select {
	width: 100%;
	padding: 0 18px 0 0;
	appearance: none;
	background: var(--select-arrow) no-repeat right center;
	border: 0;
	outline: none;
	font-size: 15.5px;
	font-weight: 800;
	letter-spacing: 0;
	text-transform: none;
	text-overflow: ellipsis;
	color: var(--text);
	cursor: pointer;
}

.picker__select:disabled {
	color: var(--text-muted);
	cursor: default;
}

.picker__submit {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	height: 54px;
	border-radius: calc(var(--radius-sm) + 2px);
	background: var(--accent);
	color: var(--on-accent);
	font-size: 16px;
	font-weight: 900;
	transition: background 0.15s;
}

.picker__submit:hover {
	background: var(--accent-hover);
}

.picker__often {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 10px;
	margin: 0;
	font-size: 13.5px;
	color: var(--on-deep-muted);
}

.picker__often a {
	font-weight: 800;
	color: var(--on-deep);
}

.picker__often a:hover {
	color: var(--on-deep-hover);
}

/* Плитка конструктора */
.promo {
	position: relative;
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: space-between;
	gap: 16px;
	min-height: 150px;
	padding: 22px;
	overflow: hidden;
	background: var(--bg-promo);
	border-radius: var(--radius-lg);
	color: var(--on-deep);
}

.promo__case {
	position: absolute;
	right: -6px;
	top: 14px;
	color: rgba(var(--on-overlay-rgb), 0.45);
	transform: rotate(12deg);
	transition: transform 0.25s ease;
}

.promo:hover .promo__case {
	transform: rotate(6deg);
}

.promo__case rect {
	fill: none;
	stroke: currentColor;
	stroke-width: 3;
}

.promo__text {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 4px;
	max-width: 230px;
}

.promo__price {
	color: var(--on-deep-soft);
}

.promo__title {
	font-size: 26px;
	font-weight: 900;
	line-height: 1.1;
}

.promo__cta {
	position: relative;
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	gap: 8px;
	height: 46px;
	padding: 0 18px;
	border-radius: calc(var(--radius-sm) + 2px);
	background: var(--accent);
	color: var(--on-accent);
	font-weight: 900;
	transition: background 0.15s;
}

.promo:hover .promo__cta {
	background: var(--accent-hover);
}

@media (max-width: 1099px) {
	.hero__grid {
		grid-template-columns: minmax(0, 1fr) 340px;
	}
}

/* Планшет: слайдер на всю ширину, під ним плитки в ряд */
@media (max-width: 900px) {
	.hero__grid {
		grid-template-columns: minmax(0, 1fr);
	}

	.hero-slider {
		height: clamp(200px, 50vw, 430px);
	}

	.hero__side {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
	}

	.hero-slide__content {
		left: 5%;
		bottom: 40px;
		max-width: 70%;
	}

	.hero-slider :deep(.swiper-pagination.swiper-pagination-horizontal) {
		left: 5%;
		bottom: 18px;
	}
}

/* Телефон: усе одною колонкою */
@media (max-width: 640px) {
	.hero__inner {
		padding-top: 20px;
		padding-bottom: 24px;
	}

	.hero__head {
		margin-bottom: 14px;
	}

	.hero__lead {
		font-size: 14px;
	}

	.hero__side,
	.hero__grid--no-slider .hero__side {
		display: flex;
		gap: 12px;
	}

	.picker,
	.promo {
		padding: 18px;
	}

	.promo {
		min-height: 0;
	}

	.promo__title {
		font-size: 22px;
	}

	/* Напис на всю ширину знизу — розтяжка знизу вгору, а не зліва */
	.hero-slide__scrim {
		background: linear-gradient(
			to top,
			rgba(var(--shade-rgb), 0.72) 0%,
			rgba(var(--shade-rgb), 0.15) 55%,
			rgba(var(--shade-rgb), 0) 78%
		);
	}

	.hero-slide__content {
		left: 16px;
		right: 16px;
		bottom: 28px;
		max-width: none;
		gap: 2px;
	}

	.hero-slide__title {
		font-size: 22px;
	}

	.hero-slide__desc {
		font-size: 13.5px;
	}

	.hero-slider :deep(.swiper-pagination.swiper-pagination-horizontal) {
		left: 16px;
		bottom: 13px;
		gap: 5px;
	}

	.hero-slider__nav {
		display: none;
	}
}
</style>
