/**
 * Генерація дефолтного прев'ю для соцмереж — brand/public/images/og-default.jpg (1200×630).
 * Запуск: node scripts/gen-og.mjs (портативний Node 22 з .node/)
 *         OUT=<тека> node scripts/gen-og.mjs — записати в іншу теку (для порівняння)
 *
 * Використовується як фолбек og:image у usePageSeo для сторінок без власної картинки
 * (головна, категорії, фільтри, блог, інфо-сторінки). Без нього посилання на ці адреси
 * летіли в Viber/Telegram/Facebook голим текстом.
 *
 * Тексту мовою навмисно немає: картинка одна на дві локалі, тож лишаємо лого + домен —
 * так вона не потребує перегенерації при змінах контенту. Лого, кольори й домен — з brand/.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { BRAND_DIR, readTheme, loadBrandConfig } from './lib/brand.mjs'

const W = 1200
const H = 630

const { bg: BG, accent: ACCENT, logo: LOGO_COLOR } = readTheme()
const { domain } = await loadBrandConfig()

// Лого — brand/public/images/logo.svg: контури й viewBox (ширина × висота)
const LOGO_SVG = readFileSync(join(BRAND_DIR, 'public', 'images', 'logo.svg'), 'utf8')
const [, , VB_W, VB_H] = LOGO_SVG.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
const LOGO_INNER = LOGO_SVG.replace(/^[\s\S]*?<svg\b[^>]*>|<\/svg>[\s\S]*$/g, '').trim()

const LOGO_W = 560
const LOGO_H = Math.round((LOGO_W * VB_H) / VB_W)

// Суцільний фон без градієнтів: у прев'ю месенджерів картку часто стискають до
// кількох сотень пікселів, і плавні переходи там перетворюються на смугастий шум
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
	<rect width="${W}" height="${H}" fill="${BG}"/>

	<g transform="translate(${(W - LOGO_W) / 2}, ${H / 2 - LOGO_H - 26}) scale(${LOGO_W / VB_W})" fill="${LOGO_COLOR}">
		${LOGO_INNER}
	</g>

	<rect x="${W / 2 - 60}" y="${H / 2 + 26}" width="120" height="3" rx="1.5" fill="${ACCENT}" opacity="0.55"/>

	<text x="${W / 2}" y="${H / 2 + 96}" fill="${ACCENT}" font-family="Arial, Helvetica, sans-serif"
		font-size="38" font-weight="600" letter-spacing="6" text-anchor="middle">${domain}</text>
</svg>`

const dir = process.env.OUT || join(BRAND_DIR, 'public', 'images')
mkdirSync(dir, { recursive: true })
const out = join(dir, 'og-default.jpg')

// JPEG, а не WebP: Facebook/Viber досі надійніше показують саме його в прев'ю
const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 88, progressive: true }).toBuffer()
writeFileSync(out, buf)

console.log(`og-default.jpg — ${W}×${H}, ${Math.round(buf.length / 1024)} КБ → ${out}`)
