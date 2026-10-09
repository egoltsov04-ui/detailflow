// Display strings only. Database status codes, option values and customer data stay unchanged.
const rows=`
Огляд|Overview
Календар|Calendar
Замовлення|Orders
Клієнти|Clients
Команда|Team
Кабінет майстра|Professional workspace
Послуги|Services
Аналітика та фінанси|Analytics and finance
Склад|Inventory
Онлайн-запис|Online booking
Налаштування|Settings
Чеки|Receipts
Тариф|Plan
Завдання|Tasks
Звернення|Enquiries
Продажі|Sales
Рахунки|Invoices
Фінанси|Finance
Оплати|Payments
Витрати|Expenses
Вхід до кабінету|Sign in
Оберіть спосіб входу|Choose your workspace
Кожна роль бачить тільки свій робочий простір.|Each role has its own workspace.
Єдина система для студії|One system for your studio
Власник студії|Studio owner
Майстер|Professional
Адміністратор студії|Studio administrator
Підтримка Detailflow|Detailflow support
Службовий вхід|Staff sign in
Вхід за запрошенням|Sign in with your invitation
Увійдіть за запрошенням власника|Sign in using the owner's invitation
Календар, клієнти та замовлення за доступом власника|Calendar, clients and orders with owner-granted access
На головну|Home
Назад|Back
Увійти|Sign in
Вийти|Sign out
Вийти з акаунта|Sign out
Пароль|Password
Новий пароль|New password
Повторіть пароль|Repeat password
Створіть пароль|Create a password
Активація акаунта|Account activation
Після збереження відкриється ваш робочий кабінет.|Your workspace will open after saving.
Ваше ім’я|Your name
Ім’я|Name
Ім’я та прізвище|Full name
Назва студії|Studio name
Телефон|Phone
Зручний месенджер|Preferred messenger
Нік / контакт у месенджері|Messenger username or contact
Заявка на підключення|Studio application
Заявка власника|Owner application
Менеджер активує ваш обліковий запис після зв’язку з вами.|A manager will contact you and activate your account.
Вже є акаунт? Увійти|Already have an account? Sign in
Ще немає акаунта? Зареєструвати студію|New here? Register your studio
Підтвердження email|Email confirmation
Перевірте пошту|Check your email
Листа немає?|No email yet?
Перейти до входу|Go to sign in
Вказати іншу адресу|Use another email
Перевірити статус|Check status
Спробувати ще раз|Try again
Пошук|Search
Назва|Name
Опис|Description
Категорія|Category
Клієнт|Client
Авто|Vehicle
Автомобіль|Vehicle
Дата|Date
Час|Time
Від|From
До|To
Сьогодні|Today
Завтра|Tomorrow
Тиждень|Week
Місяць|Month
Рік|Year
Усі|All
Статус|Status
Спосіб оплати|Payment method
Готівка|Cash
Картка|Card
Переказ|Bank transfer
Сума|Amount
Сума, ₴|Amount, ₴
Оплата|Payment
Послуга|Service
Зберегти|Save
Зберегти зміни|Save changes
Зберігаємо…|Saving…
Завантаження…|Loading…
Завантаження Detailflow…|Loading Detailflow…
Перевіряємо сесію…|Checking session…
Перевіряємо доступ…|Checking access…
Закрити|Close
Скасувати|Cancel
Видалити|Delete
Редагувати|Edit
Деактивувати|Deactivate
Активувати|Activate
Заблокувати|Block
Підтвердити|Confirm
Відхилити|Decline
Оновити|Refresh
Обрати|Choose
Очистити|Clear
Скинути|Reset
Продовжити|Continue
Примітка|Note
Коментар|Comment
Внутрішня примітка|Internal note
Не вказано|Not specified
Не призначено|Unassigned
Оберіть значення зі списку.|Choose a value from the list.
Нічого не знайдено|No matches found
Оберіть майстра|Choose a professional
Усі майстри|All professionals
Усі статуси|All statuses
Усі клієнти|All clients
Очікує підтвердження|Awaiting confirmation
Підтверджено|Confirmed
В роботі|In progress
У роботі|In progress
Завершено|Completed
Скасовано|Cancelled
Не прийшов|No-show
На перевірці|Awaiting review
Потрібно призначити|Needs assignment
Призначено|Assigned
Призначені|Assigned
Готово|Ready
Видано|Delivered
На зміні|On shift
Не на зміні|Off shift
Поза зміною|Off shift
На перерві|On break
Пауза|Paused
Тариф і білінг|Plan and billing
Пробний період|Trial period
Підписка активна|Subscription active
Потрібне продовження|Renewal required
Обрати тариф|Choose a plan
Статус і строк — у тарифах|View status and term under Plans
Оновити статус оплати|Refresh payment status
Історія платежів|Payment history
Платежів ще немає.|No payments yet.
Оплату тарифу виконує власник студії.|Only the studio owner can purchase a plan.
До 3 майстрів|Up to 3 professionals
До 10 майстрів|Up to 10 professionals
Без ліміту майстрів|Unlimited professionals
₴ / місяць|₴ / month
Оплачено|Paid
Очікує оплати|Awaiting payment
Не оплачено|Unpaid
Строк минув|Expired
Календар записів|Booking calendar
Новий запис|New booking
← Тиждень|← Week
Тиждень →|Week →
Новий запис →|New booking →
Розклад на сьогодні|Today's schedule
Наступний запис|Next booking
Новий клієнт|New client
Додати клієнта|Add client
Оберіть клієнта|Choose a client
Картка клієнта|Client profile
Клієнти та автомобілі|Clients and vehicles
Сегмент|Segment
Без завершених візитів|No completed visits
Повторні клієнти|Returning clients
Теги через кому|Comma-separated tags
Теги|Tags
Примітка клієнта|Client note
Примітка авто|Vehicle note
Автомобілі|Vehicles
Марка|Make
Модель|Model
Держномер|License plate
Додати автомобіль|Add vehicle
Прибрати нове авто|Remove new vehicle
Зберегти картку|Save profile
Історія візитів|Visit history
Візитів ще немає.|No visits yet.
Клієнтів не знайдено.|No clients found.
Варіант послуги|Service option
Оберіть розмір або варіант|Choose a size or option
Не призначено — у спільний список|Unassigned — add to shared queue
Підтвердити запис|Confirm booking
Адміністратор · CRM|Administrator · CRM
Співробітники|Employees
Команда та кабінет майстра|Team and professional workspace
Додати майстра|Add professional
Новий майстер|New professional
Email для доступу|Access email
Спеціалізація|Specialization
Колір у календарі|Calendar color
Зарплата за місяць|Monthly earnings
Профіль майстра|Professional profile
Робоча зміна|Work shift
Послуги майстрів|Professional specializations
Усі послуги, включно з новими|All services, including new ones
Лише обрані послуги|Selected services only
Адміністратори студії|Studio administrators
Запросити адміністратора|Invite administrator
Окремий email|Separate email
Створити доступ і надіслати запрошення|Create access and send invitation
Доступ до фінансів та зарплат|Finance and payroll access
Повторний лист / відновити пароль|Resend email / reset password
Відновити пароль|Reset password
Доступ до кабінету майстра|Professional account access
Email для запрошення|Invitation email
Оплата роботи майстрів|Professional compensation
Ставки та процентовка|Rates and commissions
Базовий відсоток, %|Base commission, %
Погодинна ставка, ₴|Hourly rate, ₴
Базовий відсоток|Base commission
Погодинна ставка|Hourly rate
Є незбережені зміни|Unsaved changes
Оплата за послугами|Service compensation
Послуга та збережена оплата|Service and saved compensation
Ціна для клієнта|Client price
Відсоток майстра|Professional commission
Або фіксовано, ₴|Or fixed amount, ₴
Фіксована сума, ₴|Fixed amount, ₴
Послуг з власними умовами|Services with custom rates
Планування змін|Shift planning
Графік команди|Team schedule
Додати зміну|Add shift
День|Day
Початок|Start
Завершення|End
Додайте першу зміну.|Add your first shift.
Підтверджене замовлення|Approved order
Оберіть замовлення|Choose an order
Знижка, ₴|Discount, ₴
Сформувати чек|Issue receipt
Клієнт, авто або номер|Client, vehicle or receipt number
Відкрити / друкувати|Open / print
Чеків немає.|No receipts yet.
Друк / зберегти PDF|Print / save PDF
Підсумок|Subtotal
Знижка|Discount
Разом|Total
Зареєстровано оплат:|Payments recorded:
Інформаційний документ. Не є фіскальним чеком.|Informational document. Not a fiscal receipt.
Нове замовлення|New order
Конвеєр робіт за автомобілями|Vehicle work pipeline
Показувати скасовані|Show cancelled
Перетягніть сюди замовлення|Drag an order here
Роботи та перевірка|Jobs and review
Призначити майстра|Assign professional
Підтвердити та нарахувати|Approve and accrue pay
Внести оплату|Record payment
Почати роботу|Start job
Видати авто|Deliver vehicle
Перетягніть картку в потрібну колонку, щоб змінити статус.|Drag the card into a column to change its status.
Назва робіт|Job title
Чек-лист робіт|Job checklist
Відповідальний майстер|Assigned professional
Передоплата, ₴|Deposit, ₴
Термін готовності|Due date
Робочий день студії|Studio workday
Немає робіт у цій черзі.|No jobs in this queue.
Команда на зміні|Team on shift
Створено|Created
Готовність|Due
Історія|History
Додати роботу до автомобіля|Add a job to this vehicle
Коментар і фото|Comment and photos
Зберегти коментар|Save comment
Додати фото (JPG, PNG, WebP до 8 МБ)|Add photo (JPG, PNG, WebP up to 8 MB)
Призначити / умови|Assignment / terms
Призупинити|Pause
Здати на перевірку|Submit for review
Перевірити роботу|Review job
Перевірка якості|Quality review
Якість відповідає завданню|Work meets the requirements
Видимих дефектів немає|No visible defects
Коментар / причина повернення|Comment / reason for rework
Оплату буде нараховано за умовами, збереженими власником.|Pay will accrue using the owner's saved terms.
Повернути на доопрацювання|Return for rework
Перевірено|Reviewed
Індивідуальна робота|Custom job
Етап|Stage
Черга етапу|Stage order
Виконавець|Assignee
Без виконавця|Unassigned
Вартість для клієнта, ₴|Client price, ₴
Оплата майстру|Professional pay
За збереженими умовами майстра|Use saved professional rates
Відсоток цієї роботи|Commission for this job
Фіксована сума|Fixed amount
За активні години цієї роботи|Active hours for this job
Завдання — кожне з нового рядка|Tasks — one per line
Видалити роботу|Delete job
Заробіток і виплати|Earnings and payouts
Оплата роботи|Compensation
Вся команда|Entire team
Нараховано за місяць|Accrued this month
Виплачено з цих нарахувань|Paid from these earnings
Залишок за всі періоди|Outstanding across all periods
Виплата|Payout
Зареєструвати виплату|Record payout
За цей місяць нарахувань немає.|No earnings this month.
Зберегти виплату|Save payout
Перегляд власника|Owner preview
Почати зміну|Start shift
Завершити зміну|End shift
Мої автомобілі|My vehicles
За цей місяць|This month
Призначених робіт немає|No assigned jobs
Нові роботи від власника з’являться тут автоматично.|New assignments from the owner will appear here automatically.
Історія змін|Shift history
Мій профіль|My profile
Зберегти профіль|Save profile
Мої роботи|My jobs
Заробіток|Earnings
Профіль|Profile
Пізніше|Later
Встановити застосунок|Install app
Оновити застосунок|Update app
Доступна нова версія. Збережіть відкриті форми перед оновленням.|A new version is available. Save open forms before updating.
Додати послугу|Add service
Нова послуга|New service
Назва послуги|Service name
Опис послуги|Service description
Варіанти послуги|Service options
Додати варіант|Add option
Назва варіанта|Option name
Ціна варіанта|Option price
Тривалість варіанта|Option duration
Опис варіанта|Option description
Видалити варіант|Delete option
Тривалість|Duration
Ціна, ₴|Price, ₴
Товари|Products
Набори|Bundles
Послуги, товари та набори|Services, products and bundles
Товари додаються на склад|Add products in Inventory
Зберегти послугу|Save service
Оберіть значення|Choose a value
Зменшити значення|Decrease value
Збільшити значення|Increase value
Обрати час|Choose time
Відкрити календар|Open calendar
Вибір часу|Time selection
Вибір дати|Date selection
Оберіть час|Choose a time
Оберіть дату|Choose a date
Закрити вибір дати|Close date picker
Попередній місяць|Previous month
Наступний місяць|Next month
Пн|Mon
Вт|Tue
Ср|Wed
Чт|Thu
Пт|Fri
Сб|Sat
Нд|Sun
Ім’я, телефон, email, авто або тег|Name, phone, email, vehicle or tag
Пошук клієнтів, авто, записів…|Search clients, vehicles and bookings…
БД підключена|Database connected
Перевірка БД…|Checking database…
Потрібно увійти|Sign in required
Локальний режим|Local mode
Поточна студія:|Current studio:
Редагувати профіль студії|Edit studio profile
Налаштування студії|Studio settings
Завантаження профілю майстра…|Loading professional profile…
detailflow · Кабінет майстра|detailflow · Professional workspace
Завантаження кабінету…|Loading workspace…
Завантаження каталогу…|Loading catalog…
Завантаження замовлень…|Loading orders…
Завантаження фінансів…|Loading finances…
Завантаження заявок…|Loading requests…
Завантаження завдань…|Loading tasks…
Завантаження звернень…|Loading enquiries…
Завантаження продажів…|Loading sales…
Завантаження рахунків…|Loading invoices…
Призначених робіт поки немає.|No assigned jobs yet.
Призначених записів поки немає.|No assigned bookings yet.
Перегляд кабінету майстра|Preview professional workspace
Перегляд власника. Дії виконує майстер зі свого акаунта.|Owner preview. The professional performs actions from their own account.
Зберегти спеціалізацію|Save specialization
Надіслати заявку|Submit application
Надсилаємо…|Sending…
Входимо…|Signing in…
Забули пароль?|Forgot password?
Очікує активації|Awaiting activation
Зареєстрований|Registered
Заблокований|Blocked
Заявку відхилено|Application declined
Збережено|Saved
Збережено для|Saved for
Графік ще не задано|No schedule yet
Неділя|Sunday
Понеділок|Monday
Вівторок|Tuesday
Середа|Wednesday
Четвер|Thursday
П’ятниця|Friday
Субота|Saturday
Оплата у студії. Додаткові роботи погоджуються з вами окремо.|Pay at the studio. Additional work will be agreed with you separately.
Ваш візит|Your visit
Оберіть послуги для свого авто.|Choose services for your vehicle.
ДОГЛЯД ЗА ВАШИМ АВТО|CARE FOR YOUR VEHICLE
ОЧІКУЄ ПІДТВЕРДЖЕННЯ|AWAITING CONFIRMATION
Дякуємо,|Thank you,
Ще один запис|Make another booking
01 / ПОСЛУГИ|01 / SERVICES
Що зробимо для вашого авто?|What does your vehicle need?
Можна обрати кілька послуг за один візит.|Choose several services for one visit.
Оберіть варіант, щоб продовжити.|Choose an option to continue.
02 / ДАТА І ЧАС|02 / DATE AND TIME
Коли вам зручно?|When suits you?
Час студії:|Studio time:
. Показуємо слоти для всіх обраних послуг.|. Available times cover all selected services.
Будь-який вільний|Any available professional
Більше доступного часу|More available times
Інша дата|Another date
Час початку|Start time
Оновлюємо доступний час…|Updating available times…
На цю дату немає вільного часу|No availability on this date
Оберіть інший день|Choose another day
. Для довгих робіт зв’яжіться зі студією.|. Contact the studio for longer jobs.
03 / ВАШІ ДАНІ|03 / YOUR DETAILS
Залишилося познайомитись|Let's get to know you
Email для підтвердження|Confirmation email
Перевірте запис|Review your booking
Змінити дату або час|Change date or time
Час більше не доступний. Поверніться до вибору дати.|This time is no longer available. Choose another date.
Онлайн-запис працює на|Online booking powered by
Фінансовий контроль|Financial overview
Грошовий потік|Cash flow
Додати операцію|Add transaction
Усі операції|All transactions
Надходження|Income
Дата та операція|Date and transaction
Метод / клієнт|Method / client
Фінансових операцій за цим фільтром немає.|No financial transactions match these filters.
Ручна фінансова операція|Manual financial entry
Рух грошей|Money movement
Витрата|Expense
Назва операції|Transaction title
Витрати студії|Studio expenses
Додати витрату|Add expense
Нова витрата|New expense
Дата витрати|Expense date
Матеріали|Materials
Оренда|Rent
Зарплата|Payroll
Маркетинг|Marketing
Комунальні|Utilities
Інше|Other
Кількість на склад|Quantity received
Одиниця виміру|Unit of measure
Дата та опис|Date and description
Операційний облік|Operations
Списати матеріал|Write off material
Додати товар|Add item
Початковий залишок|Opening stock
Назва товару|Item name
Кількість|Quantity
Одиниця|Unit
Мінімальний залишок|Minimum stock
Собівартість одиниці, ₴|Unit cost, ₴
Ціна продажу, ₴|Selling price, ₴
Зберегти на склад|Save inventory item
Списання матеріалу|Material write-off
Товар|Item
Оберіть товар|Choose an item
Кількість до списання|Write-off quantity
Причина / послуга|Reason / service
Підтвердити списання|Confirm write-off
Залишок|Stock
Мінімум|Minimum
Собівартість|Cost
Ціна продажу|Selling price
Склад порожній. Додайте першу позицію або закупівлю матеріалів.|Inventory is empty. Add an item or a material purchase.
За цим запитом товарів не знайдено.|No items match this search.
Історія руху|Stock history
Останні 20 операцій|Last 20 transactions
Дата та товар|Date and item
Операція|Transaction
Рух товарів|Stock movements
Окремо від закупівель у витратах|Separate from purchases recorded as expenses
Оприбуткувати|Receive stock
Нова ціна одиниці, ₴|New unit price, ₴
Причина / примітка|Reason / note
Зберегти операцію|Save transaction
Профіль студії|Studio profile
Адреса|Address
Телефон студії|Studio phone
Email студії|Studio email
Часовий пояс|Time zone
Нагадування клієнтам|Client reminders
SMS-нагадування|SMS reminders
Email-нагадування|Email reminders
За 24 години до запису|24 hours before booking
За 2 години до запису|2 hours before booking
Імпорт клієнтів|Import clients
Каталог послуг|Service catalog
Завантажити шаблон Excel|Download Excel template
Завантажити шаблон CSV|Download CSV template
Завантажте шаблон|Download the template
Перенесення клієнтів за шаблоном|Import clients using a template
Завантажити заповнений шаблон або свій CSV|Upload a completed template or your CSV
Або вставити дані з таблиці|Or paste spreadsheet data
Перевірити дані|Validate data
Підтвердити імпорт|Confirm import
Імпортуємо…|Importing…
Підключення студій|Studio onboarding
Заявки власників|Owner applications
Примітка менеджера|Manager note
Активувати студію|Activate studio
У цьому розділі заявок немає.|No applications in this section.
detailflow · Підтримка|detailflow · Support
Після підтвердження робіт сформуйте підсумковий документ. Збережений чек фіксує склад і ціни та не змінюється після редагування каталогу.|Issue a receipt after approving the work. Saved receipts preserve items and prices even if the catalog changes.
Зареєструйте виплату|Record a payout
хв|min
год|h
Повна картина грошей студії|Your studio finances at a glance
Розділи фінансів|Finance sections
Фактично отримані оплати|Payments actually received
Усі витрати|All expenses
Прибуток за оплатами|Cash profit
Надходження мінус усі витрати|Income minus all expenses
Зарплату нараховано|Wages accrued
За підтверджені роботи в періоді|For work approved in this period
Виплачено зарплати за період|Wages paid in this period
До виплати за всі періоди|Outstanding wages across all periods
Перейти до зарплат →|View payroll →
Надходження та витрати|Income and expenses
Порівняння за|Compare by
місяцями|month
днями|day
Структура витрат|Expense breakdown
Операційні витрати та виплачена зарплата|Operating expenses and paid wages
% від усіх витрат|% of all expenses
Динаміка прибутку за оплатами|Cash profit over time
Результат кожного періоду після витрат, включно з виплатами майстрам|Results for each period after expenses, including staff payouts
Показати точні суми за періодами|Show exact amounts by period
Період|Period
Усі фінансові операції|All financial transactions
операцій за вибраний період|transactions in the selected period
Показати|Show
Виплати зарплати|Wage payouts
Показати ще 30|Show 30 more
Як розраховані показники|How these figures are calculated
Надходження — зареєстровані оплати замовлень, продажі товарів і ручні надходження. Витрати — записи витрат студії та видаткові операції каси, включно з фактичними виплатами зарплати. Кожна виплата враховується один раз.|Income includes recorded order payments, product sales and manual receipts. Expenses include studio expenses and cash outflows, including actual wage payouts. Each payout is counted once.
Прибуток за оплатами — касовий результат, а не бухгалтерський чистий прибуток. Неоплачені замовлення та невиплачена нарахована зарплата до нього не входять. Податки, оренду та інші видатки потрібно внести у витрати. Не дублюйте одну витрату в касі та у витратах студії.|Cash profit is a cash-based result, not accounting net profit. Unpaid orders and unpaid accrued wages are excluded. Record taxes, rent and other costs as expenses. Do not enter the same expense in both cash flow and studio expenses.
Нарахування зарплати показані за датою підтвердження роботи, виплати — за датою платежу. Залишок до виплати охоплює всі періоди.|Wages accrue on the work approval date; payouts use the payment date. Outstanding wages include all periods.
Часовий пояс студії|Studio time zone
Каса: оплати замовлень, продажі, виплати та ручні операції. Повний журнал, включно з витратами студії, — у вкладці «Огляд».|Cash flow: order payments, sales, payouts and manual entries. The full journal, including studio expenses, is in Overview.
Оренда, матеріали, маркетинг та інші витрати. Виплати за нараховану роботу майстрів реєструйте у вкладці «Зарплати».|Rent, materials, marketing and other costs. Record staff wage payouts in Payroll.
За цей період операцій немає.|No transactions in this period.
: надходження|: income
, витрати|, expenses
, прибуток|, profit
Не вдалося завантажити налаштування повідомлень.|Could not load notification settings.
Налаштування збережено.|Settings saved.
Інтервал збережено.|Interval saved.
Провайдер міг уже прийняти це повідомлення. Перевірте його журнал перед повтором, щоб не надіслати дублікат. Повторити?|The provider may have already accepted this message. Check its log before retrying to avoid a duplicate. Retry?
Повідомлення повернуто в чергу.|Message returned to the queue.
Повторні візити: лише для клієнтів зі згодою в CRM. Інтервал задається окремо для кожної послуги.|Return visits: only for clients who opted in through CRM. Set a separate interval for each service.
Зберегти налаштування|Save settings
Інтервали повторних послуг|Return service intervals
Вимкнено|Disabled
місяців|months
Журнал повідомлень|Notification log
Повторити|Retry
Повідомлень ще немає.|No notifications yet.
Не вдалося завантажити календар. Спробуйте ще раз.|Could not load the calendar. Please try again.
Мій календар|My calendar
Попередній період|Previous period
Наступний період|Next period
Завантажуємо календар…|Loading calendar…
Графік не задано|No schedule set
Авто не вказано|No vehicle specified
Записів немає|No bookings
Завантаження за графіком|Scheduled workload
Вільні інтервали розраховані за збереженим графіком. Кожне вікно — щонайменше 30 хвилин.|Free intervals follow the saved schedule. Each window is at least 30 minutes.
Зайнято|Booked
Вільні інтервали|Free intervals
Вільних 30-хвилинних слотів|Free 30-minute slots
Немає|None
Без призначеного майстра|No professional assigned
Ці записи ще не займають персональний графік.|These bookings do not yet occupy a personal schedule.
Не вдалося завантажити налаштування студії.|Could not load studio settings.
Підготуйте студію до першого запису|Prepare your studio for its first booking
Зберегти й продовжити|Save and continue
Додайте послуги, ціни, тривалість і варіанти автомобілів.|Add services, prices, durations and vehicle options.
Послуг|Services
Відкрити каталог|Open catalog
Далі|Next
Запросіть майстрів, оберіть їхні послуги та робочі години.|Invite professionals and set their services and working hours.
Майстрів|Professionals
Робочих інтервалів|Working intervals
Налаштувати команду|Set up your team
Перевірте публічну сторінку запису. Імпорт клієнтів можна виконати пізніше в налаштуваннях.|Check your public booking page. You can import clients later in Settings.
Відкрити онлайн-запис|Open online booking
Завершити налаштування|Finish setup
Команда і графік|Team and schedule
Готовність до запису|Booking readiness
Студії та підписки|Studios and subscriptions
Пошук студії|Find a studio
Назва, адреса сторінки або email|Name, page address or email
Знайти|Search
Завантажуємо студії…|Loading studios…
Клієнтів|Clients
Змінити підписку|Change subscription
Студій не знайдено|No studios found
Доступ до|Access until
Причина зміни|Reason for change
Зміна фіксується в журналі. Зупинка нових записів зберігає доступ до наявних даних.|Changes are logged. Stopping new bookings preserves access to existing data.
Нові записи зупинено|New bookings stopped
Push-повідомлення ще не налаштовано.|Push notifications are not configured yet.
Дозвольте повідомлення в налаштуваннях браузера.|Allow notifications in your browser settings.
Оновіть застосунок і повторіть спробу.|Update the app and try again.
Увійдіть повторно.|Please sign in again.
Не вдалося зберегти повідомлення. Спробуйте ще раз.|Could not save notification settings. Please try again.
Сповіщення|Notifications
Робочі сповіщення|Work notifications
Призначення, перевірка та підтвердження робіт на цьому пристрої.|Assignments, reviews and approvals on this device.
Для iPhone встановіть застосунок на головний екран і відкрийте його звідти.|On iPhone, add the app to your Home Screen and open it from there.
Вимкнути на цьому пристрої|Disable on this device
Увімкнути повідомлення|Enable notifications
Нагадування про повторний візит|Return visit reminders
У черзі|Queued
Надсилається|Sending
Прийнято провайдером|Accepted by provider
Помилка, буде повтор|Failed, retry scheduled
Потрібна перевірка доставки|Delivery needs checking
Повтори вичерпано|Retry limit reached
Повторний візит|Return visit
У тому числі зарплати|Including wages
Увесь час|All time
Зарплати|Payroll
Операції|Transactions
Минулий місяць|Previous month
7 днів|7 days
Для завершення реєстрації відкрийте посилання в листі на|To complete registration, open the link sent to
. Потім менеджер зможе активувати студію.|. A manager can then activate your studio.
Перевірте «Спам» та правильність адреси. Для вже зареєстрованої пошти новий лист може не надсилатися — спробуйте увійти.|Check your spam folder and email address. Existing accounts may not receive another email; try signing in.
Власник надіслав вам лист. Увійдіть тим самим email і паролем, який задали в листі.|The owner sent you an invitation. Sign in with that email and the password you set through the link.
Після активації менеджером тут відкриється робочий простір студії.|Your studio workspace will open here after a manager activates it.
Вхід доступний лише співробітникам підтримки з активованим службовим акаунтом.|Sign-in is restricted to support staff with an activated support account.
Показники за вибраний період|Metrics for the selected period
Аналітика студії|Studio analytics
Статус запису|Booking status
Метод оплати запису|Booking payment method
Категорія витрат|Expense category
Скинути фільтри|Reset filters
Дата початку має бути не пізніше дати завершення.|The start date must not be after the end date.
Вартість робіт рахується після знижок за датою запису. Фактичні надходження та витрати беруться з фінансового журналу. Фільтри майстра, послуги й статусу не застосовуються до руху грошей.|Work value uses booking dates and includes discounts. Actual income and expenses come from the financial journal. Professional, service and status filters do not apply to cash flow.
Завершені роботи|Completed work
Планові роботи|Planned work
Роботи мінус витрати|Work value minus expenses
Фактично надійшло|Actually received
Середня завершена робота|Average completed job
Після знижок|After discounts
Скасовано / неявки|Cancellations / no-shows
Записів|Bookings
Годин завершених робіт|Completed work hours
Вартість завершених робіт|Completed work value
За цими фільтрами записів немає.|No bookings match these filters.
Витрати за категоріями|Expenses by category
Витрат за цими фільтрами немає.|No expenses match these filters.
Динаміка за днями|Daily trends
Витрати журналу|Recorded expenses
Немає даних за вибраний період.|No data for the selected period.
Завантаження запису…|Loading booking…
Не вдалося увійти|Could not sign in
Службовий доступ|Support access
Цей акаунт не має прав підтримки. Увійдіть службовим акаунтом або поверніться на головну сторінку.|This account does not have support permissions. Sign in with a support account or return to the home page.
Доступ призупинено|Access suspended
Власник студії заблокував ваш профіль. Зверніться до нього для відновлення доступу.|The studio owner blocked your profile. Contact them to restore access.
Кабінет підтримки|Support workspace
Відкрийте /admin на цьому сайті для службового входу.|Open /admin on this site to sign in as support.
Профіль не прив’язано|Profile not linked
Для майстра потрібне запрошення від власника. Якщо ви вже перейшли з листа, попросіть власника перевірити прив’язку акаунта.|Professionals need an invitation from the owner. If you already followed the email link, ask the owner to check your account link.
Профіль майстра недоступний|Professional profile unavailable
Закрити меню|Close menu
Відкрити меню|Open menu
Меню профілю|Profile menu
Нарахування:|Accruals:
. Детальний журнал виплат недоступний — перевірте підключення модуля робіт.|. The detailed payout log is unavailable. Check the work module connection.
Мінімум 8 символів|At least 8 characters
Створіть вашу студію|Create your studio
Це створить окремий tenant — інші студії не бачитимуть ваші дані.|This creates a separate studio. Other studios cannot see your data.
Публічна адреса|Public page address
Латиниця, цифри та дефіси; наприклад: detail-test. Використаємо у сторінці запису.|Use Latin letters, numbers and hyphens, for example detail-test. This is used for your booking page.
Вітаємо,|Hello,
Виконано сьогодні|Completed today
Заплановано на сьогодні|Scheduled for today
Статус зміни|Shift status
записів ·|bookings ·
у роботі|in progress
Весь календар →|Full calendar →
На сьогодні записів немає|No bookings today
Створіть запис вручну або поділіться посиланням на онлайн-запис.|Create a booking or share your online booking link.
Створити запис →|Create booking →
Відкрити у календарі →|Open in calendar →
Записів у черзі немає|No upcoming bookings
Усі заплановані роботи вже завершені або скасовані.|All scheduled work is completed or cancelled.
Команда сьогодні|Team today
Активні записи за майстрами|Active bookings by professional
Команда →|Team →
Додайте майстрів, щоб бачити їх завантаження.|Add professionals to see their workload.
На цей день записів немає. Створіть новий запис для обраної дати.|No bookings for this day. Create a booking for the selected date.
клієнтів|clients
Без тегів|No tags
Тег|Tag
Усі теги|All tags
Показано:|Showing:
Зберегти клієнта|Save client
Завершено візитів|Completed visits
Сума завершених робіт|Completed work total
Сума робіт|Work total
Клієнтів за цим сегментом не знайдено.|No clients in this segment.
Закрити картку|Close card
VIP, корпоративний, повторний|VIP, corporate, returning
Внутрішня нотатка|Internal note
Побажання клієнта, важливі деталі авто|Client preferences and vehicle details
Автомобілі:|Vehicles:
Історія записів|Booking history
Історія записів порожня.|No booking history.
Видалити клієнта|Delete client
Каталог|Catalog
Наприклад, тонування|For example, window tinting
Мийка|Wash
Полірування|Polishing
Кераміка|Ceramic coating
Хімчистка|Interior cleaning
Тонування|Window tinting
2 год|2 h
Наприклад, мийка, хімчистка|For example, washing and interior cleaning
Після збереження майстер отримає лист із посиланням для реєстрації та входу до свого кабінету.|After saving, the professional receives an email link to register and access their workspace.
Зарплата за поточний місяць. Відсоток за послугами та графік редагуються нижче для обраного майстра.|Wages for this month. Edit service commission rates and the selected professional's schedule below.
Чеки та оплати|Receipts and payments
Чек|Receipt
Метод|Method
Чеки з’являться після початку або завершення послуги.|Receipts appear after a service starts or finishes.
Позицій на складі|Inventory items
Низький залишок|Low stock
На рівні або нижче мінімуму|At or below minimum
Оцінка запасів|Inventory valuation
За собівартістю; без ціни — не враховано|At cost; items without a price are excluded
Наприклад, шампунь pH neutral|For example, pH-neutral shampoo
шт|pcs
л|L
мл|mL
кг|kg
уп.|packs
Необов’язково|Optional
Використовуйте після виконаної послуги або при псуванні. Операція буде збережена в історії.|Use after a service or for damaged stock. The operation is recorded in history.
Наприклад, дітейлінг BMW X5|For example, BMW X5 detailing
Пошук товару на складі|Search inventory
Рухи з’являться після закупівель, коригувань або списань.|Movements appear after purchases, adjustments or write-offs.
Витрати за весь час|All-time expenses
Контроль запасів|Stock control
Найбільша стаття|Largest category
За весь час|All time
Наприклад, закупівля мікрофібри|For example, microfiber purchase
Наприклад, 5|For example, 5
Студія|Studio
Налаштування та онбординг|Settings and onboarding
Назва вашої студії|Your studio name
Місто, вулиця, номер|City, street, building
Запуск студії|Studio setup
Послуг:|Services:
· Майстрів:|· Professionals:
· Клієнтів:|· Clients:
Назва, адреса та часовий пояс|Name, address and time zone
Послуг у каталозі:|Catalog services:
Майстрів у команді:|Team members:
Необов’язково — можна зробити пізніше|Optional; you can do this later
Почніть вводити ім’я або телефон|Start typing a name or phone number
Новий клієнт — буде створений і збережений після підтвердження запису.|A new client will be created and saved when you confirm the booking.
Марка, модель, номер|Make, model, plate
Операційний контроль|Operations
Потребують уваги|Needs attention
Ще|More
Усе під контролем|Everything is up to date
Немає прострочених завдань, термінових звернень, проблемних залишків або прострочених рахунків.|No overdue tasks, urgent enquiries, stock issues or overdue invoices.
Завантажуємо підписку…|Loading subscription…
. Поточний тариф:|. Current plan:
Після завершення періоду збережені дані доступні; нові записи й активація майстрів потребують продовження.|Saved data remains available after expiry. Renew to create bookings and activate professionals.
Разова оплата одного місяця через WayForPay. Автоматичних списань немає. Продовження додає місяць до невикористаного оплаченого періоду. Платіж підтверджується після відповіді провайдера.|A one-off payment for one month through WayForPay, with no automatic charges. Renewal adds a month to any remaining paid period. Payment is confirmed after the provider responds.
Адміністратор · заявки з онлайн-запису|Administrator · online booking requests
Заявки клієнтів|Client requests
Тут адміністратор підтверджує або відхиляє заявки. Ручний запис — у календарі. Після підтвердження клієнт із вказаним email отримує лист.|Review booking requests here. Create manual bookings in the calendar. After approval, clients with an email address receive a confirmation.
Ваша сторінка онлайн-запису|Your online booking page
Клієнт обирає послуги, майстра та час, залишає контакти — заявка з’являється тут. Додайте посилання в Instagram, Google Maps або на свій сайт. Час бронюється після вашого підтвердження.|Clients choose services, a professional and a time, then leave their details. Requests appear here. Share your link on Instagram, Google Maps or your website. Time is reserved after your approval.
Посилання онлайн-запису|Online booking link
Копіювати посилання|Copy link
Відкрити сторінку запису ↗|Open booking page ↗
Завантаження адреси студії…|Loading studio address…
Ім’я, телефон, email, авто|Name, phone, email, vehicle
Заявок за цими фільтрами немає|No requests match these filters
Нові онлайн-заявки відображатимуться зі статусом «Очікує підтвердження».|New online requests appear as Awaiting confirmation.
За вибраний період|For the selected period
Видатки каси, включно з виплатами|Cash expenses, including payouts
Рух коштів, нетто|Net cash flow
Надходження мінус витрати|Income minus expenses
Видалити операцію|Delete transaction
Старі автоматичні нарахування (|Legacy automatic accruals (
Ці записи створювалися при підтвердженні роботи. Вони збережені для звірки та не враховуються як фактична виплата. Перевірте видані суми перед реєстрацією виплат у новому журналі.|These entries were created on work approval. They remain for reconciliation and do not count as actual payouts. Check paid amounts before recording payouts in the new journal.
Продажі та каталог|Sales and catalog
Пошук у каталозі|Search catalog
Там задаються кількість, одиниця виміру, мінімальний залишок і закупівельна ціна. Це виключає дублювання товарів у каталозі.|Set quantities, units, minimum stock and purchase prices there to avoid duplicate catalog products.
Новий набір|New package
Наприклад, комплексний догляд|For example, complete care
Комплексні послуги|Service packages
Склад набору|Package contents
Ціна набору, ₴|Package price, ₴
ДД.ММ.РРРР|DD.MM.YYYY
ГГ:ХХ|HH:MM
ДД.ММ.РРРР ГГ:ХХ|DD.MM.YYYY HH:MM
Фіксовано|Fixed
год активної роботи|hour of active work
Призначено роботу|Work assigned
Робота на перевірці|Work under review
Роботу підтверджено|Work approved
Роботу повернуто|Work returned
Вкажіть дійсну дату / час у зазначеному форматі.|Enter a valid date / time in the indicated format.
Значення раніше за дозволений початок.|Value is before the allowed start.
Значення пізніше за дозволене завершення.|Value is after the allowed end.
Введіть число, наприклад 1250,50.|Enter a number, for example 1250.50.
Мінімальне значення|Minimum value
Максимальне значення|Maximum value
Вкажіть значення з кроком|Enter a value in increments of
Платформа|Platform
Пробний період активний|Trial is active
12 днів до першого списання. План можна змінити в будь-який момент.|12 days until the trial ends. You can change plans at any time.
Записи, CRM, календар і нагадування|Bookings, CRM, calendar and reminders
Онлайн-оплата тимчасово готується. Обраний тариф:|Online payments are being prepared. Selected plan:
Що входить до набору та для яких авто підходить|Package contents and suitable vehicles
На складі:|In stock:
Позицій у цій вкладці поки немає.|No items in this tab yet.
Заповніть готову таблицю та перенесіть її в сервіс. До 1000 рядків, 2 МБ за один імпорт.|Fill in the template and import it. Up to 1,000 rows and 2 MB per import.
9 колонок: контакти клієнта, марка, модель, номер, рік і примітки. Excel містить окремі аркуші з прикладом та інструкцією.|9 columns cover client contacts, make, model, plate, year and notes. The Excel file includes separate example and instruction sheets.
Заповніть у Excel або Google-таблицях|Complete it in Excel or Google Sheets
Залиште заголовки в першому рядку. Кожен наступний рядок — клієнт та його авто. Для кількох авто повторіть телефон клієнта в окремих рядках.|Keep the headers in the first row. Each subsequent row is a client and vehicle. For multiple vehicles, repeat the client's phone on separate rows.
Збережіть аркуш «Клієнти» як CSV UTF-8|Save the Clients sheet as CSV UTF-8
Завантажте CSV або скопіюйте заповнені рядки разом із заголовками та вставте нижче. Перевірте дані перед імпортом.|Upload a CSV or paste the completed rows with headers below. Review the data before importing.
Як заповнити колонки шаблону|How to fill in the template columns
Ім’я · обов’язково|Name · required
Ім’я та прізвище або назва клієнта.|Full name or client company name.
Телефон · обов’язково|Phone · required
Задайте текстовий формат колонки, щоб зберегти «+» і початкові нулі. Вкажіть міжнародний номер із кодом країни, наприклад +380…|Format the column as text to preserve + and leading zeroes. Include the country code, for example +380…
Email та примітка клієнта|Client email and notes
Контактна пошта та побажання клієнта. Необов’язкові.|Contact email and client preferences. Optional.
Марка, модель, держномер, рік|Make, model, plate, year
Окремі поля картки автомобіля. Рік — чотири цифри. Невідомі дані залиште порожніми.|Separate vehicle fields. Use a four-digit year. Leave unknown values blank.
Колір, особливості покриття або інша інформація про авто. Стару колонку «Авто» також можна імпортувати сюди.|Color, coating details or other vehicle information. You can also map an older Vehicle column here.
Аркуш «Клієнти» порожній. Демонстраційні дані є лише на аркуші «Приклад»; його не імпортуйте. Переносяться лише заповнені вами рядки. Послуги, склад і фінансові дані цей шаблон не імпортує.|The Clients sheet is empty. Demo data is only on the Example sheet; do not import it. Only your completed rows are imported. This template does not import services, inventory or financial records.
Дані разом із заголовками|Data with headers
Ім’я,Телефон,Авто|Name,Phone,Vehicle
Читаємо файл…|Reading file…
Рядків у файлі:|Rows in file:
. Обов’язкові поля: ім’я та телефон. Необов’язкові колонки можна пропустити.|. Name and phone are required. Optional columns can be skipped.
Зіставлення колонок · перевірити або змінити|Column mapping · review or change
Виправте дані перед імпортом:|Fix the data before importing:
Ще помилок:|More errors:
Попередній перегляд клієнтів|Client preview
Показано|Showing
з|of
коректних рядків.|valid rows.
Наявних клієнтів зіставляємо за телефоном. Їхні дані не перезаписуємо; додаємо лише відсутні авто.|Existing clients are matched by phone. Their details are preserved; only missing vehicles are added.
Для імпорту увійдіть до акаунта студії.|Sign in to your studio account to import.
Додано клієнтів:|Clients added:
. Автомобілів:|. Vehicles:
. Рядків зі збігом телефону:|. Rows with matching phones:
Перейти до клієнтів|View clients
Клієнт погодився на нагадування про повторні візити|Client opted in to return visit reminders
Фінанси та документи|Finance and documents
Новий рахунок|New invoice
До оплати|Amount due
Надіслані та прострочені|Sent and overdue
За поточним списком|For the current list
Чернетки|Drafts
Потребують перевірки|Needs review
Пошук рахунку або клієнта|Search invoice or client
Рахунок|Invoice
Клієнт і склад|Client and items
Статус / строк|Status / due date
Рахунків за цим фільтром немає.|No invoices match this filter.
Платіжні посилання з’являться тут після підключення та активації платіжного провайдера. До того моменту рахунок можна надіслати клієнту вручну та позначити оплату у списку.|Payment links appear after a payment provider is connected and activated. Until then, send the invoice manually and record payment in the list.
Фінансовий документ|Financial document
Призначення *|Purpose *
Наприклад, передоплата за кераміку|For example, ceramic coating deposit
Сума, ₴ *|Amount, ₴ *
Строк оплати|Payment due date
Перейти до вмісту|Skip to content
Detailflow — головна|Detailflow — home
для детейлінгу|for detailing
Головна навігація|Main navigation
Можливості|Features
Як це працює|How it works
Запитання|Questions
Зареєструвати студію|Register your studio
Робочий простір детейлінг-студії|Your detailing studio workspace
Кожне авто.|Every vehicle.
Кожен майстер.|Every professional.
Усе під контролем.|Everything in view.
Від першого запису до перевірки роботи та нарахування майстру. Detailflow об’єднує щоденну роботу вашої студії в одній системі.|From the first booking to work review and staff earnings. Detailflow brings your studio's daily work into one system.
Підключити студію|Connect your studio
Подивитися, як працює|See how it works
Власний кабінет для власника та кожного майстра|A workspace for the owner and every professional
Приклад роботи студії|Example studio workflow
Ваша студія. Один робочий простір.|Your studio. One workspace.
Роботу перевірено|Work reviewed
Нарахування майстру підтверджено|Professional earnings approved
Ілюстрація інтерфейсу · демонстраційні дані|Interface illustration · demo data
Менше перемикань.|Less switching.
Більше порядку.|More organization.
Запис|Booking
Призначення|Assignment
Перевірка|Review
Нарахування|Earnings
Студія виросла. Час змінити інструменти.|Your studio has grown. Time for better tools.
Досить керувати студією|Stop running your studio
в Google-таблицях.|in Google Sheets.
Записи — у таблиці, завдання — у чаті, зарплата — на калькуляторі. Зберіть роботу команди в одному місці й приділіть більше уваги автомобілям та клієнтам.|Bookings in a spreadsheet, tasks in a chat, wages on a calculator. Bring your team's work together and give more attention to vehicles and clients.
Навести лад у студії|Organize your studio
«У якій таблиці цей запис?»|“Which spreadsheet has this booking?”
Кожне авто має своє замовлення|Every vehicle has its own order
Клієнт, послуги, майстер і статус роботи зібрані в одній картці.|Client, services, professional and work status in one card.
«Хто це робить і що вже готово?»|“Who is doing this, and what is finished?”
Кожен знає свої завдання|Everyone knows their tasks
Власник бачить хід робіт, а кожен майстер — свої призначення та чекліст у кабінеті.|The owner sees progress, while each professional sees assignments and checklists in their workspace.
«Скільки нарахувати за цю роботу?»|“How much should this job pay?”
Умови оплати вже збережені|Pay terms are already saved
Відсоток або фіксована сума за послугу. Перевіряєте роботу й підтверджуєте нарахування.|A commission or fixed amount per service. Review the work and approve the earnings.
Імпорт клієнтів із CSV|Import clients from CSV
Ваша база вже в таблиці?|Already have a client spreadsheet?
Перенесіть її за кілька кліків.|Import it in a few clicks.
Заповніть готовий шаблон або збережіть свою Google-таблицю чи Excel у CSV та завантажте в Detailflow. Імена, телефони й автомобілі перенесуться після вашого підтвердження — без ручного введення кожного клієнта.|Fill in the template or export Google Sheets or Excel as CSV and upload it to Detailflow. Confirm to import names, phones and vehicles without entering every client manually.
Почати зі своєї бази|Start with your client list
Завантажити шаблон|Download template
Завантажте CSV|Upload a CSV
Або вставте скопійовані рядки разом із заголовками.|Or paste copied rows with their headers.
Перевірте дані|Review the data
Оберіть колонки імені, телефону та авто в попередньому перегляді.|Map the name, phone and vehicle columns in the preview.
Підтвердьте імпорт|Confirm import
Клієнти зі збігом телефону зіставляються з наявною базою.|Matching phone numbers are linked to existing clients.
Від клієнтської бази до керування студією|From client records to studio management
більше, ніж CRM.|more than a CRM.
Клієнти та записи — це початок. Далі — зміни майстрів, завдання по кожному авто, перевірка якості, нарахування та фінанси студії.|Clients and bookings are just the start. Then come shifts, vehicle tasks, quality reviews, earnings and studio finances.
Склад вашої студії|Your studio inventory
Хімія та матеріали —|Chemicals and materials —
під контролем.|under control.
Відстежуйте залишки автохімії, витратних матеріалів і товарів. Бачте, що є на складі та що вже час докупити.|Track chemicals, consumables and products. See what is in stock and what needs restocking.
Залишки та мінімальний запас|Stock levels and minimums
Встановлюйте поріг для кожної позиції й бачте матеріали, яких бракує.|Set a threshold for each item and spot shortages.
Прихід і списання|Receipts and write-offs
Фіксуйте поставки та використання матеріалів з історією рухів.|Record deliveries and usage with movement history.
Інвентаризація|Stocktaking
Звіряйте облік із фактичними залишками на полиці.|Reconcile records with the stock on your shelves.
Підключити свою студію|Connect your studio
Залишки матеріалів|Material stock levels
Приклад складу|Example inventory
Демонстраційні залишки матеріалів|Demo material stock levels
Матеріал|Material
Стан|State
1 позиція нижче мінімального запасу|1 item below minimum stock
Ілюстрація складського обліку · демонстраційні дані|Inventory illustration · demo data
Одна команда — різні задачі|One team, different tasks
Кожному —|Everyone gets
свій робочий простір.|their own workspace.
Кабінети|Workspaces
Власнику|For the owner
Майстру|For the professional
Приклад інтерфейсу|Interface example
Від заявки до першого замовлення|From application to first order
Почнімо з вашої студії.|Let's start with your studio.
Перед початком|Before you start
Є запитання?|Have questions?
Ось відповіді.|Here are the answers.
Наступний крок — простіший робочий день|Next step: a simpler working day
Дайте студії|Give your studio
власний Detailflow.|its own Detailflow.
Залиште заявку — менеджер допоможе розпочати.|Apply and a manager will help you get started.
Уже з нами? Увійти|Already with us? Sign in
Порядок у роботі. Увага до деталей.|Organized work. Attention to detail.
Робота студії|Studio workflow
Авто в роботі|Vehicles in progress
Полірування кузова|Body polishing
ОМ|OP
Олександр · майстер|Oleksandr · professional
2 з 3 завдань виконано|2 of 3 tasks completed
Хімчистка салону|Interior cleaning
ІК|IK
Іван · майстер|Ivan · professional
Завдання виконано|Tasks completed
Очікує перевірки власника|Awaiting owner review
Привіт, Олександр|Hello, Oleksandr
Зміну розпочато о 09:00|Shift started at 09:00
Моє завдання|My task
Підготовча мийка|Preparation wash
Фінішна перевірка|Final inspection
Передати на перевірку|Submit for review
Підтверджені нарахування|Approved earnings
Продажі та комунікація|Sales and communication
Нове звернення|New enquiry
Пошук за клієнтом, телефоном, джерелом|Search client, phone or source
Усі джерела|All sources
Усі відповідальні|All assignees
Усі строки|All deadlines
Прострочені|Overdue
Показувати втрачені|Show lost enquiries
звернень|enquiries
Немає звернень|No enquiries
Втрачені звернення|Lost enquiries
Видалити звернення|Delete enquiry
Контакт до:|Contact by:
Терміново|Urgent
Звернення клієнта|Client enquiry
Новий клієнт / не обрано|New client / not selected
Тема *|Subject *
Наприклад, запит на полірування авто|For example, a car polishing enquiry
Джерело|Source
Рекомендація|Referral
Дзвінок|Phone call
Сайт|Website
Вручну|Manual
Відповідальний|Assignee
Крайній термін контакту|Contact deadline
Пріоритет|Priority
Звичайний|Normal
Терміновий|Urgent
Деталі запиту та наступний крок|Enquiry details and next step
Оберіть майстра, щоб побачити його зміну, автомобілі та нарахування.|Choose a professional to view their shift, vehicles and earnings.
Мобільний робочий простір|Mobile workspace
Перевірте запрошення на email|Check your email invitation
Власник створює профіль майстра та надсилає лист для реєстрації. Перейдіть за посиланням у листі, задайте пароль і увійдіть тим самим email. Якщо листа немає або доступ заблоковано — зверніться до власника студії.|The owner creates your profile and sends a registration email. Follow the link, set your password and sign in with the same email. Contact the studio owner if the email is missing or access is blocked.
Привіт,|Hello,
Мої авто|My vehicles
Нараховано|Accrued
Мої призначені роботи|My assigned work
Чек-лист ще не додано власником.|The owner has not added a checklist yet.
Роботу відправлено на перевірку власнику.|Work submitted to the owner for review.
Відправити на перевірку|Submit for review
Активних робіт немає|No active work
Нові призначення від власника з’являться тут.|New assignments from the owner appear here.
Після перевірки робіт власником суми з’являться тут.|Earnings appear here after the owner approves your work.
Заповніть профіль|Complete your profile
Мийка, полірування, хімчистка|Washing, polishing, interior cleaning
Студія отримала вашу заявку. Час буде остаточно заброньовано після підтвердження адміністратором.|The studio received your request. Your time is reserved after the administrator confirms it.
Після підтвердження студія надішле лист. Якщо час потрібно уточнити, адміністратор зв’яжеться за номером|The studio will email you after approval. To clarify the time, the administrator will call
Етапи запису|Booking steps
Пошук послуг|Search services
Знайти послугу|Find a service
Категорії послуг|Service categories
Варіант послуги «|Service option “
Без реєстрації. Контакти потрібні студії для підтвердження візиту.|No registration required. The studio needs your contact details to confirm the visit.
Як до вас звертатися|Your name
Марка, модель, держномер|Make, model, plate
Ви надсилаєте заявку. Підтвердження часу — від адміністратора студії.|You are submitting a request. The studio administrator confirms the time.
Чек DF-|Receipt DF-
Контроль результатів|Performance tracking
Звіти|Reports
Скинути період|Reset period
Виручка послуг|Service revenue
Продажі товарів|Product sales
За обраний період|For the selected period
Операційний результат|Operating result
Послуги та виручка|Services and revenue
Ефективність команди|Team performance
За обраний період даних немає.|No data for this period.
Товари та роздріб|Products and retail
Новий продаж|New sale
Продажів|Sales
Виручка товарів|Product revenue
Без повернень|Excluding returns
Середній чек|Average sale
Тільки товари|Products only
Пошук за клієнтом або товаром|Search client or product
Продаж|Sale
Клієнт і товари|Client and products
Продажів ще немає. Оформіть перший продаж товару зі складу.|No sales yet. Record your first inventory product sale.
Роздріб і склад|Retail and inventory
Роздрібний продаж|Retail sale
Оберіть зі складу|Select from inventory
Ціна за од., ₴|Unit price, ₴
Наприклад, преміум мийка|For example, premium wash
Що входить у послугу та що потрібно знати клієнту|What the service includes and what clients should know
Клієнти побачать цей опис під час онлайн-запису.|Clients see this description when booking online.
90 хв|90 min
Одна послуга, різні розміри авто або комплектації. Клієнт обере один варіант.|One service with different vehicle sizes or packages. The client chooses one option.
M — седан|M — sedan
, хв|, min
Для седанів і компактних авто|For sedans and compact cars
Наприклад: M — 600 ₴ / 60 хв, L — 800 ₴ / 75 хв, XL — 1 000 ₴ / 90 хв.|For example: M — ₴600 / 60 min, L — ₴800 / 75 min, XL — ₴1,000 / 90 min.
Адміністратор працює із записами, клієнтами, чеками й командою. Фінансова аналітика та зарплати доступні лише з дозволу власника. Оплату тарифу й управління адміністраторами виконує власник.|Administrators manage bookings, clients, receipts and the team. Finance and payroll require owner permission. The owner manages plan payments and administrator access.
Заявки|Requests
Завантажуємо заявки…|Loading requests…
Для відмови вкажіть причину|Enter a reason for rejection
Операційна робота студії|Studio operations
Завдання команди|Team tasks
Створити завдання|Create task
Усі ·|All ·
Призначені ·|Assigned ·
Прострочені ·|Overdue ·
Пошук завдань, клієнта або майстра|Search tasks, clients or professionals
Немає завдань|No tasks
Видалити завдання|Delete task
Майстер:|Professional:
Клієнт:|Client:
Операційне завдання|Operational task
Нове завдання|New task
Наприклад, замовити мікрофібри|For example, order microfiber cloths
Що саме потрібно зробити?|What needs to be done?
Дедлайн|Deadline
Без прив’язки до клієнта|Not linked to a client
Адміністрування|Administration
Умови зберігаються окремо для кожного майстра та застосовуються до нових призначень. Для послуги можна задати власний відсоток або фіксовану суму. Уже нарахована зарплата не зміниться.|Terms are saved per professional and apply to new assignments. Set a custom commission or fixed amount per service. Existing earnings do not change.
Завантажуємо збережені умови…|Loading saved terms…
Не задано|Not set
Без ставки|No rate
Збережені умови|Saved terms
Профіль майстра не знайдено. Оновіть список команди.|Professional profile not found. Refresh the team list.
Під кожною послугою — збережені умови. Порожні поля означають базовий відсоток; фіксована сума має пріоритет.|Saved terms are shown under each service. Empty fields use the base commission; a fixed amount takes priority.
Додайте послуги до каталогу, щоб налаштувати оплату майстрів.|Add catalog services to configure staff pay.
за поточною ціною|at the current price
Графік допомагає планувати завантаження. Фактичний вихід майстер відзначає сам у своєму кабінеті.|Schedules help plan workload. Professionals check in themselves in their workspace.
Видалити зміну|Delete shift
Спеціалізацію збережено. Вона враховується під час запису й призначення робіт.|Specialization saved. It is used for bookings and work assignments.
Оберіть, які послуги виконує кожен майстер. Якщо вибрати «Лише обрані» та не позначити послуг, нові роботи з каталогу цьому майстру не призначатимуться.|Choose each professional's services. Selecting Selected only with no services prevents new catalog work assignments to that professional.
Активні замовлення|Active orders
Від призначення до видачі|From assignment to handover
Потрібне підтвердження власника|Owner approval required
Отримано передоплат|Deposits received
Пошук за клієнтом, авто, послугою|Search client, vehicle or service
замовлень|orders
Скасовані|Cancelled
Видалити замовлення|Delete order
Статус оновлено:|Status updated:
о|at
Термін:|Due:
· оплачено|· paid
· залишок|· remaining
Замовлення #|Order #
· до сплати|· due
Замовлення на роботи|Work order
Наприклад, керамічне покриття BMW X5|For example, BMW X5 ceramic coating
Кожен пункт через кому: мийка, полірування, нанесення кераміки|Separate items with commas: wash, polish, ceramic coating
Побажання клієнта, дефекти, важливі деталі|Client preferences, defects, important details
Не вдалося відкрити сторінку|Could not open the page
Оновіть сторінку. Якщо проблема повториться — зверніться до підтримки.|Refresh the page. Contact support if the problem persists.
Час готовності|Ready time
Застосунок Detailflow|Detailflow app
Пошук…|Search…
Поточний майстер недоступний|Current professional unavailable
Зберігаємо призначення…|Saving assignment…
Немає майстрів із відповідною спеціалізацією. Змініть перелік послуг у розділі «Команда».|No professionals have the required specialization. Update their services in Team.
Завантажуємо роботи…|Loading work…
· до|· until
· з|· from
активних робіт|active jobs
Закрити замовлення|Close order
Роботи (|Jobs (
Нові дії з’являтимуться тут.|New activity appears here.
· черга|· stage
Очікує перевірки власника з|Awaiting owner review since
Після підтвердження:|After approval:
. Це нарахування, виплату реєструють окремо у фінансах.|. These are accrued earnings; payouts are recorded separately in Finance.
Однакова черга — паралельні роботи. Етап 1 можна почати після підтвердження всіх робіт етапу 0, етап 2 — після етапу 1.|Jobs at the same stage run in parallel. Stage 1 starts after all stage 0 jobs are approved; stage 2 follows stage 1.
робіт|jobs
Правило послуги → базовий відсоток → погодинна ставка. Якщо умови відсутні — 0 ₴. Після збереження перевірте суму в картці.|Service rule → base commission → hourly rate. If no terms are set, pay is ₴0. Check the amount in the card after saving.
Умови фіксуються на цій роботі. Перерви не входять до погодинного розрахунку.|Terms are fixed for this job. Breaks are excluded from hourly pay.
· виплачено|· paid
Внесіть гроші, які вже передали майстру. Сервіс не переказує кошти.|Record money already paid to the professional. The service does not transfer funds.
Спосіб|Method
Оберіть майстра для перегляду.|Choose a professional to view.
З|From
Перерви:|Breaks:
Історія з’явиться після першої зміни.|History appears after the first shift.
Запит на повторне надсилання прийнято. Перевірте вхідні та спам. Якщо email уже підтверджений, увійдіть зі своїм паролем.|Resend requested. Check your inbox and spam folder. If your email is already confirmed, sign in with your password.
Не вдалося з’єднатися із сервісом. Спробуйте ще раз.|Could not connect. Please try again.
Сервіс не підключено до бази. Зверніться до адміністратора.|The service is not connected to its database. Contact the administrator.
Не вдалося з’єднатися із сервісом. Перевірте інтернет і спробуйте ще раз.|Could not connect. Check your internet connection and try again.
Надіслати лист повторно|Resend email
Увійдіть до робочого простору студії|Sign in to your studio workspace
Подайте заявку та керуйте всією студією|Apply to manage your entire studio
Якщо акаунт із цією адресою існує, ви отримаєте посилання для створення нового пароля. Перевірте також спам.|If an account exists for this address, you will receive a password reset link. Check your spam folder too.
Зверніться до менеджера для уточнення.|Contact the manager for details.
Менеджер Detailflow перевірить заявку, зв’яжеться з вами у вказаному месенджері та активує доступ до студії.|A Detailflow manager will review your application, contact you in your chosen messenger and activate studio access.
Паролі не збігаються.|Passwords do not match.
Не вдалося зберегти пароль. Спробуйте ще раз.|Could not save the password. Try again.
Зберегти та увійти|Save and sign in
Доступно без окремих фільтрів записів і витрат|Available without individual booking and expense filters
За весь обраний період|Across the selected period
Майстри|Professionals
Спеціалізація не вказана|No specialization specified
Не вдалося обробити заявку. Спробуйте ще раз.|Could not process the request. Try again.
Запис підтверджено, але лист клієнту не вдалося надіслати.|Booking confirmed, but the client email could not be sent.
У майстра вже є запис на цей час. Перенесіть запис перед підтвердженням.|The professional is already booked at this time. Reschedule before confirming.
Не вдалося змінити статус. Оновіть сторінку та спробуйте ще раз.|Could not change status. Refresh and try again.
Потрібне оновлення бази для описів і варіантів послуг (міграція 032).|Service descriptions and options require database update 032.
Не вдалося зберегти послугу.|Could not save the service.
Клієнт із цим телефоном уже існує.|A client with this phone number already exists.
Не вдалося зберегти клієнта.|Could not save the client.
Закупівля матеріалів|Materials purchase
Оприходування|Stock receipt
Майстра створено, але лист не надіслано.|Professional created, but the email was not sent.
Не вдалося оновити замовлення.|Could not update the order.
Не вдалося підтвердити роботу.|Could not approve the work.
Такий номер рахунку вже існує. Створіть рахунок ще раз.|This invoice number already exists. Create the invoice again.
Не вдалося створити рахунок.|Could not create the invoice.
Доступ міг бути заблокований власником. Перевірте прив’язку акаунта.|The owner may have blocked access. Check the account link.
Адресу не вказано|No address specified
Г|G
Ваш профіль|Your profile
Ви не увійшли|Not signed in
колего|colleague
Перевірте email і підтвердьте реєстрацію, потім увійдіть.|Check your email, confirm registration, then sign in.
Вхід до студії|Studio sign-in
Створити акаунт|Create account
Зачекайте…|Please wait…
Немає акаунта? Зареєструватися|No account? Register
Введіть адресу від 3 символів: латинські літери, цифри та дефіси.|Enter at least 3 characters: Latin letters, numbers and hyphens.
Така публічна адреса вже зайнята. Оберіть іншу.|This public address is already taken. Choose another.
Створюємо…|Creating…
Створити студію|Create studio
робота триває|job in progress
роботи тривають|jobs in progress
Немає активних робіт|No active work
Ще немає завершених робіт|No completed work yet
Вільний сьогодні|Free today
Вільний день|Free day
Зміни збережено.|Changes saved.
Не вдалося зберегти зміни.|Could not save changes.
Збереження…|Saving…
Майстра додано, запрошення надіслано на email.|Professional added; invitation emailed.
Майстра додано. Email можна додати при наступному редагуванні.|Professional added. You can add an email later.
Додати та надіслати запрошення|Add and send invitation
поза зміною|off shift
зараз не на зміні|currently off shift
Майстер ще не розпочинав зміну сьогодні.|This professional has not started a shift today.
Очікує завершення|Awaiting completion
Обрано|Selected
Спочатку оберіть товар|Select a product first
Потрібно поповнити|Restock needed
В наявності|In stock
Не вдалося зберегти витрату. Перевірте з’єднання.|Could not save the expense. Check your connection.
Зберегти витрату|Save expense
Додайте та оберіть послугу.|Add and select a service.
Оберіть варіант послуги.|Choose a service option.
Цей майстер уже зайнятий у вибраний час. Оберіть інший слот.|This professional is busy at the selected time. Choose another slot.
Термінове звернення|Urgent enquiry
Клієнта не вказано|No client specified
Не вдалося завантажити підписку. Перевірте оновлення бази 034.|Could not load the subscription. Check database update 034.
Не вдалося створити платіж|Could not create payment
Не вдалося відкрити оплату|Could not open payment
Оплачений період відсутній|No paid period
Відкриваємо оплату…|Opening payment…
Запис підтверджено.|Booking confirmed.
Заявку відхилено.|Request rejected.
Не вдалося зберегти зміни. Спробуйте знову.|Could not save changes. Try again.
Операцію видалено.|Transaction deleted.
Без клієнта|No client
Виплату збережено в історії зарплати|Payout saved in payroll history
Операцію збережено.|Transaction saved.
Вкажіть назву та суму операції.|Enter the transaction name and amount.
Наприклад, оплата оренди|For example, rent payment
Вкажіть назву, суму та щонайменше одну послугу.|Enter a name, price and at least one service.
Додати набір|Add package
Додати товар на склад|Add inventory product
Товари ведуться через склад і доступні для продажу.|Products are managed in inventory and available for sale.
Ціни та склад робіт у одному місці.|Prices and work details in one place.
Зберегти набір|Save package
від|from
Ціну не вказано|No price specified
Набір деактивовано.|Package deactivated.
Не вдалося прочитати файл.|Could not read the file.
Оберіть колонку|Select a column
Не імпортувати|Do not import
Імпорт завершено.|Import completed.
Імпортуємо… Не закривайте сторінку|Importing… Keep this page open
Імпорт завершено|Import completed
Повторити імпорт|Retry import
Не вдалося завантажити клієнтів|Could not load clients
Телефон не вказано|No phone specified
Графік прибутку за оплатами. Точні суми в таблиці нижче.|Cash profit chart. Exact amounts are in the table below.
Графік надходжень і витрат. Точні суми в таблиці нижче.|Income and expense chart. Exact amounts are in the table below.
Статус рахунку оновлено.|Invoice status updated.
Строк не вказано|No deadline specified
Рахунок створено.|Invoice created.
Вкажіть призначення та суму рахунку.|Enter the invoice purpose and amount.
Створити рахунок|Create invoice
Докупити|Restock
У запасі|In stock
Керування студією|Studio management
Особистий кабінет|Personal workspace
Бачте результат, а не збирайте звіти в чатах.|See results without collecting reports from chats.
Відкрив зміну. Побачив задачі. Почав роботу.|Start a shift. See your tasks. Get to work.
Розподіляйте роботу між майстрами та контролюйте кожен етап — від призначення до видачі авто.|Assign work and track every stage, from assignment to vehicle handover.
Усі призначення, інформація про авто та чеклісти доступні в одному місці, зокрема з телефона.|Assignments, vehicle details and checklists in one place, including on your phone.
Увійти як майстер|Sign in as a professional
Статус звернення оновлено.|Enquiry status updated.
Звернення видалено.|Enquiry deleted.
Менеджера не призначено|No manager assigned
Вкажіть тему звернення.|Enter the enquiry subject.
Створити звернення|Create enquiry
Спочатку позначте всі пункти чек-листа.|Complete all checklist items first.
Не розпочато|Not started
Виконана робота|Completed work
Не вдалося зберегти профіль. Спробуйте ще раз.|Could not save the profile. Try again.
Зберегти та відкрити кабінет|Save and open workspace
Студію не знайдено|Studio not found
Не вдалося завантажити запис.|Could not load booking.
Вкажіть ім’я та телефон із кодом країни.|Enter your name and phone number with country code.
Не вдалося надіслати заявку|Could not send the request
Не вдалося надіслати заявку. Спробуйте ще раз.|Could not send the request. Try again.
Готуємо онлайн-запис…|Preparing online booking…
Запис тимчасово недоступний|Booking temporarily unavailable
Завантажуємо послуги та графік студії.|Loading studio services and schedule.
Тривалість після вибору|Duration after selection
Будь-який вільний майстер|Any available professional
Автомобіль уточнимо у студії|Vehicle details to be confirmed at the studio
За цим запитом послуг немає. Спробуйте іншу назву.|No services match. Try another name.
Студія ще не додала послуги для онлайн-запису.|The studio has not added services for online booking yet.
Оберіть хоча б одну послугу|Select at least one service
Майстер студії|Studio professional
або будь-якого вільного майстра|or any available professional
Не вдалося завантажити чеки. Перевірте міграцію 036.|Could not load receipts. Check database update 036.
Не вдалося завантажити історію оплат|Could not load payment history
Продаж збережено, залишки оновлено.|Sale saved and stock updated.
Оберіть товар, коректну кількість у межах залишку та ціну.|Select a product, a quantity within available stock and a price.
Додайте хоча б один товар.|Add at least one product.
Вкажіть ціну|Enter a price
Оформити продаж|Record sale
1 год|1 h
Вкажіть назву та коректну ціну.|Enter a name and valid price.
Не вдалося зберегти послугу. Спробуйте ще раз.|Could not save the service. Try again.
Редагувати послугу|Edit service
Не вдалося завантажити адміністраторів. Перевірте міграцію 035.|Could not load administrators. Check database update 035.
Помилка|Error
Не вдалося отримати заявки. Перевірте з’єднання та встановлення оновлення підтримки (031).|Could not load applications. Check your connection and support update 031.
Студію активовано. Власник може увійти або оновити сторінку.|Studio activated. The owner can sign in or refresh the page.
Не вдалося зберегти рішення.|Could not save the decision.
Очікує підтвердження пошти|Awaiting email confirmation
Месенджер|Messenger
Статус завдання оновлено.|Task status updated.
Завдання видалено.|Task deleted.
Не вдалося надіслати лист.|Could not send the email.
Не вдалося завантажити доступи.|Could not load account access.
Не вдалося змінити доступ.|Could not change access.
Доступ майстра активовано.|Professional access activated.
Доступ майстра заблоковано.|Professional access blocked.
Надіслати запрошення|Send invitation
Наступний лист можна запросити через хвилину.|You can request another email in one minute.
Повторний лист містить посилання для створення нового пароля. Поточний пароль не зміниться до підтвердження майстром.|The new email includes a password reset link. The current password stays unchanged until the professional confirms.
Майстер отримає посилання для активації свого кабінету.|The professional receives a link to activate their workspace.
Для збереження умов увійдіть до акаунта студії.|Sign in to your studio account to save terms.
Не вдалося завантажити збережені умови. Перевірте підключення та повторіть спробу.|Could not load saved terms. Check your connection and try again.
Не вдалося зберегти умови. Спробуйте ще раз.|Could not save terms. Try again.
Відсоток має бути від 0 до 100, ставка — не меншою за 0.|Commission must be 0–100%; the rate cannot be negative.
· базовий|· base
· індивідуальний|· custom
Оплату ще не задано|Pay is not set yet
Базовий не задано|Base rate not set
Відсоток: 0–100. Сума: від 0 ₴.|Commission: 0–100%. Amount: ₴0 or more.
Оберіть майстра.|Select a professional.
Зміну збережено.|Shift saved.
Зміну видалено.|Shift deleted.
Не вдалося завантажити спеціалізації. Потрібне оновлення бази 033.|Could not load specializations. Database update 033 is required.
Оберіть товар і вкажіть коректну кількість.|Select a product and enter a valid quantity.
Прихід збережено.|Stock receipt saved.
Інвентаризацію збережено.|Stocktake saved.
Не вдалося зберегти операцію.|Could not save the transaction.
Прихід товару|Stock receipt
Кількість приходу|Received quantity
Фактичний залишок|Actual stock
Наприклад, поставка від постачальника|For example, supplier delivery
Наприклад, фактичний перерахунок|For example, physical stock count
Авто видано.|Vehicle handed over.
Відкрито роботи автомобіля. Призначення та перевірка виконуються окремо для кожної роботи.|Vehicle jobs opened. Assign and review each job separately.
Статус роботи оновлено.|Job status updated.
Не вдалося оновити|Could not update
Статус замовлення оновлено.|Order status updated.
Не можна змінити майстра після нарахування.|Cannot change the professional after earnings are accrued.
Майстра призначено.|Professional assigned.
Підтвердження недоступне. Оновіть сторінку.|Approval unavailable. Refresh the page.
Роботу підтверджено, заробіток нараховано майстру.|Work approved and earnings accrued to the professional.
Не вдалося підтвердити роботу. Оновіть список перед повторною спробою.|Could not approve work. Refresh the list before retrying.
Підтверджене замовлення має нарахування — видалення недоступне.|This approved order has earnings and cannot be deleted.
Замовлення видалено.|Order deleted.
Без майстра|No professional
Майстра не призначено|No professional assigned
Підтвердити оплату|Confirm payment
Оберіть клієнта.|Select a client.
Передоплата не може бути більшою за суму замовлення.|The deposit cannot exceed the order total.
Створити замовлення|Create order
Підтвердьте дію|Confirm action
Повідомлення|Message
Зрозуміло|Got it
Форма|Form
Не вдалося надіслати лист. Адміністратор має перевірити поштову службу.|Could not send email. The administrator needs to check the mail service.
Немає прав на збереження клієнтів у цій студії.|You do not have permission to save clients in this studio.
Структуру бази потрібно оновити.|The database structure needs updating.
Завантажуємо роботи для призначення…|Loading jobs for assignment…
Роботи не завантажено. Натисніть «Оновити» або відкрийте «Роботи та перевірка».|Jobs did not load. Select Refresh or open Work and review.
Призначення знято.|Assignment removed.
Не вдалося призначити майстра. Спробуйте ще раз.|Could not assign the professional. Try again.
· на зміні|· on shift
Не вдалося оновити дані. Перевірте з’єднання та натисніть «Оновити».|Could not update data. Check your connection and select Refresh.
Не вдалося зберегти. Повторіть спробу.|Could not save. Try again.
Перерва|Break
Керівник студії|Studio manager
Фото роботи|Work photo
Фото недоступне|Photo unavailable
Завантаження фото…|Loading photo…
Без нарахування|No earnings
Очікувана оплата|Expected pay
Результат перевірки|Review result
Доопрацювання|Rework
Завершіть перерву, щоб працювати.|End your break to work.
Розпочніть зміну, щоб працювати.|Start your shift to work.
Виконання|Execution
Умови роботи|Job terms
Нова робота|New job
перерва|on break
на зміні|on shift
Відсоток, %|Commission, %
За годину, ₴|Per hour, ₴
Зберегти роботу|Save job
Попереднє нарахування|Previous accrual
Ваш робочий простір|Your workspace
Зміну не розпочато|Shift not started
Завершити перерву|End break
Призначені роботи|Assigned work
Всі мої роботи|All my work
триває|ongoing
Перевірте графік|Check the schedule
Час графіка недоступний у цю дату. Перевірте перехід на літній час.|The scheduled time does not exist on this date. Check the daylight saving transition.
Виконується|In progress
Підготовка|Preparation
Виконання|Execution
Контроль якості|Quality control
На перерві|On break
Спочатку перевірте й активуйте доступ адміністратора у команді.|First review and activate the administrator’s team access.
Послуги з каталогу|Catalog services
Прибрати послугу|Remove service
Спочатку додайте послуги в каталог.|Add services to the catalog first.
Можна призначити окремого майстра для кожної роботи після створення.|You can assign a different professional to each job after creation.
Період доступу завершено. Власник має продовжити тариф|Access has expired. The owner needs to renew the plan.
Продовження додається до залишку доступу. Для завершеного періоду — від сьогодні.|Renewal adds to remaining access. Expired periods start from today.
Наприклад: оплату за тариф підтверджено менеджером у Telegram|For example: plan payment confirmed by the manager in Telegram
Звернутися в Telegram|Contact on Telegram
Для підключення тарифу зверніться до менеджера Detailflow.|Contact the Detailflow manager to activate your plan.
Підключення та продовження — через менеджера. Узгодьте тариф і спосіб оплати в Telegram. Після підтвердження менеджер активує доступ; залишок періоду зберігається.|Activation and renewal are handled by the manager. Agree on a plan and payment method on Telegram. After confirmation, the manager activates access while preserving remaining days.
Оновити статус доступу|Refresh access status
До 3 активних майстрів|Up to 3 active professionals
До 10 активних майстрів|Up to 10 active professionals
Без ліміту активних майстрів|Unlimited active professionals
Без ліміту|Unlimited
Тариф і продовження|Plan and renewal
Активних майстрів|Active professionals
Календар і онлайн-запис|Calendar and online booking
Замовлення, чек-листи та перевірка робіт|Orders, checklists and work review
CRM та імпорт клієнтів|CRM and client import
Кабінети майстрів, зміни та зарплата|Professional workspaces, shifts and pay
Склад, фінанси, аналітика та чеки|Inventory, finance, analytics and receipts
Усі тарифи включають однакові функції. Відрізняється лише кількість активних майстрів. Власник і адміністратори не займають місця майстрів; запрошені активні профілі займають.|All plans include the same features. Only the number of active professionals differs. Owners and administrators do not use professional seats; active invited profiles do.
Для цього тарифу спочатку деактивуйте зайві профілі майстрів.|Deactivate excess professional profiles before switching to this plan.
Тариф доступний власнику та адміністратору студії|Plans are available to the studio owner and administrator
Не вдалося завантажити тариф. Оновіть сторінку або зверніться до підтримки.|Could not load the plan. Refresh the page or contact support.
Період доступу завершено. Власник або адміністратор має продовжити тариф|Access has expired. The owner or administrator needs to renew the plan.
Відновлюємо вхід…|Restoring your session…
Вхід зберігається на цьому пристрої. На спільному пристрої натисніть «Вийти» після роботи.|You stay signed in on this device. On shared devices, sign out when you finish.
Керування доступом|Access management
Знайти студію|Find a studio
Номер, назва, телефон, email або текст із Telegram|ID, name, phone, email or Telegram message
Вставте повідомлення про оплату — номер студії визначиться автоматично.|Paste the payment request to find the studio ID automatically.
Скинути пошук|Clear search
Номер студії|Studio ID
Копіювати номер студії|Copy studio ID
Номер студії скопійовано|Studio ID copied
Виділіть та скопіюйте номер студії вручну.|Select and copy the studio ID manually.
Контакти та сторінка запису|Contacts and booking page
Email не вказано|Email not provided
Телефон не вказано|Phone not provided
Підписку оновлено|Subscription updated
Перевірте номер студії або скиньте пошук.|Check the studio ID or clear the search.
Додати оплачений період|Add a paid period
Не вдалося завантажити студії. Спробуйте ще раз.|Could not load studios. Please try again.
Вкажіть причину зміни (щонайменше 5 символів).|Enter a reason for the change (at least 5 characters).
Аналітика студії|Studio analytics
Майстри|Specialists
Час послуг|Service time
Вартість робіт, ₴|Work value, UAH
Години|Hours
Роботи з таймером|Timed jobs
Вартість за годину, ₴|Value per hour, UAH
Виміряно|Measured
План, хв|Planned, min
Факт, хв|Actual, min
Перевищення плану|Over plan
Візити|Visits
Середній чек, ₴|Average order value, UAH
Візити за всю історію|All-time visits
Історична вартість, ₴|Historical value, UAH
Сезонність|Seasonality
Попит|Demand
День тижня|Weekday
Година|Hour
Записи|Bookings
Скасовано|Cancelled
Оновити звіт|Refresh report
Період до трьох років. Часовий пояс студії.|Up to three years. Studio timezone.
Для звіту підключіть студію.|Connect a studio to view reports.
Звіт недоступний. Перевірте підключення, фінансові права та оновлення бази.|Report unavailable. Check your connection, finance permissions and database updates.
Експорт Excel (XML)|Export Excel (XML)
Друк / PDF|Print / PDF
Завершені замовлення|Completed orders
Вартість завершених замовлень|Completed order value
Повторні клієнти, %|Repeat customers, %
Завершено із запізненням|Completed late
Замовлення з указаним терміном готовності|Orders with a due date
Вартість завершених робіт — не отримані оплати. Грошові надходження та прибуток дивіться в огляді фінансів.|Completed work value is not cash received. See the finance overview for receipts and profit.
Повторні клієнти мають попередній завершений візит або кілька візитів у періоді. Історична вартість — сума завершених замовлень до кінця періоду, без прогнозу LTV.|Repeat customers have an earlier completed visit or multiple visits in the period. Historical value is completed order value through the period end, without an LTV forecast.
Години — активний час підтверджених робіт. Вартість за годину враховує лише роботи з таймером. План зберігається для нових робіт із каталогу; для старих робіт може бути відсутній.|Hours are active time on approved jobs. Value per hour includes only timed jobs. Planned time is saved for new catalog jobs and may be missing for older jobs.
Немає даних за цей період|No data for this period
Попит за днями та годинами|Demand by weekday and hour
Кількість записів за часом початку. Скасовані записи виключено; це не відсоток завантаження.|Booking count by start time. Cancelled bookings are excluded; this is not a utilization percentage.
Роботи|Jobs
Історія змін підписки|Subscription change history
Не вдалося завантажити історію.|Could not load history.
Змін підписки ще немає.|No subscription changes yet.
Експорт XLSX|Export XLSX
Завантажити PDF|Download PDF
Не вдалося створити файл. Спробуйте ще раз.|Could not create the file. Please try again.
Попередній період|Previous period
Вартість у попередньому періоді|Previous period value
Порівняння періодів|Period comparison
Немає бази порівняння|No comparison baseline
Динаміка вартості робіт|Work value trend
Середня частка замовлення, ₴|Average order share, UAH
Скасовані замовлення|Cancelled orders
Середня частка замовлення — вартість робіт майстра, поділена на кількість його замовлень. Скасування показують причетність до замовлення, а не провину майстра.|Average order share is the specialist’s work value divided by their order count. Cancellations indicate assignment, not fault.
Плановий час, хв|Planned time, min
Необов’язково. Для каталогу план визначається автоматично.|Optional. Catalog jobs receive an automatic estimate.
Вкажіть цілу кількість хвилин|Enter a whole number of minutes
План має бути від 1 до 43200 хвилин|Planned time must be between 1 and 43200 minutes
Фото та відео роботи|Work photos and videos
До початку робіт|Before work
Після роботи|After work
Додати фото або відео|Add photo or video
Файли до роботи|Before-work files
Файли після роботи|After-work files
Попередні фото без етапу|Earlier photos without a stage
Товщина покриття, мкм|Coating thickness, µm
Для полірування: вкажіть деталь кузова та заміри до і після.|For polishing: enter the body panel and measurements before and after.
Деталь кузова|Body panel
До, мкм|Before, µm
Після, мкм|After, µm
Прибрати|Remove
Додати замір|Add measurement
Зберегти заміри|Save measurements
Фото: JPG, PNG, WebP до 8 МБ. Відео: MP4, WebM, MOV до 50 МБ. До 40 файлів на роботу.|Photos: JPG, PNG, WebP up to 8 MB. Videos: MP4, WebM, MOV up to 50 MB. Up to 40 files per job.
Фото до 8 МБ, відео до 50 МБ|Photos up to 8 MB, videos up to 50 MB
Не вдалося завантажити файл|Could not upload the file
Відкрити файл|Open file
Оновити посилання|Refresh link
Повторити завантаження|Retry loading
Фотоархів|Media archive
Історія робіт студії|Studio work history
Пошук в архіві|Search archive
Авто, клієнт, майстер, робота або номер замовлення|Vehicle, client, specialist, job or order number
Етап матеріалів|Media stage
Всі етапи|All stages
Тип файлу|File type
Фото та відео|Photos and videos
Відео|Video
Знайти|Search
Не вдалося завантажити архів|Could not load the archive
Матеріалів за цим запитом немає|No media matches this search
мкм|µm
Матеріали вже передано на перевірку|Evidence has already been submitted for review
Перевірте етап і ліміт: 40 файлів на роботу|Check the stage and limit: 40 files per job
Невірний шлях файлу|Invalid file path
Спочатку завантажте файл|Upload the file first
Додайте до 30 точок вимірювання|Add up to 30 measurement points
Вкажіть деталь кузова|Enter the body panel
Вкажіть хоча б один замір|Enter at least one measurement
Заміри: від 0 до 5000 мкм|Measurements: 0 to 5000 µm
Робота має збережені матеріали. Збережіть її в історії|This job has saved evidence. Keep it in the history
Додано матеріали роботи|Work media added
Оновлено заміри покриття|Coating measurements updated
Матеріали перевіряються з підключеною базою|Evidence requires a connected database
Повторити прив’язку завантаженого файлу|Retry attaching the uploaded file
Перевірте повторний візит|Review a repeat visit
Перегляньте тривалість послуги|Review service duration
Перевірте собівартість і ціну|Review costs and pricing
Обговоріть додаткову послугу|Discuss an additional service
Перевірте день із нижчим попитом|Review a lower-demand weekday
Клієнт не повернувся у звичний строк. Перевірте історію та доречність особистого контакту. Це сигнал, а не прогноз втрати клієнта.|The client has not returned within their usual interval. Review their history and whether personal contact is appropriate. This is a signal, not a churn prediction.
Роботи регулярно тривають довше плану. Перевірте складність автомобілів, перерви таймера та тривалість у каталозі.|Jobs regularly take longer than planned. Check vehicle complexity, timer breaks and catalog duration.
Більша тривалість може впливати на маржу. Спочатку перевірте витрати й обсяг робіт. Даних недостатньо для автоматичного розрахунку нової ціни.|Longer duration can affect margins. Review costs and scope first. There is not enough evidence to calculate a new price automatically.
Ці послуги часто замовляють разом у вашій студії. Перевірте стан автомобіля й потребу клієнта перед пропозицією.|These services are often purchased together at your studio. Check the vehicle and the client's needs before making an offer.
Записів менше, ніж в інші дні з історією. Перевірте графік, вихідні та доступність майстрів. Кількість записів не дорівнює завантаженню.|There are fewer bookings than on other weekdays with history. Check opening hours, holidays and staff availability. Booking count is not utilization.
Основна послуга|Base service
Звичний інтервал, днів|Typical interval, days
Днів після візиту|Days since visit
Підтверджені роботи з таймером|Approved timed jobs
Спільні замовлення|Orders with both services
Замовлення основної послуги|Orders with the base service
Середня кількість записів за день тижня|Average bookings per weekday
Тижні з записами|Weeks with bookings
Для рекомендацій підключіть студію.|Connect a studio to see recommendations.
Не вдалося оновити рекомендації|Could not refresh recommendations
Не вдалося зберегти оцінку|Could not save feedback
Рекомендації|Recommendations
Підказки з історії вашої студії|Suggestions from your studio history
Оновити рекомендації|Refresh recommendations
Адаптивні правила · без зовнішнього AI|Adaptive rules · no external AI
Нові роботи оновлюють розрахунки. Оцінки коригують пріоритет типів підказок після п’яти різних оцінених рекомендацій. Це не навчання мовної моделі й не гарантія результату.|New jobs update the calculations. Feedback adjusts category priority after five distinct rated recommendations. This does not train a language model or guarantee outcomes.
Ціни, записи та повідомлення не змінюються автоматично. Дані інших студій не використовуються.|Prices, bookings and messages are never changed automatically. Other studios' data is not used.
Днів історії|Days of history
Коли з’являються рекомендації|When recommendations appear
Повторний візит: щонайменше три візити та два інтервали від доби. Затримки: п’ять робіт із планом і таймером за 90 днів. Перевірка ціни: дванадцять таких робіт. Додаткова послуга: п’ять спільних замовлень і частка від 35%. Попит: від 40 записів і восьми тижнів спостережень.|Repeat visits: at least three visits and two gaps of a day or more. Delays: five timed jobs with a plan in 90 days. Price review: twelve such jobs. Add-ons: five joint orders and a share of at least 35%. Demand: at least 40 bookings and eight observed weeks.
Оцінка спільна для студії: повторне натискання замінює її, а не додає голос. Можна скасувати оцінку. Позначка «Виконано» не підтверджує фінансовий результат.|Feedback is shared across the studio: voting again replaces the rating instead of adding a vote. You can undo it. Marking a suggestion done does not confirm a financial result.
Показувати оцінені підказки|Show reviewed suggestions
Сигнал для перевірки|Signal to review
Пріоритет враховує оцінки студії|Priority reflects studio feedback
Базовий пріоритет: ще мало оцінок|Base priority: not enough feedback yet
Корисно|Useful
Не корисно|Not useful
Скасувати оцінку|Undo feedback
Нових підказок поки немає. Потрібно більше історії або відхилень від звичного процесу; відсутність підказок не означає помилку.|No new suggestions yet. More history or deviations from the usual process are needed; an empty feed is not an error.
Спочатку оберіть підтверджене замовлення.|Select an approved order first.
Замовлення повністю оплачене. Знижка недоступна, оскільки вона зменшила б суму нижче вже отриманої оплати.|This order is fully paid. A discount would reduce the total below the payment already received.
Максимальна знижка — неоплачений залишок:|Maximum discount — unpaid balance:
`;

export const messages:Record<string,string>=Object.fromEntries(rows.trim().split('\n').map(row=>{const [uk,en]=row.split('|');return [uk,en]}))
