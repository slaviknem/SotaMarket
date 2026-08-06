<template>
	<!-- Вміст: лишається строго у своєму шарі (порядок у масиві = порядок накладання),
	     виділення його не піднімає — інакше нижній шар перекривав би верхні -->
	<div
		ref="elRef"
		class="stage-el"
		:class="{ 'is-hidden': element.hidden }"
		:style="boxStyle"
		@pointerdown.stop="startDrag"
		@dblclick.stop="element.type === 'text' && $emit('editText')"
		@touchmove.prevent
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
	</div>

	<!-- Рамка, ручки resize, поворот, видалення — окремим шаром поверх усіх елементів
	     (див. .stage__chrome): видно завжди — і під чохлом, і поза його межами -->
	<Teleport :to="frameTarget" :disabled="!frameTarget">
		<div v-if="element.activated && !element.hidden" class="stage-el__frame" :style="frameStyle">
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
		</div>
	</Teleport>
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
	// Шар для рамки виділення — поза обрізанням сцени (див. .stage__chrome)
	frameTarget?: HTMLElement | null
}>()

const emit = defineEmits<{
	activate: []
	remove: []
	editText: []
	update: [patch: Partial<StageEl>]
}>()

const handles = ['tl', 'tr', 'br', 'bl'] as const

const elRef = ref<HTMLElement | null>(null)

const boxStyle = computed(() => ({
	left: props.element.x + 'px',
	top: props.element.y + 'px',
	width: props.element.width + 'px',
	height: props.element.height + 'px',
}))

