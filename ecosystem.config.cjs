// Опис бойового запуску для PM2. Головне тут — interpreter: демон PM2 на сервері
// крутиться під node 16, а Nuxt 3 без глобальних fetch/Headers (node 18+) мовчки
// віддає 404 на всьому каталозі. Поки команда запуску жила лише в чиїйсь пам'яті
// й у нотатках, прапорець двічі губився при вставці в термінал — тепер він у файлі.
//
// Запуск на сервері:
//   cd /root/nodeapps/FLOY-PROD
//   pm2 delete floy-prod
//   pm2 start ecosystem.config.cjs
//   pm2 save
//
// Перевірка після підйому (перший рядок має дати шлях до node 22, другий — 200):
//   readlink -f /proc/$(pgrep -f "FLOY-PROD/(cluster.mjs|.output/server/index.mjs)" | head -1)/exe
//   curl -s -o /dev/null -w "%{http_code}\n" "https://floy.com.ua/api/settings?t=1"
// Саме readlink: `ps -o args=` показує `node <скрипт>` навіть із правильним
// інтерпретатором, тобто як перевірка не годиться.
//
// Кількість копій — FLOY_WORKERS нижче. 1 = один процес, як зараз; 4 = чотири
// копії на спільному порту (форкає cluster.mjs, не PM2 — чому саме так, написано там).

module.exports = {
	apps: [
		{
			name: 'floy-prod',
			cwd: __dirname,
			script: 'cluster.mjs',

			// ⚠️ ОБИДВА РЯДКИ ОБОВ'ЯЗКОВІ Й ПОВ'ЯЗАНІ.
			// exec_mode має бути саме fork: у cluster PM2 ігнорує interpreter і бере
			// node свого демона (16.20.2) — сайт підніметься мертвим.
			interpreter: '/root/.nvm/versions/node/v22.23.1/bin/node',
			exec_mode: 'fork',
			instances: 1, // копії робить cluster.mjs, а не PM2

			// SITE_URL / URL_API / URL_STORAGE сюди НЕ додавати: nuxt.config читає їх під час
			// ЗБІРКИ і зашиває значення в .output, тож у рантаймі вони не діють (перекрити
			// зібране можна лише змінними виду NUXT_PUBLIC_URL_API). Саме тому на проді їх
			// немає в оточенні процесу, а сайт працює — дефолти з nuxt.config уже бойові.
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
				FLOY_WORKERS: 1,
			},

			// Падіння по колу не має ні їсти CPU, ні наливати логи: 19.09 у /root/.pm2/logs
			// лежало 18 ГБ, з них 14 ГБ — один застосунок, що сипав у консоль без упину.
			min_uptime: 30000,
			max_restarts: 10,
			restart_delay: 5000,
			max_memory_restart: '1G',

			time: true, // мітка часу в кожному рядку логу — без неї розбір аварії сліпий
			merge_logs: true,
		},
	],
}
