// Кілька копій Nitro на спільному порту — кластеризує САМ Node, а не PM2.
//
// Навіщо окремий файл замість `pm2 start … -i 4`:
// демон PM2 на бойовому сервері крутиться під node 16.20.2, а в cluster-режимі
// PM2 ІГНОРУЄ --interpreter — копії народжуються через cluster.fork() від демона
// й успадковують його node. Для Nuxt 3 це смерть: у node 16 немає глобальних
// fetch/Headers, кожен $fetch падає з «TypeError: Headers is not a constructor»,
// сайт віддає 404 на всіх сторінках моделей. 19.09.2026 це коштувало доби —
// див. NOTES/plans/PLAN-FLOY-CATEGORY-404.md в адмінці.
//
// Тут форкає сам Node, тобто той інтерпретатор, яким запущено цей файл. PM2
// лишається у fork-режимі, де --interpreter працює, і все дерево процесів —
// на node 22.
//
// Запуск (краще через ecosystem.config.cjs — там усе вже прописано):
//   PORT=3000 FLOY_WORKERS=4 pm2 start cluster.mjs --name FLOY \
//     --interpreter /root/.nvm/versions/node/v22.23.1/bin/node
//
// FLOY_WORKERS=1 — без форків узагалі, поводиться як звичайний одиночний процес.

import cluster from 'node:cluster'
import { availableParallelism } from 'node:os'

const SERVER = new URL('./.output/server/index.mjs', import.meta.url).href

// Ядер на машині багато, але сервер спільний із рештою застосунків — беремо 4,
// а не «по ядру на копію». Стеля — кількість ядер, менше 1 бути не може.
const workers = Math.min(
	Math.max(1, Number(process.env.FLOY_WORKERS) || 4),
	availableParallelism()
)

// Копія, що прожила менше — вважається невдалим стартом, а не падінням під навантаженням
const MIN_UPTIME = 5000
// Стільки невдалих стартів поспіль — здаємось і виходимо, далі вирішує PM2 (у нього
// свій backoff). Інакше вийшов би нескінченний цикл форків, який їсть CPU і наливає логи.
const MAX_FAILS = 10

// Запобіжник від головної пастки: під node 16 сайт мовчки віддає 404 на всьому
// каталозі. Краще гучно не піднятись, ніж добу годувати Google помилками.
const major = Number(process.versions.node.split('.')[0])
if (major < 18) {
	console.error(
		`[cluster] node ${process.version} не підходить: у Nuxt 3 потрібні глобальні fetch/Headers (node 18+).\n` +
			'[cluster] Схоже, застосунок запущено без --interpreter або в cluster-режимі PM2 — див. NOTES/SERVER.md'
	)
	process.exit(1)
}

if (workers === 1 || !cluster.isPrimary) {
	await import(SERVER)
} else {
	console.log(`[cluster] node ${process.version}, копій: ${workers}, порт ${process.env.PORT || 3000}`)

	const born = new Map()
	let fails = 0

	const spawn = () => {
		const worker = cluster.fork()
		born.set(worker.process.pid, Date.now())
	}

	for (let i = 0; i < workers; i++) spawn()

	cluster.on('exit', (worker, code, signal) => {
		const pid = worker.process.pid
		const lived = Date.now() - (born.get(pid) ?? Date.now())
		born.delete(pid)

		// Штатна зупинка (pm2 reload / stop) — не піднімаємо заново
		if (worker.exitedAfterDisconnect) return

		console.error(
			`[cluster] копія ${pid} вийшла (code=${code}, signal=${signal}), прожила ${Math.round(lived / 1000)} с`
		)

		fails = lived < MIN_UPTIME ? fails + 1 : 0
		if (fails >= MAX_FAILS) {
			console.error(`[cluster] ${MAX_FAILS} невдалих стартів поспіль — виходжу, далі PM2`)
			process.exit(1)
		}

		spawn()
	})

	// PM2 шле сигнал лише головному процесу — розводимо його по копіях самі,
	// інакше вони лишаються сиротами й тримають порт
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => {
			for (const worker of Object.values(cluster.workers || {})) worker?.kill(signal)
			process.exit(0)
		})
	}
}
