<template>
	<!-- id="reviews" — якір для посилань «до відгуків» (з рейтингу біля H1, з меню,
	     ззовні). Один блок відгуків на сторінку, тож id лишається унікальним. -->
	<section id="reviews" class="reviews">
		<!-- Заголовок секції (опційно) + зведений рейтинг -->
		<header v-if="title || stats.ratedCount" class="reviews__head">
			<h2 v-if="title" class="reviews__title">{{ title }} <span v-if="stats.count" class="reviews__count">({{ stats.count }})</span></h2>

			<div v-if="stats.ratedCount" class="reviews__summary">
				<span class="reviews__avg">{{ stats.avg }}</span>
				<span class="reviews__summary-info">
					<RatingStars :value="stats.avg" :size="18" />
					<span class="reviews__summary-note text-muted">{{ t('reviews.basedOn', { n: stats.ratedCount }) }}</span>
				</span>
			</div>
		</header>

		<div class="reviews__grid">
			<!-- Список відгуків -->
			<div ref="listCol" class="reviews__list-col">
				<div v-if="allReviews.length" class="reviews__list">
					<article
						v-for="(review, idx) in allReviews"
						v-show="idx >= (page - 1) * PER_PAGE && idx < page * PER_PAGE"
						:key="review.id"
						class="review"
					>
						<div class="review__avatar" aria-hidden="true">{{ initial(review.author) }}</div>
						<div class="review__body">
							<div class="review__head">
								<span class="review__author">{{ review.author }}</span>
								<span class="review__meta">
									<RatingStars v-if="Number(review.rating) > 0" :value="Number(review.rating)" :size="14" />
									<time v-if="review.date" class="review__date" :datetime="reviewIsoDate(review.date)">{{ review.date }}</time>
								</span>
							</div>
							<p class="review__text">{{ review.text }}</p>

							<!-- Позначка відгука про індивідуальний друк + вхід у конструктор тієї моделі.
							     У зведеному списку на /printcase це назва моделі (там зібрані відгуки всіх
							     моделей, і без підпису незрозуміло, про що відгук), а серед відгуків самої
							     моделі назва зайва — там важливо лише, що відгук про друк. -->
							<NuxtLink v-if="review.model" :to="url.printcase(review.model.alias)" class="review__model">
								<AppIcon name="printer" :size="13" />
								{{ type === 'printcase' ? review.model.title : t('reviews.printcaseTag') }}
							</NuxtLink>
						</div>
					</article>
				</div>

				<!-- Порожній стан: панель на всю колонку, щоб врівноважити форму праворуч -->
				<div v-else class="reviews__empty">
					<RatingStars :value="0" :size="26" />
					<p class="reviews__empty-text text-muted">{{ t('reviews.notReviews') }}</p>
				</div>

				<!-- Пагінація по сторінках усередині блоку (весь список — у SSR-HTML, SEO) -->
				<AppPagination
					v-if="totalPages > 1"
					:current="page"
					:total-pages="totalPages"
					class="reviews__pagination"
					@change="goToPage"
				/>
			</div>

			<!-- Форма нового відгука -->
			<form class="review-form card" @submit.prevent="submit">
				<div class="card-body">
					<h3 class="review-form__title">{{ t('reviews.newReview') }}</h3>

					<div class="form-group">
						<div class="star-input" role="radiogroup" @mouseleave="hoverRating = 0">
							<button
								v-for="i in 5"
								:key="i"
								type="button"
								class="star-input__btn"
								:class="{ 'is-on': i <= (hoverRating || rating) }"
								:aria-label="`${i}/5`"
								@mouseenter="hoverRating = i"
								@click="rating = rating === i ? 0 : i"
							>
								<AppIcon name="star" :size="27" :filled="i <= (hoverRating || rating)" :stroke-width="1.6" />
							</button>
							<span v-if="rating" class="star-input__val">{{ rating }}/5</span>
						</div>
					</div>

					<div class="review-form__row">
						<div class="form-group">
							<label for="review-author">{{ t('reviews.name') }} <b class="required-star">*</b></label>
							<input id="review-author" v-model="author" class="form-control" type="text" :maxlength="60" />
						</div>

						<div class="form-group">
							<label for="review-email">{{ t('reviews.email') }}</label>
							<input id="review-email" v-model="email" class="form-control" type="email" :maxlength="100" />
						</div>
					</div>

					<div class="form-group">
						<label for="review-text">{{ t('reviews.message') }} <b class="required-star">*</b></label>
						<textarea id="review-text" v-model="text" class="form-control" rows="4" :maxlength="500" />
					</div>

					<button class="btn btn-primary" type="submit" :disabled="sending">
						{{ t('reviews.postReivew') }}
					</button>
				</div>
			</form>
		</div>
	</section>
