<template>
	<nav v-if="brands?.length" class="brand-tiles" :aria-label="t('header.topbar.categories')">
		<NuxtLink
			v-for="brand in brands"
			:key="brand.alias"
			:to="url.category(brand.alias)"
			class="brand-tile"
		>
			<span class="brand-tile__logo">
				<!-- лише ширина → IPX масштабує пропорційно (без обрізання логотипа) -->
				<AppImage
					:src="url.categoryImg(brand.image_file)"
					:alt="brand.title_full || brand.title_rus || brand.title"
					:width="220"
				/>
			</span>
			<span class="brand-tile__name">{{ brand.title_full || brand.title_rus || brand.title }}</span>
		</NuxtLink>
	</nav>
</template>

<script setup lang="ts">
defineProps<{ brands: any[] | null }>()

const { t } = useI18n()
const url = useUrl()
</script>

<style scoped>
.brand-tiles {
	display: grid;
	grid-template-columns: repeat(8, 1fr);
	gap: 14px;
}

@media (max-width: 1280px) {
	.brand-tiles {
		grid-template-columns: repeat(6, 1fr);
	}
}

@media (max-width: 980px) {
	.brand-tiles {
		grid-template-columns: repeat(4, 1fr);
	}
}

.brand-tile {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
}

.brand-tile:hover {
	border-color: var(--accent);
	transform: translateY(-2px);
	box-shadow: var(--shadow-card);
}

.brand-tile__logo {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 120px;
	padding: 18px 22px;
	background: var(--img-bg);
}

.brand-tile__logo :deep(img) {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.brand-tile__name {
	padding: 12px 10px;
	background: var(--bg-elevated);
	color: var(--text-soft);
	font-size: 14px;
	font-weight: 700;
	text-align: center;
	transition: color 0.16s ease;
}

.brand-tile:hover .brand-tile__name {
	color: var(--accent-text);
}

@media (max-width: 560px) {
	.brand-tiles {
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.brand-tile__logo {
		height: 80px;
	}
}
</style>
