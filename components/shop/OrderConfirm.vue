<template>
	<section ref="rootRef" class="oc">
		<!-- ─────────── Підтверджено ─────────── -->
		<div v-if="state === 'done'" class="card oc__box oc__box--final">
			<span class="oc__final-icon">
				<AppIcon name="check" :size="30" :stroke-width="2.6" />
			</span>
			<h2 class="oc__title">{{ t('confirm.doneTitle') }}</h2>
			<p class="oc__sub">{{ t('confirm.doneSub', { day: dispatch }) }}</p>

			<!-- Сумнів у моделі скасовує «не телефонувати»: тут дзвінок таки потрібен -->
			<p v-if="modelDoubt" class="oc__note oc__note--warn">
				<template v-if="doubtModels">{{ t('confirm.youSaid', { model: doubtModels }) }}. </template>{{ t('confirm.doneDoubt') }}
			</p>
			<p v-else-if="tooMany" class="oc__note">{{ t('confirm.tooMany') }}</p>
			<p v-else-if="!noCall" class="oc__note">{{ t('confirm.noCallOff') }}</p>
			<p v-else class="oc__note oc__note--ok">{{ t('confirm.noCallOn') }}</p>
			<p v-if="comment.trim()" class="oc__note">{{ t('confirm.doneComment') }}</p>
			<p
				v-if="(order.delivery_missing && address.trim()) || (order.recipient_missing && recipient.trim())"
				class="oc__note"
			>
				{{ t('confirm.doneDelivery') }}
			</p>

			<!-- Ще не сплачено — ті самі кнопки й після підтвердження: хто обрав накладений чи
			     реквізити, може передумати й сплатити одразу. Повернувся з MonoPay — їх немає (payState) -->
			<ShopOrderConfirmPay
				v-if="payKind"
				class="oc__final-pay"
				:kind="payKind"
				:pay="pay"
				:cod="cod"
				:loading="payLoading"
				:mode="payMode"
				@go="payGo"
			/>

			<div class="oc__final-actions">
				<!-- Змінити відповіді після підтвердження не можна (рішення 2026-10-01): менеджер
				     працює з тим, що клієнт підтвердив, — бекенд після нього відповіді й не приймає -->
				<NuxtLink :to="localePath('/')" class="btn btn-secondary">{{ t('confirm.toHome') }}</NuxtLink>
			</div>
		</div>

		<!-- ─────────── Опитувальник ─────────── -->
		<div v-else class="card oc__box">
			<header class="oc__head">
				<button v-if="canBack" type="button" class="oc__back" :aria-label="t('confirm.back')" @click="back">
					<AppIcon name="arrow-right" :size="18" />
				</button>

				<div class="oc__head-text">
					<h2 class="oc__title">
						<span class="oc__title-check"><AppIcon name="check" :size="13" :stroke-width="3.2" /></span>
						{{ t('confirm.accepted', { id: order.id }) }}
					</h2>
					<p class="oc__sub">{{ subline }}</p>
				</div>
			</header>

			<!-- Номер телефону — найдорожча помилка з усіх, тому не рядок у зведенні в кінці,
			     а смуга одразу під заголовком, великими згрупованими цифрами і на КОЖНОМУ кроці.
			     0990721412 суцільним рядком описку приховує, «099 072 14 12» — показує. -->
			<div class="oc__phone-bar" :class="{ 'is-alarm': phoneAlarm, 'is-warn': phoneSoft }">
				<div class="oc__phone-top">
					<span class="oc__phone-cap">{{ editable ? t('confirm.phoneCap') : t('confirm.phoneCapReadonly') }}</span>
					<button v-if="editable && !phoneEditing" type="button" class="oc__sum-edit" @click="startPhoneEdit">
						{{ t('confirm.phoneEdit') }}
					</button>
				</div>

				<span v-if="!phoneEditing" class="oc__phone-big">{{ phoneGrouped }}</span>

				<div v-else class="oc__phone-edit">
					<span class="oc__phone-field">
						<span class="oc__phone-code">+38</span>
						<input
							ref="phoneRef"
							v-model="phoneDraft"
							class="form-control oc__phone-input"
							type="tel"
							inputmode="tel"
							autocomplete="tel-national"
							maxlength="13"
							:aria-label="t('confirm.phoneAria')"
							@input="phoneDraft = maskPhone(phoneDraft)"
							@keydown.enter.prevent="savePhone"
						/>
					</span>
					<button type="button" class="btn btn-outline btn-sm" @click="savePhone">{{ t('confirm.phoneDone') }}</button>
				</div>

				<!-- Пояснення «навіщо» лишилось тільки для підозрілого номера: у звичайному
				     стані заголовок і самі цифри кажуть усе, а зайвий абзац під ними просто
				     відсуває крок униз. Невідомий префікс оператора — лише ввічливе прохання:
				     список операторів у адмінці ще неповний, і номер цілком може бути правильним -->
				<p v-if="phoneError" class="field-error">{{ phoneError }}</p>
				<p v-else-if="phoneAlarm" class="oc__phone-why">
					<b>{{ t('confirm.phoneOdd') }}</b> {{ t('confirm.phoneOddText') }}
				</p>
				<p v-else-if="phoneSoft" class="oc__phone-why oc__phone-why--warn">{{ t('confirm.phoneSoft') }}</p>
			</div>

			<!-- Крапки прогресу: лише там, де кроків справді кілька. На зведенні теж — остання
			     крапка каже «ви на фініші», і смуга не зникає, зсуваючи екран угору -->
			<ol v-if="dots > 1" class="oc__dots" aria-hidden="true">
				<li
					v-for="i in dots"
					:key="i"
					class="oc__dot"
					:class="{ 'is-done': i - 1 < stepIndex, 'is-now': i - 1 === stepIndex }"
				/>
			</ol>

			<Transition name="oc-step" mode="out-in">
				<div :key="stepIndex" class="oc__stage">
					<!-- ── Питання ──
					     Крок — це група блоків: про одну модель буває два питання (плитки «яка модель»
					     і кнопки «яка версія, 4G чи 5G»), і їх показуємо на одному екрані, від ширшого
					     до вужчого. Кроків стільки, скільки позицій із питаннями, а не скільки питань.
					     Заголовка блоку (`title`) немає навмисно: «Ваша модель телефону» над «Модель саме
					     NARZO 50A?» — те саме двічі. `title` лишається для тексту в чаті й для legend. -->
					<template v-if="showQuestion">
						<!-- До якої позиції питання: у замовленні з кількома товарами без цього не
						     зрозуміло, про який чохол зараз мова. Той самий рядок, що у зведенні -->
						<ul v-if="stepItems.length" class="oc__items oc__items--step">
							<li v-for="i in stepItems" :key="i.id" class="oc__item">
								<span v-if="i.image" class="oc__item-thumb thumb-frame">
									<img :src="i.image" :alt="i.title" width="36" height="36" loading="lazy" />
								</span>
								<span class="oc__item-text">
									<span class="oc__item-title">{{ i.title }}</span>
									<span v-if="i.qty > 1" class="oc__item-meta">{{ t('confirm.qty', { n: i.qty }) }}</span>
								</span>
								<span class="oc__item-price">{{ formatPrice(i.price) }}</span>
							</li>
						</ul>

						<div
							v-for="(q, qi) in stepBlocks"
							:key="q.key"
							class="oc__q"
							:class="{ 'oc__q--more': qi > 0 }"
						>
							<h3 class="oc__q-text">
								<template v-for="(p, pi) in textParts(q)" :key="pi">
									<b v-if="p.b" class="oc__q-name">{{ p.t }}</b>
									<template v-else>{{ p.t }}</template>
								</template>
							</h3>

							<!-- Головне попередження питання про модель: за фото клієнт моделі НЕ визначить
							     (50A і 50 на вигляд однакові, 4G і 5G — тим паче). Одне на екран — над
							     першим питанням про модель; кнопка вбудована в сам рядок -->
							<p v-if="qi === alertAt" class="oc__alert">
								{{ t('confirm.alertLead') }} <b>{{ t('confirm.alertMust') }}</b> {{ alertText }}<button
									type="button"
									class="oc__alert-help"
									@click="helpOpen = true"
								>
									<AppIcon name="help" :size="14" />
									{{ t('confirm.howToCheck') }}
								</button>
							</p>

							<p v-if="q.note" class="oc__note">{{ q.note }}</p>

							<fieldset :ref="(el) => setFieldset(q.key, el)" class="oc__fieldset">
								<legend class="visually-hidden">{{ q.title }}</legend>

								<!-- Плитки: моделі-плутанки, боки чохла -->
								<div
									v-if="q.layout === 'tiles'"
									class="oc__tiles"
									:class="{ 'oc__tiles--photo': q.media === 'photo', 'oc__tiles--one': pickable(q).length === 1 }"
								>
									<label
										v-for="o in pickable(q)"
										:key="o.v"
										class="oc__tile"
										:class="{ 'is-on': isPicked(q, o.v) }"
									>
										<input
											class="visually-hidden"
											type="radio"
											:name="q.key"
											:value="o.v"
											:checked="isPicked(q, o.v)"
											@change="pick(q, o)"
										/>
										<!-- Моделі — прев'ю зі сховища адмінки (те саме, що у випадайці пошуку),
										     боки чохла — знімки з public/images/order-confirm. eager: плитки
										     клієнт бачить одразу -->
										<AppImage
											v-if="o.image"
											:src="optionImage(o)"
											:alt="o.label"
											:width="media(q).w"
											:height="media(q).h"
											loading="eager"
											class="oc__tile-img"
											:class="`oc__tile-img--${q.media || 'square'}`"
										/>
										<!-- Модель без фото в каталозі — силует телефона -->
										<span v-else class="oc__shape" aria-hidden="true" />

										<span class="oc__tile-label">{{ o.short || o.label }}</span>
										<span v-if="o.note" class="oc__tile-note">{{ o.note }}</span>
										<span v-if="o.tag" class="oc__tile-tag">{{ o.tag }}</span>
										<span class="oc__mark"><AppIcon name="check" :size="12" :stroke-width="3.2" /></span>
									</label>
								</div>

								<!-- Широкі рядки без картинок: 4G / 5G -->
								<div v-else class="oc__rows">
									<label
										v-for="o in pickable(q)"
										:key="o.v"
										class="oc__row"
										:class="{ 'is-on': isPicked(q, o.v) }"
									>
										<input
											class="visually-hidden"
											type="radio"
											:name="q.key"
											:value="o.v"
											:checked="isPicked(q, o.v)"
											@change="pick(q, o)"
										/>
										<span class="oc__row-text">
											<b>{{ o.label }}</b>
											<i v-if="o.note">{{ o.note }}</i>
										</span>
										<span class="oc__mark"><AppIcon name="check" :size="13" :stroke-width="3.2" /></span>
									</label>
								</div>

								<!-- «Інша, немає в списку» — окремо під варіантами, щоб не важило як плитка -->
								<div v-if="freeInput(q)" class="oc__other">
									<label class="oc__row oc__row--slim" :class="{ 'is-on': isPicked(q, freeInput(q)!.v) }">
										<input
											class="visually-hidden"
											type="radio"
											:name="q.key"
											:value="freeInput(q)!.v"
											:checked="isPicked(q, freeInput(q)!.v)"
											@change="pick(q, freeInput(q)!)"
										/>
										<AppIcon name="edit" :size="16" class="oc__row-ico" />
										<span class="oc__row-text"><b>{{ freeInput(q)!.label }}</b></span>
										<span class="oc__mark"><AppIcon name="check" :size="13" :stroke-width="3.2" /></span>
									</label>

									<div v-if="isPicked(q, freeInput(q)!.v)" class="oc__other-field">
										<input
											:id="`oc-other-${q.key}`"
											v-model="otherText[q.key]"
											class="form-control"
											:placeholder="t('confirm.otherPlaceholder')"
											@input="errors[q.key] = ''; save.later()"
											@keydown.enter.prevent="next"
										/>
										<p v-if="errors[q.key]" class="field-error">{{ errors[q.key] }}</p>
										<!-- Підказку «як подивитись точну назву» показуємо саме тут: доки клієнт
										     не сказав «інша», вона йому ні до чого -->
										<p v-else-if="q.hint && q.layout === 'tiles'" class="field-hint">{{ q.hint }}</p>
									</div>
								</div>

								<!-- Нічого не вибрано і клієнт натиснув «Далі». Заблокованої кнопки тут
								     не робимо: вона просто не працює й не каже, чому -->
								<p v-if="errors[q.key] && !answers[q.key]" class="field-error">{{ errors[q.key] }}</p>
								<p v-if="q.hint && q.layout !== 'tiles'" class="field-hint">{{ q.hint }}</p>
							</fieldset>
						</div>

						<!-- Одразу кажемо, що буде далі: інша модель = інший чохол і, можливо, інша ціна -->
						<p v-if="doubtPicked" class="oc__note oc__note--warn">{{ t('confirm.doubt') }}</p>
					</template>

					<!-- ── Зведення ── -->
					<div v-if="showSummary" class="oc__sum-wrap">
						<!-- Що саме ми зрозуміли з замовлення: компактний список позицій, як у кошику.
						     Під назвою — лише те, чого в ній немає: модель, якщо назва її не містить
						     (індивідуальний друк) або клієнт її змінив, і боки чохла.
						     Повернутись до відповідей можна стрілкою в шапці. -->
						<ul class="oc__items">
							<li v-for="i in summaryItems" :key="i.id" class="oc__item">
								<span v-if="i.image" class="oc__item-thumb thumb-frame">
									<img :src="i.image" :alt="i.title" width="36" height="36" loading="lazy" />
								</span>
								<span class="oc__item-text">
									<span class="oc__item-title">{{ i.title }}</span>
									<span v-if="i.meta" class="oc__item-meta" :class="{ 'is-warn': i.changed }">{{ i.meta }}</span>
								</span>
								<span class="oc__item-price">{{ formatPrice(i.price) }}</span>
							</li>
							<li v-if="order.discount" class="oc__items-total oc__items-total--minor">
								<span>{{ t('confirm.discount') }}</span>
								<span>−{{ formatPrice(order.discount) }}</span>
							</li>
							<li class="oc__items-total">
								<span>{{ t('confirm.total') }}</span>
								<b>{{ formatPrice(order.price) }}</b>
							</li>
						</ul>

						<!-- Замовлення вже в роботі — лише перегляд: ні термінів (їх рахують від «зараз»,
						     а відправлене вже поїхало), ні оплати, ні галочок -->
						<template v-if="editable">
							<!-- Чого бракує, щоб відправити: кошик доставки не вимагає, швидке замовлення —
							     лише телефон. Не форма з відділеннями, а одне поле своїми словами — менеджер
							     оформить сам. Без нього «підтверджую» не пускає: посилку однаково не відправити -->
							<div v-if="order.delivery_missing" class="oc__deliv">
								<p class="oc__note oc__note--warn">
									<b>{{ t('confirm.deliveryTitle') }}</b> {{ order.delivery_missing }}
								</p>
								<textarea
									id="oc-delivery"
									v-model="address"
									class="form-control oc__comment-field oc__deliv-field"
									rows="2"
									maxlength="300"
									:aria-label="t('confirm.deliveryTitle')"
									:placeholder="t('confirm.deliveryPlaceholder')"
									@input="errors.delivery = ''; save.later()"
								/>
								<p v-if="errors.delivery" class="field-error">{{ errors.delivery }}</p>
							</div>

							<!-- Отримувач — окремо від «Куди відправити?»: найчастіше адреса якраз є, а ПІБ
							     латиницею (кошик лише попереджав). Латиницею накладну не оформити, тож і тут
							     «підтверджую» без нього не пускає. autocomplete="off" — інакше браузер
							     підставив би те саме «MELNIK JOSIP» з Google-акаунта -->
							<div v-if="order.recipient_missing" class="oc__deliv">
								<p class="oc__note oc__note--warn">
									<b>{{ t('confirm.recipientTitle') }}</b> {{ order.recipient_missing }}
								</p>
								<input
									id="oc-recipient"
									v-model="recipient"
									class="form-control oc__deliv-field"
									:class="{ 'is-error': recipientError }"
									type="text"
									autocomplete="off"
									maxlength="100"
									:aria-label="t('confirm.recipientTitle')"
									:placeholder="t('confirm.recipientPlaceholder')"
									@input="errors.recipient = ''; save.later()"
								/>
								<p v-if="recipientError" class="field-error">{{ recipientError }}</p>
							</div>

							<!-- Єдина НОВА для клієнта інформація на цьому екрані — тому вона й виділена -->
							<div class="oc__next">
								<AppIcon name="truck" :size="18" class="oc__next-ico" />
								<span class="oc__next-text">
									<b>{{ t('confirm.dispatch', { day: dispatch }) }}</b>
									<i v-if="cod">{{ t('confirm.due', { sum: order.due }) }}</i>
								</span>
							</div>

							<!-- Оплата. Саме тут їй і місце: у плані (Б4) окремо сказано не класти пряме
							     посилання MonoPay у текст для чату — `genMonoPayLink` створює НОВИЙ рахунок
							     на кожен виклик. Рахунок має народжуватись від кліку клієнта, тобто звідси.

							     Кнопки — за будь-якого способу оплати, поки не сплачено (OrderConfirm::money).
							     Заготовок під друк немає (`payable === false`) — оплату не беремо, а оплачене,
							     вже отриманий аванс чи щойно сплачене (повернення з MonoPay) вдруге не пропонуємо
							     (useOrderPay, payState) -->
							<p v-if="payState === 'paid'" class="oc__note oc__note--ok">{{ t('confirm.paid') }}</p>
							<p v-else-if="payState === 'prepaid'" class="oc__note oc__note--ok">
								{{ t('confirm.prepayPaid', { sum: pay.prepay_paid }) }}
							</p>
							<p v-else-if="payState === 'unavailable'" class="oc__note">{{ t('confirm.payUnavailable') }}</p>
							<ShopOrderConfirmPay
								v-else-if="payKind"
								:kind="payKind"
								:pay="pay"
								:cod="cod"
								:loading="payLoading"
								:mode="payMode"
								@go="payGo"
							/>

							<p v-if="tooMany" class="oc__note">{{ t('confirm.tooMany') }}</p>

							<label v-else class="oc__check">
								<input v-model="noCall" type="checkbox" @change="save.later()" />
								<span class="oc__check-text">
									<!-- «Можна», а не «не телефонуйте»: це побажання, а не обіцянка. Якщо
									     в замовленні знайдеться нюанс, менеджер однаково зв'яжеться — про це
									     підрядок, щоб потім дзвінок не здивував -->
									<b>{{ t('confirm.noCall') }}</b>
									<i v-if="noCall">{{ t('confirm.noCallOn') }}</i>
									<i v-else>{{ t('confirm.noCallOff') }}</i>
								</span>
							</label>

							<!-- Коментар — згорнутий в одне посилання: більшості сказати нічого, і поле
							     на весь екран лише відсунуло б кнопку. Хто хоче щось уточнити — розгортає -->
							<div class="oc__comment">
								<button v-if="!commentOpen" type="button" class="link-btn oc__comment-open" @click="openComment">
									<AppIcon name="plus" :size="14" :stroke-width="2.4" />
									{{ t('confirm.comment') }}
								</button>
								<textarea
									v-else
									id="oc-comment"
									v-model="comment"
									:aria-label="t('confirm.comment')"
									class="form-control oc__comment-field"
									rows="2"
									maxlength="500"
									:placeholder="t('confirm.commentPlaceholder')"
									@input="save.later()"
								/>
							</div>
						</template>
					</div>
				</div>
			</Transition>

			<div v-if="editable" class="oc__cta">
				<!-- Фінал — та сама помаранчева, але з рамкою, що «дихає»: головна дія екрана
				     видна одразу, і «Сплатити» поруч її не перекрикує -->
				<button
					type="button"
					class="btn btn-primary btn-lg btn-block"
					:class="{ oc__confirm: showSummary }"
					:disabled="saving"
					@click="next"
				>
					<AppIcon v-if="showSummary" name="check" :size="18" :stroke-width="3" />
					{{ ctaLabel }}
				</button>
				<p v-if="saveError" class="field-error oc__save-error">{{ t('confirm.saveError') }}</p>
			</div>
		</div>

		<!-- Інструкція одна на всі моделі, тому живе тут, а не приходить з бекенда -->
		<AppModal v-model="helpOpen" :title="t('confirm.helpTitle')" size="sm">
			<dl class="oc__help">
				<dt>Android</dt>
				<dd>{{ t('confirm.helpAndroid') }}</dd>

				<dt>iPhone</dt>
				<dd>{{ t('confirm.helpIphone') }}</dd>

				<!-- 4G / 5G у назві моделі: у каталозі 4G-версія зазвичай без суфікса,
				     тож «немає 5G» і означає 4G — так само, як FindModelTool::filterByConnectivity() -->
				<dt>{{ t('confirm.helpNet') }}</dt>
				<dd>{{ t('confirm.helpNetText') }}</dd>
			</dl>
			<p class="oc__help-foot">{{ t('confirm.helpFoot') }}</p>
		</AppModal>
	</section>
