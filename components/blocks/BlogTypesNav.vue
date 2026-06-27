<template>
	<nav class="blog-types" :class="{ 'blog-types--vertical': vertical }" :aria-label="t('header.topbar.blog')">
		<NuxtLink v-if="vertical" :to="localePath('/article')" class="blog-types__head">
			{{ t('header.topbar.blog') }}
		</NuxtLink>

		<div class="blog-types__list">
			<NuxtLink
				v-for="type in types"
				:key="type"
				:to="localePath(`/article/${type}`)"
				class="blog-type"
				:class="{ 'is-active': activeType === type }"
			>
				<span class="blog-type__label">{{ t('blogCategory.' + type) }}</span>
			</NuxtLink>
		</div>
	</nav>
</template>

<script setup lang="ts">
defineProps<{
	vertical?: boolean
	// Активна категорія (підсвічування) — потрібна на сторінці статті, де URL = /article/{type}/{alias}
	activeType?: string
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const types = ['new', 'akcii', 'review', 'info']
</script>

<style scoped>
.blog-types__list {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.blog-type {
	padding: 8px 18px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-pill);
	font-size: 13.5px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.15s;
}

.blog-type:hover,
.blog-type.is-active {
	border-color: var(--accent);
	color: var(--accent);
}

/* ───────── Вертикальний варіант — сайдбар на сторінці статті (як фільтри) ───────── */
.blog-types--vertical {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

/* Шапка — як у сайдбарі фільтрів: трохи світліший фон + нижня лінія */
.blog-types--vertical .blog-types__head {
	display: block;
	padding: 14px 18px;
	background: var(--bg-elevated);
	border-bottom: 1px solid var(--border);
	font-weight: 700;
	font-size: 14.5px;
	color: var(--text);
	transition: color 0.15s;
}

.blog-types--vertical .blog-types__head:hover {
	color: var(--accent);
}

.blog-types--vertical .blog-types__list {
	flex-direction: column;
	gap: 2px;
	flex-wrap: nowrap;
	padding: 8px;
}

.blog-types--vertical .blog-type {
	position: relative;
	display: flex;
	align-items: center;
	padding: 10px 14px;
	border: none;
	border-radius: var(--radius-sm);
	background: transparent;
	font-weight: 600;
	color: var(--text-soft);
}

/* Ліва акцент-смужка на ховері/активному пункті */
.blog-types--vertical .blog-type::before {
	content: '';
	position: absolute;
	left: 0;
	top: 50%;
	width: 3px;
	height: 0;
	border-radius: var(--radius-pill);
	background: var(--accent);
	transform: translateY(-50%);
	transition: height 0.18s;
}

.blog-types--vertical .blog-type:hover {
	background: var(--bg-elevated);
	color: var(--text);
}

.blog-types--vertical .blog-type.is-active {
	background: var(--accent-soft);
	color: var(--accent);
}

.blog-types--vertical .blog-type:hover::before,
.blog-types--vertical .blog-type.is-active::before {
	height: 60%;
}

/* На вузьких екранах вертикальний сайдбар стає горизонтальною стрічкою-пігулками */
@media (max-width: 1023px) {
	.blog-types--vertical {
		background: transparent;
		border: none;
		overflow: visible;
	}

	.blog-types--vertical .blog-types__head {
		display: none;
	}

	.blog-types--vertical .blog-types__list {
		flex-direction: row;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0;
	}

	.blog-types--vertical .blog-type {
		padding: 8px 18px;
		border: 1px solid var(--border-light);
		border-radius: var(--radius-pill);
		background: var(--bg-card);
	}

	.blog-types--vertical .blog-type::before {
		display: none;
	}

	.blog-types--vertical .blog-type:hover,
	.blog-types--vertical .blog-type.is-active {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--bg-card);
	}
}
</style>
