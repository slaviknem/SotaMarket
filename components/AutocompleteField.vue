<template>
	<div class="form-group ac">
		<label v-if="label" :for="id">
			{{ label }} <b v-if="required" class="required-star">*</b>
		</label>

		<div class="ac__field">
			<input
				:id="id"
				:value="modelValue"
				class="form-control"
				:class="{ 'is-error': !!error, 'is-ok': !error && selected }"
				type="text"
				autocomplete="off"
				role="combobox"
				aria-autocomplete="list"
				:aria-expanded="showList"
				:aria-controls="id + '-list'"
				:disabled="disabled"
				:placeholder="placeholder"
				@input="onInput"
				@focus="open = true"
				@blur="onBlur"
				@keydown.down.prevent="move(1)"
				@keydown.up.prevent="move(-1)"
				@keydown.esc="open = false"
				@keydown.enter="onEnter"
			/>

			<span v-if="loading" class="ac__state"><span class="spinner" /></span>
			<button
				v-else-if="modelValue && !disabled"
				type="button"
				class="ac__state ac__clear"
				:aria-label="t('other.remove')"
				@mousedown.prevent="clear"
			>
				<AppIcon name="close" :size="14" />
			</button>
		</div>

		<ul v-if="showList" :id="id + '-list'" ref="listEl" class="ac__list" role="listbox">
			<li v-if="loading" class="ac__msg">{{ t('category.loading') }}</li>
			<li v-else-if="!options.length" class="ac__msg">{{ t('other.notFind') }}</li>
			<template v-else>
				<li v-for="(opt, i) in options" :key="opt.code" role="option" :aria-selected="i === active">
					<button type="button" :class="{ 'is-active': i === active }" @mousedown.prevent="choose(i)">
						{{ opt.label }}
					</button>
				</li>
			</template>
		</ul>

		<p v-if="error" class="field-error">{{ error }}</p>
		<p v-else-if="hint" class="field-hint">{{ hint }}</p>
	</div>
</template>

<script setup lang="ts">
import type { NPOption } from '~/composables/useNovaPochta'

const props = withDefaults(
	defineProps<{
		id: string
		modelValue: string
		options: NPOption[]
		label?: string
		placeholder?: string
		hint?: string
		error?: string
		required?: boolean
		disabled?: boolean
		loading?: boolean
		/** Показувати «нічого не знайдено» замість тихого закриття списку */
		showEmpty?: boolean
		/** Опція вже обрана зі списку (для зеленої рамки) */
		selected?: boolean
	}>(),
	{ options: () => [] }
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
	search: [query: string]
	select: [option: NPOption]
	blur: []
}>()

const { t } = useI18n()

const open = ref(false)
const active = ref(-1)
const listEl = ref<HTMLElement | null>(null)

// Список тримаємо відкритим, лише коли є що показати:
// опції, індикатор пошуку або явний стан «нічого не знайдено».
const showList = computed(
	() => open.value && !props.disabled && (props.options.length > 0 || props.loading || props.showEmpty)
)

// Опції змінилися (прийшла нова відповідь) — скидаємо підсвітку
watch(() => props.options, () => (active.value = -1))

// Клік по опції не викликає blur (@mousedown.prevent), тож сюди потрапляє
// лише реальний вихід із поля — тільки тоді батьку є сенс показувати помилку.
function onBlur() {
	open.value = false
	emit('blur')
}

function onInput(e: Event) {
	const value = (e.target as HTMLInputElement).value
	open.value = true
	active.value = -1
	emit('update:modelValue', value)
	emit('search', value)
}

function move(step: number) {
	const count = props.options.length
	if (!count) return
	open.value = true
	active.value = active.value < 0 ? (step > 0 ? 0 : count - 1) : (active.value + step + count) % count
	nextTick(() => listEl.value?.querySelectorAll('li')[active.value]?.scrollIntoView({ block: 'nearest' }))
}

// Enter обираємо лише коли є підсвічена опція — інакше не заважаємо сабміту форми
function onEnter(e: KeyboardEvent) {
	if (!showList.value || active.value < 0) return
	e.preventDefault()
	choose(active.value)
}

function choose(index: number) {
	const opt = props.options[index]
	if (!opt) return
	emit('update:modelValue', opt.label)
	emit('select', opt)
	open.value = false
	active.value = -1
}

function clear() {
	emit('update:modelValue', '')
	emit('search', '')
	open.value = true
	active.value = -1
}
</script>

<style scoped>
.ac__field {
	position: relative;
}

/* Місце під спінер / кнопку очищення справа в полі */
.ac__field .form-control {
	padding-right: 40px;
}

.ac__state {
	position: absolute;
	top: 50%;
	right: 12px;
	transform: translateY(-50%);
	display: flex;
	color: var(--text-muted);
}

.ac__clear:hover {
	color: var(--accent);
}

.ac {
	position: relative;
}

.ac__list {
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	z-index: 50;
	max-height: 260px;
	overflow-y: auto;
	margin: 4px 0 0;
	padding: 6px;
	list-style: none;
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	box-shadow: var(--shadow-pop);
}

.ac__msg {
	padding: 10px;
	font-size: 13.5px;
	color: var(--text-muted);
}

.ac__list button {
	display: block;
	width: 100%;
	text-align: left;
	padding: 8px 10px;
	font-size: 13.5px;
	color: var(--text-soft);
	border-radius: 6px;
}

.ac__list button:hover,
.ac__list button.is-active {
	background: var(--accent-soft);
	color: var(--accent);
}
</style>
