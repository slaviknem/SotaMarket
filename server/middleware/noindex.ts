// Сторож індексації тестових стендів: NUXT_NOINDEX=1 в оточенні процесу (без перезбірки) →
// X-Robots-Tag: noindex, nofollow на всі відповіді, а robots.txt — Disallow: / (server/routes/robots.txt.ts).
// На проді змінної немає — нічого не робить.
export default defineEventHandler((event) => {
	if (useRuntimeConfig(event).noindex) setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow')
})
