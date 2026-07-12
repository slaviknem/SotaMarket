<template>
	<span class="stars" role="img" :aria-label="`${value} / 5`">
		<span class="stars__row" aria-hidden="true">
			<AppIcon v-for="i in 5" :key="i" name="star" :size="size" :stroke-width="1.6" />
		</span>
		<span class="stars__row stars__row--fill" :style="{ width: pct }" aria-hidden="true">
			<AppIcon v-for="i in 5" :key="i" name="star" :size="size" filled :stroke-width="1.6" />
		</span>
	</span>
</template>

<script setup lang="ts">
// Зірочки рейтингу (тільки відображення, підтримує дробові значення — 4.5 тощо).
// Інтерактивний вибір зірок — у формі ShopReviewsBlock.
const props = withDefaults(
	defineProps<{
		value: number
		size?: number
	}>(),
	{ size: 16 }
)

const pct = computed(() => `${(Math.max(0, Math.min(5, props.value)) / 5) * 100}%`)
</script>

<style scoped>
.stars {
	position: relative;
	display: inline-flex;
	color: var(--warning);
	line-height: 0;
}

.stars__row {
	display: inline-flex;
	gap: 2px;
	white-space: nowrap;
}

/* Заповнена частина накриває контурну — ширина = рейтинг у % */
.stars__row--fill {
	position: absolute;
	inset: 0 auto 0 0;
	overflow: hidden;
}
</style>
