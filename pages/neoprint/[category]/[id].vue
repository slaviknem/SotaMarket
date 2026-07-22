<template>
	<div class="container">
		<Breadcrumbs :items="breadcrumbs" />

		<div class="np-layout" :class="{ 'np-layout--with-designs': themeTree.length }">
			<!-- Галерея дизайнів: свайп/стрілки гортають композиції «принт + маска» (SSR, LCP).
			     Вибір дизайну тут = активний товар сторінки (заголовок, ціна, кошик, URL). -->
			<div class="np-layout__media">
				<!-- key міняється лише при зміні теми → галерея чисто перемонтовується з новим набором
				     (Swiper інакше може лишитися в застарілому стані). У межах теми key стабільний, свайп працює. -->
				<NeoPrintGallery
					:key="selectedChildAlias || selectedParentAlias || 'all'"
					:slides="slides"
					:active-index="activeIndex"
					:category-alias="category.alias"
					@select="selectDesign"
				/>
			</div>

			<div class="np-layout__info">
				<h1 class="np-title">{{ pageTitle }}</h1>

				<div class="np-prices">
					<span class="np-prices__now">{{ formatPrice(price) }}</span>
					<span v-if="discount > 0" class="np-prices__old">{{ formatPrice(priceOld) }}</span>
					<span v-if="discount > 0" class="badge badge-sale">-{{ discount }}%</span>
				</div>

				<div class="np-actions">
					<button class="btn btn-primary btn-lg" @click="addToCart(activeDesign, category)">
						<AppIcon name="cart" :size="18" />
						{{ t('product.inCart') }}
					</button>

					<NuxtLink :to="url.printcase(category.alias, activeDesign.alias)" class="btn btn-outline btn-lg">
						<AppIcon name="edit" :size="17" />
						{{ t('neoprint.editInConstructor') }}
					</NuxtLink>
				</div>

				<ul class="np-features">
					<li v-for="key in ['ready', 'print', 'model']" :key="key">
						<AppIcon name="check" :size="15" />
						{{ t(`neoprint.features.${key}`) }}
					</li>
				</ul>

				<p v-if="description" class="np-desc typography">{{ description }}</p>

				<p class="np-note text-muted">{{ t('neoprint.cameraNote') }}</p>

				<!-- Перелінковка: тема → модель → бренд -->
				<nav class="np-links" :aria-label="t('neoprint.seeAlso')">
					<span class="np-links__label">{{ t('neoprint.seeAlso') }}:</span>
					<NuxtLink v-if="activeThemeAlias" :to="url.category(category.alias, activeThemeAlias)" class="chip">
						{{ t('neoprint.allTheme', { filter: activeThemeTitle }) }}
					</NuxtLink>
					<NuxtLink :to="url.category(category.alias)" class="chip">
						{{ t('neoprint.allModel', { model: modelName }) }}
					</NuxtLink>
					<NuxtLink v-if="category.brend" :to="url.category(category.brend.alias)" class="chip">
						{{ t('neoprint.allBrand', { brend: category.brend.title }) }}
					</NuxtLink>
				</nav>
			</div>

			<!-- Вибір дизайну: щільна сітка мініатюр. На десктопі — колонка справа (одразу видно
			     багато варіантів), на вужчих екранах — сітка на всю ширину нижче. Кожна мініатюра —
			     справжнє посилання (SSR/краулери/нова вкладка), а клік перемикає дизайн на місці. -->
			<aside v-if="themeTree.length" class="np-designs" :class="{ 'is-switching': switching }" :aria-label="t('neoprint.otherDesigns', { filter: activeThemeTitle })">
				<!-- Меню тем над блоком принтів: клік по темі/підтемі перемикає показані дизайни
				     ПРЯМО ТУТ, без переходу на іншу сторінку. Посилання лишаються справжніми (href),
				     тож краулери/нова вкладка ведуть на фільтр-сторінку, а звичайний клік — перемикає. -->
				<nav v-if="themeTree.length" class="theme-nav" :aria-label="t('filters.type.theme')">
					<div class="theme-nav__row">
						<!-- Звичайний <a>, а не NuxtLink: клік перехоплюємо і перемикаємо дизайни на місці
						     (preventDefault надійно спиняє лише дефолтну навігацію; NuxtLink навігував би
						     програмно через router.push в обхід preventDefault). href лишається для SEO/нової вкладки. -->
						<a
							v-for="tp in themeTree"
							:key="tp.alias"
							:href="url.category(category.alias, tp.alias)"
							class="chip theme-nav__chip"
							:class="{ 'is-active': tp.alias === selectedParentAlias }"
							@click="onThemeClick($event, tp)"
						>
							{{ tp.title }}
						</a>
					</div>

					<!-- Підтеми активної теми — в одній загальній обводці, самі пункти як текст-посилання.
					     «Всі авто» окремо не дублюємо: цю роль виконує підсвічений верхній чип теми. -->
					<div v-if="subthemes.length" class="theme-nav__sub">
						<a
							v-for="st in subthemes"
							:key="st.alias"
							:href="url.category(category.alias, st.alias)"
							class="theme-nav__sublink"
							:class="{ 'is-active': st.alias === selectedChildAlias }"
							@click="onSubthemeClick($event, st)"
						>
							{{ st.title }}
						</a>
					</div>
				</nav>

				<h2 class="np-designs__title">{{ t('neoprint.otherDesigns', { filter: activeThemeTitle }) }}</h2>

				<div class="np-designs__grid">
					<a
						v-for="(d, i) in slides"
						:key="d.id"
						:href="url.neoprint(category.alias, d.id)"
						class="np-thumb"
						:class="{ 'is-active': i === activeIndex }"
						:title="d.title"
						:aria-current="i === activeIndex ? 'true' : undefined"
						@click="onThumbClick($event, i)"
					>
						<NeoPrintImage
							:alias="d.alias"
							:category-alias="category.alias"
							:alt="d.alt"
							:size="150"
							class="np-thumb__img"
						/>
						<span class="np-thumb__title">{{ d.title }}</span>
					</a>
				</div>
			</aside>
		</div>
	</div>
