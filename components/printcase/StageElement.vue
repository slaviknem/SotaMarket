<template>
	<div
		class="stage-el"
		:class="{ 'is-active': element.activated, 'is-hidden': element.hidden }"
		:style="boxStyle"
		@pointerdown.stop="startDrag"
		@dblclick.stop="element.type === 'text' && $emit('editText')"
	>
		<!-- Вміст з поворотом -->
		<img
			v-if="element.type === 'image'"
			:src="element.url"
			class="stage-el__img"
			:style="{ transform: `rotate(${element.rotation}deg)` }"
			alt=""
			draggable="false"
		/>
		<div v-else class="stage-el__text" :style="textStyle">
			{{ element.text }}
		</div>

		<!-- Рамка, ручки resize, поворот, видалення -->
		<template v-if="element.activated">
			<span
				v-for="h in handles"
				:key="h"
				class="stage-el__handle"
				:class="`stage-el__handle--${h}`"
				@pointerdown.stop="startResize($event, h)"
			/>

			<!-- Бокові ручки (тільки фото): розтягування зі спотворенням по вертикалі та горизонталі -->
			<template v-if="element.type === 'image'">
				<span class="stage-el__edge stage-el__edge--tc" @pointerdown.stop="startResize($event, 'tc')" />
				<span class="stage-el__edge stage-el__edge--bc" @pointerdown.stop="startResize($event, 'bc')" />
				<span class="stage-el__edge stage-el__edge--lc" @pointerdown.stop="startResize($event, 'lc')" />
				<span class="stage-el__edge stage-el__edge--rc" @pointerdown.stop="startResize($event, 'rc')" />
			</template>

			<button class="stage-el__rotate" title="↻" @pointerdown.stop="startRotate">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
			</button>

			<button class="stage-el__delete" title="✕" @pointerdown.stop @click.stop="$emit('remove')">
				<AppIcon name="close" :size="13" :stroke-width="3" />
			</button>
		</template>
	</div>
</template>

<script setup lang="ts">
export interface StageEl {
	type: 'image' | 'text'
	url?: string
	text?: string
	x: number
	y: number
	width: number
	height: number
	rotation: number
	activated: boolean
	hidden?: boolean // шар вимкнено «оком» у списку шарів: не видно на макеті й не йде у друк
	color?: string
	font?: string
	bold?: boolean
	italic?: boolean
	underline?: boolean
}

const props = defineProps<{
	element: StageEl
	// Масштаб відображення сцени (CSS px / стейдж px)
	displayScale: number
}>()

const emit = defineEmits<{
	activate: []
	remove: []
	editText: []
	update: [patch: Partial<StageEl>]
}>()

const handles = ['tl', 'tr', 'br', 'bl'] as const

const boxStyle = computed(() => ({
	left: props.element.x + 'px',
	top: props.element.y + 'px',
	width: props.element.width + 'px',
	height: props.element.height + 'px',
}))

const textStyle = computed(() => ({
	color: props.element.color,
	fontFamily: `'${props.element.font}', sans-serif`,
	// Розмір шрифта = висота елемента (як на старому сайті)
	fontSize: props.element.height + 'px',
	fontWeight: props.element.bold ? 'bold' : 'normal',
	fontStyle: props.element.italic ? 'italic' : 'normal',
	textDecoration: props.element.underline ? 'underline' : 'none',
	transform: `rotate(${props.element.rotation}deg)`,
}))

// ---------- Drag ----------
let mode: 'drag' | 'resize' | 'rotate' | null = null
let start = { px: 0, py: 0, x: 0, y: 0, w: 0, h: 0, rotation: 0 }
let resizeHandle = ''

function toStage(dxPx: number) {
	return dxPx / props.displayScale
}

function startDrag(e: PointerEvent) {
	emit('activate')
	mode = 'drag'
	start = { px: e.clientX, py: e.clientY, x: props.element.x, y: props.element.y, w: 0, h: 0, rotation: 0 }
	bind(e)
}

function startResize(e: PointerEvent, handle: string) {
	emit('activate')
	mode = 'resize'
	resizeHandle = handle
	start = {
		px: e.clientX,
		py: e.clientY,
		x: props.element.x,
		y: props.element.y,
		w: props.element.width,
		h: props.element.height,
		rotation: 0,
	}
	bind(e)
}

function startRotate(e: PointerEvent) {
	emit('activate')
	mode = 'rotate'
	start = { px: e.clientX, py: e.clientY, x: 0, y: 0, w: 0, h: 0, rotation: props.element.rotation }
	bind(e)
}

function bind(e: PointerEvent) {
	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp, { once: true })
	e.preventDefault()
}

