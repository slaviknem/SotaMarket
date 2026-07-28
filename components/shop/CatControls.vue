<template>
	<!-- Контролі течуть у вільний простір справа від останнього товару;
	     повний останній ряд → переносяться вниз на всю ширину -->
	<div class="cat-controls">
		<div v-if="hasMorePages" class="cat-controls__row">
			<button
				v-if="showButton"
				class="btn btn-outline cat-controls__btn"
				:disabled="isLoadingMore"
				@click="$emit('load-more')"
			>
				<span v-if="isLoadingMore" class="spinner" />
				{{ isLoadingMore ? t('category.loading') : t('category.showMore') }}
			</button>
			<span v-else-if="isLoadingMore" class="spinner spinner--lg" />

			<label class="cat-controls__toggle">
				<input v-model="autoOn" type="checkbox" class="cat-controls__switch" />
				<span class="text-muted">{{ t('category.autoLoad') }}</span>
			</label>
		</div>

		<!-- Пагінація справжніми посиланнями — для ботів і прямих переходів -->
		<AppPagination
			:current="currentPage"
			:total-pages="totalPages"
			:to="to"
			:loaded="loaded"
		/>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	currentPage: number
	totalPages: number
	hasMorePages: boolean
	showButton: boolean
	isLoadingMore: boolean
	// Номери вже підвантажених (видимих) сторінок
	loaded: number[]
	// Білдер посилання на сторінку для пагінації
	to: (page: number) => any
}>()

defineEmits<{ 'load-more': [] }>()

// Ползунок «Авто-підвантаження» (двостороння прив'язка)
const autoOn = defineModel<boolean>('autoOn', { default: false })

const { t } = useI18n()
</script>

<style scoped>
/* Блок контролів: кнопка «Показати ще» + ползунок авто + пагінація.
   У flow-сітці тече у вільний простір справа від останнього товару (flex: 1 1 340px),
   або переноситься вниз на всю ширину. У grid-сітці (лендінг) — завжди на всю ширину. */
.cat-controls {
	flex: 1 1 340px;
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 10px;
	padding: 8px 14px;
	min-width: 0;
}

.cat-controls__row {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	gap: 16px;
}

.cat-controls__btn {
	min-width: 200px;
}

/* Візуал спінера — глобальний .spinner у main.css, тут лише відступ у кнопці та колір */
.cat-controls__btn .spinner {
	margin-right: 6px;
}

.spinner--lg {
	color: var(--accent);
}

/* Ползунок «Авто-підвантаження» */
.cat-controls__toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	cursor: pointer;
	user-select: none;
}

.cat-controls__switch {
	position: relative;
	width: 40px;
	height: 22px;
	border-radius: var(--radius-pill);
	background: var(--border-light);
	cursor: pointer;
	transition: background 0.2s;
	flex-shrink: 0;
	appearance: none;
	-webkit-appearance: none;
}

.cat-controls__switch:checked {
	background: var(--accent);
}

.cat-controls__switch::after {
	content: '';
	position: absolute;
	top: 3px;
	left: 3px;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: var(--on-accent);
	transition: transform 0.2s;
}

.cat-controls__switch:checked::after {
	transform: translateX(18px);
}
</style>
