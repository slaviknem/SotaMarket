<template>
	<AppModal :model-value="modelValue" :title="t('printcase.selectModel')" size="md" @update:model-value="$emit('update:modelValue', $event)">
		<div class="model-search">
			<input
				ref="inputRef"
				v-model="query"
				class="form-control"
				type="search"
				:placeholder="t('printcase.searchModelPlaceholder')"
				@keydown.enter.prevent="pickFirst"
			/>
			<!-- Смужка «шукаємо» під полем: єдиний індикатор, який нічого не зсуває -->
			<span class="model-search__bar" :class="{ 'is-on': searching }" />
		</div>

		<div ref="treeRef" class="model-tree">
			<!-- Результати пошуку -->
			<template v-if="hasQuery">
				<!-- Скелетон лише поки нема ЧОГО показати взагалі: якщо дерево вже завантажене,
				     воно й лишається на екрані до приходу результатів — так список не мигає -->
				<div v-if="searching && !results.length && !brands.length" class="model-tree__loading">
					<div v-for="i in 5" :key="i" class="skeleton model-tree__skeleton" />
				</div>

				<button
					v-for="m in results"
					:key="m.id"
					class="model-tree__model model-tree__model--flat"
					@click="select({ id: m.id, url: m.alias, title: m.title })"
				>
					{{ m.title }}
				</button>

				<p v-if="!results.length && !searching" class="model-tree__empty text-muted">
					{{ t('other.notFind') }}
				</p>
			</template>

			<!-- Дерево брендів: звичайний перегляд, а після невдалого пошуку — запасний шлях -->
			<template v-if="showTree">
				<!-- Дерево вантажиться при першому відкритті -->
				<div v-if="loading" class="model-tree__loading">
					<div v-for="i in 8" :key="i" class="skeleton model-tree__skeleton" />
				</div>

				<template v-else>
					<div v-for="(brand, bi) in brands" :key="brand.url" class="model-tree__brand">
						<button class="model-tree__brand-btn" :class="{ 'is-open': openBrand === bi }" @click="toggleBrand(bi)">
							{{ brand.title }}
							<svg width="11" height="11" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5 5-5"/></svg>
						</button>

						<div v-if="openBrand === bi" class="model-tree__series">
							<template v-for="serie in brand.children || []" :key="serie.url">
								<div class="model-tree__serie">{{ serie.title.replace(' - Serie', '') }}</div>
								<button
									v-for="m in serie.children || []"
									:key="m.url"
									class="model-tree__model"
									@click="select(m)"
								>
									{{ m.title }}
								</button>
							</template>
						</div>
					</div>
				</template>
			</template>
		</div>
	</AppModal>
</template>

<script setup lang="ts">
// Дерево «бренд → серія → модель» потрібне тільки тут, тому вантажимо його при першому
// відкритті модалки, а не на SSR: у payload сторінки конструктора воно важило ~85 КБ,
// хоча в розмітці не було жодного його рядка.
//
// Пошук по моделях — ручка apisite/search/models: той самий рушій, що й у випадайці сайту
// (кирилиця, транслітерація, друкарські помилки, розкладка, злиті слова). Свою логіку тут
// не тримаємо — розпізнавання моделей має бути в одному місці. Локальний збіг по вже
// завантаженому дереву лишається як миттєвий шар і як фолбек, якщо ручка недоступна.

import type { ISearchModels } from '~/composables/useShopApi'

const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
	'update:modelValue': [v: boolean]
	select: [model: any]
}>()

const MIN_CHARS = 2
const DEBOUNCE = 200

// Кеш і таймер живуть, поки змонтована модалка (а вона не розмонтовується між відкриттями):
// один запит за сесію на однаковий запит, друге відкриття шукає ту саму модель миттєво
const cache = new Map<string, ISearchModels['models']>()
let timer: ReturnType<typeof setTimeout> | null = null
let controller: AbortController | null = null

const { t } = useI18n()
const shopApi = useShopApi()

const query = ref('')
const openBrand = ref<number | null>(null)
const brands = ref<any[]>([])
const loading = ref(false)
const searching = ref(false)
const serverResults = ref<ISearchModels['models']>([])
const inputRef = ref<HTMLInputElement>()
const treeRef = ref<HTMLElement>()

watch(
	() => props.modelValue,
	async (open: boolean) => {
		if (!open) {
			reset()
			return
		}

		// На десктопі одразу в поле: модалку відкривають саме щоб знайти свою модель.
		// На телефоні фокус підняв би клавіатуру й закрив список — там лишаємо вибір користувачу.
		nextTick(() => {
			if (window.innerWidth > 640) inputRef.value?.focus()
		})

		if (brands.value.length || loading.value) return
		loading.value = true
		try {
			const menu = await shopApi.getMenu(100)
			const list = [...(menu?.brends || [])]
			// Хвостовий елемент «ВСІ» без моделей — не бренд
			if (list.length && !list[list.length - 1].children?.length) list.pop()
			brands.value = list
		} finally {
			loading.value = false
		}
	}
)

const toggleBrand = (i: number) => {
	openBrand.value = openBrand.value === i ? null : i
}

// ---------- Пошук ----------
const hasQuery = computed(() => query.value.trim().length >= MIN_CHARS)

// Всі моделі дерева (для миттєвого локального збігу)
const allModels = computed(() => {
	const result: any[] = []
	for (const brand of brands.value) {
		for (const serie of brand.children || []) {
			for (const m of serie.children || []) result.push(m)
		}
	}
	return result
})

// Порівнюємо без розділових знаків: «a-54», «A 54» і «a54» мають бути одним і тим самим
const norm = (s: string) =>
	s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()

