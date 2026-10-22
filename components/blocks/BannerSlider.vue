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
								:href="url.bannerLink(banner.url)"
								class="banner-slide"
							>
								<!-- Перший банер — LCP головної: eager + preload з високим пріоритетом.
								     `sizes` описує реальну ширину слайдера (уся ширина контейнера до 900px,
								     далі — мінус колонка плиток), щоб телефон не тягнув десктопний кадр.
								     `resize` — бо банер це ОРИГІНАЛ, завантажений менеджером в адмінці:
								     на відміну від прев'ю товарів/категорій, готової стисненої копії тут
								     немає, тож будь-яке джерело (хоч jpg на мегабайт) нормалізує IPX.
								     Висоту НЕ передаємо навмисно: width+height склалися б у ipx-модифікатор
								     `s_ШxВ`, тобто IPX обрізав би кадр під 1300/480 ще до браузера, і на
								     мобільному (де пропорція інша) банер поїхав би. Так IPX лише масштабує
								     по ширині, а кадрує, як і раніше, CSS (`object-fit: cover`);
								     розміри блоку тримає .banner-hero__main, тож CLS не з'являється. -->
								<AppImage
									:src="url.bannerImg(banner.image_file)"
									:alt="banner.title || brand.name"
									class="banner-slide__img"
									:width="1300"
									sizes="sm:100vw md:100vw lg:66vw 2xl:1116px"
									resize
									:fetchpriority="i === 0 ? 'high' : undefined"
									:loading="i === 0 ? 'eager' : 'lazy'"
									:preload="i === 0"
								/>
								<template v-if="banner.title || banner.description">
									<!-- Підкладка під напис — окремим елементом на весь кадр, а не ::before
									     у самого тексту: тягнеться на повну висоту слайда, тож країв підкладки
									     не видно (див. --scrim-text). Слайдам без напису вона не потрібна. -->
									<span class="banner-slide__scrim" />
									<div class="banner-slide__content">
										<h2 v-if="banner.title" class="banner-slide__title">{{ banner.title }}</h2>
										<p v-if="banner.description" class="banner-slide__desc">{{ banner.description }}</p>
									</div>
								</template>
							</component>
						</SwiperSlide>
					</Swiper>
				</div>

				<!-- Бічні промо-плитки (доставка) -->
				<aside class="banner-hero__side">
					<NuxtLink
						v-for="carrier in CARRIERS"
						:key="carrier.logo"
						:to="localePath('/dostavka')"
						class="promo-tile"
					>
						<!-- пробіл перед <br> потрібен для мобільної версії, де перенос вимикається -->
						<span class="promo-tile__title">{{ t('index.delivery') }} <br />{{ t(carrier.name) }}</span>
						<CarrierLogo :name="carrier.logo" class="promo-tile__logo" />
						<span class="promo-tile__line" />
						<span class="promo-tile__sub">{{ t(carrier.info) }}</span>
						<span class="promo-tile__go"><AppIcon name="arrow-right" :size="16" /></span>
					</NuxtLink>
				</aside>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination } from 'swiper/modules'
// Базовий swiper/css — глобальний (nuxt.config): він тримає розкладку слайдів,
// тож мусить бути в HTML ще до гідратації. Тут лишаються тільки модульні стилі.
import 'swiper/css/pagination'

defineProps<{ banners: any[] | null }>()

// Промо-плитки доставки: відрізняються лише знаком перевізника та ключами перекладу
const CARRIERS = [
	{ logo: 'nova-poshta', name: 'index.deliveryNova', info: 'index.deliveryNovaInfo' },
	{ logo: 'ukrposhta', name: 'index.deliveryUkr', info: 'index.deliveryUkrInfo' },
]

const url = useUrl()
const { t } = useI18n()
const localePath = useLocalePath()
const brand = useBrand()
const modules = [Autoplay, Pagination]
</script>

