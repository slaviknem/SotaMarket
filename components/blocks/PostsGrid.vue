<template>
	<section v-if="posts?.length" class="block">
		<div class="container">
			<div class="section-title">
				<h2>{{ title }}</h2>
			</div>

			<div class="posts-grid">
				<NuxtLink v-for="post in posts" :key="post.id" :to="url.blogPost(post)" class="post-card">
					<div class="post-card__img">
						<AppImage :src="url.articleImg(post.image_file)" :alt="post.title" :width="400" :height="220" />
					</div>
					<div class="post-card__body">
						<div class="post-card__meta">
							<span class="post-card__type">{{ t('blogCategory.' + post.type) }}</span>
							<span class="post-card__date">{{ post.date }}</span>
						</div>
						<div class="post-card__title">{{ post.title }}</div>
					</div>
				</NuxtLink>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
defineProps<{
	title: string
	posts: any[] | null
}>()

const { t } = useI18n()
const url = useUrl()
</script>

<style scoped>
.posts-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 14px;
}

.post-card {
	display: flex;
	flex-direction: column;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	transition: all 0.18s ease;
}

.post-card:hover {
	transform: translateY(-3px);
	border-color: var(--border-light);
	box-shadow: var(--shadow-card);
}

.post-card__img {
	aspect-ratio: 16 / 8.5;
	overflow: hidden;
	background: var(--bg-elevated);
}

.post-card__img img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.25s ease;
}

.post-card:hover .post-card__img img {
	transform: scale(1.04);
}

.post-card__body {
	padding: 14px 16px 16px;
}

.post-card__meta {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 12px;
	margin-bottom: 7px;
}

.post-card__type {
	color: var(--accent);
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.post-card__date {
	color: var(--text-muted);
}

.post-card__title {
	font-size: 14.5px;
	font-weight: 600;
	line-height: 1.45;
}

.post-card:hover .post-card__title {
	color: var(--accent);
}

@media (max-width: 900px) {
	.posts-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 560px) {
	.posts-grid {
		grid-template-columns: 1fr;
	}
}
</style>
