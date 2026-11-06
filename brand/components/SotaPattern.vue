<template>
	<!-- Соти на синьому (C2): фон першого екрана головної й заголовка сторінки категорії. Шматок стільника з правого
	     верхнього кута — окремі скруглені комірки з проміжками (не суцільна сітка ліній: та читалась як куби), біля кута
	     яскравіші й подекуди «медові», до тексту ліворуч розчиняються.
	     Кладеться першим у блок із position: relative і overflow: hidden; вміст блоку — position: relative -->
	<svg class="sota-pattern" aria-hidden="true" :width="BOX_W" :height="BOX_H" :viewBox="`0 0 ${BOX_W} ${BOX_H}`">
		<defs>
			<path :id="cellId" :d="CELL" />
		</defs>
		<use v-for="c in CELLS" :key="c.k" :href="`#${cellId}`" :x="c.x" :y="c.y" :class="c.cls" />
	</svg>
</template>

<script lang="ts">
/* Геометрія — один раз на модуль (однаково на сервері й клієнті: лише ціла арифметика й sqrt — без розбіжностей
   гідратації). Комірка — шестикутник вершиною догори (як фавікон і варіанти товару) */
const BOX_W = 1200
const BOX_H = 640
const STEP_X = 64
const STEP_Y = 55.43 // STEP_X · √3 / 2 — ряди щільно, зі зсувом на пів комірки
const GAP = 7

function hexPath(R: number, round: number): string {
	const pts = Array.from({ length: 6 }, (_, i) => {
		const a = (Math.PI / 180) * (-90 + 60 * i)
		return [R * Math.cos(a), R * Math.sin(a)]
	})
	const f = (n: number) => +n.toFixed(2)
	const lerp = (p: number[], q: number[], t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
	return (
		pts
			.map((v, i) => {
				const a = lerp(v, pts[(i + 5) % 6], round)
				const b = lerp(v, pts[(i + 1) % 6], round)
				return `${i ? 'L' : 'M'}${f(a[0])} ${f(a[1])}Q${f(v[0])} ${f(v[1])} ${f(b[0])} ${f(b[1])}`
			})
			.join('') + 'Z'
	)
}

const CELL = hexPath((STEP_X / 2 - GAP / 2) / Math.cos(Math.PI / 6), 0.2)

// Медові комірки — вибрані вручну (ряд-колонка від кута): поза написами й кнопками заголовків головної й категорії на 1440
const HONEY = new Set(['1-8', '2-10', '3-2', '4-5'])

// Псевдовипадковість — цілим хешем ряду й колонки (сталий візерунок, без Math.random)
const hash = (r: number, c: number) => ((((r * 73856093) ^ (c * 19349663)) >>> 0) % 1000) / 1000

const CELLS: { k: string; x: number; y: number; cls: string }[] = []
for (let r = 0; r * STEP_Y < BOX_H + STEP_Y; r++) {
	for (let c = 0; c * STEP_X < BOX_W + STEP_X; c++) {
		const x = BOX_W - c * STEP_X - (r % 2 ? STEP_X / 2 : 0)
		const y = r * STEP_Y
		// Відстань від правого верхнього кута (0 — кут, 1 — протилежний край) з невеликим розкидом
		const d = Math.sqrt(((BOX_W - x) / BOX_W) ** 2 + (y / BOX_H) ** 2)
		const h = hash(r, c)
		const v = 1.05 - d + (h - 0.5) * 0.35
		if (v < 0.12) continue
		const level = v > 0.75 ? 4 : v > 0.5 ? 3 : v > 0.3 ? 2 : 1
		const kind = HONEY.has(`${r}-${c}`) ? ' is-honey' : h < 0.22 ? ' is-fill' : ''
		CELLS.push({ k: `${r}-${c}`, x: +x.toFixed(1), y: +y.toFixed(1), cls: `l${level}${kind}` })
	}
}
</script>

<script setup lang="ts">
const cellId = useId()
</script>

<style scoped>
/* Від правого верхнього кута; ширше за екран телефона — видно лише найближчу до кута частину */
.sota-pattern {
	position: absolute;
	top: 0;
	right: 0;
	pointer-events: none;
}

/* Стінки комірок — білі на 13 %, жирні; світлі комірки — ще й заливка; медові — помаранчевий контур із ледь
   теплою заливкою (щільніша помаранчева на синьому стає бурою) */
.sota-pattern use {
	fill: none;
	stroke: rgba(var(--on-overlay-rgb), 0.13);
	stroke-width: 3.5;
}

.sota-pattern use.is-fill {
	fill: rgba(var(--on-overlay-rgb), 0.05);
}

.sota-pattern use.is-honey {
	fill: rgba(var(--accent-rgb), 0.06);
	stroke: rgba(var(--accent-rgb), 0.42);
}

/* Рівні яскравості: що далі від кута, то прозоріше */
.sota-pattern .l1 {
	opacity: 0.3;
}

.sota-pattern .l2 {
	opacity: 0.55;
}

.sota-pattern .l3 {
	opacity: 0.8;
}

/* Телефон: соти стоять просто під текстом — тихіше */
@media (max-width: 640px) {
	.sota-pattern {
		opacity: 0.7;
	}
}
</style>
