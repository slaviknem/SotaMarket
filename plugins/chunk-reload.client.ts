// Страховка на випадок викладки при відкритій вкладці.
//
// Код сторінок вантажиться шматками на вимогу. Якщо під час сеансу вийшла нова збірка,
// старих шматків на сервері вже немає — черговий import падає 404, і сторінка працює
// наполовину (мовчки: у консолі помилка, а на екрані просто «щось не те»).
//
// Ловимо саме такий збій і перезавантажуємо сторінку — з `no-cache` на документі (див.
// server/middleware/no-cache-html) вона одразу приїде новою.

const KEY = 'pc-chunk-reload'
const COOLDOWN = 60_000

export default defineNuxtPlugin(() => {
	window.addEventListener('vite:preloadError', (e) => {
		e.preventDefault()

		// Захист від нескінченного циклу: якщо шматок недоступний з іншої причини
		// (обірваний інтернет, впав сервер), перезавантажуємо не частіше разу на хвилину
		const last = Number(sessionStorage.getItem(KEY) || 0)
		if (Date.now() - last < COOLDOWN) return

		sessionStorage.setItem(KEY, String(Date.now()))
		window.location.reload()
	})
})
