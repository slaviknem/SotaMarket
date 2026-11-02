<template>
	<!-- Футер SotaMARKET (C2, PLAN-SITE-SOTAMARKET §4): найтемніший синій — про магазин, каталог, покупцям,
	     контакти (лише заведені: телефону й пошти в магазину немає — на їхньому місці чат); знизу © і мова -->
	<footer class="footer">
		<div class="container">
			<div class="footer__grid">
				<div class="footer__col footer__col--about">
					<NuxtLink :to="localePath('/')" class="footer__logo" :aria-label="brand.name">
						<AppLogo />
						<span class="footer__tagline" aria-hidden="true">{{ t('header.tagline') }}</span>
					</NuxtLink>
					<p class="footer__about-text">{{ t('footer.weAre') }}</p>
				</div>

				<nav v-if="categories.length" class="footer__col" :aria-label="t('footer.catalog')">
					<div class="footer__title">{{ t('footer.catalog') }}</div>
					<ul class="footer__links">
						<li v-for="cat in categories" :key="cat.url">
							<NuxtLink :to="localePath(cat.url.startsWith('/') ? cat.url : `/${cat.url}`)">{{ cat.title }}</NuxtLink>
						</li>
					</ul>
				</nav>

				<nav class="footer__col" :aria-label="t('footer.buyers')">
					<div class="footer__title">{{ t('footer.buyers') }}</div>
					<ul class="footer__links">
						<li v-for="link in buyerColumn" :key="link.to"><NuxtLink :to="link.to">{{ link.label }}</NuxtLink></li>
					</ul>
				</nav>

				<div class="footer__col">
					<div class="footer__title">{{ t('footer.contacts') }}</div>
					<span v-if="contacts.address">{{ contacts.address }}</span>
					<ul class="footer__schedule">
						<li v-for="row in schedule" :key="row.days">{{ t(`footer.${row.days}`) }}: {{ row.time ?? t('footer.dayOff') }}</li>
					</ul>
					<a v-for="p in phones" :key="p" :href="telHref(p)" class="footer__phone">{{ p }}</a>
					<a v-if="contacts.email" :href="`mailto:${contacts.email}`">{{ contacts.email }}</a>
					<button class="footer__chat" type="button" @click="chatOpen = true">
						<AppIcon name="chat" :size="17" />
						{{ t('header.chat') }}
					</button>
					<SocialLinks v-if="socialLinks.length" class="footer__social" :size="18" />
				</div>
			</div>

			<div class="footer__bottom">
				<span>© {{ new Date().getFullYear() }} {{ brand.name }} — {{ t('footer.allRights') }}</span>
				<LangSwitcher />
			</div>
		</div>
	</footer>
</template>

<script setup lang="ts">
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const brand = useBrand()
const { contacts, phones, schedule, socialLinks } = useSiteSettings()
const { infoLinks, buyerLinks } = useSiteMenus()

// Чат — віджет рушія (ChatWidget) відкривається цим станом (як у шапці)
const chatOpen = useState('chat_open', () => false)

// Категорії — з меню, яке вже завантажив app.vue (кеш useAsyncData 'menu-{мова}'): футер пропсів не має.
// Футер живе між переходами, а ключ залежить від мови — тож тримаємо кеш кожної мови й беремо поточну
const menus = Object.fromEntries(locales.value.map((l: any) => [l.code, useNuxtData<any>('menu-' + l.code).data]))
const categories = computed<{ title: string; url: string }[]>(() => menus[locale.value]?.value?.categories || [])

// «Покупцям»: інфо-сторінки + обране й порівняння (у шапці порівняння немає)
const buyerColumn = computed(() => {
	const extra = [localePath('/shop/wishlist'), localePath('/shop/compare')]
	return [...infoLinks.value, ...buyerLinks.value.filter((l: { to: string }) => extra.includes(l.to))]
})
</script>

<style scoped>
.footer {
	margin-top: 40px;
	background: var(--bg-deepest);
	color: var(--on-deep-muted);
	font-size: 14.5px;
}

.footer__grid {
	display: grid;
	grid-template-columns: 1.4fr 1fr 1fr 1fr;
	gap: 28px 36px;
	padding: 48px 0 28px;
}

.footer__col {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 9px;
	min-width: 0;
}

.footer__logo {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6px;
}

.footer__logo :deep(.app-logo) {
	height: 19px;
	color: var(--logo-on-deep);
}

.footer__tagline {
	font-size: 10.5px;
	font-weight: 800;
	line-height: 1;
	letter-spacing: 0.21em;
	text-transform: uppercase;
}

.footer__about-text {
	max-width: 340px;
	margin: 6px 0 0;
	font-size: 14px;
	line-height: 1.55;
}

.footer__title {
	margin-bottom: 2px;
	font-weight: 900;
	color: var(--on-deep);
}

.footer__links {
	display: flex;
	flex-direction: column;
	gap: 9px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.footer a,
.footer__chat {
	transition: color 0.15s;
}

.footer a:hover,
.footer__chat:hover {
	color: var(--on-deep-hover);
}

.footer__schedule {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.footer__phone,
.footer__chat {
	font-weight: 800;
	color: var(--on-deep);
}

.footer__phone {
	font-size: 18px;
}

.footer__chat {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	margin-top: 4px;
	padding: 0;
	font-size: inherit;
}

.footer__social {
	margin-top: 8px;
}

.footer__bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
	padding: 18px 0 28px;
	border-top: 1px solid var(--border-deep);
	font-size: 13.5px;
}

/* Мова текстом «Укр · Рус», активна — біла жирна (C2) */
.footer__bottom :deep(.lang) {
	gap: 4px;
	padding: 0;
	background: transparent;
}

.footer__bottom :deep(.lang__item) {
	padding: 2px 6px;
	font-size: 13.5px;
	color: var(--on-deep-muted);
}

.footer__bottom :deep(.lang__item:hover) {
	color: var(--on-deep-hover);
}

.footer__bottom :deep(.lang__item.is-active) {
	background: transparent;
	color: var(--on-deep);
	font-weight: 900;
}

@media (max-width: 1023px) {
	.footer__grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

/* Телефон: про магазин і контакти — на всю ширину, каталог і «Покупцям» — двома колонками */
@media (max-width: 560px) {
	.footer {
		margin-top: 30px;
	}

	.footer__grid {
		gap: 24px 16px;
		padding: 28px 0 22px;
	}

	.footer__col--about,
	.footer__col:last-child {
		grid-column: 1 / -1;
	}

	/* Кнопка чату рушія — праворуч унизу: © і мова не ховаються під нею */
	.footer__bottom {
		padding-bottom: 84px;
	}
}
</style>
