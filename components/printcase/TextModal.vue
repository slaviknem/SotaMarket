<template>
	<AppModal
		:model-value="modelValue"
		:title="isEdit ? t('printcase.editText') : t('printcase.addText')"
		size="sm"
		:hidden="picking"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<div class="form-group">
			<label>{{ t('printcase.controlText.text') }}</label>
			<input v-model="form.text" class="form-control text-preview-input" type="text" :style="previewStyle" />
		</div>

		<div class="text-row">
			<div class="form-group">
				<label>{{ t('printcase.controlText.color') }}</label>
				<div class="color-row">
					<!-- Чип + hex поруч: сам по собі темний зразок зливається з панеллю
					     і не читається як «обери колір» -->
					<label class="color-swatch" :style="{ '--swatch': form.color }" :title="t('printcase.controlText.color')">
						<input v-model="form.color" type="color" class="color-swatch__input" />
						<span class="color-swatch__chip" aria-hidden="true"></span>
						<span class="color-swatch__hex">{{ form.color.toUpperCase() }}</span>
					</label>
					<!-- Піпетка окремою кнопкою: та, що всередині нативного вибору кольору,
					     бере піксель разом із затемненням модалки — колір виходив темнішим -->
					<button v-if="canPick" class="style-btn" :title="t('printcase.controlText.pickColor')" @click="pickColor">
						<AppIcon name="pipette" :size="18" />
					</button>
				</div>
			</div>

			<div class="form-group text-styles">
				<label>&nbsp;</label>
				<div class="text-styles__btns">
					<button class="style-btn" :class="{ 'is-on': form.bold }" :title="t('printcase.controlText.bold')" @click="form.bold = !form.bold"><b>B</b></button>
					<button class="style-btn" :class="{ 'is-on': form.italic }" :title="t('printcase.controlText.italic')" @click="form.italic = !form.italic"><i>I</i></button>
					<button class="style-btn" :class="{ 'is-on': form.underline }" :title="t('printcase.controlText.underlined')" @click="form.underline = !form.underline"><u>U</u></button>
				</div>
			</div>
		</div>

		<!-- Вибір шрифта -->
		<div class="form-group">
			<label>Font</label>
			<div class="fonts-list">
				<button
					v-for="font in fonts"
					:key="font"
					class="font-item"
					:class="{ 'is-active': form.font === font }"
					:style="{ fontFamily: `'${font}', sans-serif` }"
					@click="form.font = font"
				>
					{{ form.text || 'FLOY' }}
					<span class="font-item__name">{{ font }}</span>
				</button>
			</div>
		</div>

		<button class="btn btn-primary btn-block btn-lg" :disabled="!form.text.trim()" @click="save">
			{{ isEdit ? t('printcase.editText') : t('printcase.addText') }}
		</button>
	</AppModal>
</template>

<script setup lang="ts">
export interface TextForm {
	text: string
	color: string
	font: string
	bold: boolean
	italic: boolean
	underline: boolean
}

const props = withDefaults(
	defineProps<{
		modelValue: boolean
		fonts: string[]
		isEdit: boolean
		initial: TextForm
		// Колір фону чохла: поле прев'ю малюємо на ньому, інакше темний напис на темному
		// полі виглядає тьмяним, хоча на самому чохлі він контрастний
		bg?: string
	}>(),
	{ bg: '#FFFFFF' }
)

const emit = defineEmits<{
	'update:modelValue': [v: boolean]
	save: [form: TextForm]
}>()

const { t } = useI18n()

const form = reactive<TextForm>({ ...props.initial })

// При відкритті підтягуємо актуальні значення
watch(
	() => props.modelValue,
	(open) => {
		if (open) Object.assign(form, props.initial)
	}
)

// ---------- Піпетка ----------
// EyeDropper — Chrome/Edge (не Firefox і не мобільні): кнопку показуємо тільки там, де вона працює
interface EyeDropperCtor {
	new (): { open: () => Promise<{ sRGBHex: string }> }
}

const canPick = ref(false)
const picking = ref(false)

onMounted(() => {
	canPick.value = 'EyeDropper' in window
})

