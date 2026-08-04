/**
 * Генерація всіх растрових іконок із єдиного джерела — public/favicon.svg.
 * Запуск: node scripts/gen-icons.mjs (портативний Node 22 з .node/)
 *
 * Варіанти:
 *   favicon-96 / icon-192 / icon-512 — зі скругленням і прозорими кутами;
 *   apple-touch-icon / icon-maskable-512 — full-bleed квадрат (маску накладає ОС),
 *   у maskable літера ще й зменшена, щоб уся вміщалась у safe zone (коло 80%).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

const SRC = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8')
/** full-bleed: без скруглення, фон заповнює весь квадрат */
const SQUARE = SRC.replace(/rx="15"/g, 'rx="0"')
/** maskable: літера масштабується від центру, фон лишається на всю площу */
const MASKABLE_SCALE = 0.765
const MASKABLE = SQUARE.replace(
	/<path[\s\S]*?\/>/,
	m => `<g transform="translate(32 32) scale(${MASKABLE_SCALE}) translate(-32 -32)">${m}</g>`
)

const png = (svg, size, flatten = false) => {
	let p = sharp(Buffer.from(svg), { density: 384 }).resize(size, size)
	if (flatten) p = p.flatten({ background: '#ff7a00' })
	return p.png({ compressionLevel: 9, palette: false }).toBuffer()
}

/** ICO-контейнер із PNG-payload (підтримується всіма актуальними браузерами) */
const ico = images => {
	const head = Buffer.alloc(6 + images.length * 16)
	head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4)
	let offset = head.length
	images.forEach(({ size, data }, i) => {
		const o = 6 + i * 16
		head[o] = size % 256; head[o + 1] = size % 256
		head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6)
		head.writeUInt32LE(data.length, o + 8); head.writeUInt32LE(offset, o + 12)
		offset += data.length
	})
	return Buffer.concat([head, ...images.map(i => i.data)])
}

const out = (name, data) => {
	writeFileSync(join(PUBLIC, name), data)
	console.log(`✓ ${name} (${(data.length / 1024).toFixed(1)} KB)`)
}

out('favicon-96.png', await png(SRC, 96))
out('icon-192.png', await png(SRC, 192))
out('icon-512.png', await png(SRC, 512))
out('apple-touch-icon.png', await png(SQUARE, 180, true))
out('icon-maskable-512.png', await png(MASKABLE, 512, true))
out('favicon.ico', ico(await Promise.all(
	[16, 32, 48].map(async size => ({ size, data: await png(SRC, size) }))
)))