</template>

<script setup lang="ts">
/**
 * Підтвердження замовлення клієнтом без дзвінка — на сторінці «Дякуємо» (/shop/cart/success)
 * одразу після оформлення на сайті.
 * Розбір і логіка: FLOY-ADMIN/NOTES/plans/PLAN-ORDER-CONFIRM.md
 *
 * Компонент лише малює: які питання, у якому порядку, скільки екранів, суми й стан оплати
 * вирішує бекенд (OrderConfirm::forOrder в адмінці, apisite/orders/confirm).
 * Відповіді зберігаються після кожної зміни (ConfirmAnswers в адмінці, поле orders.confirm_data) —
 * повернувшись (з MonoPay, після перезавантаження), клієнт продовжує там, де зупинився.
 */
import { ocPhoneGrouped, ocPhoneSuspicious, useOcSaver, type OcBlock, type OcOption } from '~/composables/useOrderConfirm'
import type { IOrderConfirm, IOrderConfirmAnswers, IOrderConfirmItem } from '~/composables/useShopApi'

const props = defineProps<{
	data: IOrderConfirm
	token: string // токен опитувальника — з ним бекенд приймає відповіді
	// Клієнт щойно повернувся з MonoPay: що гроші дійшли, бекенд дізнається з вебхука, а він
	// буває повільніший за клієнта. Тож оплату вдруге не пропонуємо, а повну оплату вважаємо
	// закритою й без нього (про саму оплату каже сторінка над карткою)
	justPaid?: 'full' | 'prepay' | null
}>()

