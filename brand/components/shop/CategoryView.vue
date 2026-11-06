<template>
	<!-- Сторінка категорії C2 (модель, бренд, серія, фільтр, /chekhly; PLAN-SITE-SOTAMARKET §4): темний заголовок
	     на всю ширину із сотами (крихти, фото, h1, «N дизайнів · від X ₴ · друкуємо одразу», «Своє фото на …», лід)
	     → фільтри збоку, рядок «N дизайнів · Спершу […]», сітка (перша картка — конструктор), «Показати ще» й
	     сторінки → на всю ширину «Інші моделі серії», «Популярні фільтри», FAQ, ціни, відгуки, стаття.
	     Дані й дії — useCategoryPage(): логіка (запити, 404/301, фільтри, підвантаження, SEO) — у рушії -->
	<div class="cat">
		<section class="cat-hero">
			<SotaPattern />

			<div class="container cat-hero__inner">
				<Breadcrumbs :items="breadcrumbs" />

				<div class="cat-hero__row">
					<span v-if="heroImage" class="cat-hero__img">
						<AppImage :src="heroImage" :alt="names.full" :width="84" :height="84" loading="eager" />
					</span>

					<div class="cat-hero__titles">
						<h1 class="cat-hero__title">{{ pageTitle }}</h1>

						<ul v-if="count || minPrice || printsNow" class="cat-hero__chips">
							<li v-if="count" class="cat-hero__chip">{{ designsLabel(count) }}</li>
							<li v-if="showNeoPrints" class="cat-hero__chip">
								<a href="#cat-neoprints" class="cat-hero__designs" @click.prevent="scrollToNeoprints">
									+ {{ neoprints.length }} {{ t('neoprint.countWord') }}
									<AppIcon name="chevron-down" :size="12" />
								</a>
							</li>
							<li v-if="minPrice && !designsMode" class="cat-hero__chip">
								{{ t('category.priceFrom', { price: formatPrice(minPrice) }) }}
							</li>
							<li v-if="printsNow" class="cat-hero__chip cat-hero__chip--live">{{ t('category.printsNow') }}</li>
						</ul>
					</div>

					<!-- Конструктор — на всіх сторінках моделі, на яку друкуємо (картка в сітці — лише на 1-й без фільтра) -->
					<NuxtLink v-if="canDesign" :to="url.printcase(categoryAlias)" class="btn btn-primary cat-hero__design">
						<AppIcon name="upload" :size="20" :stroke-width="2.3" />
						{{ t('category.designOwn', { model: names.short_ }) }}
					</NuxtLink>
				</div>

				<!-- Лід (SSR-текст з живими даними) — як у рушії: 1-ша сторінка моделі, фолбек сторінки фільтра -->
				<p v-if="pageLead" class="cat-hero__lead">{{ pageLead }}</p>
			</div>
		</section>

		<div class="container cat__body">
			<div class="cat-layout" :class="{ 'cat-layout--full': brandsLanding }">
				<div v-if="!brandsLanding" class="cat-layout__sidebar" :class="{ 'is-open': mobileFiltersOpen }">
					<div class="cat-layout__sidebar-backdrop" @click="mobileFiltersOpen = false" />
					<div class="cat-layout__sidebar-panel">
						<ShopFiltersSidebar
							:groups="displayTree"
							:selected="selectedForSidebar"
							:category-alias="categoryAlias"
							:active-alias="filterAlias"
							@toggle="toggleFilter"
							@reset="resetFilters"
						/>
					</div>
				</div>

				<div class="cat-layout__content">
					<!-- /chekhly: плитки брендів + повний каталог; сторінка бренду — його моделі (як у рушії) -->
					<template v-if="brandsLanding">
						<ShopBrandTiles :brands="brandTiles" class="cat-brand-tiles" />
						<LazyShopBrandsCatalog hydrate-on-visible :brands="brands" class="cat-brands" />
					</template>

					<LazyShopBrandsCatalog
						v-else-if="brandTree.length"
						hydrate-on-visible
						:brands="brandTree"
						single
						class="cat-brands"
					/>

					<!-- Рядок над сіткою: скільки дизайнів, фільтри (телефон), сортування -->
					<div class="cat-bar">
						<i18n-t v-if="count" :keypath="designsKey(count)" tag="span" class="cat-bar__count" scope="global">
							<template #n><strong>{{ count }}</strong></template>
						</i18n-t>

						<div class="cat-bar__controls">
							<!-- Клас — як у рушії: за ним зліпки відкривають шторку фільтрів (scripts/lib/snapshot.mjs) -->
							<button v-if="!brandsLanding" type="button" class="cat-head__filters-btn" @click="mobileFiltersOpen = true">
								<AppIcon name="filter" :size="16" />
								{{ t('filters.filters') }}
							</button>

							<!-- Дизайни (модель без товарів) мають одну ціну — сортувати нічого -->
							<label v-if="!designsMode" class="cat-bar__sort">
								<span class="cat-bar__sort-label">{{ t('category.sortFirst') }}</span>
								<select class="form-control" :value="options.sort" :aria-label="t('category.sortBy')" @change="changeSort">
									<option value="default">{{ t('category.sortDefault') }}</option>
									<option value="price-asc">{{ t('category.sortCheap') }}</option>
									<option value="price-desc">{{ t('category.sortDear') }}</option>
								</select>
							</label>
						</div>
					</div>

					<div v-if="pending" class="products-grid" :class="{ 'products-grid--six': brandsLanding }">
						<div v-for="i in 24" :key="i" class="skeleton skeleton--card" />
					</div>

					<template v-else-if="hasItems">
						<div v-if="products.length || designsMode" class="products-grid" :class="gridModifier">
							<ProductCardPrintcase v-if="showPrintcaseCard" :category="category" eager />

							<template v-if="designsMode">
								<NeoPrintCard v-for="np in displayDesigns" :key="np.id" :neoprint="np" :category="category" />
							</template>

							<!-- Перші чотири — перший екран: фото одразу, пріоритет — першій (див. рушій) -->
							<template v-else>
								<ProductCard
									v-for="(item, i) in displayItems"
									:key="item.product.id + '-' + (item.attribute?.id || 0)"
									:product="item.product"
									:attribute="item.attribute || undefined"
									:eager="i < 4"
									:priority="i === 0 && !showPrintcaseCard"
								/>
							</template>

							<a
								v-if="showNeoPrints && lastPage <= 1"
								class="cat-bridge"
								href="#cat-neoprints"
								@click.prevent="scrollToNeoprints"
							>
								<span class="cat-bridge__inner">
									<span class="cat-bridge__title">{{ t('neoprint.bridgeTitle', { count: neoprints.length }) }}</span>
									<span class="cat-bridge__note">{{ t('neoprint.bridgeNote') }}</span>
									<AppIcon name="arrow-down" :size="34" class="cat-bridge__arrow" />
								</span>
							</a>

							<ShopCatControls
								v-if="lastPage > 1"
								v-model:auto-on="autoOn"
								:current-page="currentPage"
								:total-pages="lastPage"
								:has-more-pages="hasMorePages"
								:show-button="showButton"
								:is-loading-more="isLoadingMore"
								:loaded="loadedPages"
								:to="pageLink"
								@load-more="loadMore"
							/>
						</div>

						<div ref="scrollSentinel" class="cat-sentinel" aria-hidden="true" />

						<section v-if="showNeoPrints" id="cat-neoprints" class="cat-neoprints">
							<div class="section-title">
								<h2>{{ t('neoprint.sectionTitle', { filter: neoprintsTitle }) }}</h2>
							</div>

							<p class="cat-neoprints__note text-muted">
								{{ t('neoprint.sectionNote', { model: names.short_, count: neoprints.length }) }}
							</p>

							<div class="products-grid products-grid--left">
								<NeoPrintCard v-for="np in visibleNeoprints" :key="np.id" :neoprint="np" :category="category" />
							</div>

							<div v-if="hasMoreNeoprints" class="cat-neoprints__more">
								<button class="btn btn-outline" @click="showMoreNeoprints">
									{{ t('neoprint.showMore') }}
								</button>
							</div>
						</section>
					</template>

					<div v-else class="cat-empty">
						<p><b>{{ t('category.noMatchingProducts') }}</b></p>
						<p class="text-muted">{{ t('category.tryResettingFilters') }}</p>
						<button class="btn btn-outline" @click="resetFilters">{{ t('filters.rezetFilters') }}</button>
					</div>
				</div>
			</div>

			<!-- Нижче — на всю ширину, як у прототипі C2 -->
			<section v-if="otherModels.length" class="cat-section" :aria-labelledby="nearId">
				<SectionHead
					:title-id="nearId"
					:eyebrow="t('category.nearEyebrow')"
					:title="t('category.otherModels', { series: seriesName })"
				/>
				<ul class="cat-near">
					<li v-for="m in otherModels" :key="m.url">
						<NuxtLink :to="url.category(m.url)" class="cat-near__link">{{ m.title }}</NuxtLink>
					</li>
				</ul>
			</section>

			<LazyShopFilterLinks
				v-if="!brandsLanding && displayTree.length"
				hydrate-on-visible
				:groups="displayTree"
				:category-alias="categoryAlias"
				:active-alias="filterAlias"
			/>

			<template v-if="showSeoBlocks">
				<ShopFilterFaq
					v-if="filterAlias"
					:category="category"
					:category-alias="categoryAlias"
					:filter-page="filterPage"
					:items="pageItems"
					:total="total"
				/>
				<ShopCategoryFaq v-else :category="category" :products="products" />
				<ShopPriceTable :title="pricesTitle" :rows="priceRows" />
			</template>
			<ShopPriceTable v-else-if="showDesignsSeo" :title="pricesTitle" :rows="priceRows" />

			<ShopReviewsBlock
				v-if="showReviews"
				:reviews="reviewsList"
				type="category"
				:target-id="category.id"
				:title="t('reviews.aboutTitle', { title: names.short_ })"
				class="cat-section"
			/>

			<div v-if="filterArticle" class="cat-desc typography" v-html="contentHtml(filterArticle)" />
			<div v-else-if="!filterAlias && category?.description" class="cat-desc typography" v-html="contentHtml(category.description)" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { pluralForm } from '#brand/plural'

