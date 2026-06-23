<template>
	<section class="features">
		<div class="container">
			<div class="features__grid">
				<div class="feature">
					<div class="feature__icon">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/></svg>
					</div>
					<div>
						<div class="feature__title">{{ t('index.freeDelivery') }}</div>
						<div class="feature__text">{{ t('index.freeDeliveryFrom') }}</div>
					</div>
				</div>

				<div class="feature">
					<div class="feature__icon">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
					</div>
					<div>
						<div class="feature__title">{{ t('index.payNalogka') }}</div>
						<div class="feature__text">{{ t('index.payNalogkaInfo') }}</div>
					</div>
				</div>

				<div class="feature">
					<div class="feature__icon">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7s-1.5-4-5-4c-2 0-3 1.3-3 2.5C4 7 7 7 12 7zM12 7s1.5-4 5-4c2 0 3 1.3 3 2.5C20 7 17 7 12 7z"/></svg>
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
	border-radius: 14px;
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
