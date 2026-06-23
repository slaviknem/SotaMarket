<template>
	<div class="reviews">
		<!-- Список відгуків -->
		<div v-if="allReviews.length" class="reviews__list">
			<div v-for="review in allReviews" :key="review.id" class="review">
				<div class="review__avatar">{{ initial(review.author) }}</div>
				<div class="review__body">
					<div class="review__head">
						<span class="review__author">{{ review.author }}</span>
						<span v-if="review.date" class="review__date">{{ review.date }}</span>
					</div>
					<p class="review__text">{{ review.text }}</p>
				</div>
			</div>
		</div>

		<p v-else class="text-muted">{{ t('reviews.notReviews') }}</p>

		<!-- Форма нового відгука -->
		<form class="review-form" @submit.prevent="submit">
			<h3>{{ t('reviews.newReview') }}</h3>

			<div class="form-group">
				<label>{{ t('reviews.nameAndSurname') }} <b class="required-star">*</b></label>
				<input v-model="author" class="form-control" type="text" />
			</div>

			<div class="form-group">
				<label>{{ t('reviews.message') }} <b class="required-star">*</b></label>
				<textarea v-model="text" class="form-control" rows="4" />
			</div>

			<button class="btn btn-primary" type="submit" :disabled="sending">
				{{ t('reviews.postReivew') }}
			</button>
		</form>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	reviews: any[]
	// Параметри прив'язки відгука
	productId?: number
	categoryId?: number
	articleId?: number
}>()

const { t } = useI18n()
const config = useRuntimeConfig()
const shopApi = useShopApi()
const { notify } = useNotify()

const author = ref('')
const text = ref('')
const sending = ref(false)

// Нові відгуки показуємо одразу (до модерації)
const localReviews = ref<any[]>([])
const allReviews = computed(() => [...localReviews.value, ...(props.reviews || [])])

const initial = (name: string) => (name || '?').trim().charAt(0).toUpperCase()

async function submit() {
	if (!author.value.trim()) {
		notify('error', t('reviews.fillAuthor'))
		return
	}
	if (!text.value.trim()) {
		notify('error', t('reviews.fillText'))
		return
	}

	sending.value = true
	try {
		await shopApi.sendReview({
			author: author.value.trim(),
			text: text.value.trim(),
			product_id: props.productId || 0,
			category_id: props.categoryId || 0,
			article_id: props.articleId || 0,
			site: config.public.site,
		})

		localReviews.value.unshift({
			id: 'local-' + Date.now(),
			author: author.value.trim(),
			text: text.value.trim(),
		})

		author.value = ''
		text.value = ''
		notify('success', t('quick.quickOrderSendMsg'))
	} catch {
		notify('error', 'Error')
	}
	sending.value = false
}
</script>

<style scoped>
.reviews__list {
	display: flex;
	flex-direction: column;
	gap: 14px;
	margin-bottom: 24px;
}

.review {
	display: flex;
	gap: 14px;
	padding: 16px;
	background: var(--bg-soft);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.review__avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent);
	font-weight: 800;
	font-size: 17px;
	flex-shrink: 0;
}

.review__head {
	display: flex;
	align-items: baseline;
	gap: 10px;
	margin-bottom: 4px;
}

.review__author {
	font-weight: 700;
	font-size: 14px;
}

.review__date {
	font-size: 12px;
	color: var(--text-muted);
}

.review__text {
	margin: 0;
	font-size: 14px;
	color: var(--text-soft);
	white-space: pre-line;
}

.review-form {
	max-width: 560px;
	padding-top: 8px;
}

.review-form h3 {
	font-size: 17px;
}
</style>