<style scoped>
.banner-hero {
	padding-top: 18px;
}

/* Слайдер (зліва) + колонка плиток (справа) */
.banner-hero__grid {
	display: grid;
	/* ширша колонка плиток → банер зліва відповідно вужчий і нижчий (висота від пропорції) */
	grid-template-columns: minmax(0, 1fr) clamp(280px, 30%, 380px);
	gap: 14px;
	align-items: stretch;
}

/* Стабільна обгортка: min-width:0 не дає Swiper розпирати grid понад контейнер */
.banner-hero__main {
	position: relative;
	min-width: 0;
	border-radius: var(--radius-lg);
	overflow: hidden;
	border: 1px solid var(--border);
}

/* Розпірка: тримає мінімальну висоту у пропорції від ширини колонки (менш
   панорамна за колишні 1300/400, щоб на широких екранах менше обрізало верх/низ),
   тож висота відома ще до завантаження фото → без CLS. Саме розпіркою, а не
   `aspect-ratio` на блоці: у grid-елемента зі stretch-висотою браузер порахував
   би з пропорції ШИРИНУ (415px × 2.7 ≈ 1124px) і банер виліз би за свою колонку
   поверх плиток — `justify-self: stretch` при заданій пропорції не діє. */
.banner-hero__main::before {
	content: '';
	display: block;
	padding-top: calc(480 / 1300 * 100%);
}

/* Слайдер поверх розпірки: заповнює фактичну висоту блоку — або пропорційну, або
   (коли вікно вузьке і колонка плиток вища) розтягнуту grid-ом під сусідній
   стовпчик. Раніше <img> тримав власну пропорцію й під слайдом лишалася порожня
   смуга; тепер фото заповнює блок, ховаючи боки через cover.
   .swiper-wrapper/.swiper-slide мають height:100% уже в базовому swiper/css. */
.banner-swiper {
	position: absolute;
	inset: 0;
}

.banner-slide {
	position: relative;
	display: block;
	height: 100%;
}

.banner-slide__img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* Легка розтяжка від лівого краю кадру (звідти починається напис) до прозорого
   приблизно на середині — лише знімає строкатість фону під літерами, кадр майже не
   темніє. Читабельність тримає ореол самого тексту (--text-shadow-on-img).
   Ніяких видимих меж підкладки, бо краї збігаються з краями кадру. */
.banner-slide__scrim {
	position: absolute;
	inset: 0;
	background: var(--scrim-text);
	pointer-events: none;
}

/* Напис — над розтяжкою (вона в потоці раніше) */
.banner-slide__content {
	position: absolute;
	left: 6%;
	top: 50%;
	transform: translateY(-50%);
	max-width: 46%;
	text-shadow: var(--text-shadow-on-img);
}

.banner-slide__title {
	font-size: clamp(18px, 3vw, 38px);
	font-weight: 800;
	line-height: 1.15;
	margin: 0 0 8px;
	color: var(--text);
}

.banner-slide__desc {
	font-size: clamp(12px, 1.5vw, 17px);
	/* світліше за --text-soft: підпис на фото має лишатися читабельним */
	color: var(--text);
	/* трохи щільніше за звичайний абзац — на фото тонке накреслення «губиться» */
	font-weight: 500;
	margin: 0;
}

:deep(.swiper-pagination-bullet) {
	background: var(--text);
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

/* Три «поверхи» (назва+лого / хайрлайн / уточнення+стрілка), рознесені по висоті плитки —
   простір заповнений структурно, без порожнечі посередині. */
.promo-tile {
	position: relative;
	flex: 1;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	grid-template-areas:
		'title logo'
		'line  line'
		'sub   go';
	align-content: space-between;
	align-items: center;
	gap: 12px 14px;
	padding: 24px 26px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-lg);
	overflow: hidden;
	transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
}

