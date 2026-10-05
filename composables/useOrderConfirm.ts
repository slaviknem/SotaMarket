// Підтвердження замовлення клієнтом — формат блоків, які віддає бекенд (apisite/orders/confirm,
// OrderConfirm::forOrder в адмінці), і перевірки, потрібні сторінці на клієнті.
// Які питання, скільки екранів, які суми — вирішує сервер; компонент лише малює.
// Розбір: FLOY-ADMIN/NOTES/plans/PLAN-ORDER-CONFIRM.md

export interface OcOption {
	v: string
	label: string
	short?: string // підпис на плитці
	summary?: string // як назвати у зведенні
	net?: string // версія мережі без слів відповіді («5G») — дописується до моделі у зведенні
	note?: string
	// Шлях із «/» — готовий файл сайту (public/images/…), решта — image_file моделі зі сховища.
	// Немає картинки — силует телефона на CSS
	image?: string | null
	tag?: string // «ваша» для моделі із замовлення, «радимо» для кольору
	input?: boolean // «інша, вписати руками»
}

export interface OcBlock {
	// model:{id} | net:{id} | color:{model_id}:{дизайн}[:{n}] — у боків ключ від моделі й дизайну, а не
	// від позиції: адмінка перестворює позиції з новими id при кожному збереженні форми
	key: string
	// Блоки з однаковим group — один екран (плитки моделі і 4G / 5G тієї ж моделі)
	group?: string
	item_id?: number // боки: про яку позицію питання
	kind: 'question' | 'info'
	topic: 'model' | 'color'
	title: string
	text: string
	strong?: string // частина тексту, яку виділяємо жирним (назва моделі)
	hint?: string | null
	note?: string | null
	layout?: 'tiles' | 'rows'
	// Форма картинки в плитках: square — прев'ю каталогу 200×200, photo — знімок 600×760
	media?: 'square' | 'photo'
	summary?: string // для info-блоків: що показати у зведенні
	// Підставлена відповідь: у моделі — та, що в замовленні; у боках — колір, під який створено
	// дизайн, або єдиний колір, що є в постачальників (тоді й варіант один — не питання, а показ)
	default?: string | null
	// Боки: наявність кольорів у постачальників ще рахується — сайт перепитує бекенд із wait=1
	pending?: boolean
	options: OcOption[]
}

// Query сторінки «Дякуємо» після оформлення (кошик, швидке замовлення): номер замовлення
// і токен опитувальника. Суми, оплату й аванс сторінка бере з бекенда за ними — тягнути
// їх в URL не треба. Токена у відповіді немає (бекенд ще старий) — буде проста подяка
export function ocSuccessQuery(newOrder: { id?: number | string; confirm_token?: string } | null) {
	const query: Record<string, string> = { id: String(newOrder?.id ?? '') }
	if (newOrder?.confirm_token) query.t = newOrder.confirm_token
	return query
}

// Збереження відповідей опитувальника. send сам бере ПОТОЧНИЙ стан у момент відправки, тож:
//   later — після кожної зміни, через паузу: друк у полі не шле запит на кожну літеру;
//   flush — одразу, якщо є відкладене (крок назад, вихід зі сторінки, перехід на оплату);
//   now   — одразу й завжди («Далі», фінал). Проміс фіналу відхиляється, якщо не вийшло.
// Запити йдуть по одному: наступний — лише після попереднього, тож старий стан не перезапише новіший
export function useOcSaver(send: (final: boolean) => Promise<unknown>, delay = 800) {
	let timer: ReturnType<typeof setTimeout> | null = null
	let chain: Promise<unknown> = Promise.resolve()

	function now(final = false) {
		if (timer) clearTimeout(timer)
		timer = null
		chain = chain.catch(() => {}).then(() => send(final))
		return chain
	}

	function later() {
		if (timer) clearTimeout(timer)
		timer = setTimeout(() => now().catch(() => {}), delay)
	}

	const flush = () => {
		if (timer) now().catch(() => {})
	}

	// Пішов зі сторінки раніше за паузу — останнє не губимо
	onBeforeUnmount(flush)

	return { later, flush, now }
}

// Номер виглядає підозріло — та сама перевірка, що PhoneCheck::check() на бекенді, крім
// оператора (його список знає лише адмінка). Потрібна для номера, який клієнт виправив сам:
// тривога має зникати одразу, щойно цифри стали схожими на правду.
// Не 10 цифр, усі цифри однакові або послідовність — «вписали, щоб пройшло»
export function ocPhoneSuspicious(digits: string): boolean {
	const tail = digits.slice(3)
	return !/^0\d{9}$/.test(digits) || /^(\d)\1+$/.test(tail) || '0123456789'.includes(tail) || '9876543210'.includes(tail)
}

// «099 072 14 12»: суцільне 0990721412 описку приховує, згруповане — показує
export function ocPhoneGrouped(digits: string): string {
	return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean).join(' ')
}
