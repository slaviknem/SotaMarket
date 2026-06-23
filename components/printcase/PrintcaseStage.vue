<template>
	<div ref="wrapRef" class="stage-wrap">
		<div
			ref="stageRef"
			class="stage"
			:style="{
				width: STAGE_W * displayScale + 'px',
				height: STAGE_H * displayScale + 'px',
			}"
			@wheel.prevent="onWheel"
			@pointerdown.self="$emit('deselect')"
		>
			<div
				class="stage__inner"
				:style="{ transform: `scale(${displayScale})` }"
			>
				<!-- Фон -->
				<div class="stage__bg" :style="{ backgroundColor }" />

				<!-- Елементи -->
				<PrintcaseStageElement
					v-for="(el, i) in elements"
					:key="i"
					:element="el"
					:display-scale="displayScale"
					@activate="$emit('activate', i)"
					@remove="$emit('remove', i)"
					@edit-text="$emit('editText', i)"
					@update="(patch) => $emit('updateElement', i, patch)"
				/>

				<!-- Маска чохла (поверх, без подій) -->
				<div
					v-if="maskUrl"
					class="stage__mask"
					:style="{ backgroundImage: `url(${maskUrl})` }"
				/>

				<!-- Підказка коли модель не вибрана -->
				<div v-if="!hasModel" class="stage__placeholder" @pointerdown.stop="$emit('requestModel')">
					<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4"/></svg>
					<span>{{ t('printcase.msgSelectModel') }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
// Внутрішня система координат сцени (як на старому сайті: 400×800)
export const STAGE_W = 400
export const STAGE_H = 800
</script>

<script setup lang="ts">
import type { StageEl } from './StageElement.vue'

defineProps<{
	elements: StageEl[]
	backgroundColor: string
	maskUrl: string | null
	hasModel: boolean
}>()

const emit = defineEmits<{
	activate: [index: number]
	remove: [index: number]
	editText: [index: number]
	updateElement: [index: number, patch: Partial<StageEl>]
	deselect: []
	wheelZoom: [dir: 1 | -1]
	requestModel: []
}>()

const { t } = useI18n()

// Масштаб відображення сцени під ширину колонки
const wrapRef = ref<HTMLElement>()
const stageRef = ref<HTMLElement>()
const displayScale = ref(0.6)

function updateScale() {
	// Ширину міряємо по білому блоку (.pc-editor) — стабільна ширина колонки
	const editor = wrapRef.value?.parentElement?.parentElement
	if (!editor) return
	const isNarrow = window.innerWidth <= 640
	// Праворуч — вмонтована панель інструментів, плюс поля навколо макета
	const availW = editor.clientWidth - 88
	// На телефоні тримаємо макет компактним по висоті, щоб усе вмістилося на екран
	const availH = isNarrow ? window.innerHeight * 0.5 : Math.max(440, window.innerHeight - 195)
	const maxScale = isNarrow ? 1 : 0.9
	displayScale.value = Math.min(availW / STAGE_W, availH / STAGE_H, maxScale)
}

onMounted(() => {
	updateScale()
	window.addEventListener('resize', updateScale)
})

onUnmounted(() => window.removeEventListener('resize', updateScale))

function onWheel(e: WheelEvent) {
	emit('wheelZoom', e.deltaY < 0 ? 1 : -1)
}

defineExpose({ displayScale })
</script>

<style scoped>
/* Центрування макета — телефон стоїть прямо на білому блоці сторінки, без власної рамки */
.stage-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	max-width: 100%;
}

.stage {
	position: relative;
	overflow: hidden;
	touch-action: none;
}

.stage__inner {
	position: absolute;
	top: 0;
	left: 0;
	width: 400px;
	height: 800px;
	transform-origin: top left;
}

.stage__bg {
	position: absolute;
	inset: 0;
	z-index: 0;
}

.stage__mask {
	position: absolute;
	inset: 0;
	z-index: 5;
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	pointer-events: none;
}

.stage__placeholder {
	position: absolute;
	inset: 0;
	z-index: 6;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 0 44px;
	text-align: center;
	font-size: 19px;
	font-weight: 600;
	color: var(--text-muted);
	cursor: pointer;
	background: rgba(255, 255, 255, 0.55);
}
</style>