const { t } = useI18n()
const url = useUrl()
const shopApi = useShopApi()
const localePath = useLocalePath()
const { maskPhone, isValidPhone, phoneDigits } = usePhone()
const { hasLatin } = useFio()
// Приклад номера в підказці — телефон магазину з налаштувань
const { phoneExample } = useSiteSettings()

// ─────────────────────────── Стан ───────────────────────────

const order = computed(() => props.data.order)
const items = computed(() => props.data.order.items)
// Блоки боків, уточнені після перевірки постачальників (refreshColors), — поверх тих, що прийшли.
// null — кольорів для друку так і не знайшлось, кроку боків більше немає
const fresh = ref<Record<string, OcBlock | null>>({})
const blocks = computed(() =>
	props.data.blocks.flatMap((b) => (fresh.value[b.key] === null ? [] : [fresh.value[b.key] || b]))
)
// Коли відправимо — бекенд вгадує постачальника (CS чи VDMT) з тієї ж наявності, тож після
// refreshColors день теж уточнюється
const freshDispatch = ref('')
const dispatch = computed(() => freshDispatch.value || order.value.dispatch)
const pay = computed(() => props.data.pay)
// Накладений платіж (за товар ще платять на пошті) — якщо не щойно сплатили все онлайн
const cod = computed(() => order.value.cod && props.justPaid !== 'full')
// Замовлення вже поза new / messaged / not_call / waiting / drop_first — лише перегляд, без питань і кнопки
const editable = computed(() => props.data.order.editable)

const answers = ref<Record<string, { v: string; text?: string }>>({})

const state = ref<'ask' | 'done'>('ask')
const stepIndex = ref(0)
const noCall = ref(true)
const comment = ref('')
const commentOpen = ref(false)
const address = ref('') // куди відправити — лише коли бракує даних доставки (order.delivery_missing)
const recipient = ref('') // ПІБ кирилицею — лише коли його немає або він латиницею (order.recipient_missing)
const otherText = ref<Record<string, string>>({})
const errors = ref<Record<string, string>>({})
const helpOpen = ref(false)
const saving = ref(false)
const saveError = ref(false)

// Відповіді, які дав сам клієнт: обрав варіант або пройшов крок кнопкою «Далі» (так він
// підтвердив і підставлене «так, моя»). Підставлене на кроці, якого він ще не пройшов, — не його
// відповідь, менеджеру її не шлемо. Потрібне лише для збереження, тож не реактивне
let given = new Set<string>()

// Номер клієнт править прямо тут, пропси не мутуємо
const phone = ref('')
const phoneEdited = ref(false)
const phoneEditing = ref(false)
const phoneDraft = ref('')
const phoneError = ref('')
const phoneRef = ref<HTMLInputElement | null>(null)
const rootRef = ref<HTMLElement | null>(null)

const smooth = (): ScrollBehavior =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

