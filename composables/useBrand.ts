// Конфіг бренду (brand/site.config.ts): назва, домен, графік, політики, вкладки головної,
// промотовари. Статичні дані збірки — у payload сторінок не потрапляють.
// Ключ сайту, назва й адреса є ще й у runtimeConfig.public (site, siteName, siteUrl) —
// звідти їх читають сервер і наявний код; SITE_URL при цьому береться з оточення.
import brand from '#brand/site.config'
import type { BrandConfig, BrandFeatures } from '~/types/brand'

export const useBrand = () => brand

// Перемикачі розділів: чого в конфігу немає — значення рушія (розділи увімкнено, фільтр «Тип чохла» —
// ні). Через BrandConfig, бо в конфігу без поля features (satisfies лишає вузький тип) звернення до
// нього не пройшло б перевірку типів
const features: BrandFeatures = { reviews: true, caseFilter: false, ...(brand as BrandConfig).features }

export const useFeatures = () => features
