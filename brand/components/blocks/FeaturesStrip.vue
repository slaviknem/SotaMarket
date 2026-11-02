<template>
	<!-- Переваги SotaMARKET (C2 «Чому SotaMARKET»): одна біла панель із чотирма пунктами під першим екраном.
	     Лише факти з налаштувань: поріг безкоштовної доставки, строк доставки (policies), оплата, звірка макета -->
	<section class="perks-block" :aria-label="t('index.eyebrow.perks', { brand: brand.name })">
		<div class="container">
			<ul class="perks">
				<li v-for="p in perks" :key="p.icon" class="perk">
					<span class="perk__icon"><AppIcon :name="p.icon" :size="23" /></span>
					<span class="perk__text">
						<strong class="perk__title">{{ p.title }}</strong>
						<span class="perk__info">{{ p.info }}</span>
					</span>
				</li>
			</ul>
		</div>
	</section>
</template>

<script setup lang="ts">
const { t } = useI18n()
const brand = useBrand()
const { freeDeliveryFrom, policies } = useSiteSettings()

const perks = computed(() => {
	const [from, to] = policies.value.shipping_days
	return [
		{ icon: 'truck', title: t('index.freeDelivery'), info: t('index.freeDeliveryFrom', { sum: freeDeliveryFrom.value }) },
		{ icon: 'clock', title: t('index.perkDays', { from, to }), info: t('index.perkDaysInfo') },
		{ icon: 'card', title: t('index.payNalogka'), info: t('index.payNalogkaInfo') },
		{ icon: 'headset', title: t('index.discount'), info: t('index.discountInfo') },
	]
})
</script>

<style scoped>
.perks-block {
	padding-top: 24px;
}

.perks {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 22px;
	margin: 0;
	padding: 24px 28px;
	list-style: none;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-lg);
}

.perk {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	min-width: 0;
}

.perk__icon {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	width: 48px;
	height: 48px;
	border-radius: calc(var(--radius-sm) + 3px);
	background: var(--accent-soft);
	color: var(--accent);
}

.perk__text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.perk__title {
	font-size: 16px;
	font-weight: 900;
	line-height: 1.3;
}

.perk__info {
	font-size: 14px;
	color: var(--text-muted);
}

@media (max-width: 1180px) {
	.perks {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 640px) {
	.perks-block {
		padding-top: 16px;
	}

	.perks {
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
		padding: 18px;
	}
}
</style>
