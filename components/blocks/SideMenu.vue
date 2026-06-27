<template>
	<nav class="side-menu" :class="`side-menu--${variant || 'sidebar'}`" :aria-label="menu.title">
		<template v-if="variant !== 'strip'">
			<NuxtLink v-if="menu.titleTo" :to="menu.titleTo" class="side-menu__head">{{ menu.title }}</NuxtLink>
			<span v-else class="side-menu__head">{{ menu.title }}</span>
		</template>

		<div class="side-menu__list">
			<NuxtLink
				v-for="item in menu.items"
				:key="item.to"
				:to="item.to"
				class="side-menu__item"
				:class="{ 'is-active': item.active }"
			>
				{{ item.label }}
			</NuxtLink>
		</div>
	</nav>
</template>

<script setup lang="ts">
import type { SideMenu } from '~/composables/useSiteMenus'

defineProps<{
	menu: SideMenu
	// sidebar — вертикальна картка (моб.: пігулки); strip — завжди горизонтальні пігулки
	variant?: 'sidebar' | 'strip'
}>()
</script>

<style scoped>
.side-menu__list {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.side-menu__item {
	padding: 8px 18px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-pill);
	font-size: 13.5px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.15s;
}

.side-menu__item:hover,
.side-menu__item.is-active {
	border-color: var(--accent);
	color: var(--accent);
}

/* ───────── variant=sidebar — вертикальна картка (як блок фільтрів) ───────── */
.side-menu--sidebar {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

/* Шапка — трохи світліший фон + нижня лінія */
.side-menu--sidebar .side-menu__head {
	display: block;
	padding: 14px 18px;
	background: var(--bg-elevated);
	border-bottom: 1px solid var(--border);
	font-weight: 700;
	font-size: 14.5px;
	color: var(--text);
	transition: color 0.15s;
}

a.side-menu__head:hover {
	color: var(--accent);
}

.side-menu--sidebar .side-menu__list {
	flex-direction: column;
	gap: 2px;
	flex-wrap: nowrap;
	padding: 8px;
}

.side-menu--sidebar .side-menu__item {
	position: relative;
	display: flex;
	align-items: center;
	padding: 10px 14px;
	border: none;
	border-radius: var(--radius-sm);
	background: transparent;
	color: var(--text-soft);
}

/* Ліва акцент-смужка на ховері/активному пункті */
.side-menu--sidebar .side-menu__item::before {
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

.side-menu--sidebar .side-menu__item:hover {
	background: var(--bg-elevated);
	color: var(--text);
}

.side-menu--sidebar .side-menu__item.is-active {
	background: var(--accent-soft);
	color: var(--accent);
}

.side-menu--sidebar .side-menu__item:hover::before,
.side-menu--sidebar .side-menu__item.is-active::before {
	height: 60%;
}

/* На вузьких екранах вертикальна картка стає горизонтальною стрічкою-пігулками */
@media (max-width: 1023px) {
	.side-menu--sidebar {
		background: transparent;
		border: none;
		overflow: visible;
	}

	.side-menu--sidebar .side-menu__head {
		display: none;
	}

	.side-menu--sidebar .side-menu__list {
		flex-direction: row;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0;
	}

	.side-menu--sidebar .side-menu__item {
		padding: 8px 18px;
		border: 1px solid var(--border-light);
		border-radius: var(--radius-pill);
		background: var(--bg-card);
	}

	.side-menu--sidebar .side-menu__item::before {
		display: none;
	}

	.side-menu--sidebar .side-menu__item:hover,
	.side-menu--sidebar .side-menu__item.is-active {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--bg-card);
	}
}
</style>
