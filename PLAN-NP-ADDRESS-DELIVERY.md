# Адресна (кур'єрська) доставка Нової Пошти — від кошика до ТТН

> **Статус: реалізовано 2026-08-18** — сайт, БД, бекенд і форма адмінки. Колонки на локальній БД
> уже додані (перевірено тим самим SQL, що піде на прод). Не перевірено живою ТТН: запис у НП
> (`Address.save` + `InternetDocument.save`) — єдине, що не звіряється читаючими запитами.
>
> Відхилення від плану (обидва — у бік простоти): **поштомати лишились на тому самому шляху,
> що й відділення** (`WarehouseWarehouse`), бо так це працює в проді вже зараз — окремий
> `WarehousePostomat` не вводимо без потреби; **довідник вулиць — напряму з браузера**, бо метод
> НП виявився відкритим без ключа, тож проксі та кеш в адмінці не знадобились.

## 1. Рішення одним абзацом

`orders.delivery` **не чіпаємо** (35 місць в адмінці порівнюють його з `'n_pochta'`). Додаємо
**окремий вимір** — `orders.delivery_type` (`warehouse` | `courier`, у перспективі `postomat`),
плюс 4 колонки під адресу (`street_ref`, `street`, `house`, `flat`). Уся різниця в ТТН зводиться
до двох полів запиту НП: `ServiceType = WarehouseDoors` і `RecipientAddress = <Ref створеної адреси>`
замість `Ref` відділення. Вулиці тягнемо з довідника НП (`Address.getStreet`) **напряму з браузера** —
метод відкритий без API-ключа (перевірено, §3.1), тобто це рівно те саме, що вже робить
[useNovaPochta.ts](composables/useNovaPochta.ts) для міст і відділень: +12 рядків і нуль бекенду.
У кошику додається один чіп-перемикач і два поля — уся решта форми (місто, оплата, валідація,
збереження в localStorage) працює як є.

| Що | Де зберігається | Хто заповнює |
|---|---|---|
| Тип точки доставки | `orders.delivery_type` | кошик сайту / форма адмінки |
| Вулиця (Ref + назва) | `orders.street_ref`, `orders.street` | автокомпліт із довідника НП |
| Будинок / квартира | `orders.house`, `orders.flat` | клієнт вручну |
| Читабельна адреса | `orders.address` (**вже є**) | збирається автоматично в `Order` |
| Тариф кур'єра | налаштування `public.common.delivery.n_pochta_kur` | адмінка (дерево налаштувань) |

Наслідки: **1 міграція, 0 нових моделей, 0 нових ручок API, 0 нових компонентів на сайті**
(перевикористовуємо [AutocompleteField.vue](components/AutocompleteField.vue)) — ≈265 рядків
коду разом із двома фронтами (розкладка по кроках — §11).

---

## 2. Модель даних

### 2.1 Колонки (адмінка)

Окремої міграції немає: колонки додані **в саму міграцію створення orders**
([2022_08_03_080918_create_orders_table.php](../FLOY-ADMIN/database/migrations/2022_08_03_080918_create_orders_table.php)),
тож на чистій БД вони з'являються самі. Для вже наявних баз — разовий SQL
([NOTES/orders_delivery_address.sql](../FLOY-ADMIN/NOTES/orders_delivery_address.sql)):

```sql
ALTER TABLE `orders`
	ADD COLUMN `delivery_type` VARCHAR(10)  NULL DEFAULT NULL AFTER `delivery`,
	ADD COLUMN `street_ref`    VARCHAR(36)  NULL DEFAULT NULL AFTER `warehouse_ref`,
	ADD COLUMN `street`        VARCHAR(100) NULL DEFAULT NULL AFTER `street_ref`,
	ADD COLUMN `house`         VARCHAR(20)  NULL DEFAULT NULL AFTER `street`,
	ADD COLUMN `flat`          VARCHAR(20)  NULL DEFAULT NULL AFTER `house`;
```

### 2.2 Чому саме так

