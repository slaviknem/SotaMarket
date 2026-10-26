<template>
	<!-- Вигляд сторінки категорії рушія. Дані й дії — з useCategoryPage() (логіка — ShopCategoryPage);
	     бренд перекриває цей компонент своїм, логіку не копіюючи -->
	<div class="container">
		<Breadcrumbs :items="breadcrumbs" />

		<div class="cat-layout" :class="{ 'cat-layout--full': brandsLanding }">
			<!-- Сайдбар фільтрів (ховаємо в режимі лендінгу брендів) -->
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

			<!-- Контент -->
			<div class="cat-layout__content">
				<header class="cat-head">
					<h1 class="cat-head__title">{{ pageTitle }}</h1>
					<span v-if="displayTotal || showNeoPrints || designsTotal" class="cat-head__count">
						<template v-if="designsMode">{{ designsTotal }} {{ t('neoprint.countWord') }}</template>
						<template v-else-if="showNeoPrints">
							<template v-if="productsCount > 0">{{ productsCount }} {{ t('category.products') }} + </template>
							<a class="cat-head__count-designs" href="#cat-neoprints" @click.prevent="scrollToNeoprints">
								{{ neoprints.length }} {{ t('neoprint.countWord') }}
								<AppIcon name="chevron-down" :size="12" />
							</a>
						</template>
						<template v-else>{{ displayTotal }} {{ t('category.products') }}</template>
					</span>

					<div class="cat-head__controls">
						<button v-if="!brandsLanding" class="cat-head__filters-btn" @click="mobileFiltersOpen = true">
							<AppIcon name="filter" :size="15" />
							{{ t('filters.filters') }}
						</button>

						<!-- Дизайни (модель без товарів) мають одну ціну — сортувати нічого -->
						<label v-if="!designsMode" class="cat-head__sort">
							<span class="cat-head__sort-label text-muted">{{ t('category.sortBy') }}:</span>
							<!-- aria-label дублює видиму мітку: на мобільному її текст ховається, а ім'я поля має лишатись -->
							<select
								class="form-control"
								:value="options.sort"
								:aria-label="t('category.sortBy')"
								@change="changeSort"
							>
								<option value="default">—</option>
								<option value="price-asc">{{ t('category.sortPrice1') }}</option>
								<option value="price-desc">{{ t('category.sortPrice9') }}</option>
							</select>
						</label>
					</div>
				</header>

				<!-- Короткий унікальний лід: на сторінці моделі — завжди, на фільтрі — фолбек,
				     коли у нього ще немає власної статті -->
				<p v-if="pageLead" class="filter-desc">{{ pageLead }}</p>

				<!-- /chekhly: плитки брендів з логотипами + повний каталог бренд→серії→моделі.
				     Каталог — сотні посилань: у HTML він є повністю (SSR), а гідратується лише
				     коли доходить до екрана — інакше саме він давав найдовші задачі головного потоку -->
				<template v-if="brandsLanding">
					<ShopBrandTiles :brands="brandTiles" class="cat-brand-tiles" />
					<LazyShopBrandsCatalog hydrate-on-visible :brands="brands" class="cat-brands" />
				</template>

				<!-- Сторінка бренду: усі моделі цього бренду (той самий компонент, один бренд) -->
				<LazyShopBrandsCatalog
					v-else-if="brandTree.length"
					hydrate-on-visible
					:brands="brandTree"
					single
					class="cat-brands"
				/>

				<!-- Товари (на лендінгу /chekhly — 6 у ряд) -->
				<div v-if="pending" class="products-grid" :class="{ 'products-grid--six': brandsLanding }">
					<div v-for="i in 24" :key="i" class="skeleton skeleton--card" />
				</div>

				<template v-else-if="hasItems">
					<div v-if="products.length || designsMode" class="products-grid" :class="gridModifier">
						<!-- Конструктор чохлів — перший товар (як на старому сайті) -->
						<ProductCardPrintcase v-if="showPrintcaseCard" :category="category" eager />

						<!-- Модель без товарів: усі готові дизайни сайту на цій моделі — справжніми
						     сторінками ?page=N, як товари. Картка веде на /neoprint/{модель}/{дизайн} -->
						<template v-if="designsMode">
							<NeoPrintCard
								v-for="np in displayDesigns"
								:key="np.id"
								:neoprint="np"
								:category="category"
							/>
						</template>

						<!-- Перші картки — це перший екран (на телефоні два ряди по два), і LCP — будь-яка
						     з них: фото на всю площу (alphaprint) більше за сусідні. Лениве фото тут
						     чекало розкладки й затримувало LCP на ~2 с, тож перші чотири вантажимо одразу.
						     Пріоритет і preload — лише першій, щоб не ділити канал порівну -->
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

						<!-- Місток у порожній «хвіст» останнього ряду: заповнює пустку і веде вниз
						     до готових дизайнів. Лише на одній сторінці (у flow це місце — контроли). -->
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

						<!-- Кнопка «Показати ще» + авто-підвантаження + пагінація -->
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

					<!-- Тригер авто-підвантаження по скролу -->
					<div ref="scrollSentinel" class="cat-sentinel" aria-hidden="true" />

					<!-- Готові дизайни теми: друкуємо будь-який принт із бібліотеки на цю модель.
					     Товару в БД немає — картка веде на /neoprint/{модель}/{дизайн}. -->
					<section v-if="showNeoPrints" id="cat-neoprints" class="cat-neoprints">
						<div class="section-title">
							<h2>{{ t('neoprint.sectionTitle', { filter: neoprintsTitle }) }}</h2>
						</div>

						<p class="cat-neoprints__note text-muted">
							{{ t('neoprint.sectionNote', { model: names.short_, count: neoprints.length }) }}
						</p>

						<div class="products-grid products-grid--left">
							<NeoPrintCard
								v-for="np in visibleNeoprints"
								:key="np.id"
								:neoprint="np"
								:category="category"
							/>
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

				<!-- Перелінковка: усі фільтри як crawlable посилання (для індексації одно-фасетних сторінок).
				     Посилання в HTML є одразу (SSR), гідратація — коли блок доходить до екрана -->
				<LazyShopFilterLinks
					v-if="!brandsLanding && displayTree.length"
					hydrate-on-visible
					:groups="displayTree"
					:category-alias="categoryAlias"
					:active-alias="filterAlias"
				/>

				<!-- FAQ + таблиця цін (як на старому сайті): унікальний SSR-контент з реальних
				     даних сторінки + FAQPage JSON-LD. Лише 1-ша сторінка моделі/фільтра. -->
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

				<!-- Відгуки: на сторінці моделі — відгуки моделі + усіх її товарів;
				     на сторінці фільтра — відгуки товарів, що підпадають під фільтр (агрегує бекенд). -->
				<ShopReviewsBlock
					v-if="showReviews"
					:reviews="reviewsList"
					type="category"
					:target-id="category.id"
					:title="t('reviews.aboutTitle', { title: names.short_ })"
					class="cat-reviews"
				/>

				<!-- SEO-стаття низом: на сторінці фільтра — стаття фільтра (специфічна або шаблон
				     фільтра з підставленою моделлю); на сторінці моделі/категорії — стаття моделі.
				     Повну статтю моделі на сторінках фільтрів не дублюємо (там стаття фільтра або лід вище). -->
				<div v-if="filterArticle" class="cat-desc typography" v-html="contentHtml(filterArticle)" />
				<div v-else-if="!filterAlias && category?.description" class="cat-desc typography" v-html="contentHtml(category.description)" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const {
	categoryAlias, filterAlias, brandsLanding, category, filterPage, names, pageTitle, pageLead, breadcrumbs,
	displayTree, selectedForSidebar, mobileFiltersOpen, toggleFilter, resetFilters, options, changeSort,
	total, displayTotal, productsCount, brandTiles, brands, brandTree,
	pending, hasItems, products, displayItems, gridModifier, showPrintcaseCard, designsMode, designsTotal, displayDesigns,
	currentPage, lastPage, hasMorePages, showButton, isLoadingMore, loadedPages, autoOn, scrollSentinel, pageLink, loadMore,
	showNeoPrints, neoprints, neoprintsTitle, visibleNeoprints, hasMoreNeoprints, showMoreNeoprints, scrollToNeoprints,
	showSeoBlocks, showDesignsSeo, pageItems, pricesTitle, priceRows, showReviews, reviewsList, filterArticle,
} = useCategoryPage()
</script>

