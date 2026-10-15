<template>
	<span class="stars" role="img" :aria-label="`${value} / 5`" :style="{ '--star': `${size}px`, '--fill': pct }" />
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
/* Один елемент на весь рейтинг: контур і заливка — дві CSS-маски з тієї самої зірки, що
   й іконка star в AppIcon. Раніше це було 10 SVG на кожну оцінку: на сторінці відгуків
   ~500 SVG (169 КБ HTML) і тисячі зайвих DOM-вузлів. Клітинка маски = зірка + 2px проміжку */
.stars {
	position: relative;
	display: inline-flex;
	flex: none;
	width: calc((var(--star) + 2px) * 5);
	height: var(--star);
	color: var(--warning);
}

.stars::before,
.stars::after {
	content: '';
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	background-color: currentColor;
	-webkit-mask-repeat: repeat-x;
	mask-repeat: repeat-x;
	-webkit-mask-size: calc(var(--star) + 2px) var(--star);
	mask-size: calc(var(--star) + 2px) var(--star);
}

.stars::before {
	right: 0;
	-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z'/%3E%3C/svg%3E");
	mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z'/%3E%3C/svg%3E");
}

/* Заповнена частина накриває контурну — ширина = рейтинг у % */
.stars::after {
	width: var(--fill);
	-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z'/%3E%3C/svg%3E");
	mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z'/%3E%3C/svg%3E");
}
</style>