</template>

<script setup lang="ts">
// Сторінка готового дизайну на конкретній моделі: /neoprint/{модель}/{дизайн}.
//
// Товару в БД не існує — сторінка збирається з атрибута (шаблон принта + текст із
// плейсхолдерами моделі) та категорії. Увесь контент (фото, H1, опис, ціна, перелінковка) —
// у server-rendered HTML, тож сторінку бачать і Google, і AI-боти.
//
// Дизайни однієї теми — це фактично варіанти одного товару (та сама модель і ціна, різний
// малюнок). Тому галерея дозволяє гортати їх (свайп/стрілки/тап по мініатюрі), і вибір
// перемикає активний дизайн БЕЗ перезавантаження — так само, як вибір принта на сторінці
// товару: заголовок, ціна, опис, кошик і URL ідуть за показаним дизайном.

import type { IFilterNode } from '~/composables/useFilters'

const route = useRoute()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const url = useUrl()
const shopApi = useShopApi()
const { price, priceOld, title, description: npDescription, addToCart } = useNeoPrint()

const categoryAlias = computed(() => String(route.params.category))
const id = computed(() => String(route.params.id))

// Одна хвиля запитів: дизайн, модель і дерево фільтрів — паралельно; список дизайнів теми —
// щойно відомий filter_id. У payload кладемо лише те, що малює сторінка: короткі об'єкти дизайнів
// (id/alias/назва) + опис лише активного (решту вантажимо на вимогу при перемиканні).
// false замість null, щоб useAsyncData не повторював запит на клієнті.
const { data } = await useAsyncData(
	`neoprint-${categoryAlias.value}-${id.value}-${locale.value}`,
	async () => {
		const [neoprint, category, filters] = await Promise.all([
			shopApi.getNeoPrint(id.value),
			shopApi.getCategoryByAlias(categoryAlias.value),
			shopApi.getFilters(categoryAlias.value),
		])

		// Дизайн має бути опублікований і належати цьому сайту; модель — підтримувати друк
		if (!neoprint?.publish || neoprint.site !== config.public.site) return false
		if (!category?.printcase) return false

		// Дерево фільтрів: тема дизайну + її батько (для меню й підбору дизайнів)
		const flat = flattenFilters(filters)
		const themeNode = flat.find((f) => f.id === neoprint.filter_id) ?? null
		const parentNode = themeNode
			? flat.find((f) => f.items?.some((i) => i.id === themeNode.id)) ?? null
			: null
		const activeParent = parentNode ?? themeNode

		// Дизайни теми = її власний filter_id + усі підтеми: дизайни бувають прив'язані і напряму
		// до теми (напр. «Футболисты»), і до підтем. Беремо обидва рівні й перемежовуємо для різноманіття.
		const themeIds = [...new Set(
			[neoprint.filter_id, ...(themeNode?.items || []).map((i) => i.id)].filter(
				(v): v is number => typeof v === 'number' && v > 0
			)
		)]
		const batches = await Promise.all(themeIds.map((fid) => shopApi.getNeoPrints(fid)))
		const others = interleave(batches)
			.filter((n) => n.id !== neoprint.id)
			.map((n) => ({ id: n.id, alias: n.alias, title: n.title, filter_id: n.filter_id }))

		// Активний дизайн — першим; решта теми — далі. Разом це «плівка» галереї та рейл вибору.
		const designs = [
			{ id: neoprint.id, alias: neoprint.alias, title: neoprint.title, filter_id: neoprint.filter_id },
			...others,
		].slice(0, 30)

		// Дерево тем для меню-перемикача: верхній рівень — усі теми (окрім службових фільтр-типів
		// Категорія/Форм-фактор/Матеріал), у кожної — її підтеми з id. id потрібні, щоб на кліку
		// вантажити дизайни теми прямо тут, без переходу на фільтр-сторінку.
		const FILTER_TYPES = ['cat', 'form_factor', 'material']
		const themeTree = ((filters as IFilterNode[]) || [])
			.filter((f) => !FILTER_TYPES.includes(f.type || ''))
			.map((f) => ({
				alias: f.alias,
				title: f.title,
				id: f.id ?? 0,
				children: (f.items || []).map((i) => ({ alias: i.alias, title: i.title, id: i.id ?? 0 })),
			}))

		return {
			landingId: neoprint.id,
			// Опис лендінгового дизайну з уже підставленою моделлю (готовий, без запиту на клієнті)
			landingDescription: npDescription(neoprint, category, locale.value),
			category: {
				id: category.id,
				alias: category.alias,
				title: category.title,
				title_full: category.title_full,
				brend: category.brend ? { alias: category.brend.alias, title: category.brend.title } : null,
			},
			themeTree,
			// Початковий вибір меню: батьківська тема (Авто) + конкретна підтема дизайну (BMW)
			initialParentAlias: activeParent?.alias ?? null,
			initialChildAlias: themeNode?.alias ?? null,
			designs,
		}
	}
)

