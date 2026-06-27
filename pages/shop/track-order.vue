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
						v-model="ttn"
						class="form-control"
						type="text"
						placeholder="20400000000000"
						inputmode="numeric"
					/>
					<button class="btn btn-primary" type="submit">{{ t('trackOrder.track') }}</button>
				</form>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { infoMenu } = useSiteMenus()

usePageSeo({ title: () => t('header.topbar.trackOrder'), noindex: true })

const ttn = ref('')

// Відкриваємо трекінг Нової Пошти з номером ТТН
function track() {
	if (!ttn.value.trim()) return
	window.open(
		'https://tracking.novaposhta.ua/#/uk/parcel/list/' + encodeURIComponent(ttn.value.trim()),
		'_blank'
	)
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
</style>
