<template>
	<div class="np-img" :class="{ 'np-img--big': big }">
		<!-- Шаблон принта -->
		<AppImage
			:src="url.neoprintTemplate(alias, !big)"
			:alt="alt"
			:title="alt"
			:width="printWidth"
			class="np-img__print"
			:loading="eager ? 'eager' : 'lazy'"
			:fetchpriority="eager ? 'high' : undefined"
			:preload="eager"
		/>

		<!-- Маска моделі (PNG з прозорістю) — декоративна, лягає зверху -->
		<AppImage
			:src="url.neoprintMask(categoryAlias)"
			alt=""
			:width="size"
			class="np-img__mask"
			:loading="eager ? 'eager' : 'lazy'"
			:fetchpriority="eager ? 'high' : undefined"
		/>
	</div>
</template>

<script setup lang="ts">
// Композиція «готовий дизайн на моделі» БЕЗ canvas: шаблон принта + маска моделі поверх.
// Точний CSS-еквівалент бекендового ImageH::composeAlphaprint (білий квадрат → шаблон по
// висоті, по центру → маска по висоті, по центру). Рендериться на SSR, тож дизайни бачать
// і пошуковики, і AI-боти. Маска в межах сторінки одна — браузер тягне її раз.
const props = withDefaults(
	defineProps<{
		// alias дизайну (== його id) і alias моделі
		alias: string | number
		categoryAlias: string
		alt?: string
		// Сторона квадрата у CSS-пікселях (для srcset)
		size?: number
		// Повний шаблон замість thumb — для головного фото сторінки дизайну
		big?: boolean
		// LCP-зображення: без lazy, з пріоритетом
		eager?: boolean
	}>(),
	{ alt: '', size: 280 }
)

const url = useUrl()

// Шаблони друку — вертикальні (1100×2100), тож у квадраті принт займає ~53% ширини.
// Задаємо лише ширину: IPX збереже пропорції, висоту тримає CSS (height: 100%).
const printWidth = computed(() => Math.round(props.size * 0.53))
</script>
