<template>
	<div class="notifications-wrap" aria-live="polite">
		<TransitionGroup name="note">
			<div
				v-for="n in notes"
				:key="n.id"
				class="notification"
				:class="{ 'is-success': n.type === 'success', 'is-error': n.type === 'error' }"
			>
				{{ n.text }}
			</div>
		</TransitionGroup>
	</div>
</template>

<script setup lang="ts">
const { notes } = useNotify()
</script>

<style scoped>
.note-leave-active {
	transition: opacity 0.25s, transform 0.25s;
}

.note-leave-to {
	opacity: 0;
	transform: translateX(30px);
}
</style>