// Новий крок — з початку картки. На телефоні «Далі» натискають унизу довгого кроку, і без
// цього наступне питання відкрилося б вище краю екрана. Під прибиту шапку не ховаємо —
// відступ дає scroll-margin-top у стилях
function toTop() {
	nextTick(() => {
		const el = rootRef.value
		if (!el || el.getBoundingClientRect().top >= parseFloat(getComputedStyle(el).scrollMarginTop)) return
		el.scrollIntoView({ block: 'start', behavior: smooth() })
	})
}

// Блоки варіантів за ключем питання — щоб трусити саме той, де немає відповіді
const fieldsets = new Map<string, HTMLElement>()
const setFieldset = (key: string, el: unknown) => {
	if (el instanceof HTMLElement) fieldsets.set(key, el)
	else fieldsets.delete(key)
}

// Показуємо блок варіантів, де бракує відповіді, коли клієнт натиснув «Далі», нічого не обравши.
// Спершу докручуємо до нього: на телефоні питання 4G / 5G під плитками часто нижче краю
// екрана, і без цього кнопка «просто не працювала б». Потім трусимо: червоний рядок легко
// проґавити, а рух показує, ДЕ саме затримка.
// Element.animate, а не CSS-клас: клас не перезапустився б при повторному кліку
function flagOptions(key: string) {
	const el = fieldsets.get(key)
	if (!el) return

	const r = el.getBoundingClientRect()
	if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: smooth() })
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

	el.animate(
		[
			{ transform: 'translateX(0)' },
			{ transform: 'translateX(-8px)' },
			{ transform: 'translateX(7px)' },
			{ transform: 'translateX(-5px)' },
			{ transform: 'translateX(4px)' },
			{ transform: 'translateX(0)' },
		],
		{ duration: 420, easing: 'ease-in-out' }
	)
}

// Підозри щодо номера: поки це номер із замовлення — вердикт бекенда (PhoneCheck, він знає
// й операторів); виправлений клієнтом — перевіряємо тут же, щоб тривога зникала одразу,
// щойно цифри стали схожими на правду
const phoneCheck = computed(() =>
	phoneEdited.value ? (ocPhoneSuspicious(phoneDigits(phone.value)) ? 'bad' : 'ok') : order.value.phone_check
)
const phoneAlarm = computed(() => editable.value && phoneCheck.value === 'bad')
const phoneSoft = computed(() => editable.value && phoneCheck.value === 'soft')

// Стан опитувальника — зі збереженого, якщо клієнт уже відповідав (повернувся з MonoPay,
// перезавантажив сторінку), інакше з нуля
function reset() {
	const saved = props.data.saved
	answers.value = {}
	otherText.value = {}
	// Збережену відповідь беремо, лише поки такий варіант ще є (питання могли змінитись)
	blocks.value.forEach((b) => {
		if (b.kind !== 'question') return
		const a = saved?.answers[b.key]
		if (a && b.options.some((o) => o.v === a.v)) {
			answers.value[b.key] = { ...a }
			if (a.text) otherText.value[b.key] = a.text
		} else if (b.default) answers.value[b.key] = { v: b.default }
	})
	given = new Set(Object.keys(saved?.answers || {}))
	comment.value = saved?.comment || ''
	commentOpen.value = !!comment.value
	address.value = saved?.address || ''
	recipient.value = saved?.recipient || ''
	noCall.value = saved?.no_call ?? true
	errors.value = {}
	saveError.value = false
	phone.value = saved?.phone || order.value.phone
	phoneEdited.value = !!saved?.phone
	phoneError.value = ''
	phoneDraft.value = maskPhone(phone.value)
	// Підозрілий номер одразу відкриває поле: шукати, де його правити, клієнт не мусить
	phoneEditing.value = phoneAlarm.value

	// Продовжуємо там, де зупинився: підтверджене — фінальний екран (поки замовлення не в роботі),
	// інакше перший крок, де бракує збереженої відповіді (усі є — зведення)
	const got = saved?.answers || {}
	const open = steps.value.findIndex((s) => shown(s, got).some((q) => !got[q.key]))
	stepIndex.value = saved && (saved.done || open < 0) ? steps.value.length : Math.max(open, 0)
	state.value = saved?.done && editable.value ? 'done' : 'ask'
}

// Питання кроку, які показуємо: клієнт сказав у плитках «Інша, немає в списку» — питати 4G / 5G
// про модель, якої в нього немає, безглуздо. Мережевий блок тієї ж групи ховаємо (і не вимагаємо)
function shown(list: OcBlock[], picked: Record<string, { v: string }>) {
	const otherPicked = list.some((q) => q.layout === 'tiles' && picked[q.key]?.v === 'other')
	return otherPicked ? list.filter((q) => !q.key.startsWith('net:')) : list
}

// ─────────────────────────── Кроки ───────────────────────────

const questions = computed(() => blocks.value.filter((b) => b.kind === 'question'))

// Крок = група питань (group), у порядку появи першого питання групи
const allSteps = computed(() => {
	const map = new Map<string, OcBlock[]>()
	questions.value.forEach((q) => {
		const g = q.group || q.key
		map.set(g, [...(map.get(g) || []), q])
	})
	return [...map.values()]
})

// Питань забагато (кроки + зведення > ліміту екранів — рахує бекенд) — кроків не показуємо
// зовсім: лише зведення, і звіряє менеджер. «Можна без дзвінка» тоді не пропонуємо — дзвінок
// і є спосіб підтвердження
const tooMany = computed(() => props.data.too_many)
const steps = computed(() => (!editable.value || tooMany.value ? [] : allSteps.value))

reset()
watch(
	() => props.data,
	() => {
		fresh.value = {}
		reset()
		refreshColors()
	}
)

// Одним екраном — лише коли питань немає зовсім. Навіть одне питання йде окремим кроком
// перед зведенням: разом із плитками, оплатою і галочкою «не телефонувати» екран виходив
// задовгим, і питання губилося серед того, що від клієнта нічого не вимагає
const single = computed(() => steps.value.length === 0)

const showQuestion = computed(() => stepIndex.value < steps.value.length)
const showSummary = computed(() => !showQuestion.value)
const stepBlocks = computed(() => shown(steps.value[stepIndex.value] || [], answers.value))

const dots = computed(() => (single.value ? 0 : steps.value.length + 1))
const canBack = computed(() => stepIndex.value > 0)

const pickable = (q: OcBlock) => q.options.filter((o) => !o.input)
const freeInput = (q: OcBlock) => q.options.find((o) => o.input) || null

// Червона плашка — над першим питанням про модель на екрані. Є на екрані 4G / 5G —
// просимо перевірити і версію: саме її клієнт найчастіше не знає
const alertAt = computed(() => stepBlocks.value.findIndex((q) => q.topic === 'model'))
const alertText = computed(() =>
	stepBlocks.value.some((q) => q.key.startsWith('net:')) ? t('confirm.alertNet') : t('confirm.alertModel')
)

// Текст питання з виділеною назвою моделі (на сайті жирним, у чаті — звичайним текстом)
function textParts(q: OcBlock) {
	const i = q.strong ? q.text.indexOf(q.strong) : -1
	if (i < 0) return [{ t: q.text, b: false }]
	return [
		{ t: q.text.slice(0, i), b: false },
		{ t: q.strong!, b: true },
		{ t: q.text.slice(i + q.strong!.length), b: false },
	]
}

// Рядок під заголовком — не лічильник, а рамка розмови: замовлення вже прийняте, від
// клієнта нічого не «вимагають». Скільки лишилось, показують крапки прогресу
const subline = computed(() => {
	if (!editable.value) return t('confirm.subReadonly')
	if (single.value) return t('confirm.subSingle')
	if (showSummary.value) return t('confirm.subLast')
	return steps.value.length === 1 ? t('confirm.subOne') : t('confirm.subMany')
})

const ctaLabel = computed(() => (showSummary.value ? t('confirm.confirm') : t('confirm.next')))

// ─────────────────────────── Відповіді ───────────────────────────

// Готовий шлях сайту беремо як є, коротке імʼя файлу — картинка моделі зі сховища
const optionImage = (o: OcOption) => (o.image?.startsWith('/') ? o.image : url.categoryImg(o.image))

// Власні розміри файлів — лише підказка браузеру проти стрибка верстки; кадр тримає CSS
const media = (q: OcBlock) => (q.media === 'photo' ? { w: 600, h: 760 } : { w: 200, h: 200 })

const isPicked = (q: OcBlock, v: string) => answers.value[q.key]?.v === v

function pick(q: OcBlock, o: OcOption) {
	answers.value[q.key] = { v: o.v }
	given.add(q.key)
	save.later()
	errors.value[q.key] = ''
	if (o.input) nextTick(() => document.getElementById(`oc-other-${q.key}`)?.focus())
}