- **Не новий `delivery = 'n_pochta_kur'`.** Перевізник і спосіб отримання — різні осі. Новий ключ у
  `delivery` зламав би 35 місць: [OrderAction::sendOrder](../FLOY-ADMIN/app/Actions/OrderAction.php#L23),
  `detectCarrier` у [ApiSite/OrderController](../FLOY-ADMIN/app/Http/Controllers/ApiSite/OrderController.php#L66),
  `ApiPROM::setTTN`, фільтри списку замовлень, статистику, `v-if` у формі.
- **Не JSON-колонка.** Форма адмінки біндить поля напряму (`record.house`), JSON вимагав би геттерів,
  валідації й ускладнив би фільтри.
- **`house`/`flat` окремо, а не парсингом з `address`.** НП приймає `BuildingNumber` і `Flat`
  окремими полями; парсити «вул. Соборна, 12, кв. 5» назад — джерело помилок на кожній нестандартній адресі.
- **`address` лишається читабельним рядком** — його вже показує адмінка, друк і SMS для Укрпошти,
  тож кур'єрська адреса з'явиться скрізь без нового UI. Збирається в одному місці:

```php
// app/Models/Order.php — викликається з actionInCreateOrUpdate()
public function composeAddress()
{
    if ($this->delivery_type !== 'courier') return;

    $this->address = implode(', ', array_filter([
        $this->street,
        $this->house ? 'буд. ' . $this->house : null,
        $this->flat  ? 'кв. '  . $this->flat  : null,
    ]));
}
```

### 2.3 Захист від «нової колонки на сайті раніше, ніж у БД»

[ApiSite/OrderController::sendOrder](../FLOY-ADMIN/app/Http/Controllers/ApiSite/OrderController.php#L83)
робить `Order::create($order)` з `$guarded = false`: **невідомий ключ у payload → SQL-помилка →
замовлення втрачено**. Тому міграція викочується першою, а разом із нею — страховка на майбутнє (2 рядки):

```php
$columns = Cache::rememberForever('orders_columns', fn() => Schema::getColumnListing('orders'));
$order   = array_intersect_key($order, array_flip($columns));
```

---

## 3. Довідник вулиць

### 3.1 Перевірено живим запитом

`Address.getStreet` — `{ CityRef, FindByString, Limit }` — **працює без API-ключа**, як `getCities`
і `getWarehouses`. Відповідь (Полтава, «собор»):

```json
{ "Description": "Соборності (Жовтнева)", "Ref": "5ba8cf51-…", "StreetsTypeRef": "Street", "StreetsType": "вул." }
{ "Description": "Соборний",             "Ref": "f516f291-…", "StreetsTypeRef": "Maidan",  "StreetsType": "майдан" }
```

Тобто label для автокомпліта = `StreetsType + ' ' + Description` → «вул. Соборності (Жовтнева)».
`CityRef` — той самий, що вже обирається в кошику через `getCities`.

Ще дві речі, які показала перевірка:

- **Вулиці є навіть у селах** (смт Опішня — 58 вулиць). Тому порожня видача означає «такої вулиці
  немає», а **не** «тут немає адресної доставки» — фолбек в UI треба формулювати саме так (§6.2).
- З порожнім `FindByString` метод віддає **весь** список міста. Не використовуємо: у Києві це
  десятки тисяч рядків. Завжди шукаємо на боці НП від 2 літер, `Limit = 50`.

### 3.2 Тому — напряму з браузера

Ніякого проксі, кешу й таблиці `np_streets`. У [useNovaPochta.ts](composables/useNovaPochta.ts)
додається третій метод поруч із наявними двома (~12 рядків):

```ts
async getStreets(cityRef: string, findString: string): Promise<NPOption[]> {
    const res = await call('getStreet', { CityRef: cityRef, FindByString: findString, Limit: '50' })
    if (!res?.data) return []

    return res.data.map((item: any) => ({
        code: item.Ref,
        label: `${item.StreetsType} ${item.Description}`,
    }))
}
```

Форма адмінки викликає той самий метод НП напряму — в
[apiNovaPochtaMixin](../FLOY-ADMIN/resources/js/mixins/api/apiNovaPochtaMixin.js) вже є пара
`getCitiesDirect`/`getWarehousesDirect`, додається `getStreetsDirect` за тим самим зразком.

**Якщо НП колись закриє метод ключем** — фолбек на 25 рядків: ручка
`apisite/nova_pochta/get_streets/{city_ref}?q=` в
[NovaPochtaController](../FLOY-ADMIN/app/Http/Controllers/ApiSite/NovaPochtaController.php)
плюс `Cache::remember(…, now()->addDay())`; в `ApiNovaPochta` метод `getStreets` із тими самими
`methodProperties`. Обидва фронти перемикаються на неї зміною одного рядка.

---

## 4. Створення ТТН з адресною доставкою

### 4.1 Що змінюється в запиті до НП

| Поле | Точка видачі: відділення й поштомат (як зараз) | Кур'єр |
|---|---|---|
| `ServiceType` | `WarehouseWarehouse` | **`WarehouseDoors`** |
| `RecipientAddress` | `Ref` точки (`orders.warehouse_ref`) | **`Ref` адреси** з `Address.save` |
| решта (`Cost`, наложка, платники, `PackingNumber`, відправник) | — | **без змін** |

Поштомат окремого сервісу не отримує: у НП є `WarehousePostomat`, але поштомати їздять через
`WarehouseWarehouse` у проді вже сьогодні (вони давно в списку точок) — не чіпаємо те, що працює.

Ланцюжок: `Counterparty.save` (він уже є в `createTTN`) → `Address.save`
`{ CounterpartyRef, StreetRef, BuildingNumber, Flat }` → `Ref` → `InternetDocument.save`.

**Перевірено запитами до API** (порожні виклики, які нічого не створюють, — НП у відповідь
перелічує обов'язкові поля):

```
Address.save {}                              → CounterpartyRef / StreetRef / BuildingNumber
                                               (Flat — необов'язковий)
InternetDocument.save { WarehouseDoors }     → CitySender, SenderAddress, CityRecipient,
                                               RecipientAddress, CargoType, SeatsAmount, Sender,
                                               ContactSender, SendersPhone, Recipient,
                                               ContactRecipient, RecipientsPhone, PayerType,
                                               PaymentMethod, Description
Common.getServiceTypes                       → WarehouseDoors = «Відділення-Адреса» ✔
```

Тобто **для адресної доставки НП вимагає рівно той самий набір полів**, що вже надсилає
`createTTN` для відділення — жодних додаткових `RecipientArea`/`RecipientCityName`. Уся правка
зводиться до `ServiceType` і того, який `Ref` лягає в `RecipientAddress`.

```php
// ApiNovaPochta — нове
public function createCounterpartyAddress($counterpartyRef, $streetRef, $house, $flat = '')
{
    return $this->request([
        'modelName'        => 'Address',
        'calledMethod'     => 'save',
        'methodProperties' => [
            'CounterpartyRef' => $counterpartyRef,
            'StreetRef'       => $streetRef,
            'BuildingNumber'  => $house,
            'Flat'            => $flat,
        ],
    ]);
}
```

```php
// ApiNovaPochta::createTTN — +1 необов'язковий параметр у кінці, решта сигнатури недоторкана
// $addressData = ['street' => ref, 'house' => '12', 'flat' => '5'] або null
$serviceType = 'WarehouseWarehouse';

if ($addressData && $addressData['street']) {
    $rezAddr          = $this->createCounterpartyAddress($Recipient, $addressData['street'], $addressData['house'], $addressData['flat'] ?? '');
    $RecipientAddress = $rezAddr['data'][0]['Ref'] ?? null;

    if (!$RecipientAddress) return $rezAddr; // помилку НП віддаємо як є — її покаже адмінка

    $serviceType = 'WarehouseDoors';
}
```

### 4.2 Виклик із замовлення

```php
// OrderAction::sendOrderNovaPochta
$addressData = $order->delivery_type === 'courier'
    ? ['street' => $order->street_ref, 'house' => $order->house, 'flat' => $order->flat]
    : null;

// Зрозуміла помилка замість «NP: RecipientAddress is empty»
if ($order->delivery_type === 'courier' && (!$order->street_ref || !$order->house)) {
    return ['errors' => ['Кур\'єрська доставка: не вказано вулицю або будинок']];
}
```

`$rez['track_ref'] / $rez['track']` читаються з тієї самої відповіді — код нижче не змінюється.

### 4.3 Тип вантажу — лишаємо `Documents`

`InternetDocument.getDocumentPrice` рахує ціну для `WarehouseDoors` + `Documents` без помилок,
тобто «Документи» на адресу НП приймає, і це дешевше за «Посилку» (§5). Отже, гілку з `Parcel`
чіпати не треба — `CargoType` лишається `Documents`, `Weight = 0.1`, як зараз.

### 4.4 Запасний шлях без `StreetRef`

Якщо вулиці немає в довіднику (село, новий масив), НП приймає «спрощений» формат:
`RecipientCityName` + `RecipientArea` + `RecipientAddressName` (назва вулиці рядком) + `RecipientHouse`
+ `RecipientFlat`. Це друга гілка в `createTTN` (~15 рядків). **У перший реліз не тягнемо** —
замість неї менеджер бачить у формі порожній `street_ref` і або дообирає вулицю зі списку,
або переводить замовлення на відділення. Додамо, якщо такі замовлення реально підуть.

---

## 5. Тарифи й безкоштовна доставка

### 5.0 Скільки це коштує насправді

`InternetDocument.getDocumentPrice`, Полтава → Київ, оціночна 500 грн, наложка 500 грн:

| | Відділення | Кур'єр (`WarehouseDoors`) |
|---|---|---|
| Документи, 0.1 кг | **80 грн** | **140 грн** |
| Посилка, 0.5 кг | 90 грн | 150 грн |
| Зворотна доставка грошей (наложка) | 30 грн | 30 грн |

Два висновки:

- Поточний тариф у налаштуваннях `n_pochta.delivery = 80` **точно збігається** з реальною ціною НП
  за «Документи» — отже, для кур'єра логічний аналог `n_pochta_kur.delivery = 140` (різниця +60).
- `nal_plateg = 20` у налаштуваннях **занижений**: НП бере 20 грн + 2% від суми переказу, тобто
  на 500 грн виходить 30, на 1000 — 40. До кур'єрської доставки це стосунку не має (комісія
  однакова), але як окрему неточність варто мати на увазі.

**Опційно:** ціну можна показувати не константою, а точну — `getDocumentPrice` знає обидва
`city_ref` уже на етапі кошика. Ціна за напрямком, а не «середня по лікарні». Але метод **вимагає
API-ключ**, тож потрібна ручка в apisite (+25 рядків) — це окрема задача, не для цього релізу.

Тарифи живуть у дереві налаштувань адмінки та вивантажуються у `config/settings.php` +
`storage/settings/{site}.json` ([SettingAction](../FLOY-ADMIN/app/Actions/SettingAction.php#L20)).
Додаємо **вузол `public.common.delivery.n_pochta_kur`** `{ delivery, nal_plateg }` — це робиться
в UI налаштувань, коду не потребує.

Ключ тарифу обчислюється однаково з обох боків:

```
delivery = n_pochta && delivery_type = courier  →  тариф "n_pochta_kur"
інакше                                          →  тариф = delivery
```

- Сайт: [useCart.ts](composables/useCart.ts) — `shippingFor/codFee/grandTotalFor` уже приймають ключ
  тарифу, тож у кошику підставляється `n_pochta_kur`. У `DELIVERY_METHODS` цей ключ **не додаємо** —
  інакше він потрапить у розрахунок «від» (найдешевший перевізник).
- [useSiteSettings.ts](composables/useSiteSettings.ts) — новий ключ у `DEFAULTS.delivery` (страховка).
- Адмінка: [Order::actionInCreateOrUpdate](../FLOY-ADMIN/app/Models/Order.php#L120) передає той самий
  ключ у `OrderAction::calculateDeliveryCost` — `suma_delivery` не розійдеться з кошиком.

**Поріг безкоштовної доставки — кур'єра не покриває.** Бойове значення `free_delivery_from = 1200`
(у storage-JSON; у `config/settings.php` лежить старіше 1000) обнуляє доставку й наложку для точок
видачі, але **не** для `n_pochta_kur`: адресна доставка коштує 140 проти 80, і дарувати її невигідно.

Обидві сторони рахують це однією умовою: `isFreeFor(method)` у [useCart.ts](composables/useCart.ts)
і `$isCourier` у `calculateDeliveryCost`. У кошику це видно одразу: понад 1200 грн рядок «Доставка»
для точки видачі показує «Безкоштовно», а щойно поставлено галочку кур'єра — 140 грн.

---

## 6. UX кошика

### 6.1 Порядок кроків

```
Контакти
Доставка
 └ Перевізник:  [ Нова Пошта ] [ УкрПошта ]        ← як зараз
    └ Місто                                        ← як зараз
       └ ☐ Доставити кур'єром на адресу   +60 грн  ← НОВЕ: галочка, а не третій режим
          ├ вимкнено → Відділення або поштомат     ← одне поле: НП віддає їх одним списком
          └ увімкнено → Вулиця + Будинок* | Квартира
Оплата → Коментар → Кнопка
```

**Чому галочка, а не сегментований перемикач.** Відділення, поштомат і пункт видачі — це не
три способи доставки, а три види однієї сутності: точки видачі. НП повертає їх **одним списком**
`getWarehouses` із полем `CategoryOfWarehouse` (`Branch` / `Postomat` / `DropOff`), і назва в
списку вже говорить сама за себе («Відділення №1: …», «Поштомат "Нова Пошта" №2480: …»).
Тому вибір точки — одне поле, а кур'єр — єдиний справжній перемикач: він змінює не пункт списку,
а сам набір полів (адреса замість точки). Перемикач із двох чіпів «Відділення / Кур'єр» цю
структуру ламав би: додати поштомат означало б третій чіп, який нічого не вирішує.

Доплата за кур'єра показана прямо в галочці (`+60 грн`) — щоб різниця не спливала аж у підсумку.

### 6.1.1 Список точок видачі: фільтр і порядок

Дані з API (перевірено):

| Місто | Усього працюючих | Branch | Postomat | DropOff | з них поштоматів **у під'їздах** |
|---|---|---|---|---|---|
| Полтава | 507 | 40 | 433 | 34 | 269 |
| Київ | 6600 | ~620 | 5980 | ~– | **3813** |

`PostMachineType = ForResidentsOfEntrance` — це поштомат у під'їзді ЖК, доступний лише мешканцям.
Тобто **зараз клієнт бачить у списку тисячі точок, куди фізично не потрапить** — це не наслідок
нової фічі, а наявна проблема поля «Відділення». Тому в `getWarehouses`:

- **фільтруємо** `ForResidentsOfEntrance`, `LimitedAccess`, `Private` (Київ: 6600 → ~2780 точок);
- **сортуємо** `Branch → Postomat → DropOff` — інакше 5980 поштоматів витісняють 620 відділень
  зі списку (показуємо перші 60);
- повертаємо `category` у `NPOption` — з неї потім визначається `delivery_type` для ТТН (§10.3),
  без жодного питання до клієнта.

### 6.2 Стани й реакції

- Дефолт — `warehouse` (переважна більшість замовлень), клієнт нічого не робить зайвого.
- Зміна міста скидає і відділення, і вулицю (`resetWarehouse()` + `resetStreet()` — дзеркальна логіка).
- Зміна типу доставки **місто зберігає**, скидає лише точку призначення.
- Перемикання перевізника на Укрпошту скидає `delivery_type` (він лише для НП) — розширюємо
  наявний `watch(isNovaPochta)`.
- `hasDestination` (момент появи блоку оплати) для кур'єра = обрана вулиця (або введена вручну) **і**
  заповнений будинок. Блок оплати, як і зараз, показавшись раз, більше не ховається.
- Валідація лишається м'якою: доставка не обов'язкова, помилок на кур'єрі не додаємо. Єдиний
  «жорсткий» момент — `house` підсвічується як незаповнений, коли вулицю вже обрано.
- Порожня видача вулиць після 2+ літер → це «такої вулиці немає в довіднику НП» (у селах вулиці теж
  є, §3.1), а не «кур'єр сюди не їздить». Формулювання: «Не знайшли вулицю — введіть адресу вручну,
  менеджер уточнить» + посилання, що вмикає вільне поле (як `manualUkrAddress` в Укрпошті).
- Необов'язковий бонус: `getCities` віддає `Delivery1…Delivery7` — дні тижня, коли НП возить у це
  місто (Мачухи `1111100`, Вільхуватка `1010100`). Дані вже в руках, запит не потрібен; можна
  показати «кур'єр у ваш н.п. — пн, ср, пт». Значення полів документовані слабко, тож **гейтом
  для чіпа не робимо** — лише підказкою, і то в другу чергу.
- Підсумок: рядок «Доставка» показує кур'єрський тариф одразу після перемикання; примітка
  `deliveryNote` доповнюється фразою про виклик кур'єра.

### 6.3 Збереження між сесіями

У `floy_checkout` (localStorage) додаються `deliveryType`, `streetRef`, `street`, `house`, `flat`.
Відновлення дзеркалить наявне `restoreCity` — вулиця відновлюється з `streetRef` + `street` без
запиту (на відміну від відділень, список вулиць перезавантажувати немає сенсу).

### 6.4 i18n (uk + ru)

Нових ключів ~10: `deliveryToWarehouse`, `deliveryCourier`, `courierHint`, `street`,
`streetPlaceholder`, `house`, `housePlaceholder`, `flat`, `streetNotFound`, `courierNote`.

### 6.5 Payload у `sendOrder`

До наявних полів додаються `delivery_type`, `street_ref`, `street`, `house`, `flat` і зібраний
`address` (щоб випадок «ввів вручну» теж мав читабельний рядок).

---

## 7. Адмінка

| Файл | Що додається |
|---|---|
| [FormOrder.vue](../FLOY-ADMIN/resources/js/views/Order/FormOrder/FormOrder.vue) | тумблер `Відділення / Кур'єр` при `delivery == 'n_pochta'`; замість селекту відділення — `vue-select` вулиць (`@search`) + інпути «Буд.» / «Кв.»; вотчер на вибір вулиці пише `record.street` |
| [apiNovaPochtaMixin.js](../FLOY-ADMIN/resources/js/mixins/api/apiNovaPochtaMixin.js) | `getStreetsDirect(cityRef, q)` — за зразком наявних `getCitiesDirect`/`getWarehousesDirect` |
| [StoreUpdateRequest](../FLOY-ADMIN/app/Http/Requests/Order/StoreUpdateRequest.php) | 5 нових ключів — інакше `$request->validated()` мовчки викине їх при збереженні |
| [OrderResource](../FLOY-ADMIN/app/Http/Resources/Order/OrderResource.php) | 5 нових полів — інакше форма їх не побачить |
| [Order.php](../FLOY-ADMIN/app/Models/Order.php) | `composeAddress()` + ключ тарифу в `actionInCreateOrUpdate()` |
| [ApiNovaPochta.php](../FLOY-ADMIN/app/Actions/Api/ApiNovaPochta.php) | `createCounterpartyAddress`, гілка `WarehouseDoors` у `createTTN` |
| [OrderAction.php](../FLOY-ADMIN/app/Actions/OrderAction.php) | передача адреси + перевірка «вулиця/будинок заповнені» |

Дрібниця, яка сильно економить час пакувальнику: бейдж **«Кур'єр»** у списку замовлень і в
`SmartOrder` — інакше адресні замовлення візуально не відрізняються від відділенських.

Що **не** змінюється: `ttns`, відстеження (`FindOrderTool`, `detectCarrier`), PROM/Rozetka
(`delivery_type = null` → стара гілка), фіскалізація, СМС-шаблони.

---

## 8. Потік даних

```
Кошик (сайт)                                                      Нова Пошта
────────────                                                      ──────────
місто          ─────────────────────────────────────────────────► Address.getCities     (як зараз)
відділення     ─────────────────────────────────────────────────► Address.getWarehouses (як зараз)
вулиця "собор" ─────────────────────────────────────────────────► Address.getStreet     ← НОВЕ, без ключа

sendOrder { delivery_type, street_ref, street, house, flat, address }   → apisite адмінки
            └─► orders (+ composeAddress, + suma_delivery за тарифом n_pochta_kur)

Менеджер: «Створити ТТН» ──► OrderAction::sendOrderNovaPochta
                              ├─ Counterparty.save            (як зараз)
                              ├─ Address.save {StreetRef,…}   ← НОВЕ, лише для courier
                              └─ InternetDocument.save {ServiceType: WarehouseDoors, RecipientAddress: <ref>}
                                 └─► track / track_ref ──► orders (як зараз)
```

---

## 9. Крайові випадки

| Ситуація | Поведінка |
|---|---|
| Старі замовлення (`delivery_type = null`) | трактуються як `warehouse` — жодного бекфілу |
| Клієнт обрав кур'єра, але не ввів вулицю | замовлення приймається (доставка не обов'язкова), менеджер добиває у формі; ТТН без вулиці не створюється — зрозуміла помилка |
| Вулиці немає в довіднику | вільне поле адреси + підказка; ТТН менеджер робить після уточнення (або §4.4) |
| Село | вулиці в довіднику НП **є** (перевірено) — окремої гілки не потрібно |
| Наложений платіж + кур'єр | НП дозволяє; логіка `AfterpaymentOnGoodsCost` / `BackwardDeliveryData` не змінюється |
| Передоплата + кур'єр | оціночна 500 грн, як зараз |
| Замовлення з PROM/Rozetka | `delivery_type` порожній → стара гілка `WarehouseWarehouse` |
| Помилкова ТТН | видаляється в кабінеті НП (`InternetDocument.delete` в коді не реалізований — і не потрібен зараз) |
| Місто змінили після вибору вулиці | вулиця скидається (інакше в ТТН пішла б вулиця іншого міста) |

---

## 10. Що вирішує власник

1. **Тариф кур'єра** — реальна ціна НП 140 грн проти 80 за відділення (§5.0). Ставимо
   `n_pochta_kur.delivery = 140` чи інше число?
2. ~~Поріг безкоштовної доставки~~ — **вирішено: кур'єр завжди платний.** Поріг (1200 грн)
   на `n_pochta_kur` не поширюється: `isFreeFor()` у [useCart.ts](composables/useCart.ts)
   і та сама умова в `calculateDeliveryCost` — обидві сторони рахують однаково.
3. **Поштомати — питання зняте.** Вони вже в списку точок і вже їздять через
   `WarehouseWarehouse`; окремий `ServiceType` не вводимо, поки НП не почне того вимагати.
4. **Адресна доставка Укрпошти** — зараз не робимо (там свій API створення адрес; логіка інша).

_Питання про тип вантажу знято: «Документи» на адресу проходять і дешевші (§4.3)._

---

## 11. Порядок робіт

| # | Крок | Файли | Стан |
|---|---|---|---|
| 1 | Колонки в orders + фільтр невідомих полів у `sendOrder` | адмінка | ✅ локально є, для проду — SQL |
| 2 | `createTTN` з `WarehouseDoors` + `Address.save` | адмінка | ✅ |
| 3 | Форма замовлення адмінки (галочка, вулиця, буд./кв.) | адмінка | ✅ |
| 4 | Кошик сайту + `getStreets` + i18n | сайт | ✅ |
| 5 | Тариф `n_pochta_kur` у налаштуваннях | адмінка (UI) | ⬜ за власником (є фолбек на `n_pochta`) |
| 6 | Перша жива ТТН на адресу | — | ⬜ |

Що ще лишилось поза кодом: SQL на бойовій БД, збірка фронта адмінки (`npm run prod`),
деплой сайту.

## 12. Тест-план

1. Набір полів і `ServiceType` уже звірено з API (§4.1) — лишається перевірити **запис**:
   `Address.save` (створення адреси контрагента) + `InternetDocument.save`. Це єдина частина,
   яку не перевірити читаючими запитами.
2. Перша ТТН — на власну адресу з мінімальною оціночною; звірити ціну зі 140 грн із §5.0
   і видалити її в кабінеті НП (недруковані ТТН видаляються).
3. Кошик: НП → кур'єр → вулиця → будинок → оплата → замовлення; перевірити `orders`
   (`delivery_type`, `street_ref`, `house`, `address`, `suma_delivery`).
4. Перемикання туди-сюди (відділення ↔ кур'єр ↔ Укрпошта) — жодних «залишків» чужих полів у payload.
5. Перезавантаження сторінки на півдорозі — форма відновлюється з localStorage разом із вулицею.
6. Старе замовлення (без `delivery_type`) — ТТН на відділення створюється як раніше.