</template>

<script setup lang="ts">
const props = defineProps<{
	reviews: any[]
	// Прив'язка відгука: товар / категорія (модель, фільтр) / стаття (інфо-сторінки, блог) /
	// printcase (конструктор чохлів — окремий тип, прив'язка до моделі через category_id)
	type: 'product' | 'category' | 'article' | 'printcase'
	// id об'єкта; для конструктора на хабі /printcase моделі немає — тоді 0
	targetId: number
	// Заголовок секції (h2); без нього — лише список + форма (напр. у табі товару)
	title?: string
	// Шлях сторінки для запису у відгук. Потрібен там, де адресу переписує history.replaceState
	// (конструктор при виборі моделі) — route.path там лишається старим. Інакше — поточний роут.
	pageUrl?: string
}>()

const { t } = useI18n()
const config = useRuntimeConfig()
const route = useRoute()
const shopApi = useShopApi()
const url = useUrl()
const { notify } = useNotify()

const author = ref('')
const email = ref('')
const text = ref('')
const rating = ref(0)
const hoverRating = ref(0)
const sending = ref(false)

// Нові відгуки показуємо одразу (до модерації)
const localReviews = ref<any[]>([])
const allReviews = computed(() => [...localReviews.value, ...(props.reviews || [])])

// Зведений рейтинг рахуємо лише з підтверджених (з API) відгуків
const stats = computed(() => reviewsStats(props.reviews))

// Пагінація всередині блоку; приховані v-show — увесь список є у SSR-HTML (SEO)
const PER_PAGE = 6
const page = ref(1)
const totalPages = computed(() => Math.ceil(allReviews.value.length / PER_PAGE))
const listCol = ref<HTMLElement | null>(null)

// Зміна об'єкта (вибір іншої моделі в конструкторі — без навігації, компонент лишається
// той самий) скидає і локальні відгуки, і сторінку: чужий відгук у новому списку не місце
watch(
	() => `${props.type}-${props.targetId}`,
	() => {
		localReviews.value = []
		page.value = 1
	}
)

function goToPage(p: number) {
	page.value = p
	// Скролимо до початку списку (без стрибка на верх сторінки)
	listCol.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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
			rating: rating.value,
			type: props.type,
			product_id: props.type === 'product' ? props.targetId : 0,
			// printcase прив'язується до моделі тією ж колонкою, що й категорія
			category_id: props.type === 'category' || props.type === 'printcase' ? props.targetId : 0,
			article_id: props.type === 'article' ? props.targetId : 0,
			email: email.value.trim(),
			provider: 'site',
			avatar: '',
			// Реальна адреса сторінки (з мовним префіксом, фільтром, моделлю конструктора) —
			// в адмінці це клікабельне посилання, і зібрати її з типу+id бекенд не може
			url: url.absolute(props.pageUrl || route.path),
			site: config.public.site,
		})

		localReviews.value.unshift({
			id: 'local-' + Date.now(),
			author: author.value.trim(),
			text: text.value.trim(),
			rating: rating.value,
			date: new Date().toLocaleDateString('uk-UA'),
		})
		// Новий відгук — на початку списку, показуємо 1-шу сторінку
		page.value = 1

		author.value = ''
		email.value = ''
		text.value = ''
		rating.value = 0
		notify('success', t('reviews.sentMsg'))
	} catch {
		notify('error', 'Error')
	}
	sending.value = false
}
</script>

<style scoped>
/* Якір #reviews: не ховаємо заголовок під прибитою шапкою при переході за посиланням */
.reviews {
	scroll-margin-top: calc(var(--header-stuck-h) + 10px);
}