const { t } = useI18n()
const url = useUrl()
const nearId = useId()

const {
	categoryAlias, filterAlias, brandsLanding, category, filterPage, names, pageTitle, pageLead, breadcrumbs, minPrice,
	displayTree, selectedForSidebar, mobileFiltersOpen, toggleFilter, resetFilters, options, changeSort,
	total, displayTotal, productsCount, brandTiles, brands, brandTree, modelSeries,
	pending, hasItems, products, displayItems, gridModifier, showPrintcaseCard, designsMode, designsTotal, displayDesigns,
	currentPage, lastPage, hasMorePages, showButton, isLoadingMore, loadedPages, autoOn, scrollSentinel, pageLink, loadMore,
	showNeoPrints, neoprints, neoprintsTitle, visibleNeoprints, hasMoreNeoprints, showMoreNeoprints, scrollToNeoprints,
	showSeoBlocks, showDesignsSeo, pageItems, pricesTitle, priceRows, showReviews, reviewsList, filterArticle,
} = useCategoryPage()

// Фото в заголовку: модель, бренд (у лендінгу /chekhly фото немає)
const heroImage = computed(() => (category.value?.image_file ? url.categoryImg(category.value.image_file) : ''))

// Скільки дизайнів: товар Sota — дизайн (принти — його варіанти). Готові дизайни теми — окремим чипом,
// тож без них (як лічильник рушія: «N товарів + M дизайнів»); модель без товарів — її дизайни
const count = computed(() => (designsMode.value ? designsTotal.value : showNeoPrints.value ? productsCount.value : displayTotal.value))

