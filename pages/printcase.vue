<template>
	<div class="container pc-container">
		<Breadcrumbs :items="[{ title: t('printcase.constructor') }]" />

		<h1 class="pc-title">{{ t('printcase.constructor') }}</h1>

		<div class="pc-layout">
			<!-- Робоча зона: макет + інструменти на одному білому блоці -->
			<div ref="editorRef" class="pc-editor">
				<!-- Сцена -->
				<div class="pc-stage-col" @pointerdown.self="setActive(null)">
					<PrintcaseStage
						ref="stageCmp"
						:elements="elements"
						:background-color="backgroundColor"
						:mask-url="maskUrl"
						:has-model="!!model"
						@activate="setActive"
						@remove="removeElement"
						@edit-text="openTextEdit"
						@update-element="updateElement"
						@deselect="setActive(null)"
						@wheel-zoom="(dir) => (dir > 0 ? zoomIn() : zoomOut())"
						@request-model="modelModalOpen = true"
					/>
				</div>

				<!-- Панель інструментів (у тому ж білому блоці) -->
				<div class="pc-controls-col">
					<div class="ctrl-group" :class="{ 'is-disabled': activeIndex === null }">
						<button class="ctrl-btn" :title="t('printcase.control.plus')" @click="zoomIn">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M8 11h6M11 8v6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.minus')" @click="zoomOut">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M8 11h6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.rotateLeft')" @click="rotate(-10)">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.rotateRight')" @click="rotate(10)">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.layerUp')" @click="layerUp">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.layerDown')" @click="layerDown">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
						</button>
						<button class="ctrl-btn ctrl-btn--danger" :title="t('printcase.control.delete')" @click="removeElement(activeIndex)">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
						</button>
					</div>

					<label class="ctrl-bg" :title="t('printcase.control.colorBG')">
						<input v-model="backgroundColor" type="color" />
						<span class="ctrl-bg__swatch" :style="{ background: backgroundColor }" />
					</label>
				</div>
			</div>

			<!-- Панель дій -->
			<div class="pc-actions-col">
				<!-- Вибрана модель -->
				<button class="pc-model-btn" @click="modelModalOpen = true">
					<span v-if="model">{{ model.brend }} {{ model.title }}</span>
					<span v-else>{{ t('printcase.selectModel') }}</span>
					<AppIcon name="edit" :size="15" />
				</button>

				<template v-if="model">
					<!-- Дії -->
					<input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="addImagesFromDisk" />

					<button class="pc-action" @click="fileInput?.click()">
						<span class="pc-action__icon">
							<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
						</span>
						{{ t('printcase.addImage') }}
					</button>

					<!-- Текст: коли виділено текст — зліва «+» додавання, праворуч редагування з прев'ю тексту -->
					<div v-if="isActiveText" class="pc-action pc-action--split" @pointerdown.stop>
						<button class="pc-action__add" :title="t('printcase.addText')" @click="openTextAdd">
							<span class="pc-action__icon">
								<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>
								<span class="pc-action__plus">+</span>
							</span>
						</button>
						<button class="pc-action__edit" :title="t('printcase.editText')" @click="openTextEdit(activeIndex)">
							<AppIcon name="edit" :size="16" />
							<span class="pc-action__edit-txt" :style="{ fontFamily: `'${activeEl?.font}', sans-serif` }">{{ activeEl?.text || t('printcase.editText') }}</span>
						</button>
					</div>

					<button v-else class="pc-action" @click="openTextAdd">
						<span class="pc-action__icon">
							<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>
						</span>
						{{ t('printcase.addText') }}
					</button>

					<button class="pc-action" @click="libraryOpen = true">
						<span class="pc-action__icon">
							<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
						</span>
						{{ t('printcase.fromLibraryImage') }}
					</button>

					<!-- Шари -->
					<div v-if="elements.length" class="pc-layers" @pointerdown.stop>
						<div class="pc-layers__title">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
							{{ t('printcase.layers') }}
						</div>
						<div
							v-for="(el, revIdx) in reversedElements"
							:key="elements.length - 1 - revIdx"
							class="pc-layer"
							:class="{ 'is-active': activeIndex === elements.length - 1 - revIdx }"
							@click="setActive(elements.length - 1 - revIdx)"
						>
							<img v-if="el.type === 'image'" :src="el.url" class="pc-layer__thumb" alt="" />
							<span v-else class="pc-layer__thumb pc-layer__thumb--text">T</span>
							<span class="pc-layer__name">
								{{ el.type === 'text' ? el.text : `${t('printcase.layerImage')} ${elements.length - revIdx}` }}
							</span>
							<div class="pc-layer__actions">
								<button class="pc-layer__btn" :disabled="revIdx === 0" :title="t('printcase.control.layerUp')" @click.stop="moveLayerUp(elements.length - 1 - revIdx)">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
								</button>
								<button class="pc-layer__btn" :disabled="revIdx === elements.length - 1" :title="t('printcase.control.layerDown')" @click.stop="moveLayerDown(elements.length - 1 - revIdx)">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
								</button>
								<button class="pc-layer__btn pc-layer__btn--del" :title="t('printcase.control.delete')" @click.stop="removeElement(elements.length - 1 - revIdx)">
									<AppIcon name="close" :size="13" :stroke-width="2.4" />
								</button>
							</div>
						</div>
					</div>

					<!-- Ціна та купівля -->
					<div class="pc-buy">
						<div class="pc-buy__prices">
							<span class="pc-buy__price">{{ formatPrice(config.public.printcasePrice) }}</span>
							<span class="pc-buy__price-old">{{ formatPrice(config.public.printcasePriceOld) }}</span>
						</div>

						<button
							class="btn btn-lg btn-block"
							:class="isAvailableCase ? 'btn-primary' : 'btn-outline'"
							:disabled="generating || !elements.length"
							@click="orderId ? addToExistingOrder() : addToCart()"
						>
							<AppIcon v-if="!generating" name="cart" :size="18" />
							{{ buyLabel }}
						</button>
					</div>
				</template>
			</div>
		</div>

		<!-- SEO-текст -->
		<article v-if="article?.text" class="block typography" v-html="article.text" />

		<!-- Відгуки про конструктор (прив'язані до статті сторінки) -->
		<ShopReviewsBlock
			v-if="article"
			:reviews="article.reviews || []"
			type="article"
			:target-id="article.id"
			:title="t('reviews.title')"
			class="block"
		/>

		<!-- Модалки -->
		<PrintcaseModelSelectModal v-model="modelModalOpen" :brands="brands" @select="selectModel" />
		<PrintcaseLibraryModal v-model="libraryOpen" @select="addImageFromLibrary" />
		<PrintcaseTextModal
			v-model="textModalOpen"
			:fonts="fonts"
			:is-edit="textEditMode"
			:initial="textForm"
			@save="saveText"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StageEl } from '~/components/printcase/StageElement.vue'