.reviews__head {
	display: flex;
	align-items: center;
	gap: 20px;
	flex-wrap: wrap;
	margin-bottom: 18px;
}

.reviews__title {
	margin: 0;
	font-size: 21px;
	font-weight: 800;
	letter-spacing: -0.02em;
}

.reviews__count {
	color: var(--text-muted);
	font-weight: 600;
}

/* Зведений рейтинг: велика оцінка + зірки + к-сть */
.reviews__summary {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 16px;
	background: var(--bg-soft);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.reviews__avg {
	font-size: 28px;
	font-weight: 800;
	color: var(--warning);
	line-height: 1;
}

.reviews__summary-info {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.reviews__summary-note {
	font-size: 12px;
}

/* Список зліва + форма справа (на широких екранах).
   stretch — колонки тягнуться на висоту вищої (форми), тож ліва не «висить» коротшою */
.reviews__grid {
	display: grid;
	grid-template-columns: 1fr 440px;
	gap: 24px;
	align-items: stretch;
}

.reviews__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.reviews__empty {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 14px;
	min-height: 240px;
	padding: 36px 20px;
	border: 1px dashed var(--border-light);
	border-radius: var(--radius);
	text-align: center;
}

.reviews__empty .stars {
	opacity: 0.55;
}

.reviews__empty-text {
	margin: 0;
	max-width: 380px;
	font-size: 14px;
}

/* Flex-колонка: заглушка порожнього стану заповнює всю розтягнуту висоту (flex:1).
   scroll-margin-top: не ховаємо початок списку під прибитою шапкою при пагінації */
.reviews__list-col {
	display: flex;
	flex-direction: column;
	scroll-margin-top: calc(var(--header-stuck-h) + 10px);
}

.reviews__pagination {
	margin-top: 18px;
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

/* flex:1 — тіло займає всю ширину картки, тож дата/зірки притискаються до її правого краю */
.review__body {
	flex: 1;
	min-width: 0;
}

.review__head {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	margin-bottom: 5px;
}

.review__author {
	font-weight: 700;
	font-size: 14px;
}

/* Зірки + дата притиснуті до правого краю картки */
.review__meta {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-left: auto;
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
	overflow-wrap: anywhere;
}

/* Підпис моделі під відгуком (зведений список конструктора на хабі) */
.review__model {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	margin-top: 8px;
	font-size: 12px;
	font-weight: 600;
	color: var(--text-muted);
}

.review__model:hover {
	color: var(--accent);
}

/* Форма: картка, липне під шапкою поки скролиться список */
.review-form {
	position: sticky;
	top: calc(var(--header-stuck-h) + 10px);
	/* Не даємо колонці stretch розтягнути картку — інакше sticky нема куди рухатись */
	align-self: start;
}

.review-form__title {
	margin: 0 0 14px;
	font-size: 16px;
}

/* Ім'я + Email в один рядок */
.review-form__row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14px;
}

/* Інтерактивні зірки у формі */
.star-input {
	display: flex;
	align-items: center;
	gap: 2px;
}

.star-input__btn {
	display: flex;
	padding: 2px;
	color: var(--text-muted);
	transition: color 0.12s, transform 0.12s;
}

.star-input__btn:hover {
	transform: scale(1.12);
}

.star-input__btn.is-on {
	color: var(--warning);
}

.star-input__val {
	margin-left: 8px;
	font-size: 13px;
	font-weight: 700;
	color: var(--warning);
}

@media (max-width: 900px) {
	.reviews__grid {
		grid-template-columns: 1fr;
	}

	/* В одну колонку заглушка не мусить тягнутися на висоту форми */
	.reviews__empty {
		min-height: 0;
		padding: 24px 20px;
	}

	/* Стовпчиком: форма займає всю ширину (без обмеження max-width) і не «липне» */
	.review-form {
		position: static;
		max-width: none;
	}
}

/* На вузьких телефонах Ім'я + Email — одне під одним */
@media (max-width: 480px) {
	.review-form__row {
		grid-template-columns: 1fr;
		gap: 0;
	}
}
</style>
