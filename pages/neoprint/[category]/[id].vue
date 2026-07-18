<template>
	<div class="container">
		<Breadcrumbs :items="breadcrumbs" />

		<div class="np-layout">
			<!-- Фото: композиція «принт + маска моделі», зібрана в SSR (LCP) -->
			<div class="np-layout__media">
				<NeoPrintImage
					:alias="neoprint.alias"
					:category-alias="category.alias"
					:alt="pageTitle"
					:size="620"
					big
					eager
					class="np-hero"
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
					<button class="btn btn-primary btn-lg" @click="addToCart(neoprint, category)">
						<AppIcon name="cart" :size="18" />
						{{ t('product.inCart') }}
					</button>

					<NuxtLink :to="url.printcase(category.alias, neoprint.alias)" class="btn btn-outline btn-lg">
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
					<NuxtLink v-if="theme" :to="url.category(category.alias, theme.alias)" class="chip">
						{{ t('neoprint.allTheme', { filter: theme.title }) }}
					</NuxtLink>
					<NuxtLink :to="url.category(category.alias)" class="chip">
						{{ t('neoprint.allModel', { model: modelName }) }}
					</NuxtLink>
					<NuxtLink v-if="category.brend" :to="url.category(category.brend.alias)" class="chip">
						{{ t('neoprint.allBrand', { brend: category.brend.title }) }}
					</NuxtLink>
				</nav>
			</div>
		</div>

		<!-- Інші дизайни цієї теми на цій же моделі -->
		<section v-if="siblings.length" class="np-others">
			<div class="section-title">
				<h2>{{ t('neoprint.otherDesigns', { filter: theme?.title || '' }) }}</h2>
			</div>

			<div class="products-grid products-grid--left">
				<NeoPrintCard
					v-for="item in siblings"
					:key="item.id"
					:neoprint="item"
					:category="category"
				/>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
// Сторінка готового дизайну на конкретній моделі: /neoprint/{модель}/{дизайн}.
//
// Товару в БД не існує — сторінка збирається з атрибута (шаблон принта + текст із
// плейсхолдерами моделі) та категорії. На відміну від старого сайту, де фото малював
// canvas уже в браузері, тут увесь контент (фото, H1, опис, ціна, перелінковка) —
// у server-rendered HTML, тож сторінку бачать і Google, і AI-боти.

const route = useRoute()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const url = useUrl()
const shopApi = useShopApi()
const { price, priceOld, title, description: npDescription, addToCart } = useNeoPrint()

const categoryAlias = computed(() => String(route.params.category))
const id = computed(() => String(route.params.id))

// Одна хвиля запитів: дизайн, модель і дерево фільтрів — паралельно; сусідні дизайни теми —
// щойно відомий filter_id. У payload кладемо лише те, що малює сторінка: сирий атрибут несе
// шаблони описів обома мовами, а категорія — до 30 відгуків, і все це поїхало б у HTML.
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
		// (інакше немає маски, а отже й самого товару)
		if (!neoprint?.publish || neoprint.site !== config.public.site) return false
		if (!category?.printcase) return false

		const all = await shopApi.getNeoPrints(neoprint.filter_id)

		return {
			neoprint: {
				id: neoprint.id,
				alias: neoprint.alias,
				title: neoprint.title,
				filter_id: neoprint.filter_id,
				// Опис із уже підставленою моделлю — шаблон із #model# на клієнті не потрібен
				description: npDescription(neoprint, category, locale.value),
			},
			category: {
				id: category.id,
				alias: category.alias,
				title: category.title,
				title_full: category.title_full,
				brend: category.brend ? { alias: category.brend.alias, title: category.brend.title } : null,
			},
			// Тема (фільтр) дизайну — з плоского дерева фільтрів моделі
			theme: flattenFilters(filters).find((f) => f.id === neoprint.filter_id) ?? null,
			siblings: all.filter((n) => n.id !== neoprint.id).slice(0, 24),
		}
	}
)

if (!data.value) {
	throw createError({ statusCode: 404, statusMessage: 'Design not found', fatal: true })
}

const neoprint = computed(() => data.value!.neoprint)
const category = computed(() => data.value!.category)
const theme = computed(() => data.value!.theme)
const siblings = computed(() => data.value!.siblings)

const modelName = computed(() => category.value.title_full || category.value.title || '')
const pageTitle = computed(() => title(neoprint.value, category.value))
const description = computed(() => neoprint.value.description)
const discount = computed(() => discountPercent(price.value, priceOld.value))

// Готова композиція одним файлом — для og:image та schema.org
const shareImage = computed(() =>
	url.absolute(url.neoprintImage(category.value.alias, neoprint.value.alias))
)

const breadcrumbs = computed(() => {
	const crumbs: { title: string; url?: string }[] = []

	if (category.value.brend) {
		crumbs.push({ title: category.value.brend.title, url: url.category(category.value.brend.alias) })
	}
	crumbs.push({ title: modelName.value, url: url.category(category.value.alias) })

	if (theme.value) {
		crumbs.push({ title: theme.value.title, url: url.category(category.value.alias, theme.value.alias) })
	}
	crumbs.push({ title: neoprint.value.title })

	return crumbs
})

usePageSeo({
	title: () => pageTitle.value,
	description: () =>
		t('neoprint.metaDescription', {
			model: modelName.value,
			print: neoprint.value.title,
			price: price.value,
		}),
	image: () => shareImage.value,
})

// Product + Offer: для пошуковиків і AI це повноцінний товар зі своєю ціною та фото
useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'Product',
	name: pageTitle.value,
	description: description.value,
	image: [shareImage.value],
	sku: `NP-${neoprint.value.id}-${category.value.id}`,
	brand: { '@type': 'Brand', name: config.public.siteName },
	// Чим цей варіант відрізняється від інших дизайнів теми
	pattern: neoprint.value.title,
	offers: {
		'@type': 'Offer',
		url: url.absolute(url.neoprint(category.value.alias, neoprint.value.id)),
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

// Облік візитів (дизайн — це атрибут)
onMounted(() => shopApi.addVisit(category.value.id, 0, neoprint.value.id, neoprint.value.filter_id))
</script>

<style scoped>
.np-layout {
	display: grid;
	grid-template-columns: minmax(0, 560px) minmax(0, 1fr);
	gap: 30px;
	align-items: start;
	padding-bottom: 10px;
}

.np-layout__media {
	background: var(--img-bg);
	border-radius: var(--radius-lg);
	overflow: hidden;
	box-shadow: var(--shadow-card);
	padding: 18px;
}

.np-title {
	margin: 0 0 14px;
	font-size: 26px;
	font-weight: 800;
	letter-spacing: -0.02em;
	line-height: 1.25;
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

.np-actions {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
	margin-bottom: 20px;
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

.np-others {
	margin-top: 40px;
	padding-bottom: 30px;
}

@media (max-width: 900px) {
	.np-layout {
		grid-template-columns: 1fr;
		gap: 20px;
	}

	.np-title {
		font-size: 20px;
	}

	.np-prices__now {
		font-size: 25px;
	}

	.np-actions .btn {
		flex: 1 1 100%;
	}
}
</style>
