<template>
	<section v-if="banners?.length" class="banner-hero">
		<div class="container">
			<div class="banner-hero__grid">
				<!-- Головний слайдер (обгортка тримає ширину grid-колонки) -->
				<div class="banner-hero__main">
					<Swiper
						:modules="modules"
						:slides-per-view="1"
						:loop="banners.length > 1"
						:autoplay="{ delay: 5000, disableOnInteraction: false }"
						:pagination="{ clickable: true }"
						class="banner-swiper"
					>
						<SwiperSlide v-for="(banner, i) in banners" :key="banner.id">
							<component
								:is="banner.url ? 'a' : 'div'"
								:href="banner.url || undefined"
								class="banner-slide"
							>
								<img
									:src="url.bannerImg(banner.image_file)"
									:alt="banner.title || 'FLOY'"
									class="banner-slide__img"
									width="1300"
									height="400"
									:fetchpriority="i === 0 ? 'high' : 'auto'"
									:loading="i === 0 ? 'eager' : 'lazy'"
								/>
								<div v-if="banner.title || banner.description" class="banner-slide__content">
									<h2 v-if="banner.title" class="banner-slide__title">{{ banner.title }}</h2>
									<p v-if="banner.description" class="banner-slide__desc">{{ banner.description }}</p>
								</div>
							</component>
						</SwiperSlide>
					</Swiper>
				</div>

				<!-- Бічні промо-плитки (доставка) -->
				<aside class="banner-hero__side">
					<NuxtLink :to="localePath('/dostavka')" class="promo-tile">
						<span class="promo-tile__icon"><AppIcon name="truck" :size="28" /></span>
						<span class="promo-tile__body">
							<span class="promo-tile__title">{{ t('index.deliveryNova') }}</span>
							<span class="promo-tile__sub">{{ t('index.deliveryNovaInfo') }}</span>
						</span>
						<AppIcon name="arrow-right" :size="18" class="promo-tile__go" />
					</NuxtLink>

					<NuxtLink :to="localePath('/dostavka')" class="promo-tile">
						<span class="promo-tile__icon"><AppIcon name="map-pin" :size="28" /></span>
						<span class="promo-tile__body">
							<span class="promo-tile__title">{{ t('index.deliveryUkr') }}</span>
							<span class="promo-tile__sub">{{ t('index.deliveryUkrInfo') }}</span>
						</span>
						<AppIcon name="arrow-right" :size="18" class="promo-tile__go" />
					</NuxtLink>
				</aside>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

defineProps<{ banners: any[] | null }>()

const url = useUrl()
const { t } = useI18n()
const localePath = useLocalePath()
const modules = [Autoplay, Pagination]
</script>

<style scoped>
.banner-hero {
	padding-top: 18px;
}

/* Слайдер (зліва) + колонка плиток (справа) */
.banner-hero__grid {
	display: grid;
	grid-template-columns: minmax(0, 1fr) clamp(250px, 26%, 330px);
	gap: 14px;
	align-items: stretch;
}

/* Стабільна обгортка: min-width:0 не дає Swiper розпирати grid понад контейнер */
.banner-hero__main {
	min-width: 0;
	border-radius: var(--radius-lg);
	overflow: hidden;
	border: 1px solid var(--border);
}

.banner-swiper {
	width: 100%;
}

.banner-slide {
	position: relative;
	display: block;
}

.banner-slide__img {
	width: 100%;
	aspect-ratio: 1300 / 400;
	object-fit: cover;
}

.banner-slide__content {
	position: absolute;
	left: 6%;
	top: 50%;
	transform: translateY(-50%);
	max-width: 46%;
	text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
}

.banner-slide__title {
	font-size: clamp(18px, 3vw, 38px);
	font-weight: 800;
	margin: 0 0 8px;
}

.banner-slide__desc {
	font-size: clamp(12px, 1.5vw, 17px);
	color: var(--text-soft);
	margin: 0;
}

:deep(.swiper-pagination-bullet) {
	background: #fff;
	opacity: 0.5;
}

:deep(.swiper-pagination-bullet-active) {
	background: var(--accent);
	opacity: 1;
}

/* ---- Бічні плитки ---- */
.banner-hero__side {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.promo-tile {
	position: relative;
	flex: 1;
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px 18px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-lg);
	overflow: hidden;
	transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
}

/* М'який помаранчевий ореол у кутку */
.promo-tile::after {
	content: '';
	position: absolute;
	right: -34px;
	top: -34px;
	width: 130px;
	height: 130px;
	border-radius: 50%;
	background: radial-gradient(circle, var(--accent-soft), transparent 70%);
	pointer-events: none;
}

.promo-tile:hover {
	border-color: var(--accent);
	transform: translateY(-2px);
	box-shadow: var(--shadow-pop);
}

.promo-tile__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border-radius: 14px;
	background: var(--accent-soft);
	color: var(--accent);
	flex-shrink: 0;
}

.promo-tile__body {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.promo-tile__title {
	font-weight: 700;
	font-size: 14.5px;
	color: var(--text);
	line-height: 1.25;
}

.promo-tile__sub {
	font-size: 12.5px;
	color: var(--text-muted);
	line-height: 1.3;
}

.promo-tile__go {
	margin-left: auto;
	color: var(--text-muted);
	opacity: 0.5;
	flex-shrink: 0;
	transition: color 0.18s, opacity 0.18s, transform 0.18s;
}

.promo-tile:hover .promo-tile__go {
	color: var(--accent);
	opacity: 1;
	transform: translateX(3px);
}

/* Планшет / мобільний: плитки під слайдером, у рядок */
@media (max-width: 900px) {
	.banner-hero__grid {
		grid-template-columns: 1fr;
	}

	.banner-hero__side {
		flex-direction: row;
	}

	.promo-tile {
		flex: 1;
	}

	/* Банер на всю ширину: висота плавно масштабується разом із шириною,
	   зі стелею, щоб не «з'їдав» перший екран. Пропорція близька до самих
	   зображень (~2.1:1) — телефони не обрізаються. */
	.banner-slide__img {
		aspect-ratio: auto;
		height: clamp(170px, 45vw, 320px);
	}

	/* Текст ширше, бо на вузькому екрані 46% замало */
	.banner-slide__content {
		left: 5%;
		max-width: 70%;
	}
}

/* Малий екран: плитки знову стовпчиком */
@media (max-width: 560px) {
	.banner-hero__side {
		flex-direction: column;
	}

	.promo-tile__go {
		display: none;
	}
}
</style>