// Будь-яка відповідь про модель, крім «так, моя» — прапорець менеджеру. Зокрема й вибір
// 4G / 5G там, де ми не знали, яка версія наша: звірити заготовку однаково мусить людина
const isDoubt = (b: OcBlock) => b.topic === 'model' && !!answers.value[b.key] && answers.value[b.key].v !== 'ok'

const modelDoubt = computed(() => questions.value.some(isDoubt))
const doubtPicked = computed(() => showQuestion.value && stepBlocks.value.some(isDoubt))

// Як назвати модель позиції після відповідей: плитки кажуть «яка модель», 4G / 5G — «яка версія»
function modelValue(modelId: number | null, fallback: string) {
	let name = fallback
	let tail = ''
	let picked = false

	for (const b of blocks.value.filter((x) => modelId && x.group === `model:${modelId}`)) {
		const a = answers.value[b.key]
		if (!a || a.v === 'ok') continue
		if (a.v === 'other') return a.text || otherText.value[b.key]?.trim() || t('confirm.otherTyped')
		if (a.v === 'unknown') {
			tail = ` (${t('confirm.netUnknown')})`
			continue
		}
		const o = b.options.find((x) => x.v === a.v)
		// Версію дописуємо до вже обраної в плитках моделі: «Galaxy A22, 5G»
		if (b.layout === 'tiles' || !picked) name = o?.summary || o?.label || name
		else if (o?.net) tail = `, ${o.net}`
		picked = true
	}

	return name + tail
}

// Моделі, які менеджер уточнить (для фінального екрана)
const doubtModels = computed(() =>
	[...new Map<number, IOrderConfirmItem>(items.value.map((i) => [i.model_id || i.id, i])).values()]
		.map((i) => ({ from: i.model, to: modelValue(i.model_id, i.model || '') }))
		.filter((m) => m.from !== m.to)
		.map((m) => m.to)
		.join('; ')
)

// Колір боків позиції: у питанні — обраний варіант, в info-блоці — констатація.
// Позицію шукаємо за item_id: ключ питання — від моделі й дизайну, id позиції в ньому немає
function colorValue(itemId: number) {
	const b = blocks.value.find((x) => x.topic === 'color' && x.item_id === itemId)
	if (!b) return ''
	if (b.kind === 'info') return b.summary || ''
	return b.options.find((x) => x.v === answers.value[b.key]?.v)?.summary || ''
}

// Позиції поточного кроку — лише коли товарів у замовленні кілька. Крок моделі стосується
// всіх позицій із цією моделлю (два чохли на один телефон — одне питання), крок боків — однієї
const stepItems = computed(() => {
	if (items.value.length < 2 || !showQuestion.value) return []
	const q = stepBlocks.value[0]
	if (!q) return []
	if (q.topic === 'color') return items.value.filter((i) => i.id === q.item_id)
	return items.value.filter((i) => i.model_id && q.group === `model:${i.model_id}`)
})

// Позиції для зведення. Модель пишемо, лише коли вона щось додає: назва товару її не містить
// («Чохол з індивідуальним друком») або клієнт відповів, що в нього інша — тоді жовтим.
// Кодів у дужках («Galaxy A51 (A515)») у назві товару зазвичай немає — порівнюємо без них
const plain = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9а-яіїєґ]+/g, '')

const summaryItems = computed(() =>
	items.value.map((i) => {
		const model = i.model ? modelValue(i.model_id, i.model) : ''
		const changed = !!i.model && model !== i.model
		const showModel = changed || (!!model && !plain(i.title).includes(plain(model)))

		const meta = [
			i.qty > 1 ? t('confirm.qty', { n: i.qty }) : '',
			// Клієнт відповів сам — це його слова, а не наш сумнів: «ви вказали», жовтим,
			// бо менеджер ще звірить модель із заготовкою перед друком
			showModel ? t(changed ? 'confirm.youSaid' : 'confirm.model', { model }) : '',
			colorValue(i.id),
		].filter(Boolean).join(' · ')

		return { ...i, meta, changed }
	})
)

// ─────────────────────────── Оплата ───────────────────────────

// Кнопки, перехід на MonoPay і відмова бекенда — useOrderPay. Чи є на чому друкувати, уточнюємо
// вже після показу: на холодному кеші постачальників це секунди
const { payable, payLoading, payMode, check, pay: payOnline } = useOrderPay(() => order.value.id)

// Перед переходом на MonoPay — відкладене збереження одразу: сторінку зараз покинуть
function payGo(full: boolean) {
	save.flush()
	payOnline(full)
}

onMounted(() => {
	if (editable.value && pay.value.online && !props.justPaid) check()
})

// Що показати в блоці оплати. Оплачене й отриманий аванс вдруге не пропонуємо; заготовок
// під друк немає — пояснюємо лише тому, від кого оплату чекали (аванс або не накладений),
// накладеному без авансу блок просто не потрібен
const payState = computed(() => {
	const p = pay.value
	if (props.justPaid) return null
	if (p.paid) return 'paid'
	if (p.prepay_paid) return 'prepaid'
	if (!p.online) return null
	if (!payable.value) return p.prepay || !cod.value ? 'unavailable' : null
	if (p.prepay) return 'prepay'
	return cod.value ? 'cod' : 'online'
})

// Стани з кнопками (OrderConfirmPay) — на зведенні й на екрані «Підтверджено»; решта — рядок
const payKind = computed(() => {
	const s = payState.value
	return s === 'prepay' || s === 'cod' || s === 'online' ? s : null
})

// ─────────────────────────── Телефон ───────────────────────────

const phoneGrouped = computed(() => ocPhoneGrouped(phoneDigits(phone.value)))

function startPhoneEdit() {
	phoneDraft.value = maskPhone(phone.value)
	phoneError.value = ''
	phoneEditing.value = true
	nextTick(() => phoneRef.value?.focus())
}

function savePhone() {
	if (!isValidPhone(phoneDraft.value)) {
		phoneError.value = t('confirm.phoneError', { example: phoneExample.value })
		return
	}
	const digits = phoneDigits(phoneDraft.value)
	if (digits !== phoneDigits(phone.value)) {
		phone.value = digits
		phoneEdited.value = true
		save.later()
	}
	phoneError.value = ''
	phoneEditing.value = false
}

// ─────────────────────────── Навігація ───────────────────────────

// Латиницю в полі отримувача показуємо одразу, а не після «Підтверджую»: інакше клієнт
// упише те саме «MELNIK JOSIP» і дізнається про це лише внизу, біля кнопки
const recipientError = computed(() =>
	errors.value.recipient || (hasLatin(recipient.value) ? t('confirm.errRecipientLatin') : '')
)

// Поле зведення (#oc-{key}), без якого «Підтверджую» не пускає: докручуємо й ставимо фокус
function flagField(key: 'delivery' | 'recipient', error: string) {
	errors.value[key] = error
	const el = document.getElementById(`oc-${key}`)
	el?.scrollIntoView({ block: 'center', behavior: smooth() })
	el?.focus({ preventScroll: true })
}

// Усі питання екрана мають відповідь; перше порожнє — показуємо і трусимо
function validateStep(): boolean {
	for (const q of showQuestion.value ? stepBlocks.value : []) {
		if (q.options.length && !answers.value[q.key]) {
			errors.value[q.key] = t('confirm.errPick')
			flagOptions(q.key)
			return false
		}

		const free = freeInput(q)
		if (free && isPicked(q, free.v)) {
			const text = otherText.value[q.key]?.trim()
			if (!text) {
				errors.value[q.key] = t('confirm.errOther')
				nextTick(() => document.getElementById(`oc-other-${q.key}`)?.focus())
				return false
			}
			answers.value[q.key] = { v: free.v, text }
		}
	}
	return true
}

async function next() {
	if (saving.value || !validateStep()) return

	// Незакритий інлайн-редактор номера спершу треба зберегти. Помилка в номері — вгорі
	// картки, а клієнт унизу біля кнопки: фокус сам докрутить до поля
	if (phoneEditing.value) {
		savePhone()
		if (phoneError.value) {
			phoneRef.value?.focus()
			return
		}
	}

	if (showSummary.value) {
		// Без даних доставки й отримувача посилку не відправити — підтвердження без них не приймаємо
		if (order.value.delivery_missing && !address.value.trim()) {
			flagField('delivery', t('confirm.errDelivery'))
			return
		}
		if (order.value.recipient_missing && (!recipient.value.trim() || hasLatin(recipient.value))) {
			flagField('recipient', recipient.value.trim() ? t('confirm.errRecipientLatin') : t('confirm.errRecipient'))
			return
		}
		// Питання пропустили через їхню кількість — галочки не було, звіряє менеджер
		if (tooMany.value) noCall.value = false
		// «Підтверджено» без збереження було б неправдою: менеджер про нього не дізнається і подзвонить.
		// Не вийшло — лишаємось на зведенні з проханням спробувати ще раз
		saving.value = true
		saveError.value = false
		try {
			await save.now(true)
		} catch {
			saveError.value = true
			return
		} finally {
			saving.value = false
		}
		state.value = 'done'
	} else {
		// «Далі» — відповідь на всі питання кроку, зокрема й на підставлене «так, моя»
		stepBlocks.value.forEach((q) => given.add(q.key))
		save.now().catch(() => {})
		stepIndex.value++
	}
	toTop()
}

