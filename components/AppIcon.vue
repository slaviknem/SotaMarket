<template>
	<svg
		:width="size"
		:height="size"
		viewBox="0 0 24 24"
		:fill="fill"
		:stroke="icon.solid ? undefined : 'currentColor'"
		:stroke-width="icon.solid ? undefined : strokeWidth"
		:stroke-linecap="icon.round ? 'round' : undefined"
		:stroke-linejoin="icon.round ? 'round' : undefined"
		aria-hidden="true"
		focusable="false"
		v-html="icon.path"
	/>
</template>

<script setup lang="ts">
// Централізований реєстр SVG-іконок.
// Раніше ці контури дублювалися інлайн (кошик/серце/порівняння/хрестик…) у багатьох компонентах.
// Додати нову іконку = один запис у ICONS (легко розширювати/підтримувати).
interface IconDef {
	path: string
	round?: boolean // stroke-linecap/linejoin: round
	fillable?: boolean // заливка вмикається пропом :filled (напр. сердечко у вішлисті)
	solid?: boolean // суцільна іконка (fill, без обведення) — напр. телефон
}

const ICONS: Record<string, IconDef> = {
	cart: {
		path: '<circle cx="9" cy="21" r="1.6"/><circle cx="19" cy="21" r="1.6"/><path d="M2 2h3l3.2 13.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L23 6H6"/>',
	},
	heart: {
		path: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
		fillable: true,
	},
	compare: {
		path: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
		round: true,
	},
	close: {
		path: '<path d="M6 6l12 12M18 6L6 18"/>',
	},
	check: {
		path: '<path d="M5 12l4.5 4.5L19 7"/>',
		round: true,
	},
	filter: {
		path: '<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>',
	},
	star: {
		path: '<path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z"/>',
		round: true,
		fillable: true,
	},
	edit: {
		path: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
	},
	phone: {
		path: '<path d="M6.6 10.8c1.5 2.9 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>',
		solid: true,
	},
	'arrow-right': {
		path: '<path d="M5 12h14M13 6l6 6-6 6"/>',
		round: true,
	},
	'chevron-down': {
		path: '<path d="M6 9l6 6 6-6"/>',
		round: true,
	},
	bolt: {
		path: '<path d="M13 2 4 13h6l-1 9 9-11h-6l1-9z"/>',
		round: true,
	},
	truck: {
		path: '<path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
		round: true,
	},
	'map-pin': {
		path: '<path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
		round: true,
	},
	// Соцмережі (суцільні брендові гліфи)
	instagram: {
		path: '<path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0-2.16C8.74 0 8.33.01 7.05.07 2.7.27.28 2.69.08 7.05.01 8.33 0 8.74 0 12s.01 3.67.08 4.95c.2 4.36 2.62 6.78 6.97 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.97-6.98.07-1.28.08-1.69.08-4.95s-.01-3.67-.08-4.95c-.2-4.35-2.62-6.78-6.97-6.98C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z"/>',
		solid: true,
	},
	facebook: {
		path: '<path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z"/>',
		solid: true,
	},
	telegram: {
		path: '<path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.56 8.16-1.86 8.78c-.14.62-.51.77-1.03.48l-2.84-2.1-1.37 1.32c-.15.15-.28.28-.57.28l.2-2.9 5.27-4.76c.23-.2-.05-.32-.36-.12l-6.5 4.1-2.8-.88c-.61-.19-.62-.61.13-.9l10.94-4.22c.5-.18.95.12.79.94Z"/>',
		solid: true,
	},
	youtube: {
		path: '<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"/>',
		solid: true,
	},
}

const props = withDefaults(
	defineProps<{
		name: string
		size?: number | string
		filled?: boolean
		strokeWidth?: number | string
	}>(),
	{ size: 22, filled: false, strokeWidth: 2 }
)

const icon = computed<IconDef>(() => ICONS[props.name] ?? { path: '' })
const fill = computed(() => {
	if (icon.value.solid) return 'currentColor'
	return icon.value.fillable && props.filled ? 'currentColor' : 'none'
})
</script>
