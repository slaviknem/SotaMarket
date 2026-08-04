<template>
	<!-- id — ціль aria-controls поля пошуку (SearchBar). Обидва інпути (десктоп і мобільний
	     оверлей) показують цю випадайку, але завжди по одному за раз, тож id лишається унікальним. -->
	<div id="search-results" class="sr">
		<!-- Завантаження -->
		<div v-if="loading && !hasResults" class="sr__load">
			<span class="skeleton" style="height: 64px" />
			<span class="skeleton" style="height: 52px" />
			<span class="skeleton" style="height: 52px" />
		</div>

		<!-- Порожній запит: історія + популярні моделі -->
		<div v-else-if="query.trim().length < MIN_CHARS" class="sr__start">
			<template v-if="history.length">
				<div class="sr__head">
					<span>{{ t('search.history') }}</span>
					<button class="sr__clear" @mousedown.prevent="clearHistory">{{ t('search.clearHistory') }}</button>
				</div>
				<div class="sr__chips">
					<button v-for="h in history" :key="h" class="sr__chip" @mousedown.prevent="setQuery(h)">
						<AppIcon name="clock" :size="13" />
						{{ h }}
					</button>
				</div>
			</template>

			<template v-if="popular.length">
				<div class="sr__head">{{ t('search.popularModels') }}</div>
				<div class="sr__chips">
					<NuxtLink
						v-for="p in popular"
						:key="p.alias"
						:to="url.category(p.alias)"
						class="sr__chip"
						@click="pick"
					>
						{{ p.title_full || p.title }}
					</NuxtLink>
				</div>
			</template>
		</div>

		<!-- Нічого не знайшли -->
		<div v-else-if="!hasResults" class="sr__empty">
			<AppIcon name="search" :size="26" />
			<p>{{ t('search.nothingFound', { query: query.trim() }) }}</p>
			<span class="text-muted">{{ t('search.nothingHint') }}</span>
		</div>

		<!-- Результати -->
		<template v-else>
			<!-- Головний результат на всю ширину: модель + типи чохлів для неї -->
			<template v-if="topModel">
				<div class="sr__head">{{ t('search.models') }}</div>
				<SearchModelRow :model="topModel" :active="active === 0" class="sr__top" />
			</template>

			<!-- Далі — дві колонки: зліва решта моделей і типи, справа товари й статті.
			     Коли панель вузька (мобільний) — складаються в одну, див. @container нижче. -->
			<div class="sr__cols">
				<div v-if="restModels.length || data?.filters.length" class="sr__col">
					<section v-if="restModels.length" class="sr__group">
						<SearchModelRow
							v-for="(m, i) in restModels"
							:key="m.alias"
							:model="m"
							:active="active === i + 1"
							class="sr__stack"
						/>
					</section>

					<section v-if="data?.filters.length" class="sr__group">
						<div class="sr__head">{{ t('search.filters') }}</div>
						<NuxtLink
							v-for="(f, i) in data.filters"
							:key="f.alias"
							:to="url.category(f.model || 'chekhly', f.alias)"
							class="sr__row"
							:class="{ 'is-active': active === offFilters + i }"
							@click="pick"
						>
							<span class="sr__row-icon"><AppIcon name="filter" :size="16" /></span>
							<span class="sr__row-title" v-html="highlight(f.title)" />
						</NuxtLink>
					</section>
				</div>

				<div v-if="data?.products.length || data?.articles.length" class="sr__col">
					<section v-if="data?.products.length" class="sr__group">
						<div class="sr__head">{{ t('search.products') }}</div>
						<NuxtLink
							v-for="(p, i) in data.products"
							:key="p.id"
							:to="url.product(p)"
							class="sr__row"
							:class="{ 'is-active': active === offProducts + i }"
							@click="pick"
						>
							<AppImage :src="url.productThumb(p.image)" :alt="p.title" :width="46" :height="46" class="sr__row-img" />
							<span class="sr__row-info">
								<span class="sr__row-title" v-html="highlight(p.title)" />
								<span class="sr__row-price">
									{{ formatPrice(p.price) }}
									<s v-if="p.price_old > p.price" class="sr__row-old">{{ formatPrice(p.price_old) }}</s>
								</span>
							</span>
						</NuxtLink>
					</section>

					<section v-if="data?.articles.length" class="sr__group">
						<div class="sr__head">{{ t('search.articles') }}</div>
						<NuxtLink
							v-for="(a, i) in data.articles"
							:key="a.alias"
							:to="url.blogPost(a)"
							class="sr__row"
							:class="{ 'is-active': active === offArticles + i }"
							@click="pick"
						>
							<span class="sr__row-icon"><AppIcon name="document" :size="16" /></span>
							<span class="sr__row-title" v-html="highlight(a.title)" />
						</NuxtLink>
					</section>
				</div>
			</div>

			<button class="sr__all" @click="submit">
				{{ t('search.showAll') }}
				<span v-if="data?.total" class="sr__all-count">{{ data.total }}</span>
				<AppIcon name="arrow-right" :size="15" />
			</button>
		</template>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const url = useUrl()

