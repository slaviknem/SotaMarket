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
	key: string // model:{id} | net:{id} | color:{item_id}
	// Блоки з однаковим group — один екран (плитки моделі і 4G / 5G тієї ж моделі)
	group?: string
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
	// Підставлена відповідь: у моделі — та, що в замовленні; у боках чохла її немає свідомо
	default?: string | null
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
