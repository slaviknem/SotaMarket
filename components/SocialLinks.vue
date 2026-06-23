<template>
	<ul class="social-links" :aria-label="t('footer.follow')">
		<li v-for="s in socials" :key="s.name">
			<a
				class="social-links__link"
				:href="s.url"
				:title="s.name"
				:aria-label="s.name"
				target="_blank"
				rel="noopener nofollow"
			>
				<AppIcon :name="s.icon" :size="size" />
			</a>
		</li>
	</ul>
</template>

<script setup lang="ts">
// Іконки соцмереж з посиланнями (перевикористовується у футері / контактах).
// Гліфи — у реєстрі AppIcon, посилання — як на старому floy.com.ua.
const { t } = useI18n()

withDefaults(defineProps<{ size?: number }>(), { size: 18 })

const socials = [
	{ name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/floy.com.ua/' },
	{ name: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/floy.com.ua' },
	{ name: 'Telegram', icon: 'telegram', url: 'https://t.me/floyshop' },
	{ name: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/channel/UCmxlccT0fGh6hF79LSKYIPQ' },
]
</script>

<style scoped>
.social-links {
	display: flex;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.social-links__link {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border-radius: var(--radius-pill);
	background: var(--bg-card);
	border: 1px solid var(--border);
	color: var(--text-muted);
	transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
}

.social-links__link:hover {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
	transform: translateY(-2px);
}
</style>
