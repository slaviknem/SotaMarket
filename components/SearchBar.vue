<template>
	<div class="search" :class="{ 'is-open': showResults }">
		<form class="search__form" role="search" @submit.prevent>
			<input
				v-model="query"
				class="search__input"
				type="search"
				:placeholder="t('header.topbar.searchPlaceholder')"
				autocomplete="off"
				@input="onInput"
				@focus="query.length >= 2 && (showResults = true)"
				@blur="onBlur"
			/>
			<button class="search__btn" type="submit" :aria-label="t('header.topbar.search')">
				<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>
			</button>
		</form>

		<Transition name="search-drop">
			<div v-if="showResults" class="search__results">
				<div v-if="loading" class="search__loading">
					<span class="skeleton" style="height: 52px" />
					<span class="skeleton" style="height: 52px" />
				</div>

				<template v-else-if="results.length">
					<NuxtLink
						v-for="p in results"
						:key="p.id"
						:to="url.product(p)"
						class="search__item"
						@mousedown.prevent="goTo(p)"
					>
						<AppImage :src="url.productThumb(getImageByAttribute(p, p.attribute_id))" :alt="p.title" :width="46" :height="46" />
						<span class="search__item-info">
							<span class="search__item-title">{{ p.title }}</span>
							<span class="search__item-price">{{ formatPrice(p.price) }}</span>
						</span>
					</NuxtLink>
				</template>

				<div v-else class="search__empty">{{ t('other.notFind') }}</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const url = useUrl()
const router = useRouter()
const shopApi = useShopApi()

const query = ref('')
const results = ref<any[]>([])
const loading = ref(false)
const showResults = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onInput() {
	if (debounceTimer) clearTimeout(debounceTimer)

	if (query.value.trim().length < 2) {
		showResults.value = false
		return
	}

	debounceTimer = setTimeout(async () => {
		loading.value = true
		showResults.value = true
		try {
			results.value = await shopApi.getSuggestions(query.value.trim())
		} catch {
			results.value = []
		}
		loading.value = false
	}, 350)
}

function onBlur() {
	setTimeout(() => (showResults.value = false), 150)
}

function goTo(p: any) {
	showResults.value = false
	query.value = ''
	router.push(url.product(p))
}
</script>

<style scoped>
.search {
	position: relative;
}

.search__form {
	display: flex;
	background: var(--bg-soft);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-pill);
	overflow: hidden;
	transition: border-color 0.15s, box-shadow 0.15s;
}

.search__form:focus-within {
	border-color: var(--accent);
	box-shadow: 0 0 0 3px var(--accent-soft);
}

.search__input {
	flex: 1;
	padding: 11px 20px;
	background: transparent;
	border: none;
	outline: none;
	font-size: 14px;
}

.search__input::placeholder {
	color: var(--text-muted);
}

.search__btn {
	display: flex;
	align-items: center;
	padding: 0 18px;
	color: var(--accent);
	transition: color 0.15s;
}

.search__btn:hover {
	color: var(--accent-hover);
}

.search__results {
	position: absolute;
	top: calc(100% + 8px);
	left: 0;
	right: 0;
	z-index: 110;
	max-height: 430px;
	overflow-y: auto;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius);
	box-shadow: var(--shadow-pop);
	padding: 8px;
}

.search__loading {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px;
}

.search__item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px;
	border-radius: var(--radius-sm);
	transition: background 0.12s;
}

.search__item:hover {
	background: var(--bg-elevated);
}

.search__item img {
	width: 46px;
	height: 46px;
	object-fit: contain;
	border-radius: 8px;
	background: var(--img-bg);
	flex-shrink: 0;
}

.search__item-info {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.search__item-title {
	font-size: 13.5px;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
}

.search__item-price {
	font-size: 13.5px;
	font-weight: 700;
	color: var(--accent);
}

.search__empty {
	padding: 18px;
	text-align: center;
	color: var(--text-muted);
	font-size: 14px;
}

.search-drop-enter-active,
.search-drop-leave-active {
	transition: opacity 0.15s, transform 0.15s;
}

.search-drop-enter-from,
.search-drop-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}
</style>