function onMove(e: PointerEvent) {
	const dx = toStage(e.clientX - start.px)
	const dy = toStage(e.clientY - start.py)

	if (mode === 'drag') {
		emit('update', { x: start.x + dx, y: start.y + dy })
	} else if (mode === 'rotate') {
		emit('update', { rotation: start.rotation + (e.clientX - start.px) / 2 })
	} else if (mode === 'resize') {
		// Бокові ручки — розтягування зі спотворенням (вертикаль або горизонталь)
		if (resizeHandle === 'tc' || resizeHandle === 'bc' || resizeHandle === 'lc' || resizeHandle === 'rc') {
			let ew = start.w
			let eh = start.h
			let ex = start.x
			let ey = start.y
			if (resizeHandle === 'bc') {
				eh = Math.max(24, start.h + dy)
			} else if (resizeHandle === 'tc') {
				eh = Math.max(24, start.h - dy)
				ey = start.y + (start.h - eh)
			} else if (resizeHandle === 'rc') {
				ew = Math.max(24, start.w + dx)
			} else {
				ew = Math.max(24, start.w - dx)
				ex = start.x + (start.w - ew)
			}
			emit('update', { x: ex, y: ey, width: ew, height: eh })
			return
		}

		const aspect = start.w / start.h
		let w = start.w
		let h = start.h
		let x = start.x
		let y = start.y

		// Пропорційний resize за кутовими ручками
		const delta = resizeHandle === 'br' || resizeHandle === 'tr' ? dx : -dx
		w = Math.max(24, start.w + delta)
		h = w / aspect

		if (resizeHandle === 'tl') {
			x = start.x + (start.w - w)
			y = start.y + (start.h - h)
		} else if (resizeHandle === 'tr') {
			y = start.y + (start.h - h)
		} else if (resizeHandle === 'bl') {
			x = start.x + (start.w - w)
		}

		emit('update', { x, y, width: w, height: h })
	}
}

function onUp() {
	window.removeEventListener('pointermove', onMove)
	mode = null
}

onUnmounted(() => window.removeEventListener('pointermove', onMove))
</script>

<style scoped>
.stage-el {
	position: absolute;
	cursor: move;
	touch-action: none;
	user-select: none;
}

.stage-el.is-active {
	outline: 1.5px dashed var(--accent);
	outline-offset: 0;
	z-index: 3;
}

/* Схований шар: індекси в масиві мають лишитись, тож ховаємо, а не викидаємо з DOM */
.stage-el.is-hidden {
	display: none;
}

.stage-el__img {
	width: 100%;
	height: 100%;
	max-width: none;
	pointer-events: none;
	user-select: none;
}

.stage-el__text {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	white-space: nowrap;
	line-height: 1;
	pointer-events: none;
}

.stage-el__handle {
	position: absolute;
	width: 14px;
	height: 14px;
	background: #fff;
	border: 2px solid var(--accent);
	border-radius: 50%;
	z-index: 4;
}

.stage-el__handle--tl { top: -7px; left: -7px; cursor: nwse-resize; }
.stage-el__handle--tr { top: -7px; right: -7px; cursor: nesw-resize; }
.stage-el__handle--br { bottom: -7px; right: -7px; cursor: nwse-resize; }
.stage-el__handle--bl { bottom: -7px; left: -7px; cursor: nesw-resize; }

/* Бокові ручки — розтягування зі спотворенням */
.stage-el__edge {
	position: absolute;
	background: #fff;
	border: 2px solid var(--accent);
	border-radius: 4px;
	z-index: 4;
}

/* Верх/низ по центру — вертикальне розтягування */
.stage-el__edge--tc,
.stage-el__edge--bc {
	left: 50%;
	transform: translateX(-50%);
	width: 18px;
	height: 8px;
	cursor: ns-resize;
}

.stage-el__edge--tc { top: -5px; }
.stage-el__edge--bc { bottom: -5px; }

/* Ліво/право по центру — горизонтальне розтягування */
.stage-el__edge--lc,
.stage-el__edge--rc {
	top: 50%;
	transform: translateY(-50%);
	width: 8px;
	height: 18px;
	cursor: ew-resize;
}

.stage-el__edge--lc { left: -5px; }
.stage-el__edge--rc { right: -5px; }

.stage-el__rotate {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background: rgba(20, 20, 26, 0.8);
	color: #fff;
	cursor: ew-resize;
	z-index: 4;
}

.stage-el__delete {
	position: absolute;
	top: -13px;
	right: -13px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	background: var(--danger);
	color: #fff;
	z-index: 5;
}
</style>
