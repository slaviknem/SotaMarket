<template>
	<footer class="footer">
		<div class="container">
			<div class="footer__grid">
				<!-- Про магазин -->
				<div class="footer__col footer__col--about">
					<NuxtLink :to="localePath('/')" class="footer__logo" :aria-label="brand.name">
						<AppLogo />
					</NuxtLink>
					<p class="footer__about-text">{{ t('footer.weAre') }}</p>

					<ul class="footer__contacts">
						<li>
							<AppIcon name="map-pin-solid" :size="15" />
							{{ contacts.address }}
						</li>
						<li v-for="phone in phones" :key="phone">
							<AppIcon name="phone" :size="15" />
							<a :href="telHref(phone)">{{ phone }}</a>
						</li>
						<li>
							<AppIcon name="mail-solid" :size="15" />
							<a :href="`mailto:${contacts.email}`">{{ contacts.email }}</a>
						</li>
					</ul>
				</div>

				<!-- Інформація -->
				<div class="footer__col">
					<div class="footer__title">{{ t('footer.information') }}</div>
					<ul class="footer__links">
						<li v-for="link in footerInfoLinks" :key="link.to"><NuxtLink :to="link.to">{{ link.label }}</NuxtLink></li>
					</ul>
				</div>

				<!-- Покупцям -->
				<div class="footer__col">
					<div class="footer__title">{{ t('footer.buyers') }}</div>
					<ul class="footer__links">
						<li v-for="link in buyerLinks" :key="link.to"><NuxtLink :to="link.to">{{ link.label }}</NuxtLink></li>
					</ul>
				</div>

				<!-- Графік + соцмережі -->
				<div class="footer__col footer__col--last">
					<div class="footer__schedule-block">
						<div class="footer__title">{{ t('footer.schedule') }}</div>
						<ul class="footer__schedule">
							<li v-for="row in schedule" :key="row.days"><span>{{ t(`footer.${row.days}`) }}:</span> {{ row.time ?? t('footer.dayOff') }}</li>
						</ul>
					</div>

					<div v-if="socialLinks.length" class="footer__social">
						<div class="footer__title">{{ t('footer.social') }}</div>
						<SocialLinks :size="18" />
					</div>
				</div>
			</div>

			<div class="footer__bottom">
				<span>© {{ new Date().getFullYear() }} {{ brand.domain }} — {{ t('footer.allRights') }}</span>
			</div>
		</div>
	</footer>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const brand = useBrand()
const { contacts, phones, schedule, socialLinks } = useSiteSettings()
const { footerInfoLinks, buyerLinks } = useSiteMenus()
</script>

<style scoped>
/* Футер — на --bg-deep: текст, роздільники й лого — токени --on-deep*, --border-deep, --logo-on-deep
   (у світлій темі смуга темна, і звичайні --text* на ній не читаються) */
.footer {
	margin-top: 40px;
	background: var(--bg-deep);
	border-top: 1px solid var(--border);
}

.footer__grid {
	display: grid;
	grid-template-columns: 1.6fr 1fr 1fr 1.1fr;
	gap: 36px;
	padding: 44px 0 30px;
}

.footer__logo {
	display: inline-block;
}

.footer__logo :deep(.app-logo) {
	height: 32px;
	color: var(--logo-on-deep);
}

.footer__about-text {
	margin-top: 10px;
	color: var(--on-deep-muted);
	font-size: 13.5px;
	max-width: 320px;
}

.footer__contacts {
	margin: 14px 0 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 8px;
	font-size: 13.5px;
	color: var(--on-deep-soft);
}

.footer__contacts li {
	display: flex;
	align-items: center;
	gap: 9px;
}

.footer__contacts svg {
	color: var(--accent);
	flex-shrink: 0;
}

.footer__contacts a:hover {
	color: var(--on-deep-hover);
}

.footer__title {
	font-size: 14px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: 14px;
	color: var(--on-deep);
}

.footer__links {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.footer__links a {
	color: var(--on-deep-muted);
	font-size: 13.5px;
	transition: color 0.15s;
}

.footer__links a:hover {
	color: var(--on-deep-hover);
}

.footer__schedule {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 8px;
	font-size: 13.5px;
	color: var(--on-deep-soft);
}

.footer__schedule span {
	color: var(--on-deep-muted);
}

.footer__bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	flex-wrap: wrap;
	padding: 18px 0;
	border-top: 1px solid var(--border-deep);
	color: var(--on-deep-muted);
	font-size: 13px;
}

.footer__social {
	margin-top: 28px;
}

@media (max-width: 900px) {
	.footer__grid {
		grid-template-columns: 1fr 1fr;
		gap: 26px;
	}
}

@media (max-width: 560px) {
	/* Лишаємо 2 стовпчики, щоб футер не був надто довгим */
	.footer__grid {
		grid-template-columns: 1fr 1fr;
		gap: 24px 18px;
		padding: 30px 0 24px;
	}

	/* Бренд + контакти — на всю ширину, по центру; знизу тонкий розділювач */
	.footer__col--about {
		grid-column: 1 / -1;
		text-align: center;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--border-deep);
	}

	.footer__about-text {
		max-width: none;
		margin-left: auto;
		margin-right: auto;
	}

	/* Контакти центруємо рядками (іконка + текст лишаються компактним блоком) */
	.footer__contacts {
		align-items: center;
	}

	/* Графік + соцмережі — на всю ширину двома колонками (графік ліворуч, соцмережі праворуч);
	   зверху тонкий розділювач, симетричний до блоку бренду */
	.footer__col--last {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px 18px;
		align-items: start;
		padding-top: 24px;
		border-top: 1px solid var(--border-deep);
	}

	.footer__social {
		margin-top: 0;
	}
}
</style>
