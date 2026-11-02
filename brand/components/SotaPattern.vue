<template>
	<!-- Ледь помітні соти на синьому (C2): фон першого екрана головної й заголовка сторінки категорії.
	     Кладеться першим у блок із position: relative і overflow: hidden; вміст блоку — position: relative -->
	<svg class="sota-pattern" aria-hidden="true" width="100%" height="100%">
		<defs>
			<pattern :id="patternId" width="56" height="100" patternUnits="userSpaceOnUse">
				<path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" />
				<path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" />
			</pattern>
		</defs>
		<rect width="100%" height="100%" :fill="`url(#${patternId})`" />
	</svg>
</template>

<script setup lang="ts">
const patternId = useId()
</script>

<style scoped>
/* Білим на 5 % */
.sota-pattern {
	position: absolute;
	inset: 0;
	color: rgba(var(--on-overlay-rgb), 0.05);
	pointer-events: none;
}

.sota-pattern path {
	fill: none;
	stroke: currentColor;
	stroke-width: 1.5;
}
</style>