const {
	query, data, loading, active, hasResults, history, popular,
	setQuery, pick, submit, clearHistory, highlight, MIN_CHARS,
} = useSearch()

// Перша модель — окремо, на всю ширину (у неї чипи типів чохлів)
const topModel = computed(() => data.value?.models[0] ?? null)
const restModels = computed(() => data.value?.models.slice(1) ?? [])

// Зсуви для підсвітки клавіатурою — порядок збігається з items у useSearch
const offFilters = computed(() => data.value?.models.length || 0)
const offProducts = computed(() => offFilters.value + (data.value?.filters.length || 0))
const offArticles = computed(() => offProducts.value + (data.value?.products.length || 0))
</script>

<style scoped>
.sr {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.sr__load {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px;
}

.sr__group {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.sr__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 10px 6px;
	font-size: 11.5px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-muted);
}

.sr__clear {
	font-size: 11.5px;
	color: var(--text-muted);
	text-transform: none;
	letter-spacing: 0;
}

.sr__clear:hover {
	color: var(--accent);
}

.sr__top {
	margin-bottom: 8px;
}

.sr__stack + .sr__stack {
	margin-top: 6px;
}

/* Дві колонки лише коли ширина САМОЇ панелі це дозволяє (container query, а не
   ширина вікна: на десктопі панель широка, у повноекранному мобільному — ні).
   Якщо браузер не підтримує @container — лишається одна колонка, це безпечно. */
.sr__cols {
	display: grid;
	grid-template-columns: 1fr;
	gap: 0 26px;
	align-items: start;
}

@container search-panel (min-width: 860px) {
	.sr__cols {
		grid-template-columns: 1fr 1fr;
	}
}

.sr__col {
	min-width: 0;
}

/* Коли є лише одна група (напр. самі товари) — займає всю ширину, а не половину */
.sr__col:only-child {
	grid-column: 1 / -1;
}

/* ---------- Звичайний рядок (фільтр / товар / стаття) ---------- */
.sr__row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 10px;
	border-radius: var(--radius-sm);
	transition: background 0.12s;
}

.sr__row:hover,
.sr__row.is-active {
	background: var(--bg-elevated);
}

.sr__row-img {
	width: 46px;
	height: 46px;
	object-fit: contain;
	border-radius: var(--radius-sm);
	background: var(--img-bg);
	flex-shrink: 0;
}

.sr__row-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: var(--radius-sm);
	background: var(--bg-elevated);
	color: var(--text-muted);
	flex-shrink: 0;
}

.sr__row-info {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.sr__row-title {
	font-size: 13.5px;
	color: var(--text-soft);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
}

.sr__row-price {
	display: flex;
	align-items: center;
	gap: 7px;
	font-size: 13.5px;
	font-weight: 700;
	color: var(--accent);
}

.sr__row-old {
	font-size: 12px;
	font-weight: 400;
	color: var(--text-muted);
}

/* ---------- Порожні стани ---------- */
.sr__start {
	display: flex;
	flex-direction: column;
}

.sr__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 7px;
	padding: 0 10px 10px;
}

.sr__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 7px 12px;
	border-radius: var(--radius-pill);
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	font-size: 13px;
	color: var(--text-soft);
	transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.sr__chip:hover {
	background: var(--accent-soft);
	border-color: var(--accent);
	color: var(--accent);
}

.sr__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 32px 18px;
	text-align: center;
	color: var(--text-soft);
}

.sr__empty svg {
	color: var(--text-muted);
}

.sr__empty p {
	margin: 0;
	font-weight: 600;
}

.sr__empty span {
	font-size: 13px;
}

/* ---------- Футер ---------- */
.sr__all {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	width: 100%;
	margin-top: 8px;
	padding: 12px;
	border-top: 1px solid var(--border);
	font-size: 13.5px;
	font-weight: 600;
	color: var(--accent);
	transition: background 0.14s;
}

.sr__all:hover {
	background: var(--accent-soft);
}

.sr__all-count {
	padding: 1px 8px;
	border-radius: var(--radius-pill);
	background: var(--accent-soft);
	font-size: 12px;
}
</style>