import type { TextForm } from '~/components/printcase/TextModal.vue'
import { STAGE_W, STAGE_H } from '~/components/printcase/PrintcaseStage.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const shopApi = useShopApi()
const cart = useCart()
const { notify } = useNotify()
const localePath = useLocalePath()

usePageSeo({
	title: () => t('printcase.constructor') + ' — FLOY',
	description: () => t('metaDescription.index'),
})

// ---------- Дані ----------
const { data: menu } = await useAsyncData('printcase-menu-' + locale.value, () => shopApi.getMenu(100))
const { data: article } = await useAsyncData(
	'printcase-article-' + locale.value,
	async () => (await shopApi.getArticleByAlias('printcase')) ?? false
)

// Бренди без останнього елемента «ВСІ» (як на старому сайті)
const brands = computed(() => {
	const list = [...(menu.value?.brends || [])]
	if (list.length && !list[list.length - 1].children?.length) list.pop()
	return list
})

// ---------- Модель та маска ----------
const model = ref<any>(null)
const maskUrl = ref<string | null>(null)
const alphaprintStatus = ref('')
const modelModalOpen = ref(false)

const isAvailableCase = computed(() => {
	const s = String(alphaprintStatus.value || '').trim().toLowerCase().replace(/[-\s]+/g, '_')
	return s === 'available' || s === 'available_not'
})

const orderId = computed(() => {
	const v = route.query.order_id
	return (Array.isArray(v) ? v[0] : v) || null
})

