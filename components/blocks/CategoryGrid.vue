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
							:alt="catTitle(cat)"
							:width="160"
							:height="160"
						/>
					</div>
					<div class="cat-card__info">
						<div class="cat-card__title">{{ catTitle(cat) }}</div>
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

<!-- Стилі .cat-grid / .cat-card — глобальні (assets/css/main.css):
     ту саму картку моделі використовує сторінка пошуку. -->