function back() {
	if (stepIndex.value > 0) stepIndex.value--
	errors.value = {}
	save.flush()
	toTop()
}

// ─────────────────────────── Збереження ───────────────────────────

// Весь стан, лише коди — тексти питань і відповідей для менеджера бекенд бере зі своїх блоків.
// Сховане питання 4G / 5G (у плитках обрано «Інша») бекенд відкидає сам
function payload(): IOrderConfirmAnswers {
	const out: IOrderConfirmAnswers['answers'] = {}
	questions.value.forEach((q) => {
		const a = answers.value[q.key]
		if (!a || !given.has(q.key)) return
		const text = freeInput(q)?.v === a.v ? otherText.value[q.key]?.trim() : ''
		out[q.key] = text ? { v: a.v, text } : { v: a.v }
	})
	return {
		answers: out,
		phone: phoneEdited.value ? phoneDigits(phone.value) : null,
		comment: comment.value.trim(),
		address: address.value.trim(),
		recipient: recipient.value.trim(),
		no_call: noCall.value,
		dispatch: dispatch.value,
	}
}

// Замовлення вже в роботі або адмінка ще без збереження (у відповіді немає saved) — не шлемо
const persist = computed(() => editable.value && props.data.saved !== undefined)

const save = useOcSaver((final) =>
	persist.value ? shopApi.saveOrderConfirm(order.value.id, props.token, payload(), final) : Promise.resolve()
)

// Наявність кольорів одразу після оформлення ще рахується (блок боків pending) — перепитуємо
// бекенд із wait=1 у фоні: клієнт тим часом на кроці моделі. Замінюємо лише блоки боків.
// Обраного кольору може вже не бути — тоді підставляємо те, що є (один колір — він і є відповідь).
// Блоку боків у відповіді немає — ні чорних, ні прозорих: крок прибираємо, клієнт лишається
// на тому ж кроці (зникне саме той, де він стоїть, — побачить наступний)
async function refreshColors() {
	if (!editable.value || !props.data.blocks.some((b) => b.pending)) return
	const res = await shopApi.getOrderConfirm(order.value.id, props.token, true).catch(() => null)
	if (!res) return
	freshDispatch.value = res.order?.dispatch || ''

	const group = (q?: OcBlock) => (q ? q.group || q.key : '')
	const here = group(steps.value[stepIndex.value]?.[0])
	const live = new Map(res.blocks.map((b) => [b.key, b]))
	let removed = false

	props.data.blocks.forEach((old) => {
		if (old.topic !== 'color') return
		const b = live.get(old.key)
		if (!b) {
			fresh.value[old.key] = null
			delete answers.value[old.key]
			if (given.delete(old.key)) save.later()
			removed = true
			return
		}
		if (!b.options.length) return
		fresh.value[b.key] = b
		const a = answers.value[b.key]
		if (a && b.options.some((o) => o.v === a.v)) return
		if (b.default) answers.value[b.key] = { v: b.default }
		else delete answers.value[b.key]
		if (given.has(b.key)) save.later()
	})

	if (removed) {
		const i = here ? steps.value.findIndex((s) => group(s[0]) === here) : -1
		stepIndex.value = i >= 0 ? i : Math.min(stepIndex.value, steps.value.length)
	}
}

onMounted(refreshColors)

function openComment() {
	commentOpen.value = true
	nextTick(() => document.getElementById('oc-comment')?.focus())
}
</script>

<style scoped>
.oc {
	max-width: 620px;
	margin: 0 auto;
	/* toTop(): картка зупиняється під прибитою шапкою, а не ховається під нею */
	scroll-margin-top: calc(var(--header-stuck-h) + 12px);
}

.oc__box {
	padding: 20px 18px 16px;
}

/* ───────── Шапка ───────── */
.oc__head {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.oc__back {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	width: 34px;
	height: 34px;
	margin-top: 1px;
	border-radius: var(--radius-pill);
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	color: var(--text-soft);
}

.oc__back :deep(svg) {
	transform: rotate(180deg);
}

.oc__back:hover {
	color: var(--text);
	border-color: var(--border-light);
}

.oc__head-text {
	min-width: 0;
}

.oc__title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 18px;
	line-height: 1.25;
}

.oc__title-check {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	width: 22px;
	height: 22px;
	border-radius: var(--radius-pill);
	background: var(--success);
	color: var(--on-accent);
}

.oc__sub {
	margin-top: 5px;
	font-size: 13.5px;
	line-height: 1.4;
	color: var(--text-muted);
}

/* ───────── Прогрес ───────── */
/* padding: 0 обов'язковий — у main.css скинуто `ul`, але не `ol`, і крапки з'їжджали
   на браузерні 40px вправо відносно решти картки */
.oc__dots {
	display: flex;
	gap: 6px;
	margin: 14px 0 2px;
	padding: 0;
	list-style: none;
}

.oc__dot {
	height: 4px;
	flex: 1 1 0;
	border-radius: var(--radius-pill);
	background: var(--border);
	transition: background 0.2s;
}

.oc__dot.is-done {
	background: var(--accent-active);
}

.oc__dot.is-now {
	background: var(--accent);
}

/* ───────── Питання ───────── */
.oc__q {
	padding-top: 18px;
}

/* Текст питання і є заголовком кроку — окремої назви блоку над ним немає */
.oc__q-text {
	font-size: 16px;
	font-weight: 600;
	line-height: 1.4;
}

/* Назва моделі в питанні — те, що клієнт мусить звірити, тому контрастніше за решту речення */
.oc__q-name {
	font-weight: 800;
	color: var(--accent-text);
}

/* Позиція, про яку крок, — у замовленні з кількома товарами. Рядки ті самі, що у зведенні,
   але в плашці: це підпис до питання, а не частина переліку */
.oc__items--step {
	margin-bottom: 14px;
	padding: 0 12px;
	border-radius: var(--radius-sm);
	background: var(--bg-elevated);
}

.oc__items--step .oc__item:last-child {
	border-bottom: 0;
}

/* Друге питання того самого екрана (4G / 5G під плитками) — відділене, але не новим кроком */
.oc__q--more {
	margin-top: 22px;
	border-top: 1px dashed var(--border);
}

/* ───────── Червоне попередження ─────────
   Єдине місце екрана, де ми клієнта не заспокоюємо, а просимо піти й перевірити:
   помилка в моделі коштує чохла, і фото її не ловить. Тому червоним, з підкладкою
   і з окремою кнопкою інструкції, а не сірим рядком під плитками. */
.oc__alert {
	margin-top: 10px;
	padding: 9px 12px;
	border-left: 3px solid var(--danger);
	border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	background: var(--danger-soft);
	font-size: 13.5px;
	/* просторіше за звичайний текст: у рядок вбудована пілюля кнопки */
	line-height: 1.7;
	color: var(--text);
}

.oc__alert b {
	color: var(--danger);
	text-transform: uppercase;
	letter-spacing: 0.02em;
}

/* Не червона: на червоній плашці ще один червоний елемент не читався б як «натисни».
   Помаранчевий — колір усіх посилань сайту, тож клікабельність тут очевидна */
.oc__alert-help {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	vertical-align: -4px;
	margin-left: 6px;
	padding: 3px 9px 3px 7px;
	border-radius: var(--radius-pill);
	background: var(--bg-elevated);
	font-size: 12.5px;
	font-weight: 600;
	line-height: 1.4;
	color: var(--accent-text);
	white-space: nowrap;
}

.oc__alert-help:hover {
	background: var(--accent);
	color: var(--on-accent);
}

/* ───────── Вікно інструкції ───────── */
.oc__help dt {
	margin-top: 12px;
	font-size: 12px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--text-muted);
}

.oc__help dt:first-child {
	margin-top: 0;
}

.oc__help dd {
	margin: 4px 0 0;
	font-size: 14.5px;
	line-height: 1.45;
	font-weight: 600;
}

.oc__help-foot {
	margin-top: 16px;
	padding-top: 12px;
	border-top: 1px solid var(--border);
	font-size: 13px;
	line-height: 1.45;
	color: var(--text-muted);
}

