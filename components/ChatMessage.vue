<template>
	<div class="chat-msg" :class="`chat-msg--${side}`">
		<!-- Аватар для admin/ai (ліворуч) -->
		<div v-if="side === 'in'" class="chat-msg__avatar" :class="{ 'is-ai': m.sender_type === 'ai' }">
			<AppIcon :name="m.sender_type === 'ai' ? 'robot' : 'headset'" :size="15" />
		</div>

		<div class="chat-msg__bubble">
			<!-- Вкладення -->
			<template v-if="isImage">
				<img
					class="chat-msg__img"
					:src="imgSrc"
					:alt="fileName || ''"
					loading="lazy"
					@click="$emit('open-image', imgSrc)"
				/>
			</template>
			<a
				v-else-if="m.attachment"
				class="chat-msg__file"
				:href="m.attachment.url"
				target="_blank"
				rel="noopener"
			>
				<AppIcon name="document" :size="18" />
				<span>{{ fileName }}</span>
			</a>

			<!-- Текст (linkify + екранування у renderChatText) -->
			<p v-if="m.message" class="chat-msg__text" v-html="html" />

			<span class="chat-msg__meta">
				<span v-if="m.edited" class="chat-msg__edited">{{ t('chat.edited') }}</span>
				<span>{{ time }}</span>
				<AppIcon v-if="m.pending" name="clock" :size="11" class="chat-msg__clock" />
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{ m: ChatMessage }>()
defineEmits<{ 'open-image': [src: string] }>()

const { t } = useI18n()

const side = computed(() => (props.m.sender_type === 'client' ? 'out' : 'in'))
const isImage = computed(
	() => !!props.m.localUrl || (!!props.m.attachment && props.m.attachment.mime.startsWith('image/'))
)
const imgSrc = computed(() => props.m.attachment?.url || props.m.localUrl || '')
const fileName = computed(() => props.m.attachment?.name || props.m.fileName || '')
const html = computed(() => renderChatText(props.m.message))
const time = computed(() => props.m.created_at?.slice(11, 16) || '')
</script>

<style scoped>
.chat-msg {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	max-width: 88%;
}

.chat-msg--out {
	align-self: flex-end;
	flex-direction: row-reverse;
}

.chat-msg--in {
	align-self: flex-start;
}

/* Аватар оператора / асистента */
.chat-msg__avatar {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	color: var(--text-muted);
}

.chat-msg__avatar.is-ai {
	background: var(--accent-soft);
	border-color: transparent;
	color: var(--accent);
}

/* Бульбашка */
.chat-msg__bubble {
	position: relative;
	padding: 8px 12px;
	border-radius: var(--radius) var(--radius) var(--radius) 4px;
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	font-size: 14px;
	line-height: 1.45;
	min-width: 0;
}

.chat-msg--out .chat-msg__bubble {
	background: var(--accent);
	border-color: transparent;
	color: var(--on-accent);
	border-radius: var(--radius) var(--radius) 4px var(--radius);
}

.chat-msg__text {
	margin: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.chat-msg__text :deep(a) {
	color: inherit;
	text-decoration: underline;
	text-underline-offset: 2px;
}

/* Картинка-вкладення */
.chat-msg__img {
	display: block;
	max-width: 220px;
	max-height: 240px;
	width: auto;
	border-radius: var(--radius-sm);
	cursor: zoom-in;
	background: var(--img-bg);
}

.chat-msg__img + .chat-msg__text {
	margin-top: 6px;
}

/* Файл-вкладення (не картинка) */
.chat-msg__file {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border-radius: var(--radius-sm);
	background: rgba(0, 0, 0, 0.14);
	font-size: 13px;
	font-weight: 500;
	max-width: 220px;
}

.chat-msg__file span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chat-msg--in .chat-msg__file {
	background: var(--bg-soft);
}

.chat-msg__file:hover {
	text-decoration: underline;
}

/* Метадані: час + «ред.» + індикатор надсилання */
.chat-msg__meta {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 5px;
	margin-top: 3px;
	font-size: 10.5px;
	line-height: 1;
	opacity: 0.7;
}

.chat-msg--in .chat-msg__meta {
	color: var(--text-muted);
	opacity: 1;
}

.chat-msg__edited {
	font-style: italic;
}

.chat-msg__clock {
	opacity: 0.8;
}
</style>