const designsKey = (n: number) => `index.designs.${pluralForm(n)}`
const designsLabel = (n: number) => t(designsKey(n), { n })

// Модель, на яку друкуємо, і не знята з друку — та сама умова, що в картки конструктора в сітці
const canDesign = computed(() => canPrintOn(category.value) && printStockState(category.value) !== 'out')

// «Друкуємо одразу» — друк на модель без передзамовлення
const printsNow = computed(() => canPrintOn(category.value) && printStockState(category.value) === 'in')

// Інші моделі серії (features.seriesModels — стан рушія), без поточної
const otherModels = computed(() => modelSeries.value?.children.filter((m) => m.url !== categoryAlias.value) ?? [])
const seriesName = computed(() => serieTitle(modelSeries.value?.title || ''))
</script>

<style scoped>
.cat {
	padding-bottom: 40px;
}

/* ---------- Заголовок на синьому із сотами ---------- */
.cat-hero {
	position: relative;
	overflow: hidden;
	margin-bottom: 28px;
	background: var(--bg-deep);
	color: var(--on-deep);
}

.cat-hero__inner {
	position: relative;
	padding-top: 6px;
	padding-bottom: 34px;
}

/* Крихти рушія на синьому: світлі, поточна — білим */
.cat-hero :deep(.breadcrumbs) {
	padding: 14px 0 18px;
	color: var(--on-deep-muted);
	font-size: 13.5px;
}

