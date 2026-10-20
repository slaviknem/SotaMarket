<template>
	<!-- Лого бренду — вміст brand/public/images/logo.svg: той самий файл сайт віддає за адресою
	     /images/logo.svg (JSON-LD) і бере генератор og. Колір — currentColor (--logo-color) -->
	<svg
		class="app-logo"
		xmlns="http://www.w3.org/2000/svg"
		:viewBox="viewBox"
		fill="currentColor"
		:aria-label="brand.name"
		role="img"
		v-html="inner"
	/>
</template>

<script setup lang="ts">
import logoSvg from '#brand/public/images/logo.svg?raw'

const brand = useBrand()
const viewBox = logoSvg.match(/viewBox="([^"]+)"/)?.[1]
// Усе між <svg …> і </svg> — контури лого як є
const inner = logoSvg.replace(/^[\s\S]*?<svg\b[^>]*>|<\/svg>[\s\S]*$/g, '').trim()
</script>

<style scoped>
.app-logo {
	display: block;
	height: 34px;
	width: auto;
	color: var(--logo-color);
	transition: opacity 0.2s;
}

.app-logo:hover {
	opacity: 0.85;
}
</style>
