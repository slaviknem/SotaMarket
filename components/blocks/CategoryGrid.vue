<template>
	<section v-if="categories?.length" class="block">
		<div class="container">
			<div class="section-title">
				<h2>{{ title }}</h2>
			</div>

			<div class="cat-grid" :class="`cat-grid--${variant}`">
				<NuxtLink
					v-for="cat in categories"
					:key="cat.id"
					:to="url.category(cat.alias)"
					class="cat-card"
				>
					<div class="cat-card__img">
						<AppImage
							:src="url.categoryImg(cat.image_file)"
							:alt="cat.title_full || cat.title"
							:width="160"
							:height="160"
						/>
					</div>
					<div class="cat-card__info">
						<div class="cat-card__title">{{ cat.title_full || cat.title }}</div>
						<div v-if="cat.products_count" class="cat-card__count">
							{{ cat.products_count }} {{ t('category.products') }}
						</div>
					</div>
				</NuxtLink>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
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
</script>

<style scoped>
.cat-grid {
	display: grid;
	gap: 12px;
}

.cat-grid--models {
	grid-template-columns: repeat(4, 1fr);
}

.cat-grid--categories {
	grid-template-columns: repeat(3, 1fr);
}

.cat-card {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 16px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	transition: all 0.18s ease;
}

.cat-card:hover {
	border-color: var(--accent);
	transform: translateY(-2px);
	box-shadow: var(--shadow-card);
}

.cat-card__img {
	width: 64px;
	height: 64px;
	border-radius: 12px;
	background: var(--img-bg);
	padding: 6px;
	flex-shrink: 0;
}

.cat-card__img img {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.cat-card__title {
	font-weight: 600;
	font-size: 14px;
	line-height: 1.35;
}

.cat-card:hover .cat-card__title {
	color: var(--accent);
}

.cat-card__count {
	margin-top: 3px;
	font-size: 12.5px;
	color: var(--text-muted);
}

@media (max-width: 1023px) {
	.cat-grid--models {
		grid-template-columns: repeat(2, 1fr);
	}

	.cat-grid--categories {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 560px) {
	.cat-grid--models,
	.cat-grid--categories {
		grid-template-columns: 1fr;
	}
}
</style>
