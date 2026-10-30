<template>
	<section v-if="reviews?.length" class="block">
		<div class="container">
			<div class="section-title">
				<h2>{{ title }}</h2>
				<NuxtLink :to="localePath('/otzyvy-klientov')" class="reviews-strip__all">
					{{ t('reviews.all') }}
					<AppIcon name="arrow-right" :size="15" />
				</NuxtLink>
			</div>

			<!-- Горизонтальна стрічка карток зі scroll-snap (без JS-каруселі) -->
			<div class="reviews-strip">
				<article v-for="review in reviews" :key="review.id" class="review-tile">
					<div class="review-tile__head">
						<div class="review-tile__avatar" aria-hidden="true">{{ initial(review.author) }}</div>
						<div class="review-tile__who">
							<span class="review-tile__author">{{ review.author }}</span>
							<time v-if="review.date" class="review-tile__date" :datetime="reviewIsoDate(review.date)">{{ review.date }}</time>
						</div>
						<RatingStars v-if="Number(review.rating) > 0" :value="Number(review.rating)" :size="13" class="review-tile__stars" />
					</div>
					<p class="review-tile__text">{{ review.text }}</p>
				</article>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
defineProps<{
	title: string
	reviews: any[] | null
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const initial = (name: string) => (name || '?').trim().charAt(0).toUpperCase()
</script>

<style scoped>
.reviews-strip__all {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 13.5px;
	font-weight: 600;
	color: var(--text-soft);
	white-space: nowrap;
	transition: color 0.15s;
}

.reviews-strip__all:hover {
	color: var(--accent-text);
}

.reviews-strip {
	display: grid;
	grid-auto-flow: column;
	/* Ширина картки = 1/4 видимої області (мінус 3 проміжки) — крайня не обрізається */
	grid-auto-columns: calc((100% - 3 * 14px) / 4);
	gap: 14px;
	overflow-x: auto;
	scroll-snap-type: x mandatory;
	padding-bottom: 12px;
	scrollbar-width: thin;
	scrollbar-color: var(--border-light) transparent;
}

.reviews-strip::-webkit-scrollbar {
	height: 6px;
}

.reviews-strip::-webkit-scrollbar-track {
	background: transparent;
}

.reviews-strip::-webkit-scrollbar-thumb {
	background: var(--border-light);
	border-radius: var(--radius-pill);
}

.reviews-strip::-webkit-scrollbar-thumb:hover {
	background: var(--text-muted);
}

.review-tile {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 18px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	scroll-snap-align: start;
	transition: all 0.18s ease;
}

.review-tile:hover {
	transform: translateY(-3px);
	border-color: var(--border-light);
	box-shadow: var(--shadow-card);
}

.review-tile__head {
	display: flex;
	align-items: center;
	gap: 10px;
}

.review-tile__avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 38px;
	height: 38px;
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent);
	font-weight: 800;
	font-size: 15px;
	flex-shrink: 0;
}

.review-tile__who {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.review-tile__author {
	font-weight: 700;
	font-size: 13.5px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.review-tile__date {
	font-size: 11.5px;
	color: var(--text-muted);
}

.review-tile__stars {
	margin-left: auto;
}

.review-tile__text {
	margin: 0;
	font-size: 13.5px;
	line-height: 1.55;
	color: var(--text-soft);
	display: -webkit-box;
	-webkit-line-clamp: 5;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

/* Менше карток у видимій області на вужчих екранах — завжди ціле число */
@media (max-width: 1200px) {
	.reviews-strip {
		grid-auto-columns: calc((100% - 2 * 14px) / 3);
	}
}

@media (max-width: 860px) {
	.reviews-strip {
		grid-auto-columns: calc((100% - 14px) / 2);
	}
}

@media (max-width: 560px) {
	.reviews-strip {
		/* Одна картка + «хвостик» наступної як підказка, що можна гортати */
		grid-auto-columns: 86%;
	}
}
</style>
