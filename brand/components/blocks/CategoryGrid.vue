<template>
	<!-- Плитки моделей SotaMARKET (C2 «Моделі · Популярні зараз»): фото на світлій підкладці, назва, кількість
	     дизайнів і стрілка; «Усі моделі →» — каталог брендів /chekhly. Пропси — як у рушійного CategoryGrid
	     (його кличе pages/index.vue двічі: моделі й розділи; розділів у Sota немає — блоку теж) -->
	<section v-if="categories?.length" class="block" :aria-labelledby="titleId">
		<div class="container">
			<SectionHead
				:title-id="titleId"
				:title="title"
				:eyebrow="variant === 'models' ? t('index.eyebrow.models') : undefined"
				:to="variant === 'models' ? localePath('/chekhly') : undefined"
				:more-label="t('index.allModels')"
			/>

			<div class="tiles">
				<NuxtLink v-for="cat in categories" :key="cat.id" :to="url.category(cat.alias)" class="tile">
					<span class="tile__img">
						<AppImage :src="url.categoryImg(cat.image_file)" :alt="catTitle(cat)" :width="108" :height="108" />
					</span>
					<span class="tile__text">
						<strong class="tile__title">{{ catTitle(cat) }}</strong>
						<span v-if="cat.products_count" class="tile__count">{{ designs(cat.products_count) }}</span>
					</span>
					<AppIcon name="chevron-right-sm" :size="14" class="tile__arrow" />
				</NuxtLink>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { pluralForm } from '#brand/plural'

withDefaults(
	defineProps<{
		title: string
		categories: any[] | null
		variant?: 'models' | 'categories'
	}>(),
	{ variant: 'categories' }
)

const { t } = useI18n()
const url = useUrl()
const localePath = useLocalePath()
const titleId = useId()

// «1 дизайн / 2 дизайни / 5 дизайнів»
const designs = (n: number) => t(`index.designs.${pluralForm(n)}`, { n })
</script>

<style scoped>
.tiles {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 14px;
}

.tile {
	display: flex;
	align-items: center;
	gap: 14px;
	min-width: 0;
	padding: 12px 18px 12px 12px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: calc(var(--radius) + 2px);
	transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.tile:hover {
	border-color: var(--border-light);
	box-shadow: var(--shadow-card);
	transform: translateY(-2px);
}

.tile__img {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	width: 68px;
	height: 68px;
	border-radius: calc(var(--radius-sm) + 4px);
	background: var(--bg-soft);
}

/* Знімки моделей — на білому: multiply прибирає білий прямокутник на сірій підкладці */
.tile__img :deep(img) {
	width: 54px;
	height: 54px;
	object-fit: contain;
	mix-blend-mode: multiply;
}

.tile__text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	line-height: 1.3;
}

.tile__title {
	font-size: 16px;
	font-weight: 900;
	color: var(--text);
}

.tile__count {
	font-size: 13.5px;
	color: var(--text-muted);
}

.tile__arrow {
	flex-shrink: 0;
	color: var(--link);
}

@media (max-width: 1180px) {
	.tiles {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

@media (max-width: 900px) {
	.tiles {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

/* Телефон: списком в одну колонку — у двох назви моделей ламаються по слову */
@media (max-width: 560px) {
	.tiles {
		grid-template-columns: minmax(0, 1fr);
		gap: 8px;
	}

	.tile {
		gap: 12px;
		padding: 8px 14px 8px 8px;
		border-radius: var(--radius);
	}

	.tile__img {
		width: 52px;
		height: 52px;
	}

	.tile__img :deep(img) {
		width: 42px;
		height: 42px;
	}

	.tile__title {
		font-size: 15px;
	}
}
</style>