// Рамка повторює поворот вмісту — так само навколо центру боксу
const frameStyle = computed(() => ({
	...boxStyle.value,
	transform: `rotate(${props.element.rotation}deg)`,
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
let mode: 'drag' | 'resize' | 'rotate' | 'pinch' | null = null
let start = { px: 0, py: 0, x: 0, y: 0, w: 0, h: 0, rotation: 0 }
let resizeHandle = ''
const MIN_SIZE = 24

// Активні пальці/курсори на елементі: двоє — «щипок» для масштабування
const pointers = new Map<number, { x: number; y: number }>()
let pinch = { dist: 0, ax: 0.5, ay: 0.5 }
// Палець, що веде жест (крім щипка, де рахуються обидва)
let primaryId = -1
let bound = false

function toStage(dxPx: number) {
	return dxPx / props.displayScale
}

// Поворот вектора на кут (градуси)
function turn(x: number, y: number, deg: number) {
	const r = (deg * Math.PI) / 180
	const cos = Math.cos(r)
	const sin = Math.sin(r)
	return { x: x * cos - y * sin, y: x * sin + y * cos }
}

// Нові координати боксу після зміни розміру: точка (ax, ay) у частках самого
// об'єкта лишається на місці. Бокс повертається навколо центру, тож зсув центру
// рахуємо вже в повернутій системі — інакше об'єкт «тікає» від пальця.
function boxAt(w: number, h: number, ax: number, ay: number, rotation: number) {
	const o = turn((ax - 0.5) * (start.w - w), (ay - 0.5) * (start.h - h), rotation)
	return {
		x: start.x + start.w / 2 + o.x - w / 2,
		y: start.y + start.h / 2 + o.y - h / 2,
		width: w,
		height: h,
	}
}

// Куди «прибитий» бокс під час тягнення за конкретну ручку (протилежний край)
const ANCHORS: Record<string, [number, number]> = {
	tl: [1, 1], tr: [0, 1], br: [0, 0], bl: [1, 0],
	tc: [0.5, 1], bc: [0.5, 0], lc: [1, 0.5], rc: [0, 0.5],
}

function startDrag(e: PointerEvent) {
	emit('activate')
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
	bind(e)

	// Другий палець поверх елемента — переходимо на масштабування «щипком»
	if (pointers.size === 2 && (mode === null || mode === 'drag')) return startPinch()
	// Під час resize/rotate/pinch зайві пальці лише реєструємо
	if (mode !== null) return

	primaryId = e.pointerId
	mode = 'drag'
	start = { px: e.clientX, py: e.clientY, x: props.element.x, y: props.element.y, w: 0, h: 0, rotation: 0 }
}

function startResize(e: PointerEvent, handle: string) {
	emit('activate')
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
	primaryId = e.pointerId
	mode = 'resize'
	resizeHandle = handle
	start = {
		px: e.clientX,
		py: e.clientY,
		x: props.element.x,
		y: props.element.y,
		w: props.element.width,
		h: props.element.height,
		rotation: props.element.rotation,
	}
	bind(e)
}

function startRotate(e: PointerEvent) {
	emit('activate')
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
	primaryId = e.pointerId
	mode = 'rotate'
	start = { px: e.clientX, py: e.clientY, x: 0, y: 0, w: 0, h: 0, rotation: props.element.rotation }
	bind(e)
}

// Щипок двома пальцями: пропорційне масштабування навколо точки між пальцями
// (як зум фото в галереї) + перетягування за їхньою серединою
function startPinch() {
	const [a, b] = [...pointers.values()]
	const rect = elRef.value?.getBoundingClientRect()
	const mx = (a.x + b.x) / 2
	const my = (a.y + b.y) / 2
	mode = 'pinch'
	// Відлік жесту: середина пальців і розміри об'єкта на старті
	start = {
		px: mx,
		py: my,
		x: props.element.x,
		y: props.element.y,
		w: props.element.width,
		h: props.element.height,
		rotation: props.element.rotation,
	}

	// Точка щипка в частках об'єкта (0…1) — вона лишається під пальцями
	let ax = 0.5
	let ay = 0.5
	if (rect?.width && rect?.height) {
		const l = turn(mx - (rect.left + rect.width / 2), my - (rect.top + rect.height / 2), -start.rotation)
		ax = 0.5 + l.x / rect.width
		ay = 0.5 + l.y / rect.height
	}
	pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, ax, ay }
}

function onPinchMove() {
	const [a, b] = [...pointers.values()]
	const w = Math.max(MIN_SIZE, (start.w * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist)
	const box = boxAt(w, start.h * (w / start.w), pinch.ax, pinch.ay, start.rotation)

	emit('update', {
		...box,
		// Об'єкт іде ще й за серединою пальців
		x: box.x + toStage((a.x + b.x) / 2 - start.px),
		y: box.y + toStage((a.y + b.y) / 2 - start.py),
	})
}

function bind(e: PointerEvent) {
	e.preventDefault()
	if (bound) return
	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp)
	window.addEventListener('pointercancel', onUp)
	bound = true
}

function unbind() {
	window.removeEventListener('pointermove', onMove)
	window.removeEventListener('pointerup', onUp)
	window.removeEventListener('pointercancel', onUp)
	bound = false
}

function onMove(e: PointerEvent) {
	if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

	if (mode === 'pinch') {
		if (pointers.size >= 2) onPinchMove()
		return
	}

	// Одиночні жести веде лише перший палець — решта не збиває відлік
	if (e.pointerId !== primaryId) return

	const dx = toStage(e.clientX - start.px)
	const dy = toStage(e.clientY - start.py)

	if (mode === 'drag') {
		emit('update', { x: start.x + dx, y: start.y + dy })
	} else if (mode === 'rotate') {
		emit('update', { rotation: start.rotation + (e.clientX - start.px) / 2 })
	} else if (mode === 'resize') {
		// Рух пальця переводимо в систему координат самого об'єкта: ручка «вправо»
		// у поверненого об'єкта тягнеться під кутом, а розтягувати треба вздовж його сторони
		const l = turn(dx, dy, -start.rotation)
		const [ax, ay] = ANCHORS[resizeHandle]
		let w = start.w
		let h = start.h

		if (resizeHandle === 'tc' || resizeHandle === 'bc') {
			// Бокові ручки — розтягування зі спотворенням (вертикаль або горизонталь)
			h = Math.max(MIN_SIZE, start.h + (resizeHandle === 'bc' ? l.y : -l.y))
		} else if (resizeHandle === 'lc' || resizeHandle === 'rc') {
			w = Math.max(MIN_SIZE, start.w + (resizeHandle === 'rc' ? l.x : -l.x))
		} else {
			// Кутові ручки — пропорційно
			w = Math.max(MIN_SIZE, start.w + (resizeHandle === 'br' || resizeHandle === 'tr' ? l.x : -l.x))
			h = start.h * (w / start.w)
		}

		emit('update', boxAt(w, h, ax, ay, start.rotation))
	}
}

function onUp(e: PointerEvent) {
	pointers.delete(e.pointerId)

	if (mode === 'pinch' && pointers.size) {
		// Лишився один палець — плавно продовжуємо перетягуванням, інакше
		// перезнімаємо відлік щипка на пальцях, що лишилися (без стрибка)
		if (pointers.size > 1) return startPinch()
		const [[id, p]] = [...pointers.entries()]
		primaryId = id
		mode = 'drag'
		start = { px: p.x, py: p.y, x: props.element.x, y: props.element.y, w: 0, h: 0, rotation: 0 }
		return
	}

	if (pointers.size) return

	unbind()
	mode = null
	primaryId = -1
}

onUnmounted(unbind)
</script>

<style scoped>
.stage-el {
	position: absolute;
	cursor: move;
	touch-action: none;
	user-select: none;
}

/* Схований шар: індекси в масиві мають лишитись, тож ховаємо, а не викидаємо з DOM */
.stage-el.is-hidden {
	display: none;
}

/* Шар виділення: тільки рамка з ручками, поверх усіх шарів.
   Усередині наскрізний для кліків — тягнеться сам об'єкт, тож клік завжди
   потрапляє в те, що видно (верхній шар лишається верхнім) */
.stage-el__frame {
	position: absolute;
	/* Запасний варіант, якщо шар .stage__chrome ще не змонтований: усе одно вище за маску (5) */
	z-index: 6;
	outline: 1.5px dashed var(--accent);
	outline-offset: 0;
	pointer-events: none;
	touch-action: none;
	user-select: none;
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
	background: var(--on-overlay);
	border: 2px solid var(--accent);
	border-radius: 50%;
	z-index: 4;
	pointer-events: auto;
}

.stage-el__handle--tl { top: -7px; left: -7px; cursor: nwse-resize; }
.stage-el__handle--tr { top: -7px; right: -7px; cursor: nesw-resize; }
.stage-el__handle--br { bottom: -7px; right: -7px; cursor: nwse-resize; }
.stage-el__handle--bl { bottom: -7px; left: -7px; cursor: nesw-resize; }

/* Бокові ручки — розтягування зі спотворенням */
.stage-el__edge {
	position: absolute;
	background: var(--on-overlay);
	border: 2px solid var(--accent);
	border-radius: 4px;
	z-index: 4;
	pointer-events: auto;
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
	color: var(--on-overlay);
	cursor: ew-resize;
	z-index: 4;
	pointer-events: auto;
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
	color: var(--on-overlay);
	z-index: 5;
	pointer-events: auto;
}
</style>