const localResults = computed(() => {
	if (!hasQuery.value) return []
	const q = norm(query.value)
	const qFlat = q.replace(/\s/g, '')

	return allModels.value
		.filter((m: any) => {
			const hay = norm(`${m.brend || ''} ${m.title}`)
			return hay.includes(q) || hay.replace(/\s/g, '').includes(qFlat)
		})
		.slice(0, 30)
		.map((m: any) => ({ id: m.id, alias: m.url, title: `${m.brend || ''} ${m.title}`.trim() }))
})

// Серверна видача має пріоритет — там уся логіка пошуку сайту; локальна показується,
// поки летить відповідь, і лишається, якщо ручка не відповіла
const results = computed<{ id: number; alias: string; title: string }[]>(() =>
	serverResults.value.length ? serverResults.value : localResults.value
)

// Дерево видно завжди, коли показати результати нема чим — зокрема й поки летить відповідь.
// Так між літерами не блимає «дерево → скелетон → дерево»: воно просто стоїть на місці,
// доки його не заступлять знайдені моделі.
const showTree = computed(() => !hasQuery.value || !results.value.length)

watch(query, () => {
	if (timer) clearTimeout(timer)

	// Новий запит — новий список: без цього прокручене дерево лишало б результати
	// «десь нижче», і здавалося б, що нічого не знайшлось
	if (treeRef.value) treeRef.value.scrollTop = 0

	const q = query.value.trim()
	if (q.length < MIN_CHARS) {
		controller?.abort()
		serverResults.value = []
		searching.value = false
		return
	}

	const hit = cache.get(q)
	if (hit) {
		serverResults.value = hit
		searching.value = false
		return
	}

	searching.value = true
	timer = setTimeout(() => fetchModels(q), DEBOUNCE)
})

async function fetchModels(q: string) {
	controller?.abort()
	controller = new AbortController()

	try {
		const res = await shopApi.searchModels(q, 30, controller.signal)
		const list = res?.models || []
		cache.set(q, list)
		// поки летіла відповідь, користувач міг набрати далі — тоді вона вже не актуальна
		if (query.value.trim() === q) serverResults.value = list
	} catch {
		// запит скасовано або ручка недоступна — лишаємо локальний збіг по дереву
		if (query.value.trim() === q) serverResults.value = []
	} finally {
		if (query.value.trim() === q) searching.value = false
	}
}

// Enter — перший (найрелевантніший) результат: типовий сценарій «набрав модель і поїхали»
function pickFirst() {
	const first = results.value[0]
	if (first) select({ id: first.id, url: first.alias, title: first.title })
}

function reset() {
	if (timer) clearTimeout(timer)
	controller?.abort()
	query.value = ''
	serverResults.value = []
	searching.value = false
}

// Конструктору потрібні id + alias (url) + назва — зводимо до цього і вузол меню, і картку пошуку
function select(model: { id: number; url: string; title: string; brend?: string }) {
	emit('select', model)
	emit('update:modelValue', false)
	reset()
}
</script>

<style scoped>
.model-search {
	position: relative;
	margin-bottom: 12px;
}

.model-search__bar {
	position: absolute;
	left: 10px;
	right: 10px;
	bottom: -1px;
	height: 2px;
	border-radius: var(--radius-pill);
	background: var(--accent);
	opacity: 0;
	transform: scaleX(0);
	transition: opacity 0.15s;
}

.model-search__bar.is-on {
	opacity: 1;
	animation: search-bar 0.9s ease-in-out infinite;
}

@keyframes search-bar {
	0% {
		transform: scaleX(0);
		transform-origin: left;
	}
	50% {
		transform: scaleX(1);
		transform-origin: left;
	}
	51% {
		transform-origin: right;
	}
	100% {
		transform: scaleX(0);
		transform-origin: right;
	}
}

@media (prefers-reduced-motion: reduce) {
	.model-search__bar.is-on {
		animation: none;
		transform: scaleX(1);
	}
}

/* Висота фіксована, а не max-height: інакше після кожної літери список то коротшав
   (кілька збігів), то видовжувався (дерево / повна видача), і модалка стрибала.
   Дерево брендів і так завжди довше за цю висоту, тож для нього нічого не змінюється. */
.model-tree {
	height: 54vh;
	overflow-y: auto;
	overscroll-behavior: contain;
}

/* Низькі екрани (телефон із відкритою клавіатурою, ландшафт): лишаємо поле пошуку у видимій
   частині — панель модалки обмежена 88vh */
@media (max-height: 620px) {
	.model-tree {
		height: 44vh;
	}
}

.model-tree__loading {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.model-tree__skeleton {
	height: 40px;
	border-radius: var(--radius-sm);
}

.model-tree__empty {
	margin: 10px 0 14px;
	text-align: center;
}

.model-tree__brand-btn {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 11px 12px;
	font-size: 14.5px;
	font-weight: 700;
	color: var(--text);
	border-radius: var(--radius-sm);
	text-align: left;
}

.model-tree__brand-btn:hover,
.model-tree__brand-btn.is-open {
	background: var(--accent-soft);
	color: var(--accent);
}

.model-tree__brand-btn svg {
	transition: transform 0.18s;
}

.model-tree__brand-btn.is-open svg {
	transform: rotate(180deg);
}

.model-tree__series {
	padding: 4px 0 8px;
}

.model-tree__serie {
	padding: 9px 14px 4px;
	font-size: 11.5px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}

.model-tree__model {
	display: block;
	width: 100%;
	padding: 8px 22px;
	font-size: 14px;
	color: var(--text-soft);
	text-align: left;
	border-radius: var(--radius-sm);
}

.model-tree__model--flat {
	padding: 10px 12px;
	font-weight: 600;
}

.model-tree__model:hover {
	background: var(--bg-elevated);
	color: var(--accent);
}
</style>