.cat-hero :deep(.breadcrumbs li:last-child) {
	color: var(--on-deep);
}

.cat-hero :deep(.breadcrumbs a:hover) {
	color: var(--on-deep-hover);
}

.cat-hero__row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 18px 24px;
}

/* Фото моделі — на білій соті (знімки на білому; --hex-mask, як варіанти товару). Знімок менший за соту з запасом:
   кути квадрата зрізали б похилі грані, а телефон у кадрі вузький і по центру */
.cat-hero__img {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	width: 94px;
	height: 108px;
	background: var(--img-bg);
	-webkit-mask: var(--hex-mask) center / 100% 100% no-repeat;
	mask: var(--hex-mask) center / 100% 100% no-repeat;
}

.cat-hero__img img {
	width: 80px;
	height: 80px;
	object-fit: contain;
}

.cat-hero__titles {
	display: flex;
	flex-direction: column;
	gap: 12px;
	flex: 1 1 420px;
	min-width: 0;
}

.cat-hero__title {
	margin: 0;
	font-size: 30px;
	font-weight: 900;
	line-height: 1.12;
	letter-spacing: -0.01em;
}

.cat-hero__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cat-hero__chip {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	height: 32px;
	padding: 0 12px;
	border-radius: var(--radius-pill);
	background: var(--bg-deep-2);
	font-size: 14px;
	font-weight: 800;
}

/* «Друкуємо одразу» — зелений вогник */
.cat-hero__chip--live::before {
	content: '';
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--on-deep-success);
}

.cat-hero__designs {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--accent);
}

.cat-hero__designs:hover {
	text-decoration: underline;
}

.cat-hero__design {
	flex-shrink: 0;
	height: 56px;
	padding: 0 24px;
	font-size: 16px;
	font-weight: 900;
}

.cat-hero__lead {
	max-width: 820px;
	margin: 18px 0 0;
	color: var(--on-deep-muted);
	font-size: 14px;
}

/* ---------- Фільтри збоку + контент ---------- */
.cat-layout {
	display: grid;
	grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
	gap: 24px;
	align-items: start;
}

.cat-layout--full {
	grid-template-columns: minmax(0, 1fr);
}

.cat-brand-tiles {
	margin-bottom: 24px;
}

.cat-brands {
	margin-bottom: 34px;
}

/* Колонка сайдбара тягнеться на висоту ряду — інакше sticky-панелі немає куди рухатись */
.cat-layout__sidebar {
	align-self: stretch;
}

.cat-layout__sidebar-panel {
	position: sticky;
	top: calc(var(--header-stuck-h) + 12px);
}

.cat-layout__sidebar-backdrop {
	display: none;
}

/* Панель фільтрів рушія (ShopFiltersSidebar) у формі C2: біла, без сірої шапки, заголовки жирні */
.cat-layout__sidebar :deep(.filters) {
	border-radius: calc(var(--radius) + 2px);
}

.cat-layout__sidebar :deep(.filters__head) {
	padding: 18px 20px 10px;
	border-bottom: 0;
	background: var(--bg-card);
}

.cat-layout__sidebar :deep(.filters__title) {
	font-size: 17px;
	font-weight: 900;
}

