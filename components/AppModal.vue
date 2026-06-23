<template>
	<Teleport to="body">
		<Transition name="modal">
			<div v-if="modelValue" class="app-modal" @click.self="close">
				<div class="app-modal__panel" :class="`app-modal__panel--${size}`">
					<div class="app-modal__head">
						<h3 class="app-modal__title">{{ title }}</h3>
						<button class="app-modal__close" :aria-label="t('other.close')" @click="close">
							<AppIcon name="close" :size="18" />
						</button>
					</div>
					<div class="app-modal__body">
						<slot />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		modelValue: boolean
		title?: string
		size?: 'sm' | 'md' | 'lg' | 'xl'
	}>(),
	{ title: '', size: 'md' }
)

const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const { t } = useI18n()

const close = () => emit('update:modelValue', false)
</script>

<style scoped>
.app-modal {
	position: fixed;
	inset: 0;
	z-index: 1100;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.65);
	backdrop-filter: blur(3px);
	padding: 16px;
}

.app-modal__panel {
	display: flex;
	flex-direction: column;
	width: 100%;
	max-height: 88vh;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-pop);
	overflow: hidden;
}

.app-modal__panel--sm { max-width: 420px; }
.app-modal__panel--md { max-width: 560px; }
.app-modal__panel--lg { max-width: 760px; }
.app-modal__panel--xl { max-width: 1060px; }

.app-modal__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 16px 22px;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.app-modal__title {
	margin: 0;
	font-size: 17px;
}

.app-modal__close {
	display: flex;
	padding: 7px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
}

.app-modal__close:hover {
	background: var(--bg-elevated);
	color: var(--text);
}

.app-modal__body {
	padding: 18px 22px;
	overflow-y: auto;
}

.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.2s;
}

.modal-enter-active .app-modal__panel,
.modal-leave-active .app-modal__panel {
	transition: transform 0.2s;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}

.modal-enter-from .app-modal__panel,
.modal-leave-to .app-modal__panel {
	transform: translateY(16px) scale(0.97);
}
</style>
