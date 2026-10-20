// robots.txt — з шаблону бренду brand/robots.txt: {siteUrl} → адреса сайту з оточення (SITE_URL),
// тож Host і Sitemap завжди вказують на той домен, де крутиться процес.
// Сторож тестових стендів: NUXT_NOINDEX=1 закриває сайт повністю (див. server/middleware/noindex.ts).
// deploy.sh перевіряє підйом процесу саме цим запитом — тому тут нічого не ходить в API.
import template from '#brand/robots.txt'

export default defineEventHandler((event) => {
	const config = useRuntimeConfig(event)
	setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')

	if (config.noindex) return 'User-agent: *\nDisallow: /\n'

	// \r\n → \n: у Windows-копії репозиторію шаблон із CRLF, а віддаємо побайтно як на проді
	return template.replace(/\r\n/g, '\n').replaceAll('{siteUrl}', config.public.siteUrl)
})
