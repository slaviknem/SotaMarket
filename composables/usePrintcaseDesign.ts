// Макет конструктора чохлів: маніфест ↔ елементи сцени, підготовка фото, збереження на сервер.
//
// Готовий друк лежить, як і раніше, в images/printcase/orders/source_{id}.jpg — його читають
// адмінка й конвеєр друку. Поруч сервер тримає папку designs/{id}_{token}/ із маніфестом
// (тексти, координати, фон) і фото клієнта: саме з неї макет відкривається на правку.
// Сирці живуть 30 днів, готовий друк — завжди.
//
// Маніфест свідомо короткий: він лягає і в сховище, і в чернетку браузера, а координати
// зберігаються В КООРДИНАТАХ СЦЕНИ (400×800) — тобто рівно як у StageEl, без перетворень.

import type { StageEl } from '~/components/printcase/StageElement.vue'
import { STAGE_W, STAGE_H } from '~/components/printcase/PrintcaseStage.vue'

export interface PcStateEl {
	t: 'img' | 'txt'
	src?: string // 'sha:{файл}' — фото клієнта, 'lib:{тека}/{файл}' — галерея, 'neo:{alias}' — готовий дизайн
	s?: string // текст
	f?: string // шрифт
	c?: string // колір
	b?: boolean
	i?: boolean
	u?: boolean
	x: number
	y: number
	w: number
	h: number
	r: number
	hide?: boolean
}

export interface PcState {
	v: 1
	stage: { w: number; h: number }
	model: string
	bg: string
	els: PcStateEl[]
}

export interface PcAsset {
	name: string // {sha16}.jpg — імʼя з хешу вмісту: однакові фото не дублюються
	blob: Blob
	url: string // blob: — і для сцени, і для canvas (свій origin, полотно не «отруюється»)
	uploaded: boolean
}

// Друк рендериться у 800×1600, тож 2000 px по довшій стороні — 2.5× запас навіть із наближенням.
// Фото з телефона (3000–4000 px, 2–5 МБ) після цього важить 300–600 КБ: легша чернетка,
// вп'ятеро швидше заливання і жодної різниці на друці.
const MAX_SIDE = 2000
const JPEG_Q = 0.85
// Дрібне не чіпаємо взагалі: перекодування лише зіпсувало б якість
const SKIP_BYTES = 1024 * 1024

const round = (n: number) => Math.round(n * 100) / 100

