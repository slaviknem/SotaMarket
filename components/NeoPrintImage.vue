<template>
	<AppImage
		:src="frame.src"
		:srcset="frame.srcset"
		:alt="alt"
		:title="alt"
		:width="frame.width"
		:height="frame.height"
		class="np-img"
		:loading="eager ? 'eager' : 'lazy'"
		:fetchpriority="eager ? 'high' : undefined"
		:preload="eager"
	/>
</template>

<script setup lang="ts">
// Готовий дизайн на моделі — ОДНЕ зображення з /img/neoprint (шаблон принта + маска моделі,
// збирає Nitro-роут і кешує на диску). Раніше композицію робив CSS двома шарами: виглядало
// так само, але в HTML лежав прямокутний принт — і в індекс потрапляв він, а не чохол.
// Бонусом зникла маска (окремі 80 КБ на сторінку) і другий запит на кожну картку.
const props = withDefaults(
	defineProps<{
		// alias дизайну (== його id) і alias моделі
		alias: string | number
		categoryAlias: string
		alt?: string
		// Той самий кадр 4:5, але у більшій роздільності — головне фото сторінки дизайну
		big?: boolean
		// LCP-зображення: без lazy, з пріоритетом
		eager?: boolean
	}>(),
	{ alt: '' }
)

const url = useUrl()

const frame = computed(() => url.neoprintFrame(props.categoryAlias, props.alias, props.big ? 'hero' : 'card'))
</script>
