<template>
	<section v-if="displayBrands.length" class="brands-catalog" :class="{ 'is-single': single }">
		<article v-for="brand in displayBrands" :key="brand.url" class="brand-block">
			<!-- Сторінка одного бренду: логотип справа, моделі його обтікають (компактно).
			     Назву не дублюємо — її несе H1 сторінки. -->
			<span v-if="single && brand.image_file" class="brand-block__logo brand-block__logo--float">
				<AppImage :src="url.categoryImg(brand.image_file)" :alt="brand.title" :width="200" />
			</span>

			<!-- Каталог усіх брендів: шапка логотип + назва -->
			<header v-if="!single" class="brand-block__head">
				<span v-if="brand.image_file" class="brand-block__logo">
					<AppImage :src="url.categoryImg(brand.image_file)" :alt="brand.title" :width="120" />
				</span>
				<h2 class="brand-block__title">
					<NuxtLink :to="catLink(brand.url)">{{ brand.title }}</NuxtLink>
				</h2>
			</header>

			<div class="brand-block__series">
				<div
					v-for="serie in brand.series"
					:key="serie.url"
					class="brand-block__serie"
					:style="{ '--cols': serie.cols }"
				>
					<component :is="single ? 'h2' : 'h3'" class="brand-block__serie-title">{{ serie.title.replace(' - Serie', '') }}</component>
					<ul>
						<li v-for="model in serie.children" :key="model.url">
							<NuxtLink :to="catLink(model.url)">{{ model.title }}</NuxtLink>
						</li>
					</ul>
				</div>
			</div>
		</article>
	</section>
</template>

<script setup lang="ts">
const props = defineProps<{ brands: any[] | null; single?: boolean }>()

const url = useUrl()

const catLink = (alias: string) => url.category(String(alias).replace(/^\/+/, ''))

// Бренди → непорожні серії. К-ть колонок списку: вузькі картки масонрі (≤2),
// повна ширина на сторінці одного бренду (≤6).
const displayBrands = computed(() => {
	const maxCols = props.single ? 6 : 2
	const per = props.single ? 9 : 13
	return (props.brands || [])
		.map((b: any) => ({
			...b,
			series: (b.children || [])
				.filter((s: any) => s.children?.length)
				.map((s: any) => ({ ...s, cols: Math.min(maxCols, Math.ceil(s.children.length / per)) })),
		}))
		.filter((b: any) => b.series.length)
})
</script>

<style scoped>
/* Масонрі: бренди пакуються в кілька колонок — без великих «дірок» на широкому екрані */
.brands-catalog {
	columns: 470px;
	column-gap: 16px;
}

.brands-catalog.is-single {
	columns: auto;
}

.brand-block {
	display: block;
	break-inside: avoid;
	margin: 0 0 16px;
	padding: 16px 18px 20px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.brands-catalog.is-single .brand-block {
	display: flow-root; /* містить плаваючий логотип (його обтікають моделі) */
	margin: 0;
	padding: 0;
	background: none;
	border: none;
}

/* Логотип на сторінці бренду — плаває справа, моделі його обтікають */
.brands-catalog.is-single .brand-block__logo {
	float: right;
	width: 104px;
	height: 104px;
	margin: 0 0 14px 22px;
	padding: 12px;
}

.brand-block__head {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 14px;
}

.brand-block__logo {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	flex-shrink: 0;
	padding: 6px;
	background: var(--img-bg);
	border-radius: 10px;
}

.brand-block__logo :deep(img) {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.brand-block__title {
	margin: 0;
	font-size: 18px;
	font-weight: 800;
	letter-spacing: -0.01em;
}

.brand-block__title a {
	color: var(--text);
	transition: color 0.15s;
}

.brand-block__title a:hover {
	color: var(--accent);
}

.brand-block__series {
	display: flex;
	flex-wrap: wrap;
	gap: 14px 20px;
	align-items: flex-start;
}

/* На сторінці бренду — звичайний потік (не flex), щоб серії обтікали плаваючий логотип */
.brands-catalog.is-single .brand-block__series {
	display: block;
}

.brand-block__serie {
	width: calc(var(--cols, 1) * 166px);
}

.brands-catalog.is-single .brand-block__serie {
	display: inline-block;
	vertical-align: top;
	margin: 0 22px 16px 0;
}

.brand-block__serie-title {
	margin: 0 0 7px;
	padding: 0 8px 6px;
	font-size: 12px;
	font-weight: 700;
	color: var(--accent);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	border-bottom: 1px solid var(--border);
}

.brand-block__serie ul {
	margin: 0;
	padding: 0;
	list-style: none;
	column-count: var(--cols, 1);
	column-gap: 8px;
}

.brand-block__serie li {
	break-inside: avoid;
}

.brand-block__serie li a {
	display: block;
	padding: 6px 8px;
	border-radius: var(--radius-sm);
	font-size: 13.5px;
	color: var(--text-soft);
	transition: background 0.14s ease, color 0.14s ease, padding-left 0.14s ease;
}

.brand-block__serie li a:hover {
	background: var(--accent-soft);
	color: var(--accent);
	padding-left: 13px;
}

@media (max-width: 560px) {
	.brand-block__serie {
		width: 100%;
	}

	/* На вузькому екрані логотип бренду не плаває, а стоїть зверху */
	.brands-catalog.is-single .brand-block__logo {
		float: none;
		margin: 0 0 14px;
	}

	.brands-catalog.is-single .brand-block__serie {
		display: block;
		margin-right: 0;
	}
}
</style>
