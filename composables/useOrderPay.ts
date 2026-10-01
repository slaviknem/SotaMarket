// Онлайн-оплата замовлення через MonoPay — для опитувальника підтвердження на сторінці «Дякуємо»
// (components/shop/OrderConfirm.vue): коли ховати кнопку, як переходити на оплату,
// що робити з відмовою бекенда.
//
// Суму НЕ передаємо ніколи: full=1 — лише перемикач «усе замість авансу», скільки саме
// брати, вирішує бекенд за самим замовленням (genMonoPayLink). Рахунок створюється
// тільки від кліку клієнта — кожен виклик genMonoPayLink це новий інвойс у MonoPay.

export function useOrderPay(orderId: MaybeRefOrGetter<string | number | null | undefined>) {
	const shopApi = useShopApi()
	const { notify } = useNotify()

	// Онлайн-оплата доступна не завжди: якщо в замовленні є друк (індивідуальний, неопринт,
	// альфапринт), а порожніх чохлів під нього в постачальників немає, платити наперед не можна -
	// гроші довелося б повертати.
	//
	// Кнопку показуємо ОДРАЗУ і НЕ блокуємо на час перевірки: та ходить до постачальників і на
	// холодному кеші триває секунди, а раніше весь цей час кнопка стояла сірою - саме на це
	// («не натискається», «спочатку не працює, потім працює») і скаржились клієнти.
	// Ховаємо її лише за ЯВНОЇ відмови; якщо клієнт устиг натиснути раніше - його зупинить
	// перевірка на боці gen_monopay_link, тож заплатити за ненадрукований чохол він не зможе
	const payable = ref(true)
	const payLoading = ref(false)

	// Яку саме кнопку натиснули: поки йде запит, обидві заблоковані, але «Зачекайте…»
	// показуємо лише на натиснутій - інакше не видно, який варіант обрано
	const payMode = ref<'prepay' | 'full' | null>(null)

	// Чи є на чому друкувати (orders/print_check)
	async function check() {
		const id = toValue(orderId)
		if (!id) return
		try {
			// Ліміт часу свій: без нього зависла відповідь тримала б стан «перевіряємо» до таймауту nginx
			const res = await shopApi.printCheck(String(id), 15000)
			if (res?.payable === false) payable.value = false
		} catch {
			// не знаємо - лишаємо кнопку
		}
	}

	// full - клієнт обрав закрити всю суму замість авансу. Скільки це в грошах, вирішує
	// бекенд за самим замовленням: суму з браузера він не приймає
	async function pay(full = false) {
		const id = toValue(orderId)
		if (!id || payLoading.value) return
		payLoading.value = true
		payMode.value = full ? 'full' : 'prepay'
		try {
			const data = await shopApi.genMonopayLink(String(id), full)
			if (data?.payment_link) {
				// Переходимо в ЦІЙ самій вкладці. window.open тут викликався вже після await,
				// тобто поза жестом користувача - Safari і Chrome глушили таке вікно мовчки,
				// і для клієнта кнопка просто «не працювала». Та й повертає нас MonoPay
				// на сторінку «Дякуємо» (?orderpaid), тож окрема вкладка лишалась би зайвою
				window.location.href = data.payment_link
				return
			}
			notify('error', (data as any)?.message || 'Error')
		} catch (e: any) {
			// Бекенд відмовляє з поясненням (напр. на модель немає заготовок під друк, а вкладка
			// зі старою перевіркою лишилась відкритою) - показуємо саме його, а не «Error»
			notify('error', e?.data?.message || 'Error')
			if (e?.status === 409) payable.value = false
		}
		payLoading.value = false
		payMode.value = null
	}

	return { payable, payLoading, payMode, check, pay }
}