const buyLabel = computed(() => {
	if (generating.value) return t('category.loading')
	if (orderId.value) return `+ № ${orderId.value}`
	return isAvailableCase.value ? t('product.inCart') : t('quick.quickPreOrder')
})

async function selectModel(m: any) {
	model.value = m
	router.replace({ query: { ...route.query, model: m.url } })

	// Маска моделі з адмінки, fallback — стандартна
	maskUrl.value = '/images/printcase/default_mask.png'
	try {
		const res = await $fetch<{ base64Image?: string }>(
			`${config.public.urlApi}printcase/get_image_b64/${m.url}.png/masks`
		)
		if (res?.base64Image) maskUrl.value = res.base64Image
	} catch {
		/* стандартна маска */
	}

	// Статус доступності друку для моделі
	try {
		const cat = await shopApi.getCategoryByAlias(m.url)
		alphaprintStatus.value = cat?.alphaprint_available || cat?.brend?.alphaprint_available || ''
	} catch {
		alphaprintStatus.value = ''
	}
}

// Знаходимо модель за alias у дереві
function findModel(urlOrId: string) {
	for (const brand of brands.value) {
		for (const serie of brand.children || []) {
			for (const m of serie.children || []) {
				if (m.url === urlOrId || String(m.id) === urlOrId) return m
			}
		}
	}
	return null
}

// Ініціалізація з ?model= (і автопідбір при завантаженні меню)
watch(
	brands,
	(list: any[]) => {
		if (!list.length || model.value) return
		const q = route.query.model
		const alias = Array.isArray(q) ? q[0] : q
		if (alias) {
			const m = findModel(alias)
			if (m) selectModel(m)
		}
	},
	{ immediate: true }
)

// ---------- Елементи ----------
const elements = ref<StageEl[]>([])
const activeIndex = ref<number | null>(null)
const libraryOpen = ref(false)

const reversedElements = computed(() => [...elements.value].reverse())

// Активний елемент і чи це текст (для кнопки редагування тексту)
const activeEl = computed(() => (activeIndex.value !== null ? elements.value[activeIndex.value] : null))
const isActiveText = computed(() => activeEl.value?.type === 'text')

const stageCmp = ref<any>()
const fileInput = ref<HTMLInputElement>()
const editorRef = ref<HTMLElement>()

function setActive(i: number | null) {
	activeIndex.value = i
	elements.value.forEach((el: StageEl, idx: number) => (el.activated = idx === i))
}

function updateElement(i: number, patch: Partial<StageEl>) {
	Object.assign(elements.value[i], patch)
}

function removeElement(i: number | null) {
	if (i === null || i < 0) return
	elements.value.splice(i, 1)
	setActive(null)
}

// Додаємо зображення (вписане в сцену, по центру)
function pushImage(url: string) {
	const img = new Image()
	img.onload = () => {
		const aspect = img.width / img.height
		const width = Math.min(STAGE_W, STAGE_H * aspect)
		const height = Math.min(STAGE_H, STAGE_W / aspect)

		elements.value.push({
			type: 'image',
			url,
			x: (STAGE_W - width) / 2,
			y: (STAGE_H - height) / 2,
			width,
			height,
			rotation: 0,
			activated: false,
		})
		setActive(elements.value.length - 1)
	}
	img.src = url
}

function addImagesFromDisk(e: Event) {
	const input = e.target as HTMLInputElement
	for (const file of Array.from(input.files || [])) {
		const reader = new FileReader()
		reader.onload = () => pushImage(String(reader.result))
		reader.readAsDataURL(file)
	}
	input.value = ''
}

function addImageFromLibrary(url: string) {
	pushImage(url)
}

// ---------- Текст ----------
const fonts = [
	'Rubik Mono One', 'Roboto', 'Ruslan Display', 'Rubik Wet Paint', 'Rubik', 'Russo One', 'Bad Script',
	'Stalinist One', 'Lobster', 'Pacifico', 'Rubik Bubbles', 'Pangolin', 'Montserrat', 'Quicksand', 'Merriweather',
	'Oswald', 'Comfortaa', 'Marmelad', 'Caveat', 'Cormorant', 'Lora', 'Amatic SC', 'Neucha', 'Poiret One',
]

const textModalOpen = ref(false)
const textEditMode = ref(false)
const textForm = ref<TextForm>({ text: '', color: '#000000', font: 'Roboto', bold: false, italic: false, underline: false })

