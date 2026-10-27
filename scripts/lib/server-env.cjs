// Профіль сервера сайту — brand/server.env: процес PM2, порт, копії, кеш nginx (KEY=value).
// Один файл на копію рушія; той самий файл deploy.sh читає як bash (source), а ecosystem.config.cjs
// і nuxt.config.ts — через цю функцію. CommonJS свідомо: ecosystem.config.cjs вантажить демон PM2,
// а він на сервері — node 16 (DEPLOY.md), без require() для ES-модулів.
const { readFileSync } = require('fs')
const { join } = require('path')

function readServerEnv(brandDir) {
	const env = {}
	for (const line of readFileSync(join(brandDir, 'server.env'), 'utf8').split('\n')) {
		// KEY=value; решта рядка після пробілу — коментар (як і для bash)
		const m = line.match(/^\s*([A-Z][A-Z0-9_]*)=([^\s#]*)/)
		if (m) env[m[1]] = m[2]
	}
	return env
}

module.exports = { readServerEnv }
