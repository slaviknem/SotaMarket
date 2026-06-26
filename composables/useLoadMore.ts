// Підвантаження списку «Показати ще» / авто по скролу поверх SSR-сторінки.
// SSR-сторінка (baseItems) лишається основою для ботів; підвантажене дописується лише на клієнті —
// боти бачать решту через crawlable-пагінацію, а не через ці клієнтські дописи.

export function useLoadMore(opts: {
	baseItems: Ref<any[]> // товари поточної SSR-сторінки
	currentPage: Ref<number> // її номер (з meta)
	lastPage: Ref<number>
	fetchPage: (page: number) => Promise<any[]> // тягне товари вказаної сторінки
	autoBatches?: number // скільки партій тягнути авто по скролу (далі — кнопка/ползунок)
}) {
	const autoBatches = opts.autoBatches ?? 1

	const appended = ref<any[]>([])
	const loadMoreCount = ref(0)
	const isLoadingMore = ref(false)
	const autoOn = ref(false) // ползунок «Авто-підвантаження»: безперервна стрічка по скролу
	const scrollSentinel = ref<HTMLElement | null>(null)
	let observer: IntersectionObserver | null = null

	// Усі видимі товари = SSR-сторінка + підвантажене
	const items = computed(() => [...opts.baseItems.value, ...appended.value])

	// Чи лишилися сторінки попереду (з урахуванням уже підвантажених)
	const hasMorePages = computed(() => opts.currentPage.value + loadMoreCount.value + 1 <= opts.lastPage.value)

	// Номери вже видимих сторінок (поточна + дописані) — для позначення в пагінації
	const loadedPages = computed(() =>
		Array.from({ length: loadMoreCount.value + 1 }, (_, i) => opts.currentPage.value + i)
	)

	// Кнопку показуємо, коли авто вичерпано і ползунок вимкнено
	const showButton = computed(() => hasMorePages.value && !autoOn.value && loadMoreCount.value >= autoBatches)

	async function loadMore() {
		if (isLoadingMore.value || !hasMorePages.value) return
		isLoadingMore.value = true
		try {
			const next = await opts.fetchPage(opts.currentPage.value + loadMoreCount.value + 1)
			if (next?.length) {
				appended.value = [...appended.value, ...next]
				loadMoreCount.value++
			}
		} catch (e) {
			console.error('[useLoadMore]', e)
		} finally {
			isLoadingMore.value = false
		}
	}

	// Нова SSR-сторінка (пагінація/фільтри/сортування змінили дані) → скидаємо підвантажене
	watch(opts.baseItems, () => {
		appended.value = []
		loadMoreCount.value = 0
	})

	// Увімкнення ползунка одразу тягне наступну сторінку (далі підхоплює observer по скролу)
	watch(autoOn, (on) => {
		if (on && hasMorePages.value && !isLoadingMore.value) loadMore()
	})

	onMounted(() => {
		if (typeof IntersectionObserver === 'undefined') return
		observer = new IntersectionObserver(
			(entries) => {
				// Авто для перших autoBatches партій (плавний старт) або поки ввімкнено ползунок
				if (
					entries[0].isIntersecting &&
					(loadMoreCount.value < autoBatches || autoOn.value) &&
					!isLoadingMore.value &&
					hasMorePages.value
				) {
					loadMore()
				}
			},
			{ rootMargin: '300px' }
		)
		watchEffect(() => {
			if (scrollSentinel.value) observer?.observe(scrollSentinel.value)
		})
	})

	onBeforeUnmount(() => {
		observer?.disconnect()
		observer = null
	})

	return { items, isLoadingMore, autoOn, hasMorePages, loadedPages, showButton, loadMore, scrollSentinel }
}