function openTextAdd() {
	textEditMode.value = false
	textForm.value = { text: '', color: '#000000', font: 'Roboto', bold: false, italic: false, underline: false }
	textModalOpen.value = true
}

function openTextEdit(i: number | null) {
	if (i === null) return
	const el = elements.value[i]
	if (!el || el.type !== 'text') return
	setActive(i)
	textEditMode.value = true
	textForm.value = {
		text: el.text || '',
		color: el.color || '#000000',
		font: el.font || 'Roboto',
		bold: !!el.bold,
		italic: !!el.italic,
		underline: !!el.underline,
	}
	textModalOpen.value = true
}

function saveText(form: TextForm) {
	if (textEditMode.value && activeIndex.value !== null) {
		const el = elements.value[activeIndex.value]
		if (el?.type === 'text') Object.assign(el, form)
		return
	}

	// Ширина тексту ~ пропорційно довжині
	const height = 44
	const width = Math.min(STAGE_W - 20, Math.max(120, form.text.length * height * 0.55))

	elements.value.push({
		type: 'text',
		...form,
		x: (STAGE_W - width) / 2,
		y: (STAGE_H - height) / 2,
		width,
		height,
		rotation: 0,
		activated: false,
	})
	setActive(elements.value.length - 1)
}

// ---------- Керування ----------
const backgroundColor = ref('#FFFFFF')

function zoomIn() { scaleActive(1.1) }
function zoomOut() { scaleActive(0.9) }

function scaleActive(factor: number) {
	if (activeIndex.value === null) return
	const el = elements.value[activeIndex.value]
	const cx = el.x + el.width / 2
	const cy = el.y + el.height / 2
	el.width *= factor
	el.height *= factor
	el.x = cx - el.width / 2
	el.y = cy - el.height / 2
}

function rotate(deg: number) {
	if (activeIndex.value === null) return
	elements.value[activeIndex.value].rotation += deg
}

function layerUp() {
	const i = activeIndex.value
	if (i === null || i >= elements.value.length - 1) return
	;[elements.value[i], elements.value[i + 1]] = [elements.value[i + 1], elements.value[i]]
	setActive(i + 1)
}

function layerDown() {
	const i = activeIndex.value
	if (i === null || i <= 0) return
	;[elements.value[i], elements.value[i - 1]] = [elements.value[i - 1], elements.value[i]]
	setActive(i - 1)
}

// Зміна шару конкретного елемента зі списку шарів (вище = ближче до глядача)
function moveLayerUp(i: number) {
	if (i < 0 || i >= elements.value.length - 1) return
	;[elements.value[i], elements.value[i + 1]] = [elements.value[i + 1], elements.value[i]]
	setActive(i + 1)
}

function moveLayerDown(i: number) {
	if (i <= 0) return
	;[elements.value[i], elements.value[i - 1]] = [elements.value[i - 1], elements.value[i]]
	setActive(i - 1)
}

// Клавіатура: стрілки + Delete (ігноруємо, коли друкуємо в полі або відкрита модалка)
function onKeydown(e: KeyboardEvent) {
	if (activeIndex.value === null) return
	if (textModalOpen.value || modelModalOpen.value || libraryOpen.value) return
	const tgt = e.target as HTMLElement | null
	if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return

	const el = elements.value[activeIndex.value]
	const step = 10

	switch (e.key) {
		case 'ArrowUp': el.y -= step; break
		case 'ArrowDown': el.y += step; break
		case 'ArrowLeft': el.x -= step; break
		case 'ArrowRight': el.x += step; break
		case 'Delete': removeElement(activeIndex.value); break
		default: return
	}
	e.preventDefault()
}

// Зняти виділення при кліку будь-де поза конструктором (поза білим блоком + інструментами).
// Контроли, що працюють з виділенням (редагування тексту, список шарів), глушать pointerdown.
function onDocPointerDown(e: PointerEvent) {
	if (activeIndex.value === null) return
	if (textModalOpen.value || modelModalOpen.value || libraryOpen.value) return
	if (editorRef.value && !editorRef.value.contains(e.target as Node)) setActive(null)
}

