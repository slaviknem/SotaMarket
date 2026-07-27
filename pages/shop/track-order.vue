<template>
	<div class="container">
		<Breadcrumbs :items="[{ title: t('header.topbar.trackOrder') }]" />

		<div class="side-layout">
			<!-- Меню інфо-сторінок зліва (на мобільному ховається — є в шапці) -->
			<aside class="side-layout__aside">
				<div class="side-layout__aside-panel">
					<BlocksSideMenu :menu="infoMenu" />
				</div>
			</aside>

			<div class="side-layout__content track">
				<h1>{{ t('header.topbar.trackOrder') }}</h1>
				<p class="text-muted">{{ t('trackOrder.message') }}</p>

				<form class="track__form" @submit.prevent="track">
					<input
						v-model="query"
						class="form-control"
						type="text"
						:placeholder="t('trackOrder.placeholder')"
					/>
					<button class="btn btn-primary" type="submit" :disabled="pending">
						{{ pending ? t('trackOrder.checking') : t('trackOrder.track') }}
					</button>
				</form>

				<!-- Замовлення знайдено: статус + ТТН + посилання на перевізника -->
				<div v-if="result?.found" class="card track__result">
					<div class="card-body">
						<div class="track__row">
							<span class="text-muted">{{ t('trackOrder.orderNumber') }}</span>
							<b>№{{ result?.order_number }}</b>
						</div>
						<div class="track__row">
							<span class="text-muted">{{ t('trackOrder.status') }}</span>
							<span class="badge badge-hit">{{ statusLabel }}</span>
						</div>
						<div v-if="result?.created" class="track__row">
							<span class="text-muted">{{ t('trackOrder.date') }}</span>
							<span>{{ result.created }}</span>
						</div>
						<div v-if="result?.track" class="track__row">
							<span class="text-muted">{{ t('trackOrder.ttn') }}</span>
							<!-- ТТН — посилання на відстеження у перевізника (НП / Укрпошта / Розетка) -->
							<a
								v-if="result.tracking_url"
								class="track__ttn"
								:href="result.tracking_url"
								target="_blank"
								rel="noopener"
								:title="t('trackOrder.openCarrier')"
							>
								{{ result.track }}
								<AppIcon name="truck" :size="16" />
							</a>
							<b v-else>{{ result.track }}</b>
						</div>
						<a
							v-if="result?.tracking_url"
							class="btn btn-outline btn-sm track__link"
							:href="result?.tracking_url"
							target="_blank"
							rel="noopener"
						>
							<AppIcon name="truck" :size="18" />
							{{ t('trackOrder.openCarrier') }}
						</a>
					</div>
				</div>

				<!-- Замовлення не наше, але ТТН розпізнана — ведемо на сайт перевізника -->
				<div v-else-if="result?.tracking_url" class="card track__result">
					<div class="card-body">
						<p class="text-muted">{{ t('trackOrder.carrierOnly') }}</p>
						<a
							class="btn btn-outline btn-sm track__link"
							:href="result?.tracking_url"
							target="_blank"
							rel="noopener"
						>
							<AppIcon name="truck" :size="18" />
							{{ t('trackOrder.openCarrier') }}
						</a>
					</div>
				</div>

				<p v-else-if="result" class="track__result text-muted">{{ t('trackOrder.notFound') }}</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ITrackOrder } from '~/composables/useShopApi'

const { t, te } = useI18n()
const { infoMenu } = useSiteMenus()
const { trackOrder } = useShopApi()

usePageSeo({ title: () => t('header.topbar.trackOrder'), noindex: true })

const query = ref('')
const pending = ref(false)
const result = ref<ITrackOrder | null>(null)

// Статус перекладаємо за alias; невідомий — показуємо назву з бекенда
const statusLabel = computed(() => {
	const code = result.value?.status_code
	const key = `trackOrder.statuses.${code}`
	return code && te(key) ? t(key) : result.value?.status || ''
})

// Бекенд сам розпізнає, що ввели: номер замовлення, телефон чи ТТН
async function track() {
	const q = query.value.trim()
	if (!q || pending.value) return

	pending.value = true
	result.value = await trackOrder(q).catch(() => ({ found: false }))
	pending.value = false

	// Чужа ТТН (замовлення не в нашій базі) — одразу відкриваємо сайт перевізника
	if (result.value && !result.value.found && result.value.tracking_url) {
		window.open(result.value.tracking_url, '_blank', 'noopener')
	}
}
</script>

<style scoped>
.track {
	max-width: 520px;
	padding: 10px 0 70px;
}

.track__form {
	display: flex;
	gap: 10px;
	margin-top: 18px;
}

.track__result {
	margin-top: 20px;
}

.track__row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 14px;
	padding: 8px 0;
	border-bottom: 1px solid var(--border);
}

.track__row:last-of-type {
	border-bottom: 0;
}

.track__ttn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-weight: 700;
	color: var(--accent);
}

.track__ttn:hover {
	color: var(--accent-hover);
	text-decoration: underline;
}

.track__link {
	margin-top: 14px;
}
</style>
