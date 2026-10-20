// PLAN-SCALING етап 4 (одноразовий скрипт; видалити після етапу 4): 37 інлайн-<svg> → <AppIcon>.
// Кожна заміна — лише при рівно одному збігу в рядку, інакше нічого не записує.
// Спершу розширити AppIcon.vue (23 нові іконки, viewBox, width/height, round — PLAN-SCALING 4.1–4.2).
// Запуск: node scripts/stage4-icons.mjs --dry (перевірка), потім без --dry. Номери рядків — на коміт c6ba1bd.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CARET = '<path d="M1 1l5 5 5-5"/></svg>'
const R = (file, line, from, to) => ({ file, line, from, to })

const EDITS = [
	R('components/AppFooter.vue', 14, '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>', '<AppIcon name="map-pin-solid" :size="15" />'),
	R('components/AppFooter.vue', 22, '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>', '<AppIcon name="mail-solid" :size="15" />'),
	R('components/AppHeader.vue', 69, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>', '<AppIcon name="menu" :size="17" />'),
	R('components/AppHeader.vue', 71, '<svg class="departments__caret" width="10" height="10" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2">' + CARET, '<AppIcon name="caret-down" :size="10" class="departments__caret" />'),
	R('components/AppHeader.vue', 83, '<svg v-if="cat.url === \'/printcase\'" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="departments__spark"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>', '<AppIcon v-if="cat.url === \'/printcase\'" name="spark" :size="13" class="departments__spark" />'),
	R('components/AppHeader.vue', 107, '<svg v-if="brand.children?.length || brand.hasChildren" width="9" height="9" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2">' + CARET, '<AppIcon v-if="brand.children?.length || brand.hasChildren" name="caret-down" :size="9" />'),
	...[17, 27, 31].map((l) => R('components/AppPagination.vue', l, '<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 1L2 6l5 5"/></svg>', '<AppIcon name="chevron-left-sm" :size="12" />')),
	...[55, 65, 69].map((l) => R('components/AppPagination.vue', l, '<svg width="12" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5-5 5"/></svg>', '<AppIcon name="chevron-right-sm" :size="12" />')),
	R('components/blocks/FeaturesStrip.vue', 7, '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/></svg>', '<AppIcon name="truck" :size="26" :stroke-width="1.7" :round="false" />'),
	R('components/blocks/FeaturesStrip.vue', 17, '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>', '<AppIcon name="card" :size="26" :stroke-width="1.7" />'),
	R('components/blocks/FeaturesStrip.vue', 27, '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7s-1.5-4-5-4c-2 0-3 1.3-3 2.5C4 7 7 7 12 7zM12 7s1.5-4 5-4c2 0 3 1.3 3 2.5C20 7 17 7 12 7z"/></svg>', '<AppIcon name="gift" :size="26" :stroke-width="1.7" />'),
	R('components/MobileMenu.vue', 43, '<svg v-if="brand.children?.length || brand.hasChildren" width="11" height="11" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2" :style="{ transform: openedBrand === i ? \'rotate(180deg)\' : \'\' }">' + CARET, '<AppIcon v-if="brand.children?.length || brand.hasChildren" name="caret-down" :size="11" :style="{ transform: openedBrand === i ? \'rotate(180deg)\' : \'\' }" />'),
	R('components/printcase/ModelSelectModal.vue', 50, '<svg width="11" height="11" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2">' + CARET, '<AppIcon name="caret-down" :size="11" />'),
	R('components/printcase/PrintcasePage.vue', 60, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M8 11h6M11 8v6"/></svg>', '<AppIcon name="zoom-in" :size="17" />'),
	R('components/printcase/PrintcasePage.vue', 63, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M8 11h6"/></svg>', '<AppIcon name="zoom-out" :size="17" />'),
	R('components/printcase/PrintcasePage.vue', 66, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>', '<AppIcon name="rotate-left" :size="17" />'),
	R('components/printcase/PrintcasePage.vue', 69, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>', '<AppIcon name="rotate-right" :size="17" />'),
	R('components/printcase/PrintcasePage.vue', 72, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>', '<AppIcon name="layer-up" :size="17" />'),
	R('components/printcase/PrintcasePage.vue', 75, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>', '<AppIcon name="layer-down" :size="17" />'),
	R('components/printcase/PrintcasePage.vue', 78, '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>', '<AppIcon name="trash" :size="17" />'),
	R('components/printcase/PrintcasePage.vue', 203, '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>', '<AppIcon name="upload" :size="21" :stroke-width="1.8" />'),
	...[212, 224].map((l) => R('components/printcase/PrintcasePage.vue', l, '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>', '<AppIcon name="text" :size="21" :stroke-width="1.8" />')),
	R('components/printcase/PrintcasePage.vue', 231, '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>', '<AppIcon name="image" :size="21" :stroke-width="1.8" />'),
	R('components/printcase/PrintcasePage.vue', 239, '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>', '<AppIcon name="layers" :size="15" />'),
	R('components/printcase/PrintcasePage.vue', 298, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>', '<AppIcon name="layer-up" :size="14" :stroke-width="2.2" />'),
	R('components/printcase/PrintcasePage.vue', 301, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>', '<AppIcon name="layer-down" :size="14" :stroke-width="2.2" />'),
	R('components/printcase/PrintcaseStage.vue', 52, '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4"/></svg>', '<AppIcon name="smartphone" :size="44" :stroke-width="1.4" />'),
	R('components/printcase/StageElement.vue', 48, '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>', '<AppIcon name="rotate-right" :size="15" :stroke-width="2.4" />'),
	R('components/shop/FiltersSidebar.vue', 21, '<svg width="11" height="11" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2" :style="{ transform: isOpen(group) ? \'rotate(180deg)\' : \'\' }"><path d="M1 1l5 5 5-5" /></svg>', '<AppIcon name="caret-down" :size="11" :style="{ transform: isOpen(group) ? \'rotate(180deg)\' : \'\' }" />'),
	R('components/shop/FiltersSidebar.vue', 52, '<svg width="10" height="8" viewBox="0 0 12 9" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4.5l3.5 3.5L11 1"/></svg>', '<AppIcon name="check-sm" :width="10" :height="8" :stroke-width="2.5" />'),
	R('components/shop/FiltersSidebar.vue', 70, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>', '<AppIcon name="reset" :size="14" />'),
	R('pages/shop/cart/index.vue', 392, '<svg width="10" height="8" viewBox="0 0 12 9" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4.5l3.5 3.5L11 1"/></svg>', '<AppIcon name="check-sm" :width="10" :height="8" :stroke-width="2.5" />'),
]

const files = new Map()
const errors = []
for (const e of EDITS) {
	if (!files.has(e.file)) {
		const raw = readFileSync(join(ROOT, e.file), 'utf8')
		files.set(e.file, { eol: raw.includes('\r\n') ? '\r\n' : '\n', lines: raw.split(/\r?\n/) })
	}
	const f = files.get(e.file)
	const line = f.lines[e.line - 1]
	if (line?.split(e.from).length - 1 !== 1) {
		errors.push(`${e.file}:${e.line} — немає точного збігу; у рядку: «${line?.trim().slice(0, 120)}»`)
		continue
	}
	f.lines[e.line - 1] = line.replace(e.from, () => e.to)
}
if (errors.length) {
	console.error('Нічого не записано:\n' + errors.join('\n'))
	process.exit(1)
}
if (process.argv.includes('--dry')) {
	console.log(`✓ (перевірка) усі ${EDITS.length} замін влучають, файлів: ${files.size}`)
	process.exit(0)
}
for (const [file, f] of files) writeFileSync(join(ROOT, file), f.lines.join(f.eol))
console.log(`✓ ${EDITS.length} замін у ${files.size} файлах`)
