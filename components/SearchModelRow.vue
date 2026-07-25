<template>
	<div class="smr" :class="{ 'is-active': active, 'smr--wide': !!model.case_types.length }">
		<NuxtLink :to="to" class="smr__main" @click="pick">
			<AppImage
				v-if="model.image"
				:src="url.categoryImg(model.image)"
				:alt="model.title"
				:width="46"
				:height="46"
				class="smr__img"
			/>
			<span v-else class="smr__img smr__img--empty"><AppIcon name="phone" :size="20" /></span>

			<span class="smr__info">
				<span class="smr__title" v-html="highlight(model.title)" />
				<span v-if="model.products_count" class="smr__count">
					{{ model.products_count }} {{ t('category.products') }}
				</span>
			</span>

			<AppIcon name="arrow-right" :size="16" class="smr__go" />
		</NuxtLink>

		<!-- Типи чохлів, які реально є для цієї моделі.
		     Без лічильників: filters_expands.count рахує КАРТКИ (варіанти + дизайни),
		     а products_count вище — рядки товарів. Поруч ці числа виглядали б як помилка
		     («158 товарів» і тут же «Чохол 660»), хоч кожне вірне на своїй сторінці. -->
		<div v-if="model.case_types.length" class="smr__types">
			<NuxtLink
				v-for="ct in model.case_types"
				:key="ct.alias"
				:to="url.category(model.alias, ct.alias)"
				class="smr__type"
				:class="{ 'smr__type--match': ct.matched }"
				@click="pick"
			>
				{{ ct.title }}
			</NuxtLink>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ISearchSuggest } from '~/composables/useShopApi'

const props = defineProps<{
	model: ISearchSuggest['models'][number]
	active?: boolean
}>()

const { t } = useI18n()
const url = useUrl()
const { pick, highlight } = useSearch()

const to = computed(() => url.category(props.model.alias))
</script>

<style scoped>
.smr {
	border-radius: var(--radius-sm);
	background: var(--bg-soft);
	border: 1px solid var(--border);
	overflow: hidden;
	transition: border-color 0.14s;
}

.smr.is-active,
.smr:hover {
	border-color: var(--accent);
}

.smr__main {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
}

.smr__img {
	width: 46px;
	height: 46px;
	object-fit: contain;
	border-radius: var(--radius-sm);
	background: var(--img-bg);
	flex-shrink: 0;
}

.smr__img--empty {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--bg-elevated);
	color: var(--text-muted);
}

.smr__info {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
	flex: 1;
}

.smr__title {
	font-size: 14.5px;
	font-weight: 700;
	color: var(--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.smr__count {
	font-size: 12.5px;
	color: var(--text-muted);
}

.smr__go {
	color: var(--accent);
	flex-shrink: 0;
}

.smr__types {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 0 12px 10px;
}

.smr__type {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 5px 10px;
	border-radius: var(--radius-pill);
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	font-size: 12.5px;
	color: var(--text-soft);
	transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.smr__type:hover {
	background: var(--accent-soft);
	border-color: var(--accent);
	color: var(--accent);
}

/* Тип, що збігся із запитом («айфон 17 BMW» → чип BMW): залитий акцентом */
.smr__type--match {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
	font-weight: 600;
}

.smr__type--match:hover {
	background: var(--accent-hover);
	border-color: var(--accent-hover);
	color: var(--on-accent);
}
</style>