<style scoped>
.cat-layout {
	display: grid;
	grid-template-columns: var(--sidebar-w) 1fr;
	gap: 22px;
	align-items: start;
	padding-bottom: 30px;
}

/* Режим лендінгу брендів — без сайдбара, контент на всю ширину */
.cat-layout--full {
	grid-template-columns: 1fr;
}

/* Плитки брендів + каталог брендів — відступи до блоку товарів нижче */
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

/* Sticky-обгортка фіксує картку фільтрів під прибитою шапкою (висота шапки + 5px «повітря»).
   Висоту й скрол тримає сама картка (.filters). */
.cat-layout__sidebar-panel {
	position: sticky;
	top: calc(var(--header-stuck-h) + 5px);
}

.cat-head {
	display: flex;
	align-items: center;
	gap: 14px;
	flex-wrap: wrap;
	margin-bottom: 18px;
}

.cat-head__title {
	margin: 0;
	font-size: 24px;
	font-weight: 800;
	letter-spacing: -0.02em;
}

.cat-head__count {
	font-size: 13px;
	color: var(--text-muted);
}

/* Сигнал у шапці: «+N готових дизайнів» — акцентний клікабельний якір до секції нижче */
.cat-head__count-designs {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	margin-left: 4px;
	color: var(--accent);
	font-weight: 700;
}

.cat-head__count-designs:hover {
	text-decoration: underline;
}

