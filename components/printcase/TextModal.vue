<template>
	<AppModal
		:model-value="modelValue"
		:title="isEdit ? t('printcase.editText') : t('printcase.addText')"
		size="sm"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<div class="form-group">
			<label>{{ t('printcase.controlText.text') }}</label>
			<input v-model="form.text" class="form-control text-preview-input" type="text" :style="previewStyle" />
		</div>

		<div class="text-row">
			<div class="form-group">
				<label>{{ t('printcase.controlText.color') }}</label>
				<input v-model="form.color" type="color" class="color-input" />
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

const props = defineProps<{
	modelValue: boolean
	fonts: string[]
	isEdit: boolean
	initial: TextForm
}>()

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

const previewStyle = computed(() => ({
	color: form.color === '#000000' ? undefined : form.color,
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
	gap: 18px;
}

.color-input {
	width: 56px;
	height: 42px;
	padding: 3px;
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	background: var(--bg-soft);
	cursor: pointer;
}

.text-styles__btns {
	display: flex;
	gap: 6px;
}

.style-btn {
	width: 42px;
	height: 42px;
	border-radius: var(--radius-sm);
	border: 1.5px solid var(--border-light);
	font-size: 16px;
	color: var(--text-soft);
	transition: all 0.13s;
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