if (!data.value) {
	throw createError({ statusCode: 404, statusMessage: 'Design not found', fatal: true })
}

// Дизайн у «плівці» галереї/рейлу (getNeoPrint віддає any, тож типізуємо явно)
type NpDesign = { id: number; alias: string; title: string; filter_id: number }
type ThemeNode = { alias: string; title: string; id: number; children: { alias: string; title: string; id: number }[] }

const category = computed(() => data.value!.category)
const themeTree = data.value!.themeTree as ThemeNode[]

// Показані зараз дизайни (галерея + рейл). Реф, бо меню тем перемикає набір без навігації.
const designs = ref<NpDesign[]>([...data.value!.designs])

const modelName = computed(() => category.value.title_full || category.value.title || '')

// ---------- Активний дизайн (перемикання без навігації, як вибір принта на сторінці товару) ----------
const activeId = ref<number>(data.value!.landingId)

// Мережева пауза при перемиканні теми — приглушуємо сітку, щоб клік мав миттєвий відгук
const switching = ref(false)

// ---------- Обрана тема/підтема в меню (керує набором дизайнів і підсвіткою) ----------
const selectedParentAlias = ref<string | null>(data.value!.initialParentAlias)
const selectedChildAlias = ref<string | null>(data.value!.initialChildAlias)

