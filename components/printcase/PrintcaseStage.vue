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
			@pointerdown="$emit('deselect')"
		>
			<div
				class="stage__inner"
				:style="{ transform: `scale(${displayScale})` }"
			>
				<!-- Фон -->
				<!-- Прозорий фон малюємо шахівницею, як у графічних редакторах: інакше його не
			     відрізнити від білого, і людина не розуміла б, що саме піде в друк -->
			<div
				class="stage__bg"
				:class="{ 'stage__bg--transparent': backgroundColor === 'transparent' }"
				:style="{ backgroundColor }"
			/>

				<!-- Елементи -->
				<PrintcaseStageElement
					v-for="(el, i) in elements"
					:key="i"
					:element="el"
					:display-scale="displayScale"
					:frame-target="chromeRef"
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
			</div>

			<!-- Підказки лежать поза .stage__inner: той масштабується під ширину колонки,
			     і всередині нього текст на телефоні став би вдвічі дрібнішим -->

			<!-- Модель не вибрана -->
			<div v-if="!hasModel" class="stage__placeholder" @pointerdown.stop="$emit('requestModel')">
				<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4"/></svg>
				<span>{{ t('printcase.msgSelectModel') }}</span>
			</div>

			<!-- Модель є, але чохол порожній: великий «+» просто на макеті — найкоротший шлях
			     до першого фото. На телефоні панель дій узагалі нижче за екраном, тож без цієї
			     кнопки перший крок неочевидний. -->
			<div v-else-if="!elements.length" class="stage__empty">
				<button class="stage__add" :title="t('printcase.addImage')" @pointerdown.stop @click="$emit('addImage')">
					<AppIcon name="plus" :size="34" :stroke-width="2.2" />
				</button>
				<span class="stage__add-title">{{ t('printcase.stageAdd') }}</span>
				<button class="stage__add-hint" @pointerdown.stop @click="$emit('openLibrary')">
					{{ t('printcase.stageAddHint') }}
				</button>
			</div>
		</div>

		<!-- Шар рамок виділення: лежить поза .stage, тож не обрізається його межами —
		     рамку й ручки видно й тоді, коли об'єкт більший за чохол.
		     Повторює масштаб сцени, щоб координати рамок збігалися з елементами. -->
		<div class="stage__chrome">
			<div
				ref="chromeRef"
				class="stage__chrome-inner"
				:style="{ transform: `scale(${displayScale})` }"
			/>
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
	addImage: []
	openLibrary: []
}>()

const { t } = useI18n()

// Масштаб відображення сцени під ширину колонки
const wrapRef = ref<HTMLElement>()
const stageRef = ref<HTMLElement>()
// Контейнер, у який елементи телепортують свої рамки виділення
const chromeRef = ref<HTMLElement>()
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
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	max-width: 100%;
}

/* Шар рамок: рівно над макетом, але без overflow:hidden — рамка виходить за чохол.
   Наскрізний для кліків, «auto» вмикають лише самі ручки */
.stage__chrome {
	position: absolute;
	inset: 0;
	z-index: 10;
	pointer-events: none;
}

.stage__chrome-inner {
	position: absolute;
	top: 0;
	left: 0;
	width: 400px;
	height: 800px;
	transform-origin: top left;
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

.stage__bg--transparent {
	background-color: #fff;
	background-image:
		linear-gradient(45deg, #dcdcdc 25%, transparent 25%),
		linear-gradient(-45deg, #dcdcdc 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, #dcdcdc 75%),
		linear-gradient(-45deg, transparent 75%, #dcdcdc 75%);
	background-size: 22px 22px;
	background-position: 0 0, 0 11px, 11px -11px, -11px 0;
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
	padding: 0 26px;
	text-align: center;
	font-size: 17px;
	font-weight: 600;
	color: var(--text-muted);
	cursor: pointer;
	background: rgba(255, 255, 255, 0.55);
}

/* Порожній чохол: заклик додати перше фото просто на макеті */
.stage__empty {
	position: absolute;
	inset: 0;
	z-index: 6;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 0 20px;
	text-align: center;
	/* Зсув нижче центру: вгорі макета — блок камер, кнопка наїжджала б на нього */
	transform: translateY(12%);
	/* Кнопки клікабельні, решта площі лишається сценою (клік = зняти виділення) */
	pointer-events: none;
}

.stage__add {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 78px;
	height: 78px;
	border-radius: 50%;
	color: var(--accent);
	background: var(--img-bg);
	border: 2px dashed var(--accent);
	pointer-events: auto;
	animation: stage-add-pulse 2.6s ease-out infinite;
	transition: transform 0.15s, background 0.15s, color 0.15s;
}

.stage__add:hover {
	background: var(--accent);
	color: var(--on-accent);
	border-style: solid;
	transform: scale(1.06);
	animation: none;
}

/* Хвиля від кнопки — щоб «+» помітили без пояснень */
@keyframes stage-add-pulse {
	0% {
		box-shadow: 0 0 0 0 var(--accent-glow);
	}
	70%,
	100% {
		box-shadow: 0 0 0 18px transparent;
	}
}

.stage__add-title {
	font-size: 15px;
	font-weight: 700;
	color: var(--on-accent);
}

.stage__add-hint {
	margin-top: -6px;
	font-size: 12.5px;
	font-weight: 600;
	color: var(--text-muted);
	text-decoration: underline;
	text-underline-offset: 3px;
	pointer-events: auto;
	transition: color 0.15s;
}

.stage__add-hint:hover {
	color: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
	.stage__add {
		animation: none;
	}
}

@media (max-width: 640px) {
	.stage__placeholder {
		font-size: 15px;
	}

	/* На телефоні макет нижчий — камери «ближче», тож зсуваємо ще трохи */
	.stage__empty {
		transform: translateY(15%);
	}

	.stage__add {
		width: 66px;
		height: 66px;
	}

	.stage__add-title {
		font-size: 14px;
	}
}
</style>
