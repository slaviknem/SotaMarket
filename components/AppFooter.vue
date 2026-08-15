<template>
	<footer class="footer">
		<div class="container">
			<div class="footer__grid">
				<!-- Про магазин -->
				<div class="footer__col footer__col--about">
					<NuxtLink :to="localePath('/')" class="footer__logo" aria-label="FLOY">
						<LogoFloy />
					</NuxtLink>
					<p class="footer__about-text">{{ t('footer.weAre') }}</p>

					<ul class="footer__contacts">
						<li>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
							{{ contacts.address }}
						</li>
						<li v-for="phone in phones" :key="phone">
							<AppIcon name="phone" :size="15" />
							<a :href="`tel:+38${phone.replace(/\D/g, '')}`">{{ phone }}</a>
						</li>
						<li>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
							<a :href="`mailto:${contacts.email}`">{{ contacts.email }}</a>
						</li>
					</ul>
				</div>

				<!-- Інформація -->
				<div class="footer__col">
					<div class="footer__title">{{ t('footer.information') }}</div>
					<ul class="footer__links">
						<li><NuxtLink :to="localePath('/about')">{{ t('header.topbar.about') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/dostavka')">{{ t('header.topbar.dostavka') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/povernennya')">{{ t('header.topbar.povernennya') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/otzyvy-klientov')">{{ t('header.topbar.otzyvy') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/article')">{{ t('header.topbar.blog') }}</NuxtLink></li>
					</ul>
				</div>

				<!-- Покупцям -->
				<div class="footer__col">
					<div class="footer__title">{{ t('footer.buyers') }}</div>
					<ul class="footer__links">
						<li><NuxtLink :to="localePath('/shop/cart')">{{ t('cart.cart') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/shop/wishlist')">{{ t('other.wishlist') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/shop/compare')">{{ t('other.comparison') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/shop/track-order')">{{ t('header.topbar.trackOrder') }}</NuxtLink></li>
						<li><NuxtLink :to="localePath('/printcase')">{{ t('printcase.constructor') }}</NuxtLink></li>
					</ul>
				</div>

				<!-- Графік + соцмережі -->
				<div class="footer__col footer__col--last">
					<div class="footer__schedule-block">
						<div class="footer__title">{{ t('footer.schedule') }}</div>
						<ul class="footer__schedule">
							<li><span>{{ t('footer.monSat') }}:</span> 9:00 – 18:00</li>
							<li><span>{{ t('footer.sunday') }}:</span> {{ t('footer.dayOff') }}</li>
						</ul>
					</div>

					<div class="footer__social">
						<div class="footer__title">{{ t('footer.social') }}</div>
						<SocialLinks :size="18" />
					</div>
				</div>
			</div>

			<div class="footer__bottom">
				<span>© {{ new Date().getFullYear() }} floy.com.ua — {{ t('footer.allRights') }}</span>
			</div>
		</div>
	</footer>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { contacts, phones } = useSiteSettings()
</script>

<style scoped>
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

.footer__logo :deep(.logo-floy) {
	height: 32px;
}

.footer__about-text {
	margin-top: 10px;
	color: var(--text-muted);
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
	color: var(--text-soft);
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
	color: var(--accent);
}

.footer__title {
	font-size: 14px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: 14px;
	color: var(--text);
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
	color: var(--text-muted);
	font-size: 13.5px;
	transition: color 0.15s;
}

.footer__links a:hover {
	color: var(--accent);
}

.footer__schedule {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 8px;
	font-size: 13.5px;
	color: var(--text-soft);
}

.footer__schedule span {
	color: var(--text-muted);
}

.footer__bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	flex-wrap: wrap;
	padding: 18px 0;
	border-top: 1px solid var(--border);
	color: var(--text-muted);
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
		border-bottom: 1px solid var(--border);
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
		border-top: 1px solid var(--border);
	}

	.footer__social {
		margin-top: 0;
	}
}
</style>