const selectedParent = computed(() => themeTree.find((tn) => tn.alias === selectedParentAlias.value) || null)
const subthemes = computed(() => selectedParent.value?.children || [])
const activeThemeAlias = computed(() => selectedChildAlias.value || selectedParentAlias.value || undefined)
const activeThemeTitle = computed(() => {
	if (selectedChildAlias.value) {
		const c = subthemes.value.find((s: { alias: string }) => s.alias === selectedChildAlias.value)
		if (c) return c.title
	}
	return selectedParent.value?.title || modelName.value
})

// Опис кожного дизайну вантажимо на вимогу (у списку теми його немає) і кешуємо.
// Лендінговий — уже з SSR, тож перший показ без запиту.
const descCache = reactive<Record<number, string>>({
	[data.value!.landingId]: data.value!.landingDescription,
})

const activeIndex = computed(() => {
	const i = designs.value.findIndex((d: NpDesign) => d.id === activeId.value)
	return i < 0 ? 0 : i
})
const activeDesign = computed(() => designs.value[activeIndex.value] || designs.value[0])

// Слайди галереї = мініатюри рейлу: id/alias/назва + alt (повна назва товару для SEO)
const slides = computed(() =>
	designs.value.map((d: NpDesign) => ({ id: d.id, alias: d.alias, title: d.title, alt: title(d, category.value) }))
)

const pageTitle = computed(() => title(activeDesign.value, category.value))
const description = computed(() => descCache[activeId.value] || '')
const discount = computed(() => discountPercent(price.value, priceOld.value))

// Готова композиція одним файлом — для og:image та schema.org
const shareImage = computed(() =>
	url.absolute(url.neoprintImage(category.value.alias, activeDesign.value.alias))
)

// Підвантаження опису дизайну при перемиканні (з кешем і міткою «вантажиться»)
async function ensureDescription(designId: number) {
	if (descCache[designId] !== undefined) return
	descCache[designId] = ''
	const np = await shopApi.getNeoPrint(designId)
	descCache[designId] = np ? npDescription(np, category.value, locale.value) : ''
}

function selectDesign(index: number) {
	const d = designs.value[index]
	if (d) activeId.value = d.id
}

// Клік по мініатюрі: звичайний лівий — перемикаємо дизайн на місці; з модифікатором або
// середньою кнопкою — не заважаємо браузеру відкрити сторінку дизайну (нова вкладка/вікно).
function onThumbClick(e: MouseEvent, index: number) {
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
	e.preventDefault()
	selectDesign(index)
}

// ---------- Перемикання теми в меню (без навігації): вантажимо дизайни теми прямо тут ----------
// Перемежовуємо списки по колу (як у CategoryPage) — щоб набір теми показував різні підтеми,
// а не всі одного бренду поспіль.
function interleave<T>(lists: T[][]): T[] {
	const out: T[] = []
	const longest = Math.max(0, ...lists.map((l) => l.length))
	for (let i = 0; i < longest; i++) for (const l of lists) if (i < l.length) out.push(l[i])
	return out
}

