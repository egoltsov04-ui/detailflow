// Display strings only. Database status codes, option values and customer data stay unchanged.
const rows=`
Огляд|Обзор|Overview
Календар|Календарь|Calendar
Замовлення|Заказы|Orders
Клієнти|Клиенты|Clients
Команда|Команда|Team
Кабінет майстра|Кабинет мастера|Professional workspace
Послуги|Услуги|Services
Аналітика та фінанси|Аналитика и финансы|Analytics and finance
Склад|Склад|Inventory
Онлайн-запис|Онлайн-запись|Online booking
Налаштування|Настройки|Settings
Чеки|Чеки|Receipts
Тариф|Тариф|Plan
Завдання|Задачи|Tasks
Звернення|Обращения|Enquiries
Продажі|Продажи|Sales
Рахунки|Счета|Invoices
Фінанси|Финансы|Finance
Оплати|Платежи|Payments
Витрати|Расходы|Expenses
Вхід до кабінету|Вход в кабинет|Sign in
Оберіть спосіб входу|Выберите способ входа|Choose your workspace
Кожна роль бачить тільки свій робочий простір.|Каждая роль видит только своё рабочее пространство.|Each role has its own workspace.
Єдина система для студії|Единая система для студии|One system for your studio
Власник студії|Владелец студии|Studio owner
Майстер|Мастер|Professional
Адміністратор студії|Администратор студии|Studio administrator
Підтримка Detailflow|Поддержка Detailflow|Detailflow support
Службовий вхід|Служебный вход|Staff sign in
Вхід за запрошенням|Вход по приглашению|Sign in with your invitation
Увійдіть за запрошенням власника|Войдите по приглашению владельца|Sign in using the owner's invitation
Календар, клієнти та замовлення за доступом власника|Календарь, клиенты и заказы с доступом от владельца|Calendar, clients and orders with owner-granted access
На головну|На главную|Home
Назад|Назад|Back
Увійти|Войти|Sign in
Вийти|Выйти|Sign out
Вийти з акаунта|Выйти из аккаунта|Sign out
Пароль|Пароль|Password
Новий пароль|Новый пароль|New password
Повторіть пароль|Повторите пароль|Repeat password
Створіть пароль|Создайте пароль|Create a password
Активація акаунта|Активация аккаунта|Account activation
Після збереження відкриється ваш робочий кабінет.|После сохранения откроется ваш рабочий кабинет.|Your workspace will open after saving.
Ваше ім’я|Ваше имя|Your name
Ім’я|Имя|Name
Ім’я та прізвище|Имя и фамилия|Full name
Назва студії|Название студии|Studio name
Телефон|Телефон|Phone
Зручний месенджер|Удобный мессенджер|Preferred messenger
Нік / контакт у месенджері|Ник / контакт в мессенджере|Messenger username or contact
Заявка на підключення|Заявка на подключение|Studio application
Заявка власника|Заявка владельца|Owner application
Менеджер активує ваш обліковий запис після зв’язку з вами.|Менеджер активирует ваш аккаунт после связи с вами.|A manager will contact you and activate your account.
Вже є акаунт? Увійти|Уже есть аккаунт? Войти|Already have an account? Sign in
Ще немає акаунта? Зареєструвати студію|Ещё нет аккаунта? Зарегистрировать студию|New here? Register your studio
Підтвердження email|Подтверждение email|Email confirmation
Перевірте пошту|Проверьте почту|Check your email
Листа немає?|Нет письма?|No email yet?
Перейти до входу|Перейти ко входу|Go to sign in
Вказати іншу адресу|Указать другой адрес|Use another email
Перевірити статус|Проверить статус|Check status
Спробувати ще раз|Попробовать ещё раз|Try again
Пошук|Поиск|Search
Назва|Название|Name
Опис|Описание|Description
Категорія|Категория|Category
Клієнт|Клиент|Client
Авто|Авто|Vehicle
Автомобіль|Автомобиль|Vehicle
Дата|Дата|Date
Час|Время|Time
Від|От|From
До|До|To
Сьогодні|Сегодня|Today
Завтра|Завтра|Tomorrow
Тиждень|Неделя|Week
Місяць|Месяц|Month
Рік|Год|Year
Усі|Все|All
Статус|Статус|Status
Спосіб оплати|Способ оплаты|Payment method
Готівка|Наличные|Cash
Картка|Карта|Card
Переказ|Перевод|Bank transfer
Сума|Сумма|Amount
Сума, ₴|Сумма, ₴|Amount, ₴
Оплата|Оплата|Payment
Послуга|Услуга|Service
Зберегти|Сохранить|Save
Зберегти зміни|Сохранить изменения|Save changes
Зберігаємо…|Сохраняем…|Saving…
Завантаження…|Загрузка…|Loading…
Завантаження Detailflow…|Загрузка Detailflow…|Loading Detailflow…
Перевіряємо сесію…|Проверяем сессию…|Checking session…
Перевіряємо доступ…|Проверяем доступ…|Checking access…
Закрити|Закрыть|Close
Скасувати|Отменить|Cancel
Видалити|Удалить|Delete
Редагувати|Редактировать|Edit
Деактивувати|Деактивировать|Deactivate
Активувати|Активировать|Activate
Заблокувати|Заблокировать|Block
Підтвердити|Подтвердить|Confirm
Відхилити|Отклонить|Decline
Оновити|Обновить|Refresh
Обрати|Выбрать|Choose
Очистити|Очистить|Clear
Скинути|Сбросить|Reset
Продовжити|Продолжить|Continue
Примітка|Примечание|Note
Коментар|Комментарий|Comment
Внутрішня примітка|Внутреннее примечание|Internal note
Не вказано|Не указано|Not specified
Не призначено|Не назначен|Unassigned
Оберіть значення зі списку.|Выберите значение из списка.|Choose a value from the list.
Нічого не знайдено|Ничего не найдено|No matches found
Оберіть майстра|Выберите мастера|Choose a professional
Усі майстри|Все мастера|All professionals
Усі статуси|Все статусы|All statuses
Усі клієнти|Все клиенты|All clients
Очікує підтвердження|Ожидает подтверждения|Awaiting confirmation
Підтверджено|Подтверждено|Confirmed
В роботі|В работе|In progress
У роботі|В работе|In progress
Завершено|Завершено|Completed
Скасовано|Отменено|Cancelled
Не прийшов|Не пришёл|No-show
На перевірці|На проверке|Awaiting review
Потрібно призначити|Нужно назначить|Needs assignment
Призначено|Назначено|Assigned
Призначені|Назначенные|Assigned
Готово|Готово|Ready
Видано|Выдано|Delivered
На зміні|На смене|On shift
Не на зміні|Не на смене|Off shift
Поза зміною|Вне смены|Off shift
На перерві|На перерыве|On break
Пауза|Пауза|Paused
Тариф і білінг|Тариф и биллинг|Plan and billing
Пробний період|Пробный период|Trial period
Підписка активна|Подписка активна|Subscription active
Потрібне продовження|Нужно продление|Renewal required
Обрати тариф|Выбрать тариф|Choose a plan
Статус і строк — у тарифах|Статус и срок — в тарифах|View status and term under Plans
Оновити статус оплати|Обновить статус оплаты|Refresh payment status
Історія платежів|История платежей|Payment history
Платежів ще немає.|Платежей пока нет.|No payments yet.
Оплату тарифу виконує власник студії.|Тариф оплачивает владелец студии.|Only the studio owner can purchase a plan.
До 3 майстрів|До 3 мастеров|Up to 3 professionals
До 10 майстрів|До 10 мастеров|Up to 10 professionals
Без ліміту майстрів|Без ограничения мастеров|Unlimited professionals
₴ / місяць|₴ / месяц|₴ / month
Оплачено|Оплачено|Paid
Очікує оплати|Ожидает оплаты|Awaiting payment
Не оплачено|Не оплачено|Unpaid
Строк минув|Срок истёк|Expired
Календар записів|Календарь записей|Booking calendar
Новий запис|Новая запись|New booking
← Тиждень|← Неделя|← Week
Тиждень →|Неделя →|Week →
Новий запис →|Новая запись →|New booking →
Розклад на сьогодні|Расписание на сегодня|Today's schedule
Наступний запис|Следующая запись|Next booking
Новий клієнт|Новый клиент|New client
Додати клієнта|Добавить клиента|Add client
Оберіть клієнта|Выберите клиента|Choose a client
Картка клієнта|Карточка клиента|Client profile
Клієнти та автомобілі|Клиенты и автомобили|Clients and vehicles
Сегмент|Сегмент|Segment
Без завершених візитів|Без завершённых визитов|No completed visits
Повторні клієнти|Повторные клиенты|Returning clients
Теги через кому|Теги через запятую|Comma-separated tags
Теги|Теги|Tags
Примітка клієнта|Примечание клиента|Client note
Примітка авто|Примечание автомобиля|Vehicle note
Автомобілі|Автомобили|Vehicles
Марка|Марка|Make
Модель|Модель|Model
Держномер|Госномер|License plate
Додати автомобіль|Добавить автомобиль|Add vehicle
Прибрати нове авто|Убрать новый автомобиль|Remove new vehicle
Зберегти картку|Сохранить карточку|Save profile
Історія візитів|История визитов|Visit history
Візитів ще немає.|Визитов пока нет.|No visits yet.
Клієнтів не знайдено.|Клиенты не найдены.|No clients found.
Варіант послуги|Вариант услуги|Service option
Оберіть розмір або варіант|Выберите размер или вариант|Choose a size or option
Не призначено — у спільний список|Не назначен — в общий список|Unassigned — add to shared queue
Підтвердити запис|Подтвердить запись|Confirm booking
Адміністратор · CRM|Администратор · CRM|Administrator · CRM
Співробітники|Сотрудники|Employees
Команда та кабінет майстра|Команда и кабинет мастера|Team and professional workspace
Додати майстра|Добавить мастера|Add professional
Новий майстер|Новый мастер|New professional
Email для доступу|Email для доступа|Access email
Спеціалізація|Специализация|Specialization
Колір у календарі|Цвет в календаре|Calendar color
Зарплата за місяць|Зарплата за месяц|Monthly earnings
Профіль майстра|Профиль мастера|Professional profile
Робоча зміна|Рабочая смена|Work shift
Послуги майстрів|Услуги мастеров|Professional specializations
Усі послуги, включно з новими|Все услуги, включая новые|All services, including new ones
Лише обрані послуги|Только выбранные услуги|Selected services only
Адміністратори студії|Администраторы студии|Studio administrators
Запросити адміністратора|Пригласить администратора|Invite administrator
Окремий email|Отдельный email|Separate email
Створити доступ і надіслати запрошення|Создать доступ и отправить приглашение|Create access and send invitation
Доступ до фінансів та зарплат|Доступ к финансам и зарплатам|Finance and payroll access
Повторний лист / відновити пароль|Повторное письмо / восстановить пароль|Resend email / reset password
Відновити пароль|Восстановить пароль|Reset password
Доступ до кабінету майстра|Доступ к кабинету мастера|Professional account access
Email для запрошення|Email для приглашения|Invitation email
Оплата роботи майстрів|Оплата работы мастеров|Professional compensation
Ставки та процентовка|Ставки и проценты|Rates and commissions
Базовий відсоток, %|Базовый процент, %|Base commission, %
Погодинна ставка, ₴|Почасовая ставка, ₴|Hourly rate, ₴
Базовий відсоток|Базовый процент|Base commission
Погодинна ставка|Почасовая ставка|Hourly rate
Є незбережені зміни|Есть несохранённые изменения|Unsaved changes
Оплата за послугами|Оплата по услугам|Service compensation
Послуга та збережена оплата|Услуга и сохранённая оплата|Service and saved compensation
Ціна для клієнта|Цена для клиента|Client price
Відсоток майстра|Процент мастера|Professional commission
Або фіксовано, ₴|Или фиксированная сумма, ₴|Or fixed amount, ₴
Фіксована сума, ₴|Фиксированная сумма, ₴|Fixed amount, ₴
Послуг з власними умовами|Услуг с отдельными условиями|Services with custom rates
Планування змін|Планирование смен|Shift planning
Графік команди|График команды|Team schedule
Додати зміну|Добавить смену|Add shift
День|День|Day
Початок|Начало|Start
Завершення|Окончание|End
Додайте першу зміну.|Добавьте первую смену.|Add your first shift.
Підтверджене замовлення|Подтверждённый заказ|Approved order
Оберіть замовлення|Выберите заказ|Choose an order
Знижка, ₴|Скидка, ₴|Discount, ₴
Сформувати чек|Сформировать чек|Issue receipt
Клієнт, авто або номер|Клиент, авто или номер|Client, vehicle or receipt number
Відкрити / друкувати|Открыть / печатать|Open / print
Чеків немає.|Чеков нет.|No receipts yet.
Друк / зберегти PDF|Печать / сохранить PDF|Print / save PDF
Підсумок|Подытог|Subtotal
Знижка|Скидка|Discount
Разом|Итого|Total
Зареєстровано оплат:|Зарегистрировано оплат:|Payments recorded:
Інформаційний документ. Не є фіскальним чеком.|Информационный документ. Не является фискальным чеком.|Informational document. Not a fiscal receipt.
Нове замовлення|Новый заказ|New order
Конвеєр робіт за автомобілями|Конвейер работ по автомобилям|Vehicle work pipeline
Показувати скасовані|Показывать отменённые|Show cancelled
Перетягніть сюди замовлення|Перетащите сюда заказ|Drag an order here
Роботи та перевірка|Работы и проверка|Jobs and review
Призначити майстра|Назначить мастера|Assign professional
Підтвердити та нарахувати|Подтвердить и начислить|Approve and accrue pay
Внести оплату|Внести оплату|Record payment
Почати роботу|Начать работу|Start job
Видати авто|Выдать авто|Deliver vehicle
Перетягніть картку в потрібну колонку, щоб змінити статус.|Перетащите карточку в нужную колонку, чтобы изменить статус.|Drag the card into a column to change its status.
Назва робіт|Название работ|Job title
Чек-лист робіт|Чек-лист работ|Job checklist
Відповідальний майстер|Ответственный мастер|Assigned professional
Передоплата, ₴|Предоплата, ₴|Deposit, ₴
Термін готовності|Срок готовности|Due date
Робочий день студії|Рабочий день студии|Studio workday
Немає робіт у цій черзі.|Нет работ в этой очереди.|No jobs in this queue.
Команда на зміні|Команда на смене|Team on shift
Створено|Создано|Created
Готовність|Готовность|Due
Історія|История|History
Додати роботу до автомобіля|Добавить работу к автомобилю|Add a job to this vehicle
Коментар і фото|Комментарий и фото|Comment and photos
Зберегти коментар|Сохранить комментарий|Save comment
Додати фото (JPG, PNG, WebP до 8 МБ)|Добавить фото (JPG, PNG, WebP до 8 МБ)|Add photo (JPG, PNG, WebP up to 8 MB)
Призначити / умови|Назначить / условия|Assignment / terms
Призупинити|Приостановить|Pause
Здати на перевірку|Сдать на проверку|Submit for review
Перевірити роботу|Проверить работу|Review job
Перевірка якості|Проверка качества|Quality review
Якість відповідає завданню|Качество соответствует заданию|Work meets the requirements
Видимих дефектів немає|Видимых дефектов нет|No visible defects
Коментар / причина повернення|Комментарий / причина возврата|Comment / reason for rework
Оплату буде нараховано за умовами, збереженими власником.|Оплата будет начислена по условиям, сохранённым владельцем.|Pay will accrue using the owner's saved terms.
Повернути на доопрацювання|Вернуть на доработку|Return for rework
Перевірено|Проверено|Reviewed
Індивідуальна робота|Индивидуальная работа|Custom job
Етап|Этап|Stage
Черга етапу|Порядок этапа|Stage order
Виконавець|Исполнитель|Assignee
Без виконавця|Без исполнителя|Unassigned
Вартість для клієнта, ₴|Стоимость для клиента, ₴|Client price, ₴
Оплата майстру|Оплата мастеру|Professional pay
За збереженими умовами майстра|По сохранённым условиям мастера|Use saved professional rates
Відсоток цієї роботи|Процент этой работы|Commission for this job
Фіксована сума|Фиксированная сумма|Fixed amount
За активні години цієї роботи|За активные часы этой работы|Active hours for this job
Завдання — кожне з нового рядка|Задачи — каждая с новой строки|Tasks — one per line
Видалити роботу|Удалить работу|Delete job
Заробіток і виплати|Заработок и выплаты|Earnings and payouts
Оплата роботи|Оплата работы|Compensation
Вся команда|Вся команда|Entire team
Нараховано за місяць|Начислено за месяц|Accrued this month
Виплачено з цих нарахувань|Выплачено из этих начислений|Paid from these earnings
Залишок за всі періоди|Остаток за все периоды|Outstanding across all periods
Виплата|Выплата|Payout
Зареєструвати виплату|Зарегистрировать выплату|Record payout
За цей місяць нарахувань немає.|За этот месяц начислений нет.|No earnings this month.
Зберегти виплату|Сохранить выплату|Save payout
Перегляд власника|Просмотр владельца|Owner preview
Почати зміну|Начать смену|Start shift
Завершити зміну|Закончить смену|End shift
Мої автомобілі|Мои автомобили|My vehicles
За цей місяць|За этот месяц|This month
Призначених робіт немає|Назначенных работ нет|No assigned jobs
Нові роботи від власника з’являться тут автоматично.|Новые работы от владельца появятся здесь автоматически.|New assignments from the owner will appear here automatically.
Історія змін|История смен|Shift history
Мій профіль|Мой профиль|My profile
Зберегти профіль|Сохранить профиль|Save profile
Мої роботи|Мои работы|My jobs
Заробіток|Заработок|Earnings
Профіль|Профиль|Profile
Пізніше|Позже|Later
Встановити застосунок|Установить приложение|Install app
Оновити застосунок|Обновить приложение|Update app
Доступна нова версія. Збережіть відкриті форми перед оновленням.|Доступна новая версия. Сохраните открытые формы перед обновлением.|A new version is available. Save open forms before updating.
Додати послугу|Добавить услугу|Add service
Нова послуга|Новая услуга|New service
Назва послуги|Название услуги|Service name
Опис послуги|Описание услуги|Service description
Варіанти послуги|Варианты услуги|Service options
Додати варіант|Добавить вариант|Add option
Назва варіанта|Название варианта|Option name
Ціна варіанта|Цена варианта|Option price
Тривалість варіанта|Длительность варианта|Option duration
Опис варіанта|Описание варианта|Option description
Видалити варіант|Удалить вариант|Delete option
Тривалість|Длительность|Duration
Ціна, ₴|Цена, ₴|Price, ₴
Товари|Товары|Products
Набори|Наборы|Bundles
Послуги, товари та набори|Услуги, товары и наборы|Services, products and bundles
Товари додаються на склад|Товары добавляются на склад|Add products in Inventory
Зберегти послугу|Сохранить услугу|Save service
Оберіть значення|Выберите значение|Choose a value
Зменшити значення|Уменьшить значение|Decrease value
Збільшити значення|Увеличить значение|Increase value
Обрати час|Выбрать время|Choose time
Відкрити календар|Открыть календарь|Open calendar
Вибір часу|Выбор времени|Time selection
Вибір дати|Выбор даты|Date selection
Оберіть час|Выберите время|Choose a time
Оберіть дату|Выберите дату|Choose a date
Закрити вибір дати|Закрыть выбор даты|Close date picker
Попередній місяць|Предыдущий месяц|Previous month
Наступний місяць|Следующий месяц|Next month
Пн|Пн|Mon
Вт|Вт|Tue
Ср|Ср|Wed
Чт|Чт|Thu
Пт|Пт|Fri
Сб|Сб|Sat
Нд|Вс|Sun
Ім’я, телефон, email, авто або тег|Имя, телефон, email, авто или тег|Name, phone, email, vehicle or tag
Пошук клієнтів, авто, записів…|Поиск клиентов, авто, записей…|Search clients, vehicles and bookings…
БД підключена|БД подключена|Database connected
Перевірка БД…|Проверка БД…|Checking database…
Потрібно увійти|Нужно войти|Sign in required
Локальний режим|Локальный режим|Local mode
Поточна студія:|Текущая студия:|Current studio:
Редагувати профіль студії|Редактировать профиль студии|Edit studio profile
Налаштування студії|Настройки студии|Studio settings
Завантаження профілю майстра…|Загрузка профиля мастера…|Loading professional profile…
detailflow · Кабінет майстра|detailflow · Кабинет мастера|detailflow · Professional workspace
Завантаження кабінету…|Загрузка кабинета…|Loading workspace…
Завантаження каталогу…|Загрузка каталога…|Loading catalog…
Завантаження замовлень…|Загрузка заказов…|Loading orders…
Завантаження фінансів…|Загрузка финансов…|Loading finances…
Завантаження заявок…|Загрузка заявок…|Loading requests…
Завантаження завдань…|Загрузка задач…|Loading tasks…
Завантаження звернень…|Загрузка обращений…|Loading enquiries…
Завантаження продажів…|Загрузка продаж…|Loading sales…
Завантаження рахунків…|Загрузка счетов…|Loading invoices…
Призначених робіт поки немає.|Назначенных работ пока нет.|No assigned jobs yet.
Призначених записів поки немає.|Назначенных записей пока нет.|No assigned bookings yet.
Перегляд кабінету майстра|Просмотр кабинета мастера|Preview professional workspace
Перегляд власника. Дії виконує майстер зі свого акаунта.|Просмотр владельца. Действия выполняет мастер из своего аккаунта.|Owner preview. The professional performs actions from their own account.
Зберегти спеціалізацію|Сохранить специализацию|Save specialization
Надіслати заявку|Отправить заявку|Submit application
Надсилаємо…|Отправляем…|Sending…
Входимо…|Входим…|Signing in…
Забули пароль?|Забыли пароль?|Forgot password?
Очікує активації|Ожидает активации|Awaiting activation
Зареєстрований|Зарегистрирован|Registered
Заблокований|Заблокирован|Blocked
Заявку відхилено|Заявка отклонена|Application declined
Збережено|Сохранено|Saved
Збережено для|Сохранено для|Saved for
Графік ще не задано|График пока не задан|No schedule yet
Неділя|Воскресенье|Sunday
Понеділок|Понедельник|Monday
Вівторок|Вторник|Tuesday
Середа|Среда|Wednesday
Четвер|Четверг|Thursday
П’ятниця|Пятница|Friday
Субота|Суббота|Saturday
Оплата у студії. Додаткові роботи погоджуються з вами окремо.|Оплата в студии. Дополнительные работы согласовываются с вами отдельно.|Pay at the studio. Additional work will be agreed with you separately.
Ваш візит|Ваш визит|Your visit
Оберіть послуги для свого авто.|Выберите услуги для своего авто.|Choose services for your vehicle.
ДОГЛЯД ЗА ВАШИМ АВТО|УХОД ЗА ВАШИМ АВТО|CARE FOR YOUR VEHICLE
ОЧІКУЄ ПІДТВЕРДЖЕННЯ|ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ|AWAITING CONFIRMATION
Дякуємо,|Спасибо,|Thank you,
Ще один запис|Ещё одна запись|Make another booking
01 / ПОСЛУГИ|01 / УСЛУГИ|01 / SERVICES
Що зробимо для вашого авто?|Что сделаем для вашего авто?|What does your vehicle need?
Можна обрати кілька послуг за один візит.|Можно выбрать несколько услуг за один визит.|Choose several services for one visit.
Оберіть варіант, щоб продовжити.|Выберите вариант, чтобы продолжить.|Choose an option to continue.
02 / ДАТА І ЧАС|02 / ДАТА И ВРЕМЯ|02 / DATE AND TIME
Коли вам зручно?|Когда вам удобно?|When suits you?
Час студії:|Время студии:|Studio time:
. Показуємо слоти для всіх обраних послуг.|. Показываем время для всех выбранных услуг.|. Available times cover all selected services.
Будь-який вільний|Любой свободный|Any available professional
Більше доступного часу|Больше доступного времени|More available times
Інша дата|Другая дата|Another date
Час початку|Время начала|Start time
Оновлюємо доступний час…|Обновляем доступное время…|Updating available times…
На цю дату немає вільного часу|На эту дату нет свободного времени|No availability on this date
Оберіть інший день|Выберите другой день|Choose another day
. Для довгих робіт зв’яжіться зі студією.|. Для длительных работ свяжитесь со студией.|. Contact the studio for longer jobs.
03 / ВАШІ ДАНІ|03 / ВАШИ ДАННЫЕ|03 / YOUR DETAILS
Залишилося познайомитись|Осталось познакомиться|Let's get to know you
Email для підтвердження|Email для подтверждения|Confirmation email
Перевірте запис|Проверьте запись|Review your booking
Змінити дату або час|Изменить дату или время|Change date or time
Час більше не доступний. Поверніться до вибору дати.|Это время больше недоступно. Вернитесь к выбору даты.|This time is no longer available. Choose another date.
Онлайн-запис працює на|Онлайн-запись работает на|Online booking powered by
Фінансовий контроль|Финансовый контроль|Financial overview
Грошовий потік|Денежный поток|Cash flow
Додати операцію|Добавить операцию|Add transaction
Усі операції|Все операции|All transactions
Надходження|Поступления|Income
Дата та операція|Дата и операция|Date and transaction
Метод / клієнт|Метод / клиент|Method / client
Фінансових операцій за цим фільтром немає.|Финансовых операций по этому фильтру нет.|No financial transactions match these filters.
Ручна фінансова операція|Ручная финансовая операция|Manual financial entry
Рух грошей|Движение денег|Money movement
Витрата|Расход|Expense
Назва операції|Название операции|Transaction title
Витрати студії|Расходы студии|Studio expenses
Додати витрату|Добавить расход|Add expense
Нова витрата|Новый расход|New expense
Дата витрати|Дата расхода|Expense date
Матеріали|Материалы|Materials
Оренда|Аренда|Rent
Зарплата|Зарплата|Payroll
Маркетинг|Маркетинг|Marketing
Комунальні|Коммунальные|Utilities
Інше|Другое|Other
Кількість на склад|Количество на склад|Quantity received
Одиниця виміру|Единица измерения|Unit of measure
Дата та опис|Дата и описание|Date and description
Операційний облік|Операционный учёт|Operations
Списати матеріал|Списать материал|Write off material
Додати товар|Добавить товар|Add item
Початковий залишок|Начальный остаток|Opening stock
Назва товару|Название товара|Item name
Кількість|Количество|Quantity
Одиниця|Единица|Unit
Мінімальний залишок|Минимальный остаток|Minimum stock
Собівартість одиниці, ₴|Себестоимость единицы, ₴|Unit cost, ₴
Ціна продажу, ₴|Цена продажи, ₴|Selling price, ₴
Зберегти на склад|Сохранить на склад|Save inventory item
Списання матеріалу|Списание материала|Material write-off
Товар|Товар|Item
Оберіть товар|Выберите товар|Choose an item
Кількість до списання|Количество для списания|Write-off quantity
Причина / послуга|Причина / услуга|Reason / service
Підтвердити списання|Подтвердить списание|Confirm write-off
Залишок|Остаток|Stock
Мінімум|Минимум|Minimum
Собівартість|Себестоимость|Cost
Ціна продажу|Цена продажи|Selling price
Склад порожній. Додайте першу позицію або закупівлю матеріалів.|Склад пуст. Добавьте первую позицию или закупку материалов.|Inventory is empty. Add an item or a material purchase.
За цим запитом товарів не знайдено.|Товары по этому запросу не найдены.|No items match this search.
Історія руху|История движения|Stock history
Останні 20 операцій|Последние 20 операций|Last 20 transactions
Дата та товар|Дата и товар|Date and item
Операція|Операция|Transaction
Рух товарів|Движение товаров|Stock movements
Окремо від закупівель у витратах|Отдельно от закупок в расходах|Separate from purchases recorded as expenses
Оприбуткувати|Оприходовать|Receive stock
Нова ціна одиниці, ₴|Новая цена единицы, ₴|New unit price, ₴
Причина / примітка|Причина / примечание|Reason / note
Зберегти операцію|Сохранить операцию|Save transaction
Профіль студії|Профиль студии|Studio profile
Адреса|Адрес|Address
Телефон студії|Телефон студии|Studio phone
Email студії|Email студии|Studio email
Часовий пояс|Часовой пояс|Time zone
Нагадування клієнтам|Напоминания клиентам|Client reminders
SMS-нагадування|SMS-напоминания|SMS reminders
Email-нагадування|Email-напоминания|Email reminders
За 24 години до запису|За 24 часа до записи|24 hours before booking
За 2 години до запису|За 2 часа до записи|2 hours before booking
Імпорт клієнтів|Импорт клиентов|Import clients
Каталог послуг|Каталог услуг|Service catalog
Завантажити шаблон Excel|Скачать шаблон Excel|Download Excel template
Завантажити шаблон CSV|Скачать шаблон CSV|Download CSV template
Завантажте шаблон|Скачайте шаблон|Download the template
Перенесення клієнтів за шаблоном|Перенос клиентов по шаблону|Import clients using a template
Завантажити заповнений шаблон або свій CSV|Загрузить заполненный шаблон или свой CSV|Upload a completed template or your CSV
Або вставити дані з таблиці|Или вставить данные из таблицы|Or paste spreadsheet data
Перевірити дані|Проверить данные|Validate data
Підтвердити імпорт|Подтвердить импорт|Confirm import
Імпортуємо…|Импортируем…|Importing…
Підключення студій|Подключение студий|Studio onboarding
Заявки власників|Заявки владельцев|Owner applications
Примітка менеджера|Примечание менеджера|Manager note
Активувати студію|Активировать студию|Activate studio
У цьому розділі заявок немає.|В этом разделе заявок нет.|No applications in this section.
detailflow · Підтримка|detailflow · Поддержка|detailflow · Support
Після підтвердження робіт сформуйте підсумковий документ. Збережений чек фіксує склад і ціни та не змінюється після редагування каталогу.|После подтверждения работ сформируйте итоговый документ. Сохранённый чек фиксирует состав и цены и не меняется после редактирования каталога.|Issue a receipt after approving the work. Saved receipts preserve items and prices even if the catalog changes.
Зареєструйте виплату|Зарегистрируйте выплату|Record a payout
`;
export const messages:Record<string,[string,string]>=Object.fromEntries(rows.trim().split('\n').map(row=>{const [uk,ru,en]=row.split('|');return [uk,[ru,en]]}))