.cat-layout__sidebar :deep(.filters__title svg) {
	color: var(--text);
}

.cat-layout__sidebar :deep(.filter-group__head) {
	padding: 12px 20px;
	font-size: 14.5px;
	font-weight: 800;
}

/* Рядок над сіткою */
.cat-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 10px 12px;
	margin-bottom: 16px;
}

.cat-bar__count {
	color: var(--text-soft);
	font-size: 15px;
}

.cat-bar__count strong {
	color: var(--text);
	font-weight: 900;
}

.cat-bar__controls {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-left: auto;
}

.cat-head__filters-btn {
	display: none;
	align-items: center;
	justify-content: center;
	gap: 8px;
	height: 44px;
	padding: 0 16px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: calc(var(--radius-sm) + 2px);
	font-size: 14px;
	font-weight: 800;
}

.cat-bar__sort {
	display: flex;
	align-items: center;
	gap: 10px;
	color: var(--text-muted);
	font-size: 14px;
	font-weight: 700;
}

.cat-bar__sort select {
	width: auto;
	height: 44px;
	padding: 0 34px 0 12px;
	border-radius: calc(var(--radius-sm) + 2px);
	background-color: var(--bg-card);
	color: var(--text);
	font-size: 14px;
	font-weight: 800;
}

.cat-sentinel {
	height: 1px;
}

/* ---------- Готові дизайни теми (як у рушії) ---------- */
.cat-neoprints {
	margin-top: 14px;
	scroll-margin-top: calc(var(--header-stuck-h) + 12px);
}

.cat-neoprints__note {
	margin: -6px 0 16px;
	font-size: 13.5px;
}

.cat-neoprints__more {
	margin-top: 20px;
	text-align: center;
}

/* Місток у «хвіст» ряду товарів до секції дизайнів; flex-basis — ширина картки (4/3/2 колонки) */
.cat-bridge {
	flex: 1 0 calc((100% - 3 * 14px) / 4);
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	overflow: hidden;
	padding: 22px 20px;
	border: 1px dashed var(--accent);
	border-radius: var(--radius);
	background: var(--accent-soft);
	color: var(--accent-text);
	transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.cat-bridge:hover {
	background: var(--accent);
	color: var(--on-accent);
}

.cat-bridge__inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	max-width: 240px;
}

.cat-bridge__title {
	font-size: 16px;
	font-weight: 800;
	line-height: 1.25;
}

.cat-bridge__note {
	font-size: 12.5px;
	line-height: 1.35;
	opacity: 0.8;
}

.cat-bridge__arrow {
	margin-top: 4px;
	animation: cat-bridge-bounce 1.4s ease-in-out infinite;
}

@keyframes cat-bridge-bounce {
	0%, 100% { transform: translateY(0); opacity: 0.55; }
	50% { transform: translateY(6px); opacity: 1; }
}

@media (max-width: 1180px) {
	.cat-bridge { flex-basis: calc((100% - 2 * 14px) / 3); }
}

@media (max-width: 760px) {
	.cat-bridge { flex-basis: calc((100% - 10px) / 2); }
}

@media (prefers-reduced-motion: reduce) {
	.cat-bridge__arrow {
		animation: none;
	}
}