// Дизайни теми = її власний filter_id + усі підтеми: дизайни бувають прив'язані і напряму до теми
// (напр. «Футболисты»), і до підтем. Тому беремо обидва рівні, інакше тема «не відкривається».
// id > 0 — захист від службових/порожніх вузлів (getNeoPrints(0) віддав би сміття → 404).
async function loadThemeDesigns(node: { id: number; children?: { id: number }[] }): Promise<NpDesign[]> {
	const toDesigns = (arr: any[]): NpDesign[] =>
		(Array.isArray(arr) ? arr : []).map((n) => ({ id: n.id, alias: n.alias, title: n.title, filter_id: n.filter_id }))
	const ids = [...new Set([node.id, ...(node.children || []).map((c) => c.id)].filter((cid) => cid > 0))]
	if (!ids.length) return []
	const batches = await Promise.all(ids.map((cid) => shopApi.getNeoPrints(cid)))
	return interleave(batches.map(toDesigns)).slice(0, 30)
}

// Тільки останній клік застосовується — захист від гонки при швидкому перемиканні тем
let switchToken = 0

// true — застосовано (або запит застарів); false — у теми немає жодного дизайну.
async function applyTheme(node: { id: number; children?: { id: number }[] }, commitSelection: () => void): Promise<boolean> {
	const token = ++switchToken
	switching.value = true
	try {
		const list = await loadThemeDesigns(node)
		if (token !== switchToken) return true // прийшов новіший клік — цей застарів
		if (!list.length) return false
		designs.value = list
		commitSelection()
		activeId.value = list[0].id
		return true
	} finally {
		if (token === switchToken) switching.value = false
	}
}

// Клік по темі верхнього рівня → показати всі її дизайни (перемежовані підтеми)
function selectTopTheme(node: ThemeNode) {
	if (node.alias === selectedParentAlias.value && !selectedChildAlias.value) return
	applyTheme(node, () => {
		selectedParentAlias.value = node.alias
		selectedChildAlias.value = null
	})
}

// Клік по підтемі → її дизайни; якщо власних немає (прив'язані до теми-батька) — показуємо всю
// батьківську тему, щоб клік не був «мертвим».
async function selectSubtheme(node: { alias: string; id: number }) {
	if (node.alias === selectedChildAlias.value) return
	const applied = await applyTheme(node, () => {
		selectedChildAlias.value = node.alias
	})
	if (!applied) {
		const parent = selectedParent.value
		if (parent) applyTheme(parent, () => { selectedChildAlias.value = null })
	}
}

// Меню — справжні посилання на фільтр-сторінки (SEO/нова вкладка), а звичайний клік
// перемикає набір дизайнів тут, без переходу.
function onThemeClick(e: MouseEvent, node: ThemeNode) {
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
	e.preventDefault()
	selectTopTheme(node)
}

function onSubthemeClick(e: MouseEvent, node: { alias: string; id: number }) {
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
	e.preventDefault()
	selectSubtheme(node)
}

