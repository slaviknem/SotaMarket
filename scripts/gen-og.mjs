/**
 * Генерація дефолтного прев'ю для соцмереж — public/images/og-default.jpg (1200×630).
 * Запуск: node scripts/gen-og.mjs (портативний Node 22 з .node/)
 *
 * Використовується як фолбек og:image у usePageSeo для сторінок без власної картинки
 * (головна, категорії, фільтри, блог, інфо-сторінки). Без нього посилання на ці адреси
 * летіли в Viber/Telegram/Facebook голим текстом.
 *
 * Тексту мовою навмисно немає: картинка одна на дві локалі, тож лишаємо лого + домен —
 * так вона не потребує перегенерації при змінах контенту.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

const W = 1200
const H = 630

// Ті самі значення, що й токени в assets/css/main.css (--bg, --accent, --on-overlay)
const BG = '#0d0d10'
const ACCENT = '#ff7a00'
const WHITE = '#fff'

// Контур логотипу — з public/images/logo.svg (viewBox 0 0 225 44)
const LOGO_PATH = readFileSync(join(PUBLIC, 'images', 'logo.svg'), 'utf8').match(
	/ d="([^"]+)"/
)[1]

const LOGO_W = 560
const LOGO_H = Math.round((LOGO_W * 44) / 225)

// Суцільний фон без градієнтів: у прев'ю месенджерів картку часто стискають до
// кількох сотень пікселів, і плавні переходи там перетворюються на смугастий шум
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
	<rect width="${W}" height="${H}" fill="${BG}"/>

	<g transform="translate(${(W - LOGO_W) / 2}, ${H / 2 - LOGO_H - 26}) scale(${LOGO_W / 225})">
		<path d="${LOGO_PATH}" fill="${WHITE}"/>
	</g>

	<rect x="${W / 2 - 60}" y="${H / 2 + 26}" width="120" height="3" rx="1.5" fill="${ACCENT}" opacity="0.55"/>

	<text x="${W / 2}" y="${H / 2 + 96}" fill="${ACCENT}" font-family="Arial, Helvetica, sans-serif"
		font-size="38" font-weight="600" letter-spacing="6" text-anchor="middle">floy.com.ua</text>
</svg>`

const out = join(PUBLIC, 'images', 'og-default.jpg')

// JPEG, а не WebP: Facebook/Viber досі надійніше показують саме його в прев'ю
const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 88, progressive: true }).toBuffer()
writeFileSync(out, buf)

console.log(`og-default.jpg — ${W}×${H}, ${Math.round(buf.length / 1024)} КБ`)