.cat-empty {
	padding: 50px 20px;
	text-align: center;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

/* ---------- Блоки на всю ширину під сіткою ---------- */
.cat-section {
	margin-top: 48px;
}

/* Інші моделі серії — плитки-посилання */
.cat-near {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cat-near__link {
	display: flex;
	align-items: center;
	height: 46px;
	padding: 0 18px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: calc(var(--radius-sm) + 2px);
	font-weight: 800;
	transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.cat-near__link:hover {
	border-color: var(--border-light);
	box-shadow: var(--shadow-card);
	transform: translateY(-2px);
}

/* SEO-блоки рушія («Популярні фільтри», FAQ, ціни) — окремими секціями з повітрям, без ліній-роздільників FLOY */
.cat__body :deep(.filter-links),
.cat__body :deep(.faq),
.cat__body :deep(.prices) {
	margin-top: 48px;
	padding-top: 0;
	border-top: 0;
}

/* FAQ — картками у дві колонки (на вузьких — одна); відкрите питання не розтягує сусіда */
.cat__body :deep(.faq__list) {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(460px, 100%), 1fr));
	align-items: start;
	gap: 12px;
}

.cat__body :deep(.faq__item) {
	border-radius: var(--radius);
}

.cat__body :deep(.faq__q) {
	padding: 18px 22px;
	font-size: 15.5px;
	font-weight: 800;
}

.cat__body :deep(.faq__a) {
	padding: 0 22px 18px;
}

.cat-desc {
	margin-top: 48px;
	padding: 26px 30px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	font-size: 14px;
}

/* ---------- Планшет і телефон: фільтри — шторка зліва ---------- */
@media (max-width: 1023px) {
	.cat-layout {
		grid-template-columns: minmax(0, 1fr);
	}

	.cat-head__filters-btn {
		display: inline-flex;
	}

	.cat-layout__sidebar {
		position: fixed;
		inset: 0;
		z-index: var(--z-drawer);
		visibility: hidden;
		pointer-events: none;
	}

	.cat-layout__sidebar.is-open {
		visibility: visible;
		pointer-events: auto;
	}

	.cat-layout__sidebar-backdrop {
		display: block;
		position: absolute;
		inset: 0;
		background: rgba(var(--shade-rgb), 0.6);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.cat-layout__sidebar.is-open .cat-layout__sidebar-backdrop {
		opacity: 1;
	}

	.cat-layout__sidebar-panel {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		width: min(330px, 86vw);
		background: var(--bg-card);
		transform: translateX(-100%);
		transition: transform 0.22s ease;
	}

	.cat-layout__sidebar.is-open .cat-layout__sidebar-panel {
		transform: translateX(0);
	}

	/* У шторці панель — на всю висоту, без скруглень */
	.cat-layout__sidebar :deep(.filters) {
		border-radius: 0;
	}
}

/* Телефон: заголовок компактніший, кнопка конструктора — на всю ширину; контроли — двома рівними половинами */
@media (max-width: 640px) {
	.cat-hero {
		margin-bottom: 18px;
	}

	.cat-hero__inner {
		padding-bottom: 22px;
	}

	.cat-hero :deep(.breadcrumbs) {
		padding: 12px 0 14px;
		font-size: 13px;
	}

	.cat-hero__row {
		gap: 14px;
	}

	.cat-hero__img {
		width: 58px;
		height: 67px;
	}

	.cat-hero__img img {
		width: 48px;
		height: 48px;
	}

	.cat-hero__titles {
		flex-basis: 0;
		flex-grow: 1;
		gap: 10px;
	}

	.cat-hero__title {
		font-size: 22px;
	}

	.cat-hero__chip {
		height: 28px;
		padding: 0 10px;
		font-size: 13px;
	}

	.cat-hero__design {
		flex-basis: 100%;
		height: 50px;
		font-size: 15px;
	}

	/* Лід не відсуває товари: стеля у 2 рядки (у розмітці лишається повністю — mobile-first індексація) */
	.cat-hero__lead {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-top: 14px;
		font-size: 12px;
		line-height: 1.4;
	}

	.cat-bar {
		margin-bottom: 12px;
	}

	.cat-bar__controls {
		flex-basis: 100%;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		margin-left: 0;
	}

	.cat-head__filters-btn,
	.cat-bar__sort select {
		width: 100%;
		font-size: 13.5px;
	}

	.cat-bar__sort-label {
		display: none;
	}

	.cat-section,
	.cat__body :deep(.filter-links),
	.cat__body :deep(.faq),
	.cat__body :deep(.prices),
	.cat-desc {
		margin-top: 34px;
	}

	.cat-near {
		gap: 8px;
	}

	.cat-near__link {
		height: 42px;
		padding: 0 14px;
		font-size: 14px;
	}

	.cat__body :deep(.faq__q) {
		padding: 14px 16px;
		font-size: 14.5px;
	}

	.cat__body :deep(.faq__a) {
		padding: 0 16px 14px;
	}

	.cat-desc {
		padding: 18px 16px;
	}
}
</style>
