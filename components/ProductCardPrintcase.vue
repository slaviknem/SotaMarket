<template>
	<article class="p-card pc-card">
		<div class="p-card__media">
			<NuxtLink :to="url.printcase(category.alias)" class="p-card__img-link">
				<img
					src="/images/printcase/printcase_product.jpg"
					:alt="title"
					:title="title"
					loading="lazy"
					width="280"
					height="280"
				/>
			</NuxtLink>

			<div class="p-card__badges">
				<span class="badge pc-card__badge">{{ t('printcase.card.printcase') }}</span>
			</div>
		</div>

		<div class="p-card__body">
			<NuxtLink :to="url.printcase(category.alias)" class="p-card__title">
				{{ title }}
			</NuxtLink>

			<div class="p-card__bottom">
				<div class="p-card__prices">
					<span class="p-card__price-old">{{ formatPrice(config.public.printcasePriceOld) }}</span>
					<span class="p-card__price">{{ formatPrice(config.public.printcasePrice) }}</span>
				</div>

				<NuxtLink :to="url.printcase(category.alias)" class="pc-card__go" :title="title">
					<AppIcon name="edit" :size="18" />
				</NuxtLink>
			</div>
		</div>
	</article>
</template>

<script setup lang="ts">
const props = defineProps<{ category: any }>()

const { t } = useI18n()
const url = useUrl()
const config = useRuntimeConfig()

const title = computed(() =>
	t('printcase.card.titleProduct', { model: props.category.title_full || props.category.title })
)
</script>

<style scoped>
/* База .p-card — у assets/css/main.css. Тут лише «преміум» оформлення картки конструктора */
.p-card {
	border-color: var(--accent);
	box-shadow: 0 0 0 1px var(--accent-soft), 0 4px 18px rgba(255, 122, 0, 0.07);
}

.p-card:hover {
	box-shadow: 0 6px 26px rgba(255, 122, 0, 0.18);
}

.pc-card__badge {
	background: var(--accent);
	color: var(--on-accent);
}

/* Назва товару-конструктора яскравіша за звичайну картку */
.p-card__title {
	font-weight: 600;
	color: var(--text);
}

.p-card__bottom {
	margin-top: auto;
	padding-top: 10px;
}

.pc-card__go {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 12px;
	background: var(--accent);
	color: var(--on-accent);
	transition: all 0.15s;
	flex-shrink: 0;
}

.pc-card__go:hover {
	background: var(--accent-hover);
}
</style>
