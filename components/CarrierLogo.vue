<template>
	<svg
		:width="size"
		:height="size"
		:viewBox="logo.box"
		aria-hidden="true"
		focusable="false"
		v-html="logo.path"
	/>
</template>

<script setup lang="ts">
// Брендові лого перевізників (кольорові, тому не вміщаються в одноколірний AppIcon).
// Кольори — фірмові кольори перевізників, а не токени дизайн-системи, тому задані літералами.
// Контури малюються в сітці 100×100; `box` дозволяє додати поля для оптичного вирівнювання
// знаків між собою (суцільна пляма важча за ромб при однаковому розмірі).
interface LogoDef {
	path: string
	box: string
}

const LOGOS: Record<string, LogoDef> = {
	// Нова Пошта — чотири стрілки на всі боки, «Н» читається негативним простором (фон просвічує).
	// Контури задані звуженими, а скруглення кутів дає обведення тим самим кольором (stroke-linejoin: round).
	'nova-poshta': {
		box: '0 0 100 100',
		path: `
			<g fill="#FF0032" stroke="#FF0032" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
				<path d="M50 3.8 69.2 23H60v18H40V23h-9.2z"/>
				<path d="M50 96.2 30.8 77H40V59h20v18h9.2z"/>
				<path d="M3.9 50 24 30.7v38.6z"/>
				<path d="M96.1 50 76 30.7v38.6z"/>
			</g>`,
	},
	// Укрпошта — жовтий знак-«кома» з круглим отвором.
	// Поля в box: суцільна пляма важча, тож трохи зменшуємо її під ромб Нової Пошти.
	ukrposhta: {
		box: '-3 -3 106 106',
		path: `
			<path fill="#F5B417" fill-rule="evenodd"
				d="M27.9 1.3H100L71.4 75.1A36.9 36.9 0 1 1 40.8 25.1Z
				   M37.8 50.6a14 14 0 1 0 0 28 14 14 0 0 0 0-28z"/>`,
	},
}

const EMPTY: LogoDef = { path: '', box: '0 0 100 100' }

const props = withDefaults(defineProps<{ name: string; size?: number | string }>(), { size: 64 })

const logo = computed(() => LOGOS[props.name] ?? EMPTY)
</script>