export function usePrintcaseDesign() {
	const config = useRuntimeConfig()
	const url = useUrl()

	// Фото цієї сесії: імʼя → блоб. Живе стільки ж, скільки сторінка; на сервер іде у фоні.
	// Composable викликається в конструкторі ОДИН раз — мапа спільна для сторінки.
	const assets = new Map<string, PcAsset>()

	function registerAsset(name: string, blob: Blob): PcAsset {
		const found = assets.get(name)
		if (found) return found

		const asset: PcAsset = { name, blob, url: URL.createObjectURL(blob), uploaded: false }
		assets.set(name, asset)
		return asset
	}

	// ---------- Підготовка фото ----------

	// Запасний хеш: WebCrypto є лише в захищеному контексті (https або localhost), а в дев-режимі
	// по локальній мережі його немає. Від імені потрібна тільки унікальність — сервер однаково
	// приймає його як звичайний рядок, перевіряючи формат.
	function weakHash(buf: ArrayBuffer): string {
		const bytes = new Uint8Array(buf)
		let h1 = 0x811c9dc5
		let h2 = 0x01000193

		for (let i = 0; i < bytes.length; i++) {
			h1 = Math.imul(h1 ^ bytes[i], 16777619) >>> 0
			h2 = Math.imul(h2 + bytes[i], 2246822519) >>> 0
		}
		return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
	}

	// Імʼя = хеш вмісту: однакові фото стають одним файлом і не заливаються двічі
	async function hashName(blob: Blob): Promise<string> {
		const buf = await blob.arrayBuffer()

		let hex: string
		if (globalThis.crypto?.subtle) {
			const digest = await crypto.subtle.digest('SHA-256', buf)
			hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
		} else {
			hex = weakHash(buf)
		}

		const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
		return hex + '.' + ext
	}

	// createImageBitmap швидший і не тримає DOM-елемент, але його немає в старих Safari
	async function decode(file: Blob) {
		if (typeof createImageBitmap === 'function') {
			const bitmap = await createImageBitmap(file)
			return { w: bitmap.width, h: bitmap.height, src: bitmap as CanvasImageSource, close: () => bitmap.close() }
		}

		const objectUrl = URL.createObjectURL(file)
		const img = new Image()
		await new Promise((resolve, reject) => {
			img.onload = resolve
			img.onerror = reject
			img.src = objectUrl
		})
		return {
			w: img.naturalWidth,
			h: img.naturalHeight,
			src: img as CanvasImageSource,
			close: () => URL.revokeObjectURL(objectUrl),
		}
	}

	function toBlob(canvas: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
		return new Promise((resolve, reject) =>
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, q)
		)
	}

	// Чи є в картинці прозорість: PNG без неї немає сенсу лишати PNG (фото в ньому важить
	// у рази більше за jpeg), а от наліпку з вирізаним фоном зіпсувати не можна
	function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
		const { data } = ctx.getImageData(0, 0, w, h)
		for (let i = 3; i < data.length; i += 4) {
			if (data[i] < 250) return true
		}
		return false
	}

	// Файл із диска/буфера/перетягування → зменшена копія + імʼя-хеш + blob-URL для сцени
	async function prepareImage(file: Blob): Promise<PcAsset> {
		const image = await decode(file)
		const scale = Math.min(1, MAX_SIDE / Math.max(image.w, image.h))

		// Уже маленьке й легке — беремо як є
		if (scale === 1 && file.size <= SKIP_BYTES) {
			image.close()
			return registerAsset(await hashName(file), file)
		}

		const canvas = document.createElement('canvas')
		canvas.width = Math.round(image.w * scale)
		canvas.height = Math.round(image.h * scale)

		const ctx = canvas.getContext('2d')!
		ctx.drawImage(image.src, 0, 0, canvas.width, canvas.height)
		image.close()

		const keepPng = file.type === 'image/png' && hasAlpha(ctx, canvas.width, canvas.height)
		const blob = keepPng ? await toBlob(canvas, 'image/png') : await toBlob(canvas, 'image/jpeg', JPEG_Q)

		// Перекодування іноді дає файл більший за оригінал (дрібні png, скріншоти) — тоді оригінал
		const better = blob.size < file.size || scale < 1 ? blob : file
		return registerAsset(await hashName(better), better)
	}

	// ---------- Маніфест ----------

	function toState(elements: StageEl[], bg: string, modelAlias: string): PcState {
		return {
			v: 1,
			stage: { w: STAGE_W, h: STAGE_H },
			model: modelAlias,
			bg,
			els: elements
				.filter((el) => el.type === 'text' || el.origin)
				.map((el) => {
					const out: PcStateEl = {
						t: el.type === 'text' ? 'txt' : 'img',
						x: round(el.x),
						y: round(el.y),
						w: round(el.width),
						h: round(el.height),
						r: round(el.rotation),
					}
					if (el.hidden) out.hide = true

					if (el.type === 'text') {
						out.s = el.text || ''
						out.f = el.font
						out.c = el.color
						if (el.bold) out.b = true
						if (el.italic) out.i = true
						if (el.underline) out.u = true
					} else {
						out.src = el.origin
					}
					return out
				}),
		}
	}

	// Показове посилання на фото макета. Локальний блоб (та сама сесія або відновлена чернетка)
	// беремо напряму; інакше — base64 через наявну ручку адмінки: сховище віддається без CORS,
	// а base64 полотно не «отруює».
	async function assetUrl(name: string, dir?: string): Promise<string> {
		const local = assets.get(name)
		if (local) return local.url
		if (!dir) return ''

		const res = await $fetch<{ base64Image?: string }>(
			`${config.public.urlApi}printcase/get_image_b64/${name}/designs/${dir}`
		).catch(() => null)

		return res?.base64Image || ''
	}

	// Маніфест → елементи сцени. dir потрібен, щоб дотягнути фото з сервера (правка з адмінки),
	// localAssets — блоби з чернетки браузера. missing — скільки фото не знайшлось: макет усе
	// одно відкриється, але про це треба сказати вголос.
	async function toElements(
		state: PcState,
		dir?: string,
		localAssets?: Record<string, Blob>
	): Promise<{ elements: StageEl[]; missing: number }> {
		for (const [name, blob] of Object.entries(localAssets || {})) registerAsset(name, blob)

		// Сцена могла змінити розміри після того, як макет зберегли
		const k = STAGE_W / (state.stage?.w || STAGE_W)

		const elements: StageEl[] = []
		let missing = 0

		for (const el of state.els || []) {
			const base = {
				x: el.x * k,
				y: el.y * k,
				width: el.w * k,
				height: el.h * k,
				rotation: el.r || 0,
				activated: false,
				hidden: !!el.hide,
			}

			if (el.t === 'txt') {
				elements.push({
					type: 'text',
					text: el.s || '',
					font: el.f || 'Roboto',
					color: el.c || '#000000',
					bold: !!el.b,
					italic: !!el.i,
					underline: !!el.u,
					...base,
				})
				continue
			}

			const src = el.src || ''
			let display = ''

			if (src.startsWith('sha:')) display = await assetUrl(src.slice(4), dir)
			else if (src.startsWith('lib:')) display = `${config.public.urlStorage}images/printcase/library/${src.slice(4)}`
			else if (src.startsWith('neo:')) display = url.neoprintTemplateSource(src.slice(4))

			if (!display) {
				missing++
				continue
			}

			elements.push({ type: 'image', url: display, origin: src, ...base })
		}

		return { elements, missing }
	}

	// ---------- Сервер ----------

	// Один запит замість двох: сервер сам обирає вільний id (клієнтський Date.now() давав
	// колізії, коли два замовлення падали в одну секунду й перезаписували друк одне одному),
	// кладе прев'ю та джерело в orders/ і пише маніфест у designs/{id}_{token}/.
	// dir передаємо лише при правці вже збереженого макета — тоді все переписується на місці.
	function save(payload: { state: PcState; preview: string; source: string; dir?: string }) {
		return $fetch<{ id: number; dir: string }>(config.public.urlApi + 'printcase/save_design', {
			method: 'POST',
			body: payload,
		})
	}

	// Фото доливаємо у фоні, вже після того як кнопка кошика відпустила покупця: тримати
	// покупку заради кількох мегабайт немає сенсу. Не долилось (закрили вкладку) — у замовленні
	// лишається готовий друк, тобто рівно те, що було й до появи макетів.
	async function uploadAssets(dir: string, state: PcState) {
		const names = state.els
			.filter((el) => el.src?.startsWith('sha:'))
			.map((el) => el.src!.slice(4))

		for (const name of new Set(names)) {
			const asset = assets.get(name)
			if (!asset || asset.uploaded) continue

			const form = new FormData()
			form.append('dir', dir)
			form.append('name', name)
			form.append('file', asset.blob, name)

			try {
				await $fetch(config.public.urlApi + 'printcase/save_asset', { method: 'POST', body: form })
				asset.uploaded = true
			} catch {
				/* макет уже збережено картинкою — фото довантажимо при наступному збереженні */
			}
		}
	}

	// Маніфест беремо через API адмінки, а не прямим посиланням у сховище: веб-сервер віддає
	// звідти лише картинки, на .json відповідає 403. Розбираємо самі — Content-Type звідти
	// теж ненадійний (той самий випадок, що з webp).
	async function load(dir: string): Promise<PcState | null> {
		const raw = await $fetch<string>(`${config.public.urlApi}printcase/get_design/${dir}`, {
			responseType: 'text',
		}).catch(() => '')

		try {
			const state = JSON.parse(raw)
			return Array.isArray(state?.els) ? state : null
		} catch {
			return null
		}
	}

	return { assets, prepareImage, toState, toElements, save, uploadAssets, load }
}
