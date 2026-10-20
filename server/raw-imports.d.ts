// Nitro вбудовує імпортовані .txt у серверну збірку як рядок (вбудований плагін raw) —
// тип для такого імпорту (brand/robots.txt у server/routes/robots.txt.ts)
declare module '*.txt' {
	const content: string
	export default content
}
