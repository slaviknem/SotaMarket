<template>
	<section class="faq">
		<div class="section-title">
			<h2>{{ title }}</h2>
		</div>

		<div class="faq__list">
			<details v-for="(item, i) in items" :key="i" class="faq__item">
				<summary class="faq__q">
					{{ item.q }}
					<AppIcon name="chevron-down" :size="16" class="faq__chevron" />
				</summary>
				<div class="faq__a">
					<p>{{ item.a }}</p>
					<!-- Crawlable-посилання після відповіді (топ товарів, конструктор тощо) -->
					<ul v-if="item.links?.length" class="faq__links">
						<li v-for="l in item.links" :key="l.to">
							<NuxtLink :to="l.to">{{ l.title }}</NuxtLink>
							<span v-if="l.price" class="faq__links-price">{{ formatPrice(l.price) }}</span>
						</li>
					</ul>
				</div>
			</details>
		</div>
	</section>
</template>

<script setup lang="ts">
// Презентаційний FAQ-акордеон: нативний <details>/<summary> (SSR, без клієнтського JS)
// + FAQPage JSON-LD, що дзеркалить видимий текст. Питання формує батьківський компонент.
export interface IFaqLink {
	title: string
	to: string
	price?: number
}

export interface IFaqItem {
	q: string
	a: string
	links?: IFaqLink[]
}

const props = defineProps<{
	title: string
	items: IFaqItem[]
}>()

useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	mainEntity: props.items.map((item) => ({
		'@type': 'Question',
		name: item.q,
		acceptedAnswer: {
			'@type': 'Answer',
			text: item.links?.length
				? `${item.a} ${item.links.map((l) => (l.price ? `${l.title} — ${formatPrice(l.price)}` : l.title)).join('; ')}.`
				: item.a,
		},
	})),
}))
</script>

<style scoped>
.faq {
	margin-top: 34px;
	padding-top: 22px;
	border-top: 1px solid var(--border);
}

.faq__list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.faq__item {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
}

.faq__q {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 13px 16px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	list-style: none;
	user-select: none;
}

.faq__q::-webkit-details-marker {
	display: none;
}

.faq__chevron {
	margin-left: auto;
	flex-shrink: 0;
	color: var(--text-muted);
	transition: transform 0.18s ease;
}

.faq__item[open] .faq__chevron {
	transform: rotate(180deg);
}

.faq__a {
	padding: 0 16px 14px;
	font-size: 14px;
	line-height: 1.55;
	color: var(--text-soft);
}

.faq__a p {
	margin: 0;
}

.faq__links {
	margin: 8px 0 0;
	padding-left: 18px;
}

.faq__links li {
	margin-top: 4px;
}

.faq__links a {
	color: var(--accent);
}

.faq__links a:hover {
	text-decoration: underline;
}

.faq__links-price {
	margin-left: 6px;
	color: var(--text-muted);
	white-space: nowrap;
}
</style>
