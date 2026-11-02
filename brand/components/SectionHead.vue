<template>
	<!-- Заголовок секції C2: рубрика над заголовком, праворуч — «Усі … →» або свій вміст (вкладки).
	     Один на всі блоки головної SotaMARKET; tag="h1" — перший екран -->
	<div class="section-head" :class="{ 'section-head--h1': tag === 'h1' }">
		<div class="section-head__titles">
			<span v-if="eyebrow" class="section-head__eyebrow">{{ eyebrow }}</span>
			<component :is="tag" :id="titleId" class="section-head__title">{{ title }}</component>
		</div>
		<NuxtLink v-if="to" :to="to" class="section-head__more">
			{{ moreLabel }}
			<AppIcon name="arrow-right" :size="18" />
		</NuxtLink>
		<slot />
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		title: string
		eyebrow?: string
		tag?: 'h1' | 'h2'
		/** id заголовка — для aria-labelledby секції */
		titleId?: string
		to?: string
		moreLabel?: string
	}>(),
	{ tag: 'h2' }
)
</script>

<style scoped>
.section-head {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 12px 16px;
	margin-bottom: 18px;
}

.section-head__titles {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.section-head__eyebrow {
	font-size: 12.5px;
	font-weight: 900;
	letter-spacing: 0.11em;
	text-transform: uppercase;
	color: var(--accent-text);
}

.section-head__title {
	margin: 0;
	font-size: 30px;
	font-weight: 900;
	line-height: 1.15;
	letter-spacing: -0.01em;
}

.section-head__more {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-weight: 800;
	color: var(--link);
	white-space: nowrap;
}

.section-head__more:hover {
	text-decoration: underline;
}

/* Перший екран — на синьому: рубрика помаранчева (6,9:1), заголовок білий */
.section-head--h1 .section-head__eyebrow {
	color: var(--accent);
}

.section-head--h1 .section-head__title {
	color: var(--on-deep);
}

@media (max-width: 640px) {
	.section-head {
		margin-bottom: 14px;
	}

	.section-head__title {
		font-size: 22px;
	}
}
</style>