.oc__note {
	display: block;
	margin-top: 10px;
	padding: 9px 12px;
	border-radius: var(--radius-sm);
	background: var(--bg-elevated);
	font-size: 13px;
	line-height: 1.45;
	color: var(--text-muted);
}

.oc__note--warn {
	background: var(--warning-soft);
	color: var(--warning);
}

.oc__note--ok {
	background: var(--accent-soft);
	color: var(--text-soft);
}

.oc__fieldset {
	margin: 0;
	padding: 0;
	border: 0;
}

/* ───────── Плитки моделей ───────── */
.oc__tiles {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
	gap: 8px;
	margin-top: 14px;
}

/* Два портретні знімки на всю ширину картки виросли б під 400px і з'їли б увесь екран.
   Стеля ширини: кант однаково добре видно, а питання лишається питанням, а не плакатом.
   На телефоні треки самі стискаються до половини ширини.
   Вирівнювання — по лівому краю, як і решта опитувальника (питання, плашка, «Інша»,
   рядки 4G / 5G): плитка під заголовком читається як відповідь на нього. По центру одна
   плитка в широкій картці відривалась від питання, а моделі й боки стояли по-різному */
.oc__tiles--photo {
	grid-template-columns: repeat(2, minmax(0, 236px));
}

/* Одна плитка — модель ні з чим не плутають, лише «так, моя». auto-fit розтягнув би її
   на всю ширину картки, тож ширина — як у плитки з ряду з чотирьох. Два класи, щоб
   перебити й мобільну сітку 2×2 */
.oc__tiles.oc__tiles--one {
	grid-template-columns: minmax(0, 150px);
}

/* Один знімок канта — у постачальників лише один колір боків: не питаємо, а показуємо.
   Розмір той самий, що в пари на вибір, — кант має бути так само добре видно */
.oc__tiles--photo.oc__tiles--one {
	grid-template-columns: minmax(0, 236px);
}

.oc__tile {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	/* Однаково з усіх боків: картинка тягнеться на всю ширину контенту, тож будь-яка
	   різниця в паддінгах читається як кривий відступ саме під нею */
	padding: 12px;
	border: 2px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-soft);
	cursor: pointer;
	transition: border-color 0.15s, background 0.15s;
}

.oc__tile:hover {
	border-color: var(--border-light);
}

.oc__tile.is-on {
	border-color: var(--accent);
	background: var(--accent-soft);
}

.oc__tile-img {
	width: 100%;
	height: auto;
	border-radius: var(--radius-sm);
	transition: opacity 0.15s, filter 0.15s;
}

/* Прев'ю каталогу — квадрат 200×200 на БІЛОМУ тлі, тому під нього й підкладка --img-bg:
   на темній картці фото інакше виглядало б як біла пляма невідомої форми */
.oc__tile-img--square {
	aspect-ratio: 1;
	object-fit: contain;
	background: var(--img-bg);
}

/* Предметний знімок канта: пропорція рівно як у файлів (600×760), щоб кадр, вирізаний
   вручну, не підрізався верствкою — кант іде всією діагоналлю, і зрізати його зверху
   чи знизу означало б зрізати саму відповідь на питання */
.oc__tile-img--photo {
	aspect-ratio: 600 / 760;
	object-fit: cover;
}

.oc__tile-note {
	font-size: 11.5px;
	line-height: 1.35;
	text-align: center;
	color: var(--text-muted);
}

.oc__tile-label {
	font-size: 12.5px;
	font-weight: 600;
	line-height: 1.3;
	text-align: center;
	transition: color 0.15s;
}

/* ───────── Приглушення необраних моделей ─────────
   Питання тут — «підтвердь свою», а не «обери з чотирьох»: чотири однаково яскравих
   фото роблять із нього вибір з нуля. Тому необрані тьмяніють, а своя лишається
   у повному кольорі.

   Три обмеження, щоб це не перетворилось на «ці недоступні»:
   1. Гасимо ТІЛЬКИ фото (0.4 + десатурація). Назва моделі лишається читабельною —
      саме її клієнт і мусить звірити, а не колір корпусу (про це ж і червона плашка
      вище). Якщо гасити ще й назви, питання «50A чи 50i» стає нечитабельним саме там,
      де воно й вирішується.
   2. Колір повертається не лише по hover, а й по :focus-within — інакше той, хто ходить
      з клавіатури, бачив би плитки тьмяними завжди.
   3. Правило не чіпає плитки боків чохла (.oc__tiles--photo): там два рівноцінні знімки,
      які треба порівняти, і жоден не має бути тьмянішим за інший. */
.oc__tiles:not(.oc__tiles--photo) .oc__tile:not(.is-on) .oc__tile-img {
	opacity: 0.4;
	filter: saturate(0.5);
}

.oc__tiles:not(.oc__tiles--photo) .oc__tile:not(.is-on) .oc__tile-label {
	color: var(--text-soft);
}

.oc__tiles:not(.oc__tiles--photo) .oc__tile:hover .oc__tile-img,
.oc__tiles:not(.oc__tiles--photo) .oc__tile:focus-within .oc__tile-img {
	opacity: 1;
	filter: none;
}

.oc__tiles:not(.oc__tiles--photo) .oc__tile:hover .oc__tile-label,
.oc__tiles:not(.oc__tiles--photo) .oc__tile:focus-within .oc__tile-label {
	color: var(--text);
}

.oc__tile-tag {
	padding: 2px 7px;
	border-radius: var(--radius-pill);
	background: var(--bg-elevated);
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--text-muted);
}

.oc__tile.is-on .oc__tile-tag {
	background: var(--accent);
	color: var(--on-accent);
}

/* ───────── Широкі рядки ───────── */
.oc__rows {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 14px;
}

.oc__row {
	position: relative;
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: 58px;
	padding: 10px 44px 10px 12px;
	border: 2px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-soft);
	cursor: pointer;
	transition: border-color 0.15s, background 0.15s;
}

.oc__row:hover {
	border-color: var(--border-light);
}

.oc__row.is-on {
	border-color: var(--accent);
	background: var(--accent-soft);
}

.oc__row--slim {
	min-height: 48px;
}

.oc__row-ico {
	flex: 0 0 auto;
	color: var(--text-muted);
}

.oc__row-text {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.oc__row-text b {
	font-size: 14.5px;
	font-weight: 600;
}

.oc__row-text i {
	font-style: normal;
	font-size: 12.5px;
	color: var(--text-muted);
}

/* ───────── Галочка вибраного ───────── */
.oc__mark {
	position: absolute;
	top: 8px;
	right: 8px;
	display: grid;
	place-items: center;
	width: 20px;
	height: 20px;
	border-radius: var(--radius-pill);
	background: var(--accent);
	color: var(--on-accent);
	opacity: 0;
	transform: scale(0.7);
	transition: opacity 0.15s, transform 0.15s;
}

.oc__row .oc__mark {
	top: 50%;
	margin-top: -10px;
	right: 12px;
}

.is-on .oc__mark {
	opacity: 1;
	transform: scale(1);
}

/* ───────── «Інша модель» ───────── */
.oc__other {
	margin-top: 8px;
}

.oc__other-field {
	margin-top: 8px;
}

/* ───────── Телефон ─────────
   Найпомітніше місце картки після заголовка. Червоним не робимо без причини: червона
   плашка вже є в питанні про модель, і два червоні блоки на одному екрані гасять
   один одного. Наголос тримають самі цифри — більшого кегля на екрані немає. */
.oc__phone-bar {
	margin-top: 14px;
	padding: 11px 14px;
	border: 1px solid var(--border);
	border-left: 3px solid var(--accent);
	border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	background: var(--bg-elevated);
}

.oc__phone-bar.is-alarm {
	border-color: var(--danger);
	background: var(--danger-soft);
}

/* Невідомий код оператора: номер ще може бути правильним, тож поле не відкриваємо і тло
   не фарбуємо — але й тихим сірим рядком це не лишаємо: червона смужка зліва */
.oc__phone-bar.is-warn {
	border-left-color: var(--danger);
}

/* Підозрілий номер (обидва стани) — смуга постійно «пульсує» червоним обідком, доки клієнт
   не виправить номер: рух око ловить швидше за колір, а номер — найдорожча помилка в замовленні */
.oc__phone-bar.is-alarm,
.oc__phone-bar.is-warn {
	animation: oc-phone-attn 1.6s ease-in-out infinite;
}

@keyframes oc-phone-attn {
	50% {
		box-shadow: 0 0 0 5px var(--danger-soft);
	}
}

@media (prefers-reduced-motion: reduce) {
	.oc__phone-bar.is-alarm,
	.oc__phone-bar.is-warn {
		animation: none;
	}
}

.oc__phone-top {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 10px;
}

/* Це вже не назва поля, а прохання — тому світліше за звичайний підпис */
.oc__phone-cap {
	font-size: 11.5px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-soft);
}