onMounted(() => {
	window.addEventListener('keydown', onKeydown)
	document.addEventListener('pointerdown', onDocPointerDown)

	// Підключаємо шрифти для тексту
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = `https://fonts.googleapis.com/css2?family=${fonts.map((f) => f.replace(/ /g, '+')).join('&family=')}&display=swap`
	document.head.appendChild(link)

	// Шаблон NeoPrint (?neo_print_id=)
	const np = route.query.neo_print_id
	const alias = Array.isArray(np) ? np[0] : np
	if (alias) loadNeoPrint(alias)
})

onUnmounted(() => {
	window.removeEventListener('keydown', onKeydown)
	document.removeEventListener('pointerdown', onDocPointerDown)
})

async function loadNeoPrint(alias: string) {
	try {
		const res = await $fetch<{ base64Image?: string }>(`${config.public.urlApi}attributes/image_b64/${alias}`, {
			query: { type: 'template' },
		})
		if (res?.base64Image) {
			pushImage(res.base64Image)
			return
		}
	} catch { /* fallback нижче */ }
	pushImage(`${config.public.urlStorage}images/templates/${alias}.jpg`)
}

// ---------- Canvas-генерація ----------
const generating = ref(false)

function loadImg(src: string, cors = true): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		if (cors && !src.startsWith('data:')) img.crossOrigin = 'anonymous'
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = src
	})
}

// Завантаження зображення з обходом CORS через бекенд (для бібліотеки)
async function loadElementImage(url: string): Promise<HTMLImageElement> {
	try {
		return await loadImg(url)
	} catch {
		// Якщо пряме завантаження не вдалося — тягнемо base64 через API
		const m = url.match(/printcase\/library\/([^/]+)\/([^/]+)$/)
		if (m) {
			const res = await $fetch<{ base64Image?: string }>(
				`${config.public.urlApi}printcase/get_image_b64/${m[2]}/library/${m[1]}`
			)
			if (res?.base64Image) return loadImg(res.base64Image, false)
		}
		throw new Error('image load failed')
	}
}