.filter-desc {
	margin: 10px 0;
	font-size: 14px;
}

/* На телефоні лід не має відсувати товари: дрібніший шрифт і стеля у 2 рядки.
   12px — нижня межа читабельності (менше Lighthouse рахує помилкою мобільної зручності).
   Ховати лід не можна — індексація mobile-first, текст потрібен у мобільному HTML;
   тут він обрізаний лише візуально, у розмітці лишається повністю. */
@media (max-width: 640px) {
	.filter-desc {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin: 2px 0 10px;
		font-size: 12px;
		line-height: 1.4;
		color: var(--text-muted);
	}
}

/* Контроли шапки (сортування + кнопка фільтрів). Десктоп: праворуч біля заголовка. */
.cat-head__controls {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-left: auto;
}

.cat-head__filters-btn {
	display: none; /* десктоп: фільтри живуть у сайдбарі */
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 9px 16px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	font-size: 13.5px;
	font-weight: 600;
}

.cat-head__sort {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13.5px;
}

.cat-head__sort select {
	width: auto;
	padding: 8px 34px 8px 12px;
	font-size: 13.5px;
}

.cat-sentinel {
	height: 1px;
}

/* Секція готових дизайнів — впритул під товарами (безшовне продовження сітки),
   а не окремий блок із великим відступом. scroll-margin — щоб липка шапка не
   перекривала заголовок при переході по якорю з лічильника шапки. */
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

/* Місток у «хвіст» ряду товарів: акцентна панель, що доростає рівно на ширину
   порожнечі (flex-grow), заповнює пустку і веде до секції готових дизайнів нижче.
   flex-basis дзеркалить ширину картки товару (4/3/2 колонки, gap 14/14/10). */
.cat-bridge {
	flex: 1 0 calc((100% - 3 * 14px) / 4);
	width: auto;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	overflow: hidden;
	padding: 22px 20px;
	border: 1px dashed var(--accent);
	border-radius: var(--radius);
	background: var(--accent-soft);
	color: var(--accent);
	transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.cat-bridge:hover {
	background: var(--accent);
	color: var(--on-accent);
	transform: translateY(-2px);
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

/* Менший інфо-рядок під заголовком (приглушений відтінок поточного кольору) */
.cat-bridge__note {
	font-size: 12.5px;
	line-height: 1.35;
	opacity: 0.7;
}

/* Велика стрілка-заклик униз — плавний «дихаючий» стрибок */
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
}

.cat-reviews {
	margin-top: 34px;
	padding-top: 22px;
	border-top: 1px solid var(--border);
}

.cat-desc {
	margin-top: 34px;
	padding-top: 22px;
	border-top: 1px solid var(--border);
	font-size: 14px;
}

.cat-layout__sidebar-backdrop {
	display: none;
}

@media (max-width: 1023px) {
	.cat-layout {
		grid-template-columns: 1fr;
	}

	.cat-head__filters-btn {
		display: inline-flex;
	}

	/* Контроли — окремим рядком на всю ширину. Grid з рівних колонок замість flex:
	   minmax(0, 1fr) не залежить від вмісту (іконка + «Фільтри» проти вузького селекта),
	   тож половини завжди однакові. grid-auto-flow: column — щоб на лендінгу брендів,
	   де кнопки фільтрів немає, селект зайняв усю ширину без дірки. */
	.cat-head__controls {
		flex-basis: 100%;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		margin-left: 0;
		margin-top: 2px;
		gap: 14px; /* той самий gap, що й у .products-grid (на телефоні — 10px, нижче) */
	}

	.cat-head__filters-btn,
	.cat-head__sort {
		min-width: 0;
		height: 40px;
	}

	.cat-head__filters-btn {
		padding: 0 12px;
	}

	.cat-head__sort select {
		width: 100%;
		height: 40px;
		padding: 0 30px 0 12px;
	}

	/* Текст «Сортувати за:» прибираємо — лишається лише селект на всю свою половину */
	.cat-head__sort-label {
		display: none;
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
		max-height: none;
		background: var(--bg-card);
		transform: translateX(-100%);
		transition: transform 0.22s ease;
		border-radius: 0;
	}

	.cat-layout__sidebar.is-open .cat-layout__sidebar-panel {
		transform: translateX(0);
	}
}

/* З цієї ж межі .products-grid стає 2 колонки з gap 10px — контроли мають
   лягати рівно на ті самі колонки, тож gap беремо той самий. */
@media (max-width: 760px) {
	.cat-head__controls {
		gap: 10px;
	}
}

/* Компактна шапка категорії на телефонах */
@media (max-width: 640px) {
	.cat-head {
		gap: 8px;
		margin-bottom: 14px;
	}

	.cat-head__title {
		font-size: 19px;
	}

	/* Ширини контролів вирівняні вище (≤1023px), тут лише дрібніший текст */
	.cat-head__filters-btn,
	.cat-head__sort select {
		font-size: 13px;
	}
}
</style>
