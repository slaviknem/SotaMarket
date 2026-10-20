<template>
	<section class="features">
		<div class="container">
			<div class="features__grid">
				<div class="feature">
					<div class="feature__icon">
						<AppIcon name="truck" :size="26" :stroke-width="1.7" :round="false" />
					</div>
					<div>
						<div class="feature__title">{{ t('index.freeDelivery') }}</div>
						<div class="feature__text">{{ t('index.freeDeliveryFrom', { sum: freeDeliveryFrom }) }}</div>
					</div>
				</div>

				<div class="feature">
					<div class="feature__icon">
						<AppIcon name="card" :size="26" :stroke-width="1.7" />
					</div>
					<div>
						<div class="feature__title">{{ t('index.payNalogka') }}</div>
						<div class="feature__text">{{ t('index.payNalogkaInfo') }}</div>
					</div>
				</div>

				<div class="feature">
					<div class="feature__icon">
						<AppIcon name="gift" :size="26" :stroke-width="1.7" />
					</div>
					<div>
						<div class="feature__title">{{ t('index.discount') }}</div>
						<div class="feature__text">{{ t('index.discountInfo') }}</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { freeDeliveryFrom } = useSiteSettings()
</script>

<style scoped>
.features {
	padding: 22px 0 4px;
}

.features__grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 14px;
}

.feature {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px 18px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	transition: border-color 0.18s;
}

.feature:hover {
	border-color: var(--accent);
}

.feature__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 50px;
	height: 50px;
	border-radius: var(--radius);
	background: var(--accent-soft);
	color: var(--accent);
	flex-shrink: 0;
}

.feature__title {
	font-weight: 700;
	font-size: 14.5px;
}

.feature__text {
	font-size: 13px;
	color: var(--text-muted);
}

@media (max-width: 768px) {
	.features__grid {
		grid-template-columns: 1fr;
		gap: 10px;
	}
}
</style>