.oc__phone-big {
	display: block;
	margin-top: 3px;
	font-size: 27px;
	font-weight: 700;
	line-height: 1.15;
	letter-spacing: 0.05em;
	font-variant-numeric: tabular-nums;
}

.oc__phone-why {
	margin-top: 6px;
	font-size: 12.5px;
	line-height: 1.45;
	color: var(--text-muted);
}

.oc__phone-why b {
	color: var(--danger);
}

.oc__phone-why--warn {
	font-weight: 600;
	color: var(--danger);
}

.oc__phone-edit {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 6px;
}

.oc__phone-field {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.oc__phone-code {
	font-size: 15px;
	color: var(--text-muted);
}

/* Ширина — у символах, а не в px: 13 знаків маски «099-000-00-00» у будь-якому шрифті бренду
   (найширша цифра — «0», дефіси вужчі, тож 14ch покривають і розрядку, і курсор). 150 px
   обрізали останню цифру в Inter, Manrope і Nunito. content-box — відступи й рамка
   .form-control додаються зверху і не з'їдають місце цифр */
.oc__phone-input {
	box-sizing: content-box;
	width: 14ch;
	font-size: 17px;
	letter-spacing: 0.04em;
}

/* ───────── Зведення ───────── */
.oc__sum-wrap {
	padding-top: 18px;
}

/* ───────── Позиції у зведенні ───────── */
.oc__items {
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;
}

.oc__item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 0;
	border-bottom: 1px solid var(--border);
}

/* Рамка — .thumb-frame у main.css, тут лише розмір */
.oc__item-thumb {
	width: 44px;
	height: 44px;
	padding: 4px;
}

.oc__item-text {
	display: grid;
	gap: 3px;
	flex: 1;
	min-width: 0;
}

.oc__item-title {
	font-size: 13.5px;
	line-height: 1.35;
	color: var(--text);
}

.oc__item-meta {
	font-size: 12.5px;
	color: var(--text-muted);
}

.oc__item-meta.is-warn {
	color: var(--warning);
}

.oc__item-price {
	flex: 0 0 auto;
	font-size: 13.5px;
	font-weight: 600;
	white-space: nowrap;
}

.oc__items-total {
	display: flex;
	justify-content: space-between;
	padding-top: 10px;
	font-size: 14px;
}

/* Знижка кошика — довідковий рядок над «Разом», тихіше за нього */
.oc__items-total--minor {
	font-size: 13px;
	color: var(--text-muted);
}

/* Що буде далі — єдине НОВЕ на екрані, тому єдиний виділений блок */
.oc__next {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	margin-top: 12px;
	padding: 12px 14px;
	border-left: 3px solid var(--accent);
	border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	background: var(--accent-soft);
}

.oc__next-ico {
	flex: 0 0 auto;
	margin-top: 2px;
	color: var(--accent);
}

.oc__next-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.oc__next-text b {
	font-size: 16px;
	color: var(--accent-text);
}

.oc__next-text i {
	font-style: normal;
	font-size: 13px;
	color: var(--text-soft);
}

.oc__sum-edit {
	font-size: 12.5px;
	font-weight: 400;
	color: var(--accent-text);
	text-decoration: underline;
	text-underline-offset: 2px;
}

/* ───────── «Не телефонувати» ───────── */
/* ───────── Коментар ───────── */
.oc__comment {
	margin-top: 10px;
}

.oc__deliv-field {
	margin-top: 8px;
}

.oc__comment-open {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	margin-top: 0;
	text-decoration: none;
}

.oc__comment-open:hover {
	text-decoration: underline;
}

.oc__comment-field {
	min-height: 64px;
	font-size: 13.5px;
	line-height: 1.45;
	resize: vertical;
}

.oc__check {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	margin-top: 14px;
	padding: 12px 13px;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-soft);
	cursor: pointer;
}

.oc__check input {
	flex: 0 0 auto;
	width: 20px;
	height: 20px;
	margin-top: 1px;
	accent-color: var(--accent);
}

.oc__check-text {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.oc__check-text b {
	font-size: 14.5px;
}

.oc__check-text i {
	font-style: normal;
	font-size: 12.5px;
	color: var(--text-muted);
}

/* ───────── Кнопка ─────────
   Прибита до низу екрана, поки картка довша за нього: на фінальному екрані зі зведенням
   «Підтверджую» не має ховатись під згином. Скруглення — щоб підкладка не вилазила
   за кути картки. */
/* Великими літерами: це фінальне слово клієнта, воно має читатись як печатка.
   Рамка на відступі м'яко відходить і тьмяніє — рух без жодного JS */
.oc__confirm {
	text-transform: uppercase;
	letter-spacing: 0.04em;
	outline: 2px solid var(--accent);
	outline-offset: 3px;
	animation: oc-ring 2.4s ease-in-out infinite;
}

@keyframes oc-ring {
	50% {
		outline-offset: 6px;
		outline-color: var(--accent-glow);
	}
}

@media (prefers-reduced-motion: reduce) {
	.oc__confirm {
		animation: none;
	}
}

.oc__cta {
	position: sticky;
	bottom: 0;
	margin: 18px -18px -16px;
	padding: 14px 18px 16px;
	background: var(--bg-card);
	border-top: 1px solid var(--border);
	border-radius: 0 0 var(--radius) var(--radius);
}

/* «Не вдалося зберегти» — під кнопкою, яку треба натиснути ще раз */
.oc__save-error {
	text-align: center;
}




/* ───────── Фінальні екрани ───────── */
.oc__box--final {
	padding: 34px 20px 28px;
	text-align: center;
}

.oc__box--final .oc__title,
.oc__box--final .oc__sub {
	justify-content: center;
}

.oc__box--final .oc__sub {
	max-width: 420px;
	margin: 8px auto 0;
	font-size: 14.5px;
	color: var(--text-soft);
}

.oc__box--final .oc__note {
	max-width: 440px;
	margin: 14px auto 0;
	text-align: left;
}

/* Кнопки оплати — тієї ж ширини, що й рядки над ними (корінь OrderConfirmPay). Два класи —
   щоб перебити власний відступ компонента незалежно від порядку стилів */
.oc__box--final .oc__final-pay {
	max-width: 440px;
	margin: 18px auto 0;
}

.oc__final-icon {
	display: grid;
	place-items: center;
	width: 60px;
	height: 60px;
	margin: 0 auto 16px;
	border-radius: var(--radius-pill);
	background: var(--success);
	color: var(--on-accent);
}


.oc__final-actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	margin-top: 22px;
}

/* ───────── Силует замість фото ─────────
   Модель без image_file у каталозі — телефон на CSS: острівець камери з двома об'єктивами */
.oc__shape {
	position: relative;
	flex: 0 0 auto;
	width: 52px;
	height: 92px;
	border-radius: 9px;
	background: var(--bg-elevated);
	border: 2px solid var(--border-light);
}

.oc__shape::before {
	content: '';
	position: absolute;
	top: 6px;
	left: 6px;
	width: 16px;
	height: 22px;
	border-radius: 5px;
	background: var(--bg-deep);
	box-shadow: inset 0 0 0 1px var(--border-light);
}

.oc__shape::after {
	content: '';
	position: absolute;
	top: 10px;
	left: 11px;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--text-muted);
	box-shadow: 0 8px 0 var(--text-muted);
}

/* ───────── Перехід між кроками ───────── */
.oc-step-enter-active,
.oc-step-leave-active {
	transition: opacity 0.14s ease, transform 0.14s ease;
}

.oc-step-enter-from {
	opacity: 0;
	transform: translateX(10px);
}

.oc-step-leave-to {
	opacity: 0;
	transform: translateX(-10px);
}

@media (max-width: 480px) {
	.oc__box {
		padding: 18px 14px 14px;
	}

	/* Рівна сітка 2×2 замість «три плитки й одна під ними»: на телефоні так і зручніше
	   цілитись пальцем, і видно, що варіантів саме чотири */
	.oc__tiles {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.oc__cta {
		margin: 16px -14px -14px;
		padding: 12px 14px 14px;
	}

	/* Номер великими цифрами з кнопкою в рядок не вміщується: поле — на всю ширину смуги,
	   «Готово» — під ним (а не поле з порожнечею праворуч) */
	.oc__phone-field {
		flex: 1 1 100%;
	}

	.oc__phone-input {
		flex: 1 1 auto;
		min-width: 0;
	}
}
</style>
