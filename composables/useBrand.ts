// Конфіг бренду (brand/site.config.ts): назва, домен, графік, політики, вкладки головної,
// промотовари. Статичні дані збірки — у payload сторінок не потрапляють.
// Ключ сайту, назва й адреса є ще й у runtimeConfig.public (site, siteName, siteUrl) —
// звідти їх читають сервер і наявний код; SITE_URL при цьому береться з оточення.
import brand from '#brand/site.config'

export const useBrand = () => brand