// Вибір дизайну переписує URL на його сторінку (рівно таку віддасть SSR при перезавантаженні) —
// посилання можна скопіювати, зберегти чи переслати. history.replaceState, а не роутер: навігація
// перемонтувала б сторінку (повторні запити, стрибок скролу), а pushState засмічував би історію.
watch(activeId, (nv: number) => {
	if (!import.meta.client) return
	ensureDescription(nv)
	const href = url.neoprint(category.value.alias, nv) + location.search
	history.replaceState({ ...history.state, current: href }, '', href)
	shopApi.addVisit(category.value.id, 0, nv, activeDesign.value?.filter_id ?? 0)

	// На вузьких екранах рейл вибору — під галереєю: підкрутимо фото у видиме
	if (window.innerWidth <= 900) {
		nextTick(() => document.querySelector('.np-layout__media')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
	}
})

const breadcrumbs = computed(() => {
	const crumbs: { title: string; url?: string }[] = []

	if (category.value.brend) {
		crumbs.push({ title: category.value.brend.title, url: url.category(category.value.brend.alias) })
	}
	crumbs.push({ title: modelName.value, url: url.category(category.value.alias) })

	if (activeThemeAlias.value) {
		crumbs.push({ title: activeThemeTitle.value, url: url.category(category.value.alias, activeThemeAlias.value) })
	}
	crumbs.push({ title: activeDesign.value.title })

	return crumbs
})

usePageSeo({
	title: () => pageTitle.value,
	description: () =>
		t('neoprint.metaDescription', {
			model: modelName.value,
			print: activeDesign.value.title,
			price: price.value,
		}),
	image: () => shareImage.value,
	// URL змінюється без навігації роутера — canonical/og тримаємо на активному дизайні
	path: () => url.neoprint(category.value.alias, activeId.value),
})

// Product + Offer: для пошуковиків і AI це повноцінний товар зі своєю ціною та фото
useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'Product',
	name: pageTitle.value,
	description: description.value,
	image: [shareImage.value],
	sku: `NP-${activeDesign.value.id}-${category.value.id}`,
	brand: { '@type': 'Brand', name: config.public.siteName },
	// Чим цей варіант відрізняється від інших дизайнів теми
	pattern: activeDesign.value.title,
	offers: {
		'@type': 'Offer',
		url: url.absolute(url.neoprint(category.value.alias, activeDesign.value.id)),
		priceCurrency: 'UAH',
		price: price.value,
		itemCondition: 'https://schema.org/NewCondition',
		availability: 'https://schema.org/InStock',
	},
}))

useJsonLd(() => {
	const crumbs = [{ title: config.public.siteName, url: '/' }, ...breadcrumbs.value]
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((crumb, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: crumb.title,
			...(crumb.url ? { item: url.absolute(crumb.url) } : {}),
		})),
	}
})

// Облік візитів лендінгового дизайну (наступні перемикання — у watch(activeId))
onMounted(() => shopApi.addVisit(category.value.id, 0, activeId.value, activeDesign.value?.filter_id ?? 0))
</script>

<style scoped>
/* ---------- Меню тем (над блоком принтів у рейлі) — перевикористовує .chip з main.css ---------- */
.theme-nav {
	margin-bottom: 18px;
}

/* Ряд тем переноситься, щоб усі теми було видно повністю (без обрізання/скролу).
   flex:0 0 auto + nowrap — чип тримає власну ширину й не ламає назву. */
.theme-nav__row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.theme-nav__chip {
	flex: 0 0 auto;
	white-space: nowrap;
	font-weight: 500;
}

/* Підтеми активної теми — одна загальна обводка навколо всього блоку, а пункти всередині
   без власних чипів: звичайні текстові посилання. Мінімалістично й компактно; рівень
   «тема → підтеми» показує сам контур, без ваги окремих плашок. */
