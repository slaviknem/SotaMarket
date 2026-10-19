<template>
	<Transition name="lang-banner">
		<!-- div, а не aside: роль dialog для <aside> заборонена ARIA (Lighthouse: aria-allowed-role) -->
		<div v-if="show" class="lang-banner" role="dialog" :aria-label="t('langBanner.title')">
			<p class="lang-banner__title">
				<AppIcon name="globe" :size="20" class="lang-banner__icon" />
				{{ t('langBanner.title') }}
			</p>

			<div class="lang-banner__actions">
				<button type="button" class="btn btn-primary" @click="switchToUk">
					{{ t('langBanner.switch') }}
				</button>
				<button type="button" class="btn btn-secondary" @click="stay">
					{{ t('langBanner.stay') }}
				</button>
			</div>

			<button type="button" class="lang-banner__close" :aria-label="t('other.close')" @click="stay">
				<AppIcon name="close" :size="15" />
			</button>
		</div>
	</Transition>
</template>

<script setup lang="ts">
// Разова підказка про українську версію.
// Монтується лениво з app.vue і тільки на клієнті — у SSR-HTML її немає,
// тож вона не додає тексту сторінці й не впливає на індексацію.
const { t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const { needsPrompt, remember } = useLocalePref()

const visible = ref(false)
// needsPrompt у показі — щоб банер сам зник, якщо мову перемкнули в шапці
const show = computed(() => visible.value && needsPrompt.value)

onMounted(() => {
	visible.value = true
})

async function switchToUk() {
	remember('uk')
	await navigateTo(switchLocalePath('uk'))
}

// «Ні» — теж вибір (лишаємось на російській): більше не питаємо
function stay() {
	remember('ru')
}
</script>

<style scoped>
/* Праворуч угорі, під прибитою шапкою — на видноті, але не поверх логотипа й пошуку */
.lang-banner {
	position: fixed;
	top: calc(var(--header-stuck-h) + 12px);
	right: 16px;
	z-index: var(--z-lang-banner);
	width: calc(100% - 32px);
	max-width: 330px;
	padding: 18px 20px 20px;
	border: 1px solid var(--border-light);
	border-radius: var(--radius-lg);
	background: var(--bg-elevated);
	box-shadow: var(--shadow-pop);
	text-align: center;
	/* Одразу після появи двічі «пульсуємо» — щоб вікно точно потрапило в поле уваги.
	   Затримка більша за тривалість входу, тож із пружинкою не конфліктує. */
	animation: lang-banner-pop 0.55s ease-in-out 0.6s 2;
}

@keyframes lang-banner-pop {
	0%,
	100% {
		transform: scale(1);
	}
	35% {
		transform: scale(1.05);
	}
	70% {
		transform: scale(0.985);
	}
}

/* М'яке «дихання» акцентної рамки — привертає увагу, не смикаючи макет.
   Анімуємо лише opacity псевдоелемента (композитний шар, без перерахунку сторінки). */
.lang-banner::before {
	content: '';
	position: absolute;
	inset: -1px;
	border: 1px solid var(--accent);
	border-radius: inherit;
	box-shadow: 0 0 0 4px var(--accent-soft);
	opacity: 0;
	pointer-events: none;
	animation: lang-banner-glow 2.8s ease-in-out infinite;
}

@keyframes lang-banner-glow {
	0%,
	70%,
	100% {
		opacity: 0;
	}
	35% {
		opacity: 1;
	}
}

.lang-banner__close {
	position: absolute;
	top: 7px;
	right: 7px;
	display: flex;
	padding: 6px;
	border-radius: var(--radius-sm);
	color: var(--text-muted);
	transition: color 0.15s, background 0.15s;
}

.lang-banner__close:hover {
	color: var(--text);
	background: var(--bg-card);
}

.lang-banner__icon {
	vertical-align: -4px;
	margin-right: 6px;
	color: var(--accent);
}

.lang-banner__title {
	margin: 0 0 16px;
	font-size: 17px;
	font-weight: 700;
	line-height: 1.3;
	color: var(--text);
}

.lang-banner__actions {
	display: flex;
	gap: 10px;
}

.lang-banner__actions .btn {
	flex: 1;
}

/* Виразна поява з пружинкою: вилітає з-під шапки й «перестрибує» кінцеву точку —
   такий рух ловиться боковим зором, навіть коли людина вже читає сторінку */
.lang-banner-enter-active {
	transition: opacity 0.35s ease, transform 0.55s cubic-bezier(0.22, 1.65, 0.46, 1);
}

.lang-banner-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.lang-banner-enter-from {
	opacity: 0;
	transform: translateY(-34px) scale(0.85);
}

.lang-banner-leave-to {
	opacity: 0;
	transform: translateY(-8px) scale(0.98);
}

@media (max-width: 480px) {
	.lang-banner {
		right: 12px;
		width: calc(100% - 24px);
		max-width: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.lang-banner-enter-active,
	.lang-banner-leave-active {
		transition: none;
	}

	.lang-banner,
	.lang-banner::before {
		animation: none;
	}
}
</style>
