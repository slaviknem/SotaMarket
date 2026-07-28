// Телефон: єдина маска й валідація для всіх форм (кошик, швидке замовлення).
// Вводиться локальний формат 0XX-XXX-XX-XX, префікс +38 показуємо окремо в розмітці.

export function usePhone() {
	// 10 цифр укр. номера. Якщо вставили повний номер (+380…, 380…, 80…) — відкидаємо код країни,
	// інакше в поле потрапляло «380-991-23-45» і стара перевірка по довжині вважала його валідним.
	function phoneDigits(value: string) {
		let d = (value || '').replace(/\D/g, '')
		if (d.startsWith('380')) d = d.slice(2)
		else if (d.startsWith('80')) d = d.slice(1)
		return d.slice(0, 10)
	}

	function maskPhone(value: string) {
		const d = phoneDigits(value)
		return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join('-')
	}

	// Не звужуємо до списку кодів операторів — нові коди не повинні відсікати живі замовлення
	function isValidPhone(value: string) {
		return /^0\d{9}$/.test(phoneDigits(value))
	}

	return { phoneDigits, maskPhone, isValidPhone }
}