.theme-nav__sub {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 7px 16px;
	margin-top: 10px;
	padding: 9px 14px;
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.theme-nav__sublink {
	font-size: 13px;
	color: var(--text-soft);
	white-space: nowrap;
	transition: color 0.15s;
}

.theme-nav__sublink:hover {
	color: var(--accent);
}

.theme-nav__sublink.is-active {
	color: var(--accent);
	font-weight: 700;
}

.np-layout {
	display: grid;
	grid-template-columns: minmax(0, 480px) minmax(0, 1fr);
	gap: 30px;
	align-items: start;
	padding-bottom: 10px;
}

/* Є інші дизайни → третя колонка-рейл вибору заповнює простір справа від інфо-боксу */
.np-layout--with-designs {
	grid-template-columns: minmax(0, 430px) minmax(300px, 380px) minmax(0, 1fr);
	gap: 26px;
}

/* Рейл вибору вищий за фото — тримаємо галерею на видноті, поки гортають варіанти.
   Картку (фон/тінь/паддинг) малює сам NeoPrintGallery, тож медіа-обгортка — прозора. */
.np-layout--with-designs .np-layout__media {
	position: sticky;
	top: 20px;
}

.np-title {
	margin: 0 0 14px;
	font-size: 22px;
	font-weight: 800;
	letter-spacing: -0.02em;
	line-height: 1.3;
}

.np-prices {
	display: flex;
	align-items: baseline;
	gap: 12px;
	margin-bottom: 18px;
}

.np-prices__now {
	font-size: 30px;
	font-weight: 800;
	color: var(--accent);
}

.np-prices__old {
	font-size: 16px;
	color: var(--text-muted);
	text-decoration: line-through;
}

/* Кнопки — у стовпчик і однакової ширини (stretch); max-width тримає CTA компактним,
   навіть коли інфо-колонка широка (сторінка без інших дизайнів) */
.np-actions {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 10px;
	margin-bottom: 20px;
	max-width: 360px;
}

.np-features {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 18px;
	list-style: none;
	font-size: 14px;
	color: var(--text-soft);
}

.np-features li {
	display: flex;
	align-items: center;
	gap: 9px;
}

.np-features svg {
	color: var(--success);
	flex-shrink: 0;
}

.np-desc {
	margin-bottom: 14px;
	font-size: 14.5px;
}

.np-note {
	margin-bottom: 20px;
	font-size: 12.5px;
	line-height: 1.5;
}

.np-links {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	padding-top: 18px;
	border-top: 1px solid var(--border);
}

.np-links__label {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-muted);
}

/* ---------- Рейл «Вибір дизайну» (десктоп — права колонка, нижче — сітка на всю ширину) ---------- */
.np-designs {
	padding-bottom: 10px;
}

.np-designs__title {
	margin: 0 0 14px;
	font-size: 17px;
	font-weight: 700;
	line-height: 1.3;
}

/* auto-fill: сама тримає щільність від вузького рейлу до повної ширини — без окремих брейкпоінтів */
.np-designs__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
	gap: 10px;
	transition: opacity 0.15s;
}

/* Поки вантажаться дизайни іншої теми — приглушуємо сітку (миттєвий відгук на клік) */
.np-designs.is-switching .np-designs__grid {
	opacity: 0.45;
	pointer-events: none;
}

.np-thumb {
	display: flex;
	flex-direction: column;
	border: 2px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	background: var(--bg-card);
	transition: border-color 0.15s, transform 0.15s;
}

.np-thumb:hover {
	border-color: var(--accent);
	transform: translateY(-2px);
}

/* Активний дизайн (той, що зараз у галереї / буде в кошику) — виразна рамка */
.np-thumb.is-active {
	border-color: var(--accent);
	box-shadow: inset 0 0 0 1px var(--accent);
}

.np-thumb__title {
	padding: 5px 6px 7px;
	font-size: 11.5px;
	line-height: 1.25;
	color: var(--text-soft);
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Планшет: рейл переходить у сітку на всю ширину під основним блоком, фото більше не sticky */
@media (max-width: 1100px) {
	.np-layout--with-designs {
		grid-template-columns: minmax(0, 430px) minmax(0, 1fr);
	}

	.np-layout--with-designs .np-layout__media {
		position: static;
	}

	.np-designs {
		grid-column: 1 / -1;
		margin-top: 28px;
		padding-top: 26px;
		border-top: 1px solid var(--border);
	}

	.np-designs__title {
		font-size: 19px;
	}
}

@media (max-width: 900px) {
	.np-layout,
	.np-layout--with-designs {
		grid-template-columns: 1fr;
		gap: 20px;
	}

	.np-title {
		font-size: 20px;
	}

	.np-prices__now {
		font-size: 25px;
	}

	/* На мобільному CTA — на всю ширину екрана (стовпчик уже задано в базі) */
	.np-actions {
		max-width: none;
	}
}
</style>