async function renderCanvas(width: number, withMask: boolean): Promise<string> {
	const k = width / STAGE_W
	const height = STAGE_H * k

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')!

	// Фон
	ctx.fillStyle = backgroundColor.value
	ctx.fillRect(0, 0, width, height)

	// Елементи в порядку шарів
	for (const el of elements.value) {
		ctx.save()
		ctx.translate((el.x + el.width / 2) * k, (el.y + el.height / 2) * k)
		ctx.rotate((el.rotation * Math.PI) / 180)

		if (el.type === 'image' && el.url) {
			const img = await loadElementImage(el.url)
			ctx.drawImage(img, (-el.width / 2) * k, (-el.height / 2) * k, el.width * k, el.height * k)
		} else if (el.type === 'text') {
			const fontSize = el.height * k
			ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${fontSize}px "${el.font}", sans-serif`
			ctx.fillStyle = el.color || '#000'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(el.text || '', 0, 0)

			if (el.underline) {
				const tw = ctx.measureText(el.text || '').width
				ctx.strokeStyle = el.color || '#000'
				ctx.lineWidth = Math.max(1, fontSize / 16)
				ctx.beginPath()
				ctx.moveTo(-tw / 2, fontSize * 0.42)
				ctx.lineTo(tw / 2, fontSize * 0.42)
				ctx.stroke()
			}
		}
		ctx.restore()
	}

	// Маска поверх (тільки для превʼю)
	if (withMask && maskUrl.value) {
		const mask = await loadImg(maskUrl.value, false)
		ctx.drawImage(mask, 0, 0, width, height)
	}

	return canvas.toDataURL('image/jpeg', 0.85)
}

async function generateAndUpload(): Promise<{ id: number; preview: string; source: string }> {
	const id = Math.floor(Date.now() / 1000)

	// Знімаємо виділення, щоб рамки не потрапили в макет
	setActive(null)

	const sourceData = await renderCanvas(800, false)
	const previewData = await renderCanvas(400, true)

	await $fetch(config.public.urlApi + 'printcase/upload_image', {
		method: 'POST',
		body: { image: sourceData, id, type: 'source' },
	})
	await $fetch(config.public.urlApi + 'printcase/upload_image', {
		method: 'POST',
		body: { image: previewData, id, type: 'preview' },
	})

	return {
		id,
		preview: `${config.public.urlStorage}images/printcase/orders/preview_${id}.jpg`,
		source: `${config.public.urlStorage}images/printcase/orders/source_${id}.jpg`,
	}
}

// Додати в кошик (формат як на старому сайті)
async function addToCart() {
	if (!model.value || !elements.value.length) return

	generating.value = true
	try {
		const { id, preview, source } = await generateAndUpload()

		cart.add({
			product: {
				id,
				alias: `?model=${model.value.url}`,
				alias_cat: 'printcase',
				title: `ІНДИВІДУАЛЬНИЙ чохол для ${model.value.brend} ${model.value.title}`,
				price: config.public.printcasePrice,
				price_old: config.public.printcasePriceOld,
			},
			attribute: 0,
			image: preview,
			printcase: source,
			categoryId: model.value.id,
		})

		notify('success', t('message.productAddedCart'))
		router.push(localePath('/shop/cart'))
	} catch {
		notify('error', 'Error')
	}
	generating.value = false
}

// Додати до існуючого замовлення (?order_id=)
async function addToExistingOrder() {
	if (!model.value || !elements.value.length || !orderId.value) return

	generating.value = true
	try {
		const { preview, source } = await generateAndUpload()

		await $fetch(config.public.urlApi + 'orders/add_order_printcase', {
			query: {
				order_item: JSON.stringify({
					title: `ЧОХОЛ для ${model.value.brend} ${model.value.title}`,
					count: 1,
					price: config.public.printcasePrice,
					printcase: source,
					image_file: preview,
					order_id: orderId.value,
					product_id: 0,
					attribute_id: 0,
					category_id: model.value.id,
				}),
			},
		})

		notify('success', `OK: + № ${orderId.value}`)
	} catch {
		notify('error', 'Error')
	}
	generating.value = false
}
</script>

<style scoped>
/* Конструктор — компактна центрована робоча зона (контейнер сайту 1550px завеликий) */
.pc-container {
	max-width: 940px;
}

.pc-title {
	margin-bottom: 14px;
}

.pc-layout {
	display: grid;
	grid-template-columns: minmax(440px, 500px) minmax(0, 1fr);
	gap: 20px;
	align-items: start;
	padding-bottom: 30px;
}

/* Обгортка: білий блок + темна панель впритик (два окремі блоки, не один поверх одного) */
.pc-editor {
	display: flex;
	align-items: stretch;
	min-width: 0;
}

/* Білий блок макета — округлює лише ліві кути (правим боком стикається з панеллю) */
.pc-stage-col {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 14px;
	background: var(--img-bg);
	border-radius: var(--radius-lg) 0 0 var(--radius-lg);
	box-shadow: var(--shadow-card);
}

/* Темна панель інструментів, вмонтована в білий блок на всю висоту */
.pc-controls-col {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 10px 8px;
	background: var(--bg-card);
	border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
	box-shadow: var(--shadow-card);
}

/* Інструменти — зверху */
.ctrl-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.ctrl-group.is-disabled {
	opacity: 0.4;
	pointer-events: none;
}

.ctrl-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 40px;
	border-radius: var(--radius-sm);
	color: var(--text-soft);
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	transition: all 0.13s;
}

.ctrl-btn:hover {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
	box-shadow: 0 4px 14px var(--accent-glow);
}

.ctrl-btn--danger:hover {
	background: var(--danger);
	border-color: var(--danger);
	color: #fff;
	box-shadow: none;
}

/* Колір фону — внизу панелі */
.ctrl-bg {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	margin-top: auto;
	border-radius: var(--radius-sm);
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	cursor: pointer;
}

.ctrl-bg input {
	position: absolute;
	inset: 0;
	opacity: 0;
	cursor: pointer;
}

.ctrl-bg__swatch {
	width: 24px;
	height: 24px;
	border-radius: var(--radius-sm);
	border: 2px solid var(--border-light);
	pointer-events: none;
}

/* Панель дій */
.pc-actions-col {
	display: flex;
	flex-direction: column;
	gap: 10px;
	max-width: 480px;
}

.pc-model-btn {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 15px 18px;
	background: var(--accent);
	color: var(--on-accent);
	font-size: 15px;
	font-weight: 700;
	border-radius: var(--radius);
	text-align: left;
	transition: background 0.15s;
}

.pc-model-btn:hover {
	background: var(--accent-hover);
}

.pc-action {
	display: flex;
	align-items: center;
	gap: 13px;
	padding: 11px 14px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	font-size: 14px;
	font-weight: 600;
	color: var(--text-soft);
	text-align: left;
	transition: all 0.14s;
}

.pc-action:hover {
	border-color: var(--accent);
	color: var(--accent);
}

.pc-action__icon {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 10px;
	background: var(--accent-soft);
	color: var(--accent);
	flex-shrink: 0;
}

/* Розділена кнопка тексту: «+ додати» | «редагувати …» */
.pc-action--split {
	align-items: stretch;
	gap: 0;
	padding: 0;
	overflow: hidden;
}

.pc-action__add {
	display: flex;
	align-items: center;
	padding: 11px 12px;
	border-right: 1px solid var(--border);
	color: var(--text-soft);
	transition: color 0.14s;
}

.pc-action__add:hover {
	color: var(--accent);
}

.pc-action__plus {
	position: absolute;
	top: -5px;
	right: -5px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 17px;
	height: 17px;
	border-radius: 50%;
	background: var(--accent);
	color: var(--on-accent);
	font-size: 13px;
	font-weight: 800;
	line-height: 1;
}

.pc-action__edit {
	display: flex;
	align-items: center;
	gap: 10px;
	flex: 1;
	min-width: 0;
	padding: 11px 14px;
	color: var(--text-soft);
	font-size: 14px;
	font-weight: 600;
	text-align: left;
	transition: color 0.14s;
}

.pc-action__edit:hover {
	color: var(--accent);
}

.pc-action__edit-txt {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Шари */
.pc-layers {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 10px;
}

.pc-layers__title {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 6px 10px;
	font-size: 13px;
	font-weight: 700;
	color: var(--text-soft);
}

.pc-layers__title svg {
	color: var(--accent);
}

.pc-layer {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 8px;
	border-radius: var(--radius-sm);
	cursor: pointer;
	transition: background 0.12s;
}

.pc-layer:hover {
	background: var(--bg-elevated);
}

.pc-layer.is-active {
	background: var(--accent-soft);
}

.pc-layer__thumb {
	width: 34px;
	height: 34px;
	object-fit: cover;
	border-radius: 7px;
	background: var(--img-bg);
	flex-shrink: 0;
}

.pc-layer__thumb--text {
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 800;
	color: var(--accent);
	background: var(--bg-elevated);
}

.pc-layer__name {
	flex: 1;
	font-size: 13px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pc-layer__actions {
	display: flex;
	align-items: center;
	gap: 2px;
	flex-shrink: 0;
}

.pc-layer__btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
	transition: all 0.12s;
}

.pc-layer__btn:hover:not(:disabled) {
	background: var(--bg-card);
	color: var(--accent);
}

.pc-layer__btn:disabled {
	opacity: 0.3;
	cursor: default;
}

.pc-layer__btn--del:hover:not(:disabled) {
	color: var(--danger);
}

/* Купівля */
.pc-buy {
	padding: 16px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.pc-buy__prices {
	display: flex;
	align-items: baseline;
	gap: 12px;
	margin-bottom: 12px;
}

.pc-buy__price {
	font-size: 26px;
	font-weight: 800;
	color: var(--accent);
}

.pc-buy__price-old {
	font-size: 15px;
	color: var(--text-muted);
	text-decoration: line-through;
}

@media (max-width: 1100px) {
	/* Білий блок і панель дій — стовпцем, по центру (без розтягування) */
	.pc-layout {
		grid-template-columns: 1fr;
		justify-items: center;
	}

	.pc-editor,
	.pc-actions-col {
		width: 100%;
		max-width: 540px;
	}
}

@media (max-width: 640px) {
	/* На телефоні панель так само вмонтована праворуч; усе компактніше */
	.pc-stage-col {
		padding: 10px;
	}

	.pc-controls-col {
		padding: 8px 6px;
	}

	.ctrl-btn {
		width: 38px;
		height: 38px;
	}

	.ctrl-bg {
		width: 38px;
		height: 38px;
	}
}
</style>