// На час вибору ховаємо модалку: вона перекриває макет, а її затемнення підмішувалось
// у зчитаний піксель. Стан форми при цьому лишається — модалка не закривається.
async function pickColor() {
	picking.value = true
	// Чекаємо саме перемальовування кадру, а не лише оновлення DOM: інакше піпетка могла б
	// відкритися ще над затемненим кадром
	await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
	try {
		const { sRGBHex } = await new (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper().open()
		if (sRGBHex) form.color = sRGBHex
	} catch {
		/* Esc — вибір скасовано */
	}
	picking.value = false
}

// Відносна яскравість кольору (0…1) за sRGB — щоб оцінити контраст тексту і фону
function luminance(hex: string) {
	const raw = hex.replace('#', '')
	const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw
	const n = Number.parseInt(full, 16)
	if (full.length !== 6 || !Number.isFinite(n)) return 1
	const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
		const c = v / 255
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

// Прев'ю малюємо на кольорі чохла, але коли напис із ним майже зливається
// (білий текст на білому чохлі) — підкладаємо контрастну нейтральну поверхню,
// інакше поле виглядає порожнім і не видно, що набираєш
const previewBg = computed(() => {
	const lText = luminance(form.color)
	const lBg = luminance(props.bg)
	const contrast = (Math.max(lText, lBg) + 0.05) / (Math.min(lText, lBg) + 0.05)
	if (contrast >= 1.7) return props.bg
	return lText > 0.5 ? 'var(--bg-deep)' : 'var(--img-bg)'
})

// Поле введення — маленьке прев'ю напису на чохлі: той самий фон, колір і накреслення
const previewStyle = computed(() => ({
	color: form.color,
	background: previewBg.value,
	fontFamily: `'${form.font}', sans-serif`,
	fontWeight: form.bold ? 'bold' : 'normal',
	fontStyle: form.italic ? 'italic' : 'normal',
	textDecoration: form.underline ? 'underline' : 'none',
}))

function save() {
	emit('save', { ...form })
	emit('update:modelValue', false)
}
</script>

<style scoped>
.text-row {
	display: flex;
	flex-wrap: wrap;
	gap: 18px;
}

.color-row {
	display: flex;
	gap: 6px;
}

/* Кнопка вибору кольору: зразок + hex-код, у тій самій «коробці», що B / I / U */
.color-swatch {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	height: 42px;
	padding: 0 10px 0 8px;
	border: 1.5px solid var(--border-light);
	border-radius: var(--radius-sm);
	cursor: pointer;
	transition: border-color 0.13s;
}

.color-swatch:hover {
	border-color: var(--accent);
}

/* Нативний input лишаємо клікабельним на всю кнопку, але невидимим */
.color-swatch__input {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	padding: 0;
	border: none;
	opacity: 0;
	cursor: pointer;
}

.color-swatch__chip {
	width: 22px;
	height: 22px;
	border-radius: calc(var(--radius-sm) - 4px);
	background: var(--swatch);
	/* Сірий обідок читається і на чорному, і на білому зразку */
	box-shadow: inset 0 0 0 1px var(--text-muted);
}

.color-swatch__hex {
	font-size: 12.5px;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.02em;
	color: var(--text-soft);
}

/* Прев'ю: фон може перемикатись на контрастний — переходимо плавно */
.text-preview-input {
	transition: background-color 0.2s ease, color 0.2s ease;
}

.text-styles__btns {
	display: flex;
	gap: 6px;
}

/* Квадратна кнопка панелі тексту: B / I / U і піпетка */
.style-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	border-radius: var(--radius-sm);
	border: 1.5px solid var(--border-light);
	font-size: 16px;
	color: var(--text-soft);
	transition: all 0.13s;
}

.style-btn:hover {
	border-color: var(--accent);
	color: var(--accent);
}

.style-btn.is-on {
	border-color: var(--accent);
	background: var(--accent-soft);
	color: var(--accent);
}

.fonts-list {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 6px;
	max-height: 230px;
	overflow-y: auto;
	padding-right: 4px;
}

.font-item {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	padding: 8px 12px;
	border-radius: var(--radius-sm);
	border: 1.5px solid var(--border);
	font-size: 17px;
	color: var(--text);
	text-align: left;
	overflow: hidden;
	white-space: nowrap;
	transition: border-color 0.13s;
}

.font-item:hover {
	border-color: var(--border-light);
}

.font-item.is-active {
	border-color: var(--accent);
	background: var(--accent-soft);
}

.font-item__name {
	font-family: var(--font);
	font-size: 10.5px;
	color: var(--text-muted);
}
</style>