/* М'який помаранчевий ореол у кутку — навпроти лого: у знаку Нової Пошти «Н» це просвіт
   фону, тож підфарбований фон під ним зіпсував би її (на десктопі лого справа вгорі). */
.promo-tile::after {
	content: '';
	position: absolute;
	left: -34px;
	bottom: -34px;
	width: 130px;
	height: 130px;
	border-radius: 50%;
	background: radial-gradient(circle, var(--accent-soft), transparent 70%);
	pointer-events: none;
}

/* Вміст — над декоративним ореолом */
.promo-tile > * {
	position: relative;
}

.promo-tile:hover {
	border-color: var(--accent);
	transform: translateY(-2px);
	box-shadow: var(--shadow-pop);
}

/* Лого перевізника — головний акцент плитки, праворуч від назви */
.promo-tile__logo {
	grid-area: logo;
	/* негативний простір «Н» у знаку Нової Пошти потребує достатнього розміру */
	width: 88px;
	height: 88px;
	justify-self: end;
	transition: transform 0.18s;
}

.promo-tile:hover .promo-tile__logo {
	transform: scale(1.05);
}

/* «Доставка» + назва перевізника у два рядки (розділені <br>) */
.promo-tile__title {
	grid-area: title;
	font-weight: 700;
	font-size: 19px;
	color: var(--text);
	line-height: 1.3;
}

/* Хайрлайн, що тримає середину плитки */
.promo-tile__line {
	grid-area: line;
	height: 1px;
	background: var(--border);
}

.promo-tile__sub {
	grid-area: sub;
	font-size: 14.5px;
	color: var(--text-muted);
	line-height: 1.4;
}

.promo-tile__go {
	grid-area: go;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background: var(--bg-elevated);
	color: var(--text-muted);
	transition: background-color 0.18s, color 0.18s, transform 0.18s;
}

.promo-tile:hover .promo-tile__go {
	background: var(--accent);
	color: var(--on-accent);
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

	/* Плитки нижчі — лого зліва, текст праворуч, хайрлайн зайвий */
	.promo-tile {
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas:
			'logo title go'
			'logo sub   go';
		align-content: center;
		gap: 2px 14px;
		padding: 16px 18px;
	}

	/* лого переїхало ліворуч — ореол відповідно праворуч */
	.promo-tile::after {
		left: auto;
		right: -34px;
	}

	.promo-tile__line {
		display: none;
	}

	.promo-tile__logo {
		width: 66px;
		height: 66px;
		justify-self: start;
	}

	/* назва в один рядок — місця по ширині вистачає, перенос лише зайво піднімає плитку */
	.promo-tile__title {
		font-size: 17px;
	}

	.promo-tile__title br {
		display: none;
	}

	.promo-tile__sub {
		font-size: 13.5px;
	}

	/* Банер на всю ширину: висота плавно масштабується разом із шириною,
	   зі стелею, щоб не «з'їдав» перший екран. Пропорція близька до самих
	   зображень (~2.1:1) — телефони не обрізаються. */
	.banner-hero__main {
		height: clamp(170px, 45vw, 320px);
	}

	/* Висота задана напряму — розпірка з пропорцією тут лише заважала б */
	.banner-hero__main::before {
		display: none;
	}

	/* Текст ширше, бо на вузькому екрані 46% замало */
	.banner-slide__content {
		left: 5%;
		max-width: 70%;
	}

	/* Напис займає 70% ширини — розтягуємо саму розтяжку (а не її кольори),
	   щоб прозорою вона ставала вже за текстом, а не посеред нього */
	.banner-slide__scrim {
		background-size: 150% 100%;
		background-repeat: no-repeat;
	}
}

/* Малий екран: плитки знову стовпчиком */
@media (max-width: 560px) {
	.banner-hero__side {
		flex-direction: column;
	}

	.promo-tile {
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-areas:
			'logo title'
			'logo sub';
	}

	.promo-tile__go {
		display: none;
	}
}
</style>
