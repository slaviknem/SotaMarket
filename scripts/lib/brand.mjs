/**
 * Бренд для збірки й скриптів (PLAN-SCALING 2.2, 2.10). Колір живе в одному місці —
 * brand/theme.css; nuxt.config.ts бере звідси theme-color і кольори manifest, генератори
 * фавіконів і og — кольори, лого й домен.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const BRAND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'brand')

const toHex = (channels) =>
	'#' + channels.split(',').map((c) => Number(c.trim()).toString(16).padStart(2, '0')).join('')

/**
 * Кольори теми як hex: bg і accent — з каналів (--bg-rgb, --accent-rgb), logo — --logo-color.
 * Фон і лого прев'ю для соцмереж — необов'язкові --og-bg і --og-logo (без них — bg і logo);
 * значення var(--x) береться з токена x.
 * @returns {{ bg: string, accent: string, logo: string, ogBg: string, ogLogo: string }}
 */
export function readTheme(dir = BRAND_DIR) {
	const css = readFileSync(join(dir, 'theme.css'), 'utf8')
	const find = (name) => {
		const value = css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim()
		return value?.startsWith('var(') ? find(value.slice(4, -1).trim()) : value
	}
	const token = (name) => {
		const value = find(name)
		if (!value) throw new Error(`brand/theme.css: немає токена ${name}`)
		return value
	}
	const bg = toHex(token('--bg-rgb'))
	const logo = token('--logo-color')
	return { bg, accent: toHex(token('--accent-rgb')), logo, ogBg: find('--og-bg') ?? bg, ogLogo: find('--og-logo') ?? logo }
}

/** Конфіг бренду (TS) у .mjs-скриптах — через jiti, як його читає й сам Nuxt */
export async function loadBrandConfig(dir = BRAND_DIR) {
	const { createJiti } = await import('jiti')
	return createJiti(import.meta.url).import(join(dir, 'site.config.ts'), { default: true })
}
