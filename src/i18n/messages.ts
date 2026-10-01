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
хв|мин|min
год|ч|h
Повна картина грошей студії|Полная картина финансов студии|Your studio finances at a glance
Розділи фінансів|Разделы финансов|Finance sections
Фактично отримані оплати|Фактически полученные оплаты|Payments actually received
Усі витрати|Все расходы|All expenses
Прибуток за оплатами|Прибыль по оплатам|Cash profit
Надходження мінус усі витрати|Поступления минус все расходы|Income minus all expenses
Зарплату нараховано|Зарплата начислена|Wages accrued
За підтверджені роботи в періоді|За подтверждённые работы в периоде|For work approved in this period
Виплачено зарплати за період|Выплачено зарплаты за период|Wages paid in this period
До виплати за всі періоди|К выплате за все периоды|Outstanding wages across all periods
Перейти до зарплат →|Перейти к зарплатам →|View payroll →
Надходження та витрати|Поступления и расходы|Income and expenses
Порівняння за|Сравнение по|Compare by
місяцями|месяцам|month
днями|дням|day
Структура витрат|Структура расходов|Expense breakdown
Операційні витрати та виплачена зарплата|Операционные расходы и выплаченная зарплата|Operating expenses and paid wages
% від усіх витрат|% от всех расходов|% of all expenses
Динаміка прибутку за оплатами|Динамика прибыли по оплатам|Cash profit over time
Результат кожного періоду після витрат, включно з виплатами майстрам|Результат каждого периода после расходов, включая выплаты мастерам|Results for each period after expenses, including staff payouts
Показати точні суми за періодами|Показать точные суммы по периодам|Show exact amounts by period
Період|Период|Period
Усі фінансові операції|Все финансовые операции|All financial transactions
операцій за вибраний період|операций за выбранный период|transactions in the selected period
Показати|Показать|Show
Виплати зарплати|Выплаты зарплаты|Wage payouts
Показати ще 30|Показать ещё 30|Show 30 more
Як розраховані показники|Как рассчитаны показатели|How these figures are calculated
Надходження — зареєстровані оплати замовлень, продажі товарів і ручні надходження. Витрати — записи витрат студії та видаткові операції каси, включно з фактичними виплатами зарплати. Кожна виплата враховується один раз.|Поступления — зарегистрированные оплаты заказов, продажи товаров и ручные поступления. Расходы — расходы студии и расходные операции кассы, включая фактические выплаты зарплаты. Каждая выплата учитывается один раз.|Income includes recorded order payments, product sales and manual receipts. Expenses include studio expenses and cash outflows, including actual wage payouts. Each payout is counted once.
Прибуток за оплатами — касовий результат, а не бухгалтерський чистий прибуток. Неоплачені замовлення та невиплачена нарахована зарплата до нього не входять. Податки, оренду та інші видатки потрібно внести у витрати. Не дублюйте одну витрату в касі та у витратах студії.|Прибыль по оплатам — кассовый результат, а не бухгалтерская чистая прибыль. Неоплаченные заказы и невыплаченная начисленная зарплата в него не входят. Налоги, аренду и другие расходы нужно внести в расходы. Не дублируйте один расход в кассе и расходах студии.|Cash profit is a cash-based result, not accounting net profit. Unpaid orders and unpaid accrued wages are excluded. Record taxes, rent and other costs as expenses. Do not enter the same expense in both cash flow and studio expenses.
Нарахування зарплати показані за датою підтвердження роботи, виплати — за датою платежу. Залишок до виплати охоплює всі періоди.|Начисления зарплаты показаны по дате подтверждения работы, выплаты — по дате платежа. Остаток к выплате охватывает все периоды.|Wages accrue on the work approval date; payouts use the payment date. Outstanding wages include all periods.
Часовий пояс студії|Часовой пояс студии|Studio time zone
Каса: оплати замовлень, продажі, виплати та ручні операції. Повний журнал, включно з витратами студії, — у вкладці «Огляд».|Касса: оплаты заказов, продажи, выплаты и ручные операции. Полный журнал, включая расходы студии, — во вкладке «Обзор».|Cash flow: order payments, sales, payouts and manual entries. The full journal, including studio expenses, is in Overview.
Оренда, матеріали, маркетинг та інші витрати. Виплати за нараховану роботу майстрів реєструйте у вкладці «Зарплати».|Аренда, материалы, маркетинг и другие расходы. Выплаты за начисленную работу мастеров регистрируйте во вкладке «Зарплаты».|Rent, materials, marketing and other costs. Record staff wage payouts in Payroll.
За цей період операцій немає.|За этот период операций нет.|No transactions in this period.
: надходження|: поступления|: income
, витрати|, расходы|, expenses
, прибуток|, прибыль|, profit
Не вдалося завантажити налаштування повідомлень.|Не удалось загрузить настройки уведомлений.|Could not load notification settings.
Налаштування збережено.|Настройки сохранены.|Settings saved.
Інтервал збережено.|Интервал сохранён.|Interval saved.
Провайдер міг уже прийняти це повідомлення. Перевірте його журнал перед повтором, щоб не надіслати дублікат. Повторити?|Провайдер мог уже принять это сообщение. Проверьте его журнал перед повтором, чтобы не отправить дубликат. Повторить?|The provider may have already accepted this message. Check its log before retrying to avoid a duplicate. Retry?
Повідомлення повернуто в чергу.|Сообщение возвращено в очередь.|Message returned to the queue.
Повторні візити: лише для клієнтів зі згодою в CRM. Інтервал задається окремо для кожної послуги.|Повторные визиты: только для клиентов с согласием в CRM. Интервал задаётся отдельно для каждой услуги.|Return visits: only for clients who opted in through CRM. Set a separate interval for each service.
Зберегти налаштування|Сохранить настройки|Save settings
Інтервали повторних послуг|Интервалы повторных услуг|Return service intervals
Вимкнено|Выключено|Disabled
місяців|месяцев|months
Журнал повідомлень|Журнал сообщений|Notification log
Повторити|Повторить|Retry
Повідомлень ще немає.|Сообщений пока нет.|No notifications yet.
Не вдалося завантажити календар. Спробуйте ще раз.|Не удалось загрузить календарь. Попробуйте ещё раз.|Could not load the calendar. Please try again.
Мій календар|Мой календарь|My calendar
Попередній період|Предыдущий период|Previous period
Наступний період|Следующий период|Next period
Завантажуємо календар…|Загружаем календарь…|Loading calendar…
Графік не задано|График не задан|No schedule set
Авто не вказано|Авто не указано|No vehicle specified
Записів немає|Записей нет|No bookings
Завантаження за графіком|Загрузка по графику|Scheduled workload
Вільні інтервали розраховані за збереженим графіком. Кожне вікно — щонайменше 30 хвилин.|Свободные интервалы рассчитаны по сохранённому графику. Каждое окно — не менее 30 минут.|Free intervals follow the saved schedule. Each window is at least 30 minutes.
Зайнято|Занято|Booked
Вільні інтервали|Свободные интервалы|Free intervals
Вільних 30-хвилинних слотів|Свободных 30-минутных слотов|Free 30-minute slots
Немає|Нет|None
Без призначеного майстра|Без назначенного мастера|No professional assigned
Ці записи ще не займають персональний графік.|Эти записи ещё не занимают персональный график.|These bookings do not yet occupy a personal schedule.
Не вдалося завантажити налаштування студії.|Не удалось загрузить настройки студии.|Could not load studio settings.
Підготуйте студію до першого запису|Подготовьте студию к первой записи|Prepare your studio for its first booking
Зберегти й продовжити|Сохранить и продолжить|Save and continue
Додайте послуги, ціни, тривалість і варіанти автомобілів.|Добавьте услуги, цены, длительность и варианты автомобилей.|Add services, prices, durations and vehicle options.
Послуг|Услуг|Services
Відкрити каталог|Открыть каталог|Open catalog
Далі|Далее|Next
Запросіть майстрів, оберіть їхні послуги та робочі години.|Пригласите мастеров, выберите их услуги и рабочие часы.|Invite professionals and set their services and working hours.
Майстрів|Мастеров|Professionals
Робочих інтервалів|Рабочих интервалов|Working intervals
Налаштувати команду|Настроить команду|Set up your team
Перевірте публічну сторінку запису. Імпорт клієнтів можна виконати пізніше в налаштуваннях.|Проверьте публичную страницу записи. Импорт клиентов можно выполнить позже в настройках.|Check your public booking page. You can import clients later in Settings.
Відкрити онлайн-запис|Открыть онлайн-запись|Open online booking
Завершити налаштування|Завершить настройку|Finish setup
Команда і графік|Команда и график|Team and schedule
Готовність до запису|Готовность к записи|Booking readiness
Студії та підписки|Студии и подписки|Studios and subscriptions
Пошук студії|Поиск студии|Find a studio
Назва, адреса сторінки або email|Название, адрес страницы или email|Name, page address or email
Знайти|Найти|Search
Завантажуємо студії…|Загружаем студии…|Loading studios…
Клієнтів|Клиентов|Clients
Змінити підписку|Изменить подписку|Change subscription
Студій не знайдено|Студий не найдено|No studios found
Доступ до|Доступ до|Access until
Причина зміни|Причина изменения|Reason for change
Зміна фіксується в журналі. Зупинка нових записів зберігає доступ до наявних даних.|Изменение фиксируется в журнале. Остановка новых записей сохраняет доступ к имеющимся данным.|Changes are logged. Stopping new bookings preserves access to existing data.
Нові записи зупинено|Новые записи остановлены|New bookings stopped
Push-повідомлення ще не налаштовано.|Push-уведомления ещё не настроены.|Push notifications are not configured yet.
Дозвольте повідомлення в налаштуваннях браузера.|Разрешите уведомления в настройках браузера.|Allow notifications in your browser settings.
Оновіть застосунок і повторіть спробу.|Обновите приложение и повторите попытку.|Update the app and try again.
Увійдіть повторно.|Войдите повторно.|Please sign in again.
Не вдалося зберегти повідомлення. Спробуйте ще раз.|Не удалось сохранить уведомления. Попробуйте ещё раз.|Could not save notification settings. Please try again.
Сповіщення|Уведомления|Notifications
Робочі сповіщення|Рабочие уведомления|Work notifications
Призначення, перевірка та підтвердження робіт на цьому пристрої.|Назначение, проверка и подтверждение работ на этом устройстве.|Assignments, reviews and approvals on this device.
Для iPhone встановіть застосунок на головний екран і відкрийте його звідти.|Для iPhone установите приложение на главный экран и откройте его оттуда.|On iPhone, add the app to your Home Screen and open it from there.
Вимкнути на цьому пристрої|Выключить на этом устройстве|Disable on this device
Увімкнути повідомлення|Включить уведомления|Enable notifications
Нагадування про повторний візит|Напоминания о повторном визите|Return visit reminders
У черзі|В очереди|Queued
Надсилається|Отправляется|Sending
Прийнято провайдером|Принято провайдером|Accepted by provider
Помилка, буде повтор|Ошибка, будет повтор|Failed, retry scheduled
Потрібна перевірка доставки|Нужна проверка доставки|Delivery needs checking
Повтори вичерпано|Попытки исчерпаны|Retry limit reached
Повторний візит|Повторный визит|Return visit
У тому числі зарплати|В том числе зарплаты|Including wages
Увесь час|Всё время|All time
Зарплати|Зарплаты|Payroll
Операції|Операции|Transactions
Минулий місяць|Прошлый месяц|Previous month
7 днів|7 дней|7 days
Для завершення реєстрації відкрийте посилання в листі на|Для завершения регистрации откройте ссылку в письме на|To complete registration, open the link sent to
. Потім менеджер зможе активувати студію.|. Затем менеджер сможет активировать студию.|. A manager can then activate your studio.
Перевірте «Спам» та правильність адреси. Для вже зареєстрованої пошти новий лист може не надсилатися — спробуйте увійти.|Проверьте «Спам» и правильность адреса. Для уже зарегистрированной почты новое письмо может не отправляться — попробуйте войти.|Check your spam folder and email address. Existing accounts may not receive another email; try signing in.
Власник надіслав вам лист. Увійдіть тим самим email і паролем, який задали в листі.|Владелец отправил вам письмо. Войдите с тем же email и паролем, который задали по ссылке.|The owner sent you an invitation. Sign in with that email and the password you set through the link.
Після активації менеджером тут відкриється робочий простір студії.|После активации менеджером здесь откроется рабочее пространство студии.|Your studio workspace will open here after a manager activates it.
Вхід доступний лише співробітникам підтримки з активованим службовим акаунтом.|Вход доступен только сотрудникам поддержки с активированным служебным аккаунтом.|Sign-in is restricted to support staff with an activated support account.
Показники за вибраний період|Показатели за выбранный период|Metrics for the selected period
Аналітика студії|Аналитика студии|Studio analytics
Статус запису|Статус записи|Booking status
Метод оплати запису|Способ оплаты записи|Booking payment method
Категорія витрат|Категория расходов|Expense category
Скинути фільтри|Сбросить фильтры|Reset filters
Дата початку має бути не пізніше дати завершення.|Дата начала не может быть позже даты окончания.|The start date must not be after the end date.
Вартість робіт рахується після знижок за датою запису. Фактичні надходження та витрати беруться з фінансового журналу. Фільтри майстра, послуги й статусу не застосовуються до руху грошей.|Стоимость работ считается после скидок по дате записи. Фактические поступления и расходы берутся из финансового журнала. Фильтры мастера, услуги и статуса не применяются к движению денег.|Work value uses booking dates and includes discounts. Actual income and expenses come from the financial journal. Professional, service and status filters do not apply to cash flow.
Завершені роботи|Завершённые работы|Completed work
Планові роботи|Плановые работы|Planned work
Роботи мінус витрати|Работы минус расходы|Work value minus expenses
Фактично надійшло|Фактически поступило|Actually received
Середня завершена робота|Средняя завершённая работа|Average completed job
Після знижок|После скидок|After discounts
Скасовано / неявки|Отмены / неявки|Cancellations / no-shows
Записів|Записей|Bookings
Годин завершених робіт|Часов завершённых работ|Completed work hours
Вартість завершених робіт|Стоимость завершённых работ|Completed work value
За цими фільтрами записів немає.|По этим фильтрам записей нет.|No bookings match these filters.
Витрати за категоріями|Расходы по категориям|Expenses by category
Витрат за цими фільтрами немає.|Расходов по этим фильтрам нет.|No expenses match these filters.
Динаміка за днями|Динамика по дням|Daily trends
Витрати журналу|Расходы журнала|Recorded expenses
Немає даних за вибраний період.|Нет данных за выбранный период.|No data for the selected period.
Завантаження запису…|Загрузка записи…|Loading booking…
Не вдалося увійти|Не удалось войти|Could not sign in
Службовий доступ|Служебный доступ|Support access
Цей акаунт не має прав підтримки. Увійдіть службовим акаунтом або поверніться на головну сторінку.|Этот аккаунт не имеет прав поддержки. Войдите служебным аккаунтом или вернитесь на главную страницу.|This account does not have support permissions. Sign in with a support account or return to the home page.
Доступ призупинено|Доступ приостановлен|Access suspended
Власник студії заблокував ваш профіль. Зверніться до нього для відновлення доступу.|Владелец студии заблокировал ваш профиль. Обратитесь к нему для восстановления доступа.|The studio owner blocked your profile. Contact them to restore access.
Кабінет підтримки|Кабинет поддержки|Support workspace
Відкрийте /admin на цьому сайті для службового входу.|Откройте /admin на этом сайте для служебного входа.|Open /admin on this site to sign in as support.
Профіль не прив’язано|Профиль не привязан|Profile not linked
Для майстра потрібне запрошення від власника. Якщо ви вже перейшли з листа, попросіть власника перевірити прив’язку акаунта.|Мастеру нужно приглашение от владельца. Если вы уже перешли из письма, попросите владельца проверить привязку аккаунта.|Professionals need an invitation from the owner. If you already followed the email link, ask the owner to check your account link.
Профіль майстра недоступний|Профиль мастера недоступен|Professional profile unavailable
Закрити меню|Закрыть меню|Close menu
Відкрити меню|Открыть меню|Open menu
Меню профілю|Меню профиля|Profile menu
Нарахування:|Начисления:|Accruals:
. Детальний журнал виплат недоступний — перевірте підключення модуля робіт.|. Подробный журнал выплат недоступен — проверьте подключение модуля работ.|. The detailed payout log is unavailable. Check the work module connection.
Мінімум 8 символів|Минимум 8 символов|At least 8 characters
Створіть вашу студію|Создайте вашу студию|Create your studio
Це створить окремий tenant — інші студії не бачитимуть ваші дані.|Это создаст отдельную студию — другие студии не увидят ваши данные.|This creates a separate studio. Other studios cannot see your data.
Публічна адреса|Публичный адрес|Public page address
Латиниця, цифри та дефіси; наприклад: detail-test. Використаємо у сторінці запису.|Латиница, цифры и дефисы; например: detail-test. Используется на странице записи.|Use Latin letters, numbers and hyphens, for example detail-test. This is used for your booking page.
Вітаємо,|Здравствуйте,|Hello,
Виконано сьогодні|Выполнено сегодня|Completed today
Заплановано на сьогодні|Запланировано на сегодня|Scheduled for today
Статус зміни|Статус смены|Shift status
записів ·|записей ·|bookings ·
у роботі|в работе|in progress
Весь календар →|Весь календарь →|Full calendar →
На сьогодні записів немає|На сегодня записей нет|No bookings today
Створіть запис вручну або поділіться посиланням на онлайн-запис.|Создайте запись вручную или поделитесь ссылкой на онлайн-запись.|Create a booking or share your online booking link.
Створити запис →|Создать запись →|Create booking →
Відкрити у календарі →|Открыть в календаре →|Open in calendar →
Записів у черзі немає|Записей в очереди нет|No upcoming bookings
Усі заплановані роботи вже завершені або скасовані.|Все запланированные работы уже завершены или отменены.|All scheduled work is completed or cancelled.
Команда сьогодні|Команда сегодня|Team today
Активні записи за майстрами|Активные записи по мастерам|Active bookings by professional
Команда →|Команда →|Team →
Додайте майстрів, щоб бачити їх завантаження.|Добавьте мастеров, чтобы видеть их загрузку.|Add professionals to see their workload.
На цей день записів немає. Створіть новий запис для обраної дати.|На этот день записей нет. Создайте новую запись на выбранную дату.|No bookings for this day. Create a booking for the selected date.
клієнтів|клиентов|clients
Без тегів|Без тегов|No tags
Тег|Тег|Tag
Усі теги|Все теги|All tags
Показано:|Показано:|Showing:
Зберегти клієнта|Сохранить клиента|Save client
Завершено візитів|Завершено визитов|Completed visits
Сума завершених робіт|Сумма завершённых работ|Completed work total
Сума робіт|Сумма работ|Work total
Клієнтів за цим сегментом не знайдено.|Клиентов в этом сегменте не найдено.|No clients in this segment.
Закрити картку|Закрыть карточку|Close card
VIP, корпоративний, повторний|VIP, корпоративный, повторный|VIP, corporate, returning
Внутрішня нотатка|Внутренняя заметка|Internal note
Побажання клієнта, важливі деталі авто|Пожелания клиента, важные детали авто|Client preferences and vehicle details
Автомобілі:|Автомобили:|Vehicles:
Історія записів|История записей|Booking history
Історія записів порожня.|История записей пуста.|No booking history.
Видалити клієнта|Удалить клиента|Delete client
Каталог|Каталог|Catalog
Наприклад, тонування|Например, тонировка|For example, window tinting
Мийка|Мойка|Wash
Полірування|Полировка|Polishing
Кераміка|Керамика|Ceramic coating
Хімчистка|Химчистка|Interior cleaning
Тонування|Тонировка|Window tinting
2 год|2 ч|2 h
Наприклад, мийка, хімчистка|Например, мойка, химчистка|For example, washing and interior cleaning
Після збереження майстер отримає лист із посиланням для реєстрації та входу до свого кабінету.|После сохранения мастер получит письмо со ссылкой для регистрации и входа в свой кабинет.|After saving, the professional receives an email link to register and access their workspace.
Зарплата за поточний місяць. Відсоток за послугами та графік редагуються нижче для обраного майстра.|Зарплата за текущий месяц. Процент по услугам и график редактируются ниже для выбранного мастера.|Wages for this month. Edit service commission rates and the selected professional's schedule below.
Чеки та оплати|Чеки и оплаты|Receipts and payments
Чек|Чек|Receipt
Метод|Метод|Method
Чеки з’являться після початку або завершення послуги.|Чеки появятся после начала или завершения услуги.|Receipts appear after a service starts or finishes.
Позицій на складі|Позиций на складе|Inventory items
Низький залишок|Низкий остаток|Low stock
На рівні або нижче мінімуму|На уровне или ниже минимума|At or below minimum
Оцінка запасів|Оценка запасов|Inventory valuation
За собівартістю; без ціни — не враховано|По себестоимости; без цены — не учтено|At cost; items without a price are excluded
Наприклад, шампунь pH neutral|Например, шампунь pH neutral|For example, pH-neutral shampoo
шт|шт|pcs
л|л|L
мл|мл|mL
кг|кг|kg
уп.|уп.|packs
Необов’язково|Необязательно|Optional
Використовуйте після виконаної послуги або при псуванні. Операція буде збережена в історії.|Используйте после выполненной услуги или при порче. Операция сохранится в истории.|Use after a service or for damaged stock. The operation is recorded in history.
Наприклад, дітейлінг BMW X5|Например, детейлинг BMW X5|For example, BMW X5 detailing
Пошук товару на складі|Поиск товара на складе|Search inventory
Рухи з’являться після закупівель, коригувань або списань.|Движения появятся после закупок, корректировок или списаний.|Movements appear after purchases, adjustments or write-offs.
Витрати за весь час|Расходы за всё время|All-time expenses
Контроль запасів|Контроль запасов|Stock control
Найбільша стаття|Наибольшая статья|Largest category
За весь час|За всё время|All time
Наприклад, закупівля мікрофібри|Например, закупка микрофибры|For example, microfiber purchase
Наприклад, 5|Например, 5|For example, 5
Студія|Студия|Studio
Налаштування та онбординг|Настройки и подключение|Settings and onboarding
Назва вашої студії|Название вашей студии|Your studio name
Місто, вулиця, номер|Город, улица, номер|City, street, building
Запуск студії|Запуск студии|Studio setup
Послуг:|Услуг:|Services:
· Майстрів:|· Мастеров:|· Professionals:
· Клієнтів:|· Клиентов:|· Clients:
Назва, адреса та часовий пояс|Название, адрес и часовой пояс|Name, address and time zone
Послуг у каталозі:|Услуг в каталоге:|Catalog services:
Майстрів у команді:|Мастеров в команде:|Team members:
Необов’язково — можна зробити пізніше|Необязательно — можно сделать позже|Optional; you can do this later
Почніть вводити ім’я або телефон|Начните вводить имя или телефон|Start typing a name or phone number
Новий клієнт — буде створений і збережений після підтвердження запису.|Новый клиент будет создан и сохранён после подтверждения записи.|A new client will be created and saved when you confirm the booking.
Марка, модель, номер|Марка, модель, номер|Make, model, plate
Операційний контроль|Операционный контроль|Operations
Потребують уваги|Требуют внимания|Needs attention
Ще|Ещё|More
Усе під контролем|Всё под контролем|Everything is up to date
Немає прострочених завдань, термінових звернень, проблемних залишків або прострочених рахунків.|Нет просроченных задач, срочных обращений, проблемных остатков или просроченных счетов.|No overdue tasks, urgent enquiries, stock issues or overdue invoices.
Завантажуємо підписку…|Загружаем подписку…|Loading subscription…
. Поточний тариф:|. Текущий тариф:|. Current plan:
Після завершення періоду збережені дані доступні; нові записи й активація майстрів потребують продовження.|После завершения периода сохранённые данные доступны; новые записи и активация мастеров требуют продления.|Saved data remains available after expiry. Renew to create bookings and activate professionals.
Разова оплата одного місяця через WayForPay. Автоматичних списань немає. Продовження додає місяць до невикористаного оплаченого періоду. Платіж підтверджується після відповіді провайдера.|Разовая оплата одного месяца через WayForPay. Автоматических списаний нет. Продление добавляет месяц к оставшемуся оплаченному периоду. Платёж подтверждается после ответа провайдера.|A one-off payment for one month through WayForPay, with no automatic charges. Renewal adds a month to any remaining paid period. Payment is confirmed after the provider responds.
Адміністратор · заявки з онлайн-запису|Администратор · заявки онлайн-записи|Administrator · online booking requests
Заявки клієнтів|Заявки клиентов|Client requests
Тут адміністратор підтверджує або відхиляє заявки. Ручний запис — у календарі. Після підтвердження клієнт із вказаним email отримує лист.|Здесь администратор подтверждает или отклоняет заявки. Ручная запись — в календаре. После подтверждения клиент с указанным email получает письмо.|Review booking requests here. Create manual bookings in the calendar. After approval, clients with an email address receive a confirmation.
Ваша сторінка онлайн-запису|Ваша страница онлайн-записи|Your online booking page
Клієнт обирає послуги, майстра та час, залишає контакти — заявка з’являється тут. Додайте посилання в Instagram, Google Maps або на свій сайт. Час бронюється після вашого підтвердження.|Клиент выбирает услуги, мастера и время, оставляет контакты — заявка появляется здесь. Добавьте ссылку в Instagram, Google Maps или на свой сайт. Время бронируется после вашего подтверждения.|Clients choose services, a professional and a time, then leave their details. Requests appear here. Share your link on Instagram, Google Maps or your website. Time is reserved after your approval.
Посилання онлайн-запису|Ссылка онлайн-записи|Online booking link
Копіювати посилання|Копировать ссылку|Copy link
Відкрити сторінку запису ↗|Открыть страницу записи ↗|Open booking page ↗
Завантаження адреси студії…|Загрузка адреса студии…|Loading studio address…
Ім’я, телефон, email, авто|Имя, телефон, email, авто|Name, phone, email, vehicle
Заявок за цими фільтрами немає|Заявок по этим фильтрам нет|No requests match these filters
Нові онлайн-заявки відображатимуться зі статусом «Очікує підтвердження».|Новые онлайн-заявки отображаются со статусом «Ожидает подтверждения».|New online requests appear as Awaiting confirmation.
За вибраний період|За выбранный период|For the selected period
Видатки каси, включно з виплатами|Расходы кассы, включая выплаты|Cash expenses, including payouts
Рух коштів, нетто|Движение средств, нетто|Net cash flow
Надходження мінус витрати|Поступления минус расходы|Income minus expenses
Видалити операцію|Удалить операцию|Delete transaction
Старі автоматичні нарахування (|Старые автоматические начисления (|Legacy automatic accruals (
Ці записи створювалися при підтвердженні роботи. Вони збережені для звірки та не враховуються як фактична виплата. Перевірте видані суми перед реєстрацією виплат у новому журналі.|Эти записи создавались при подтверждении работы. Они сохранены для сверки и не считаются фактическими выплатами. Проверьте выданные суммы перед регистрацией выплат в новом журнале.|These entries were created on work approval. They remain for reconciliation and do not count as actual payouts. Check paid amounts before recording payouts in the new journal.
Продажі та каталог|Продажи и каталог|Sales and catalog
Пошук у каталозі|Поиск в каталоге|Search catalog
Там задаються кількість, одиниця виміру, мінімальний залишок і закупівельна ціна. Це виключає дублювання товарів у каталозі.|Там задаются количество, единица измерения, минимальный остаток и закупочная цена. Это исключает дублирование товаров в каталоге.|Set quantities, units, minimum stock and purchase prices there to avoid duplicate catalog products.
Новий набір|Новый набор|New package
Наприклад, комплексний догляд|Например, комплексный уход|For example, complete care
Комплексні послуги|Комплексные услуги|Service packages
Склад набору|Состав набора|Package contents
Ціна набору, ₴|Цена набора, ₴|Package price, ₴
ДД.ММ.РРРР|ДД.ММ.ГГГГ|DD.MM.YYYY
ГГ:ХХ|ЧЧ:ММ|HH:MM
ДД.ММ.РРРР ГГ:ХХ|ДД.ММ.ГГГГ ЧЧ:ММ|DD.MM.YYYY HH:MM
Фіксовано|Фиксировано|Fixed
год активної роботи|ч активной работы|hour of active work
Призначено роботу|Назначена работа|Work assigned
Робота на перевірці|Работа на проверке|Work under review
Роботу підтверджено|Работа подтверждена|Work approved
Роботу повернуто|Работа возвращена|Work returned
Вкажіть дійсну дату / час у зазначеному форматі.|Укажите действительную дату / время в указанном формате.|Enter a valid date / time in the indicated format.
Значення раніше за дозволений початок.|Значение раньше допустимого начала.|Value is before the allowed start.
Значення пізніше за дозволене завершення.|Значение позже допустимого окончания.|Value is after the allowed end.
Введіть число, наприклад 1250,50.|Введите число, например 1250,50.|Enter a number, for example 1250.50.
Мінімальне значення|Минимальное значение|Minimum value
Максимальне значення|Максимальное значение|Maximum value
Вкажіть значення з кроком|Укажите значение с шагом|Enter a value in increments of
Платформа|Платформа|Platform
Пробний період активний|Пробный период активен|Trial is active
12 днів до першого списання. План можна змінити в будь-який момент.|12 дней до окончания пробного периода. Тариф можно изменить в любой момент.|12 days until the trial ends. You can change plans at any time.
Записи, CRM, календар і нагадування|Записи, CRM, календарь и напоминания|Bookings, CRM, calendar and reminders
Онлайн-оплата тимчасово готується. Обраний тариф:|Онлайн-оплата пока готовится. Выбранный тариф:|Online payments are being prepared. Selected plan:
Що входить до набору та для яких авто підходить|Что входит в набор и для каких авто подходит|Package contents and suitable vehicles
На складі:|На складе:|In stock:
Позицій у цій вкладці поки немає.|В этой вкладке пока нет позиций.|No items in this tab yet.
Заповніть готову таблицю та перенесіть її в сервіс. До 1000 рядків, 2 МБ за один імпорт.|Заполните готовую таблицу и перенесите её в сервис. До 1000 строк, 2 МБ за один импорт.|Fill in the template and import it. Up to 1,000 rows and 2 MB per import.
9 колонок: контакти клієнта, марка, модель, номер, рік і примітки. Excel містить окремі аркуші з прикладом та інструкцією.|9 колонок: контакты клиента, марка, модель, номер, год и примечания. В Excel есть отдельные листы с примером и инструкцией.|9 columns cover client contacts, make, model, plate, year and notes. The Excel file includes separate example and instruction sheets.
Заповніть у Excel або Google-таблицях|Заполните в Excel или Google Таблицах|Complete it in Excel or Google Sheets
Залиште заголовки в першому рядку. Кожен наступний рядок — клієнт та його авто. Для кількох авто повторіть телефон клієнта в окремих рядках.|Оставьте заголовки в первой строке. Каждая следующая строка — клиент и его авто. Для нескольких авто повторите телефон клиента в отдельных строках.|Keep the headers in the first row. Each subsequent row is a client and vehicle. For multiple vehicles, repeat the client's phone on separate rows.
Збережіть аркуш «Клієнти» як CSV UTF-8|Сохраните лист «Клиенты» как CSV UTF-8|Save the Clients sheet as CSV UTF-8
Завантажте CSV або скопіюйте заповнені рядки разом із заголовками та вставте нижче. Перевірте дані перед імпортом.|Загрузите CSV или скопируйте заполненные строки вместе с заголовками и вставьте ниже. Проверьте данные перед импортом.|Upload a CSV or paste the completed rows with headers below. Review the data before importing.
Як заповнити колонки шаблону|Как заполнить колонки шаблона|How to fill in the template columns
Ім’я · обов’язково|Имя · обязательно|Name · required
Ім’я та прізвище або назва клієнта.|Имя и фамилия или название клиента.|Full name or client company name.
Телефон · обов’язково|Телефон · обязательно|Phone · required
Задайте текстовий формат колонки, щоб зберегти «+» і початкові нулі. Вкажіть міжнародний номер із кодом країни, наприклад +380…|Задайте текстовый формат колонки, чтобы сохранить «+» и начальные нули. Укажите международный номер с кодом страны, например +380…|Format the column as text to preserve + and leading zeroes. Include the country code, for example +380…
Email та примітка клієнта|Email и примечание клиента|Client email and notes
Контактна пошта та побажання клієнта. Необов’язкові.|Контактная почта и пожелания клиента. Необязательные.|Contact email and client preferences. Optional.
Марка, модель, держномер, рік|Марка, модель, госномер, год|Make, model, plate, year
Окремі поля картки автомобіля. Рік — чотири цифри. Невідомі дані залиште порожніми.|Отдельные поля карточки автомобиля. Год — четыре цифры. Неизвестные данные оставьте пустыми.|Separate vehicle fields. Use a four-digit year. Leave unknown values blank.
Колір, особливості покриття або інша інформація про авто. Стару колонку «Авто» також можна імпортувати сюди.|Цвет, особенности покрытия или другая информация об авто. Старую колонку «Авто» тоже можно импортировать сюда.|Color, coating details or other vehicle information. You can also map an older Vehicle column here.
Аркуш «Клієнти» порожній. Демонстраційні дані є лише на аркуші «Приклад»; його не імпортуйте. Переносяться лише заповнені вами рядки. Послуги, склад і фінансові дані цей шаблон не імпортує.|Лист «Клиенты» пустой. Демонстрационные данные есть только на листе «Пример»; его не импортируйте. Переносятся только заполненные вами строки. Услуги, склад и финансовые данные этот шаблон не импортирует.|The Clients sheet is empty. Demo data is only on the Example sheet; do not import it. Only your completed rows are imported. This template does not import services, inventory or financial records.
Дані разом із заголовками|Данные вместе с заголовками|Data with headers
Ім’я,Телефон,Авто|Имя,Телефон,Авто|Name,Phone,Vehicle
Читаємо файл…|Читаем файл…|Reading file…
Рядків у файлі:|Строк в файле:|Rows in file:
. Обов’язкові поля: ім’я та телефон. Необов’язкові колонки можна пропустити.|. Обязательные поля: имя и телефон. Необязательные колонки можно пропустить.|. Name and phone are required. Optional columns can be skipped.
Зіставлення колонок · перевірити або змінити|Сопоставление колонок · проверить или изменить|Column mapping · review or change
Виправте дані перед імпортом:|Исправьте данные перед импортом:|Fix the data before importing:
Ще помилок:|Ещё ошибок:|More errors:
Попередній перегляд клієнтів|Предварительный просмотр клиентов|Client preview
Показано|Показано|Showing
з|из|of
коректних рядків.|корректных строк.|valid rows.
Наявних клієнтів зіставляємо за телефоном. Їхні дані не перезаписуємо; додаємо лише відсутні авто.|Существующих клиентов сопоставляем по телефону. Их данные не перезаписываем; добавляем только отсутствующие авто.|Existing clients are matched by phone. Their details are preserved; only missing vehicles are added.
Для імпорту увійдіть до акаунта студії.|Для импорта войдите в аккаунт студии.|Sign in to your studio account to import.
Додано клієнтів:|Добавлено клиентов:|Clients added:
. Автомобілів:|. Автомобилей:|. Vehicles:
. Рядків зі збігом телефону:|. Строк с совпадением телефона:|. Rows with matching phones:
Перейти до клієнтів|Перейти к клиентам|View clients
Клієнт погодився на нагадування про повторні візити|Клиент согласился на напоминания о повторных визитах|Client opted in to return visit reminders
Фінанси та документи|Финансы и документы|Finance and documents
Новий рахунок|Новый счёт|New invoice
До оплати|К оплате|Amount due
Надіслані та прострочені|Отправленные и просроченные|Sent and overdue
За поточним списком|По текущему списку|For the current list
Чернетки|Черновики|Drafts
Потребують перевірки|Требуют проверки|Needs review
Пошук рахунку або клієнта|Поиск счёта или клиента|Search invoice or client
Рахунок|Счёт|Invoice
Клієнт і склад|Клиент и состав|Client and items
Статус / строк|Статус / срок|Status / due date
Рахунків за цим фільтром немає.|Счетов по этому фильтру нет.|No invoices match this filter.
Платіжні посилання з’являться тут після підключення та активації платіжного провайдера. До того моменту рахунок можна надіслати клієнту вручну та позначити оплату у списку.|Платёжные ссылки появятся после подключения и активации провайдера. До этого счёт можно отправить клиенту вручную и отметить оплату в списке.|Payment links appear after a payment provider is connected and activated. Until then, send the invoice manually and record payment in the list.
Фінансовий документ|Финансовый документ|Financial document
Призначення *|Назначение *|Purpose *
Наприклад, передоплата за кераміку|Например, предоплата за керамику|For example, ceramic coating deposit
Сума, ₴ *|Сумма, ₴ *|Amount, ₴ *
Строк оплати|Срок оплаты|Payment due date
Перейти до вмісту|Перейти к содержимому|Skip to content
Detailflow — головна|Detailflow — главная|Detailflow — home
для детейлінгу|для детейлинга|for detailing
Головна навігація|Главная навигация|Main navigation
Можливості|Возможности|Features
Як це працює|Как это работает|How it works
Запитання|Вопросы|Questions
Зареєструвати студію|Зарегистрировать студию|Register your studio
Робочий простір детейлінг-студії|Рабочее пространство детейлинг-студии|Your detailing studio workspace
Кожне авто.|Каждое авто.|Every vehicle.
Кожен майстер.|Каждый мастер.|Every professional.
Усе під контролем.|Всё под контролем.|Everything in view.
Від першого запису до перевірки роботи та нарахування майстру. Detailflow об’єднує щоденну роботу вашої студії в одній системі.|От первой записи до проверки работы и начисления мастеру. Detailflow объединяет ежедневную работу студии в одной системе.|From the first booking to work review and staff earnings. Detailflow brings your studio's daily work into one system.
Підключити студію|Подключить студию|Connect your studio
Подивитися, як працює|Посмотреть, как работает|See how it works
Власний кабінет для власника та кожного майстра|Свой кабинет для владельца и каждого мастера|A workspace for the owner and every professional
Приклад роботи студії|Пример работы студии|Example studio workflow
Ваша студія. Один робочий простір.|Ваша студия. Одно рабочее пространство.|Your studio. One workspace.
Роботу перевірено|Работа проверена|Work reviewed
Нарахування майстру підтверджено|Начисление мастеру подтверждено|Professional earnings approved
Ілюстрація інтерфейсу · демонстраційні дані|Иллюстрация интерфейса · демонстрационные данные|Interface illustration · demo data
Менше перемикань.|Меньше переключений.|Less switching.
Більше порядку.|Больше порядка.|More organization.
Запис|Запись|Booking
Призначення|Назначение|Assignment
Перевірка|Проверка|Review
Нарахування|Начисления|Earnings
Студія виросла. Час змінити інструменти.|Студия выросла. Время сменить инструменты.|Your studio has grown. Time for better tools.
Досить керувати студією|Хватит управлять студией|Stop running your studio
в Google-таблицях.|в Google Таблицах.|in Google Sheets.
Записи — у таблиці, завдання — у чаті, зарплата — на калькуляторі. Зберіть роботу команди в одному місці й приділіть більше уваги автомобілям та клієнтам.|Записи — в таблице, задачи — в чате, зарплата — на калькуляторе. Соберите работу команды в одном месте и уделите больше внимания автомобилям и клиентам.|Bookings in a spreadsheet, tasks in a chat, wages on a calculator. Bring your team's work together and give more attention to vehicles and clients.
Навести лад у студії|Навести порядок в студии|Organize your studio
«У якій таблиці цей запис?»|«В какой таблице эта запись?»|“Which spreadsheet has this booking?”
Кожне авто має своє замовлення|У каждого авто свой заказ|Every vehicle has its own order
Клієнт, послуги, майстер і статус роботи зібрані в одній картці.|Клиент, услуги, мастер и статус работы собраны в одной карточке.|Client, services, professional and work status in one card.
«Хто це робить і що вже готово?»|«Кто это делает и что уже готово?»|“Who is doing this, and what is finished?”
Кожен знає свої завдання|Каждый знает свои задачи|Everyone knows their tasks
Власник бачить хід робіт, а кожен майстер — свої призначення та чекліст у кабінеті.|Владелец видит ход работ, а каждый мастер — свои назначения и чек-лист в кабинете.|The owner sees progress, while each professional sees assignments and checklists in their workspace.
«Скільки нарахувати за цю роботу?»|«Сколько начислить за эту работу?»|“How much should this job pay?”
Умови оплати вже збережені|Условия оплаты уже сохранены|Pay terms are already saved
Відсоток або фіксована сума за послугу. Перевіряєте роботу й підтверджуєте нарахування.|Процент или фиксированная сумма за услугу. Проверяете работу и подтверждаете начисление.|A commission or fixed amount per service. Review the work and approve the earnings.
Імпорт клієнтів із CSV|Импорт клиентов из CSV|Import clients from CSV
Ваша база вже в таблиці?|Ваша база уже в таблице?|Already have a client spreadsheet?
Перенесіть її за кілька кліків.|Перенесите её за несколько кликов.|Import it in a few clicks.
Заповніть готовий шаблон або збережіть свою Google-таблицю чи Excel у CSV та завантажте в Detailflow. Імена, телефони й автомобілі перенесуться після вашого підтвердження — без ручного введення кожного клієнта.|Заполните шаблон или сохраните Google Таблицу либо Excel в CSV и загрузите в Detailflow. Имена, телефоны и автомобили перенесутся после подтверждения — без ручного ввода каждого клиента.|Fill in the template or export Google Sheets or Excel as CSV and upload it to Detailflow. Confirm to import names, phones and vehicles without entering every client manually.
Почати зі своєї бази|Начать со своей базы|Start with your client list
Завантажити шаблон|Скачать шаблон|Download template
Завантажте CSV|Загрузите CSV|Upload a CSV
Або вставте скопійовані рядки разом із заголовками.|Или вставьте скопированные строки вместе с заголовками.|Or paste copied rows with their headers.
Перевірте дані|Проверьте данные|Review the data
Оберіть колонки імені, телефону та авто в попередньому перегляді.|Выберите колонки имени, телефона и авто в предварительном просмотре.|Map the name, phone and vehicle columns in the preview.
Підтвердьте імпорт|Подтвердите импорт|Confirm import
Клієнти зі збігом телефону зіставляються з наявною базою.|Клиенты с совпадающим телефоном сопоставляются с существующей базой.|Matching phone numbers are linked to existing clients.
Від клієнтської бази до керування студією|От клиентской базы к управлению студией|From client records to studio management
більше, ніж CRM.|больше, чем CRM.|more than a CRM.
Клієнти та записи — це початок. Далі — зміни майстрів, завдання по кожному авто, перевірка якості, нарахування та фінанси студії.|Клиенты и записи — это начало. Дальше — смены мастеров, задачи по каждому авто, проверка качества, начисления и финансы студии.|Clients and bookings are just the start. Then come shifts, vehicle tasks, quality reviews, earnings and studio finances.
Склад вашої студії|Склад вашей студии|Your studio inventory
Хімія та матеріали —|Химия и материалы —|Chemicals and materials —
під контролем.|под контролем.|under control.
Відстежуйте залишки автохімії, витратних матеріалів і товарів. Бачте, що є на складі та що вже час докупити.|Отслеживайте остатки автохимии, расходных материалов и товаров. Смотрите, что есть на складе и что пора докупить.|Track chemicals, consumables and products. See what is in stock and what needs restocking.
Залишки та мінімальний запас|Остатки и минимальный запас|Stock levels and minimums
Встановлюйте поріг для кожної позиції й бачте матеріали, яких бракує.|Устанавливайте порог для каждой позиции и следите за нехваткой материалов.|Set a threshold for each item and spot shortages.
Прихід і списання|Приход и списание|Receipts and write-offs
Фіксуйте поставки та використання матеріалів з історією рухів.|Фиксируйте поставки и использование материалов с историей движений.|Record deliveries and usage with movement history.
Інвентаризація|Инвентаризация|Stocktaking
Звіряйте облік із фактичними залишками на полиці.|Сверяйте учёт с фактическими остатками на полке.|Reconcile records with the stock on your shelves.
Підключити свою студію|Подключить свою студию|Connect your studio
Залишки матеріалів|Остатки материалов|Material stock levels
Приклад складу|Пример склада|Example inventory
Демонстраційні залишки матеріалів|Демонстрационные остатки материалов|Demo material stock levels
Матеріал|Материал|Material
Стан|Состояние|State
1 позиція нижче мінімального запасу|1 позиция ниже минимального запаса|1 item below minimum stock
Ілюстрація складського обліку · демонстраційні дані|Иллюстрация складского учёта · демонстрационные данные|Inventory illustration · demo data
Одна команда — різні задачі|Одна команда — разные задачи|One team, different tasks
Кожному —|Каждому —|Everyone gets
свій робочий простір.|своё рабочее пространство.|their own workspace.
Кабінети|Кабинеты|Workspaces
Власнику|Владельцу|For the owner
Майстру|Мастеру|For the professional
Приклад інтерфейсу|Пример интерфейса|Interface example
Від заявки до першого замовлення|От заявки до первого заказа|From application to first order
Почнімо з вашої студії.|Начнём с вашей студии.|Let's start with your studio.
Перед початком|Перед началом|Before you start
Є запитання?|Есть вопросы?|Have questions?
Ось відповіді.|Вот ответы.|Here are the answers.
Наступний крок — простіший робочий день|Следующий шаг — более простой рабочий день|Next step: a simpler working day
Дайте студії|Дайте студии|Give your studio
власний Detailflow.|собственный Detailflow.|its own Detailflow.
Залиште заявку — менеджер допоможе розпочати.|Оставьте заявку — менеджер поможет начать.|Apply and a manager will help you get started.
Уже з нами? Увійти|Уже с нами? Войти|Already with us? Sign in
Порядок у роботі. Увага до деталей.|Порядок в работе. Внимание к деталям.|Organized work. Attention to detail.
Робота студії|Работа студии|Studio workflow
Авто в роботі|Авто в работе|Vehicles in progress
Полірування кузова|Полировка кузова|Body polishing
ОМ|АМ|OP
Олександр · майстер|Александр · мастер|Oleksandr · professional
2 з 3 завдань виконано|2 из 3 задач выполнено|2 of 3 tasks completed
Хімчистка салону|Химчистка салона|Interior cleaning
ІК|ИК|IK
Іван · майстер|Иван · мастер|Ivan · professional
Завдання виконано|Задачи выполнены|Tasks completed
Очікує перевірки власника|Ожидает проверки владельца|Awaiting owner review
Привіт, Олександр|Привет, Александр|Hello, Oleksandr
Зміну розпочато о 09:00|Смена начата в 09:00|Shift started at 09:00
Моє завдання|Моя задача|My task
Підготовча мийка|Подготовительная мойка|Preparation wash
Фінішна перевірка|Финальная проверка|Final inspection
Передати на перевірку|Передать на проверку|Submit for review
Підтверджені нарахування|Подтверждённые начисления|Approved earnings
Продажі та комунікація|Продажи и коммуникация|Sales and communication
Нове звернення|Новое обращение|New enquiry
Пошук за клієнтом, телефоном, джерелом|Поиск по клиенту, телефону, источнику|Search client, phone or source
Усі джерела|Все источники|All sources
Усі відповідальні|Все ответственные|All assignees
Усі строки|Все сроки|All deadlines
Прострочені|Просроченные|Overdue
Показувати втрачені|Показывать потерянные|Show lost enquiries
звернень|обращений|enquiries
Немає звернень|Нет обращений|No enquiries
Втрачені звернення|Потерянные обращения|Lost enquiries
Видалити звернення|Удалить обращение|Delete enquiry
Контакт до:|Контакт до:|Contact by:
Терміново|Срочно|Urgent
Звернення клієнта|Обращение клиента|Client enquiry
Новий клієнт / не обрано|Новый клиент / не выбран|New client / not selected
Тема *|Тема *|Subject *
Наприклад, запит на полірування авто|Например, запрос на полировку авто|For example, a car polishing enquiry
Джерело|Источник|Source
Рекомендація|Рекомендация|Referral
Дзвінок|Звонок|Phone call
Сайт|Сайт|Website
Вручну|Вручную|Manual
Відповідальний|Ответственный|Assignee
Крайній термін контакту|Крайний срок контакта|Contact deadline
Пріоритет|Приоритет|Priority
Звичайний|Обычный|Normal
Терміновий|Срочный|Urgent
Деталі запиту та наступний крок|Детали запроса и следующий шаг|Enquiry details and next step
Оберіть майстра, щоб побачити його зміну, автомобілі та нарахування.|Выберите мастера, чтобы увидеть его смену, автомобили и начисления.|Choose a professional to view their shift, vehicles and earnings.
Мобільний робочий простір|Мобильное рабочее пространство|Mobile workspace
Перевірте запрошення на email|Проверьте приглашение на email|Check your email invitation
Власник створює профіль майстра та надсилає лист для реєстрації. Перейдіть за посиланням у листі, задайте пароль і увійдіть тим самим email. Якщо листа немає або доступ заблоковано — зверніться до власника студії.|Владелец создаёт профиль мастера и отправляет письмо для регистрации. Перейдите по ссылке, задайте пароль и войдите с тем же email. Если письма нет или доступ заблокирован — обратитесь к владельцу студии.|The owner creates your profile and sends a registration email. Follow the link, set your password and sign in with the same email. Contact the studio owner if the email is missing or access is blocked.
Привіт,|Привет,|Hello,
Мої авто|Мои авто|My vehicles
Нараховано|Начислено|Accrued
Мої призначені роботи|Мои назначенные работы|My assigned work
Чек-лист ще не додано власником.|Владелец ещё не добавил чек-лист.|The owner has not added a checklist yet.
Роботу відправлено на перевірку власнику.|Работа отправлена владельцу на проверку.|Work submitted to the owner for review.
Відправити на перевірку|Отправить на проверку|Submit for review
Активних робіт немає|Активных работ нет|No active work
Нові призначення від власника з’являться тут.|Новые назначения от владельца появятся здесь.|New assignments from the owner appear here.
Після перевірки робіт власником суми з’являться тут.|После проверки работ владельцем суммы появятся здесь.|Earnings appear here after the owner approves your work.
Заповніть профіль|Заполните профиль|Complete your profile
Мийка, полірування, хімчистка|Мойка, полировка, химчистка|Washing, polishing, interior cleaning
Студія отримала вашу заявку. Час буде остаточно заброньовано після підтвердження адміністратором.|Студия получила вашу заявку. Время будет окончательно забронировано после подтверждения администратором.|The studio received your request. Your time is reserved after the administrator confirms it.
Після підтвердження студія надішле лист. Якщо час потрібно уточнити, адміністратор зв’яжеться за номером|После подтверждения студия отправит письмо. Если нужно уточнить время, администратор свяжется по номеру|The studio will email you after approval. To clarify the time, the administrator will call
Етапи запису|Этапы записи|Booking steps
Пошук послуг|Поиск услуг|Search services
Знайти послугу|Найти услугу|Find a service
Категорії послуг|Категории услуг|Service categories
Варіант послуги «|Вариант услуги «|Service option “
Без реєстрації. Контакти потрібні студії для підтвердження візиту.|Без регистрации. Контакты нужны студии для подтверждения визита.|No registration required. The studio needs your contact details to confirm the visit.
Як до вас звертатися|Как к вам обращаться|Your name
Марка, модель, держномер|Марка, модель, госномер|Make, model, plate
Ви надсилаєте заявку. Підтвердження часу — від адміністратора студії.|Вы отправляете заявку. Время подтверждает администратор студии.|You are submitting a request. The studio administrator confirms the time.
Чек DF-|Чек DF-|Receipt DF-
Контроль результатів|Контроль результатов|Performance tracking
Звіти|Отчёты|Reports
Скинути період|Сбросить период|Reset period
Виручка послуг|Выручка услуг|Service revenue
Продажі товарів|Продажи товаров|Product sales
За обраний період|За выбранный период|For the selected period
Операційний результат|Операционный результат|Operating result
Послуги та виручка|Услуги и выручка|Services and revenue
Ефективність команди|Эффективность команды|Team performance
За обраний період даних немає.|За выбранный период данных нет.|No data for this period.
Товари та роздріб|Товары и розница|Products and retail
Новий продаж|Новая продажа|New sale
Продажів|Продаж|Sales
Виручка товарів|Выручка товаров|Product revenue
Без повернень|Без возвратов|Excluding returns
Середній чек|Средний чек|Average sale
Тільки товари|Только товары|Products only
Пошук за клієнтом або товаром|Поиск по клиенту или товару|Search client or product
Продаж|Продажа|Sale
Клієнт і товари|Клиент и товары|Client and products
Продажів ще немає. Оформіть перший продаж товару зі складу.|Продаж пока нет. Оформите первую продажу товара со склада.|No sales yet. Record your first inventory product sale.
Роздріб і склад|Розница и склад|Retail and inventory
Роздрібний продаж|Розничная продажа|Retail sale
Оберіть зі складу|Выберите со склада|Select from inventory
Ціна за од., ₴|Цена за ед., ₴|Unit price, ₴
Наприклад, преміум мийка|Например, премиум мойка|For example, premium wash
Що входить у послугу та що потрібно знати клієнту|Что входит в услугу и что нужно знать клиенту|What the service includes and what clients should know
Клієнти побачать цей опис під час онлайн-запису.|Клиенты увидят это описание при онлайн-записи.|Clients see this description when booking online.
90 хв|90 мин|90 min
Одна послуга, різні розміри авто або комплектації. Клієнт обере один варіант.|Одна услуга, разные размеры авто или комплектации. Клиент выберет один вариант.|One service with different vehicle sizes or packages. The client chooses one option.
M — седан|M — седан|M — sedan
, хв|, мин|, min
Для седанів і компактних авто|Для седанов и компактных авто|For sedans and compact cars
Наприклад: M — 600 ₴ / 60 хв, L — 800 ₴ / 75 хв, XL — 1 000 ₴ / 90 хв.|Например: M — 600 ₴ / 60 мин, L — 800 ₴ / 75 мин, XL — 1 000 ₴ / 90 мин.|For example: M — ₴600 / 60 min, L — ₴800 / 75 min, XL — ₴1,000 / 90 min.
Адміністратор працює із записами, клієнтами, чеками й командою. Фінансова аналітика та зарплати доступні лише з дозволу власника. Оплату тарифу й управління адміністраторами виконує власник.|Администратор работает с записями, клиентами, чеками и командой. Финансовая аналитика и зарплаты доступны только с разрешения владельца. Оплату тарифа и управление администраторами выполняет владелец.|Administrators manage bookings, clients, receipts and the team. Finance and payroll require owner permission. The owner manages plan payments and administrator access.
Заявки|Заявки|Requests
Завантажуємо заявки…|Загружаем заявки…|Loading requests…
Для відмови вкажіть причину|Для отказа укажите причину|Enter a reason for rejection
Операційна робота студії|Операционная работа студии|Studio operations
Завдання команди|Задачи команды|Team tasks
Створити завдання|Создать задачу|Create task
Усі ·|Все ·|All ·
Призначені ·|Назначенные ·|Assigned ·
Прострочені ·|Просроченные ·|Overdue ·
Пошук завдань, клієнта або майстра|Поиск задач, клиента или мастера|Search tasks, clients or professionals
Немає завдань|Нет задач|No tasks
Видалити завдання|Удалить задачу|Delete task
Майстер:|Мастер:|Professional:
Клієнт:|Клиент:|Client:
Операційне завдання|Операционная задача|Operational task
Нове завдання|Новая задача|New task
Наприклад, замовити мікрофібри|Например, заказать микрофибру|For example, order microfiber cloths
Що саме потрібно зробити?|Что именно нужно сделать?|What needs to be done?
Дедлайн|Дедлайн|Deadline
Без прив’язки до клієнта|Без привязки к клиенту|Not linked to a client
Адміністрування|Администрирование|Administration
Умови зберігаються окремо для кожного майстра та застосовуються до нових призначень. Для послуги можна задати власний відсоток або фіксовану суму. Уже нарахована зарплата не зміниться.|Условия сохраняются отдельно для каждого мастера и применяются к новым назначениям. Для услуги можно задать свой процент или фиксированную сумму. Уже начисленная зарплата не изменится.|Terms are saved per professional and apply to new assignments. Set a custom commission or fixed amount per service. Existing earnings do not change.
Завантажуємо збережені умови…|Загружаем сохранённые условия…|Loading saved terms…
Не задано|Не задано|Not set
Без ставки|Без ставки|No rate
Збережені умови|Сохранённые условия|Saved terms
Профіль майстра не знайдено. Оновіть список команди.|Профиль мастера не найден. Обновите список команды.|Professional profile not found. Refresh the team list.
Під кожною послугою — збережені умови. Порожні поля означають базовий відсоток; фіксована сума має пріоритет.|Под каждой услугой — сохранённые условия. Пустые поля означают базовый процент; фиксированная сумма имеет приоритет.|Saved terms are shown under each service. Empty fields use the base commission; a fixed amount takes priority.
Додайте послуги до каталогу, щоб налаштувати оплату майстрів.|Добавьте услуги в каталог, чтобы настроить оплату мастеров.|Add catalog services to configure staff pay.
за поточною ціною|по текущей цене|at the current price
Графік допомагає планувати завантаження. Фактичний вихід майстер відзначає сам у своєму кабінеті.|График помогает планировать загрузку. Фактический выход мастер отмечает сам в своём кабинете.|Schedules help plan workload. Professionals check in themselves in their workspace.
Видалити зміну|Удалить смену|Delete shift
Спеціалізацію збережено. Вона враховується під час запису й призначення робіт.|Специализация сохранена. Она учитывается при записи и назначении работ.|Specialization saved. It is used for bookings and work assignments.
Оберіть, які послуги виконує кожен майстер. Якщо вибрати «Лише обрані» та не позначити послуг, нові роботи з каталогу цьому майстру не призначатимуться.|Выберите услуги каждого мастера. Если выбрать «Только выбранные» без услуг, новые работы из каталога этому мастеру не будут назначаться.|Choose each professional's services. Selecting Selected only with no services prevents new catalog work assignments to that professional.
Активні замовлення|Активные заказы|Active orders
Від призначення до видачі|От назначения до выдачи|From assignment to handover
Потрібне підтвердження власника|Нужно подтверждение владельца|Owner approval required
Отримано передоплат|Получено предоплат|Deposits received
Пошук за клієнтом, авто, послугою|Поиск по клиенту, авто, услуге|Search client, vehicle or service
замовлень|заказов|orders
Скасовані|Отменённые|Cancelled
Видалити замовлення|Удалить заказ|Delete order
Статус оновлено:|Статус обновлён:|Status updated:
о|в|at
Термін:|Срок:|Due:
· оплачено|· оплачено|· paid
· залишок|· остаток|· remaining
Замовлення #|Заказ #|Order #
· до сплати|· к оплате|· due
Замовлення на роботи|Заказ на работы|Work order
Наприклад, керамічне покриття BMW X5|Например, керамическое покрытие BMW X5|For example, BMW X5 ceramic coating
Кожен пункт через кому: мийка, полірування, нанесення кераміки|Каждый пункт через запятую: мойка, полировка, нанесение керамики|Separate items with commas: wash, polish, ceramic coating
Побажання клієнта, дефекти, важливі деталі|Пожелания клиента, дефекты, важные детали|Client preferences, defects, important details
Не вдалося відкрити сторінку|Не удалось открыть страницу|Could not open the page
Оновіть сторінку. Якщо проблема повториться — зверніться до підтримки.|Обновите страницу. Если проблема повторится — обратитесь в поддержку.|Refresh the page. Contact support if the problem persists.
Час готовності|Время готовности|Ready time
Застосунок Detailflow|Приложение Detailflow|Detailflow app
Пошук…|Поиск…|Search…
Поточний майстер недоступний|Текущий мастер недоступен|Current professional unavailable
Зберігаємо призначення…|Сохраняем назначение…|Saving assignment…
Немає майстрів із відповідною спеціалізацією. Змініть перелік послуг у розділі «Команда».|Нет мастеров с нужной специализацией. Измените список услуг в разделе «Команда».|No professionals have the required specialization. Update their services in Team.
Завантажуємо роботи…|Загружаем работы…|Loading work…
· до|· до|· until
· з|· с|· from
активних робіт|активных работ|active jobs
Закрити замовлення|Закрыть заказ|Close order
Роботи (|Работы (|Jobs (
Нові дії з’являтимуться тут.|Новые действия появятся здесь.|New activity appears here.
· черга|· очередь|· stage
Очікує перевірки власника з|Ожидает проверки владельца с|Awaiting owner review since
Після підтвердження:|После подтверждения:|After approval:
. Це нарахування, виплату реєструють окремо у фінансах.|. Это начисление, выплата регистрируется отдельно в финансах.|. These are accrued earnings; payouts are recorded separately in Finance.
Однакова черга — паралельні роботи. Етап 1 можна почати після підтвердження всіх робіт етапу 0, етап 2 — після етапу 1.|Одинаковая очередь — параллельные работы. Этап 1 начинается после подтверждения всех работ этапа 0, этап 2 — после этапа 1.|Jobs at the same stage run in parallel. Stage 1 starts after all stage 0 jobs are approved; stage 2 follows stage 1.
робіт|работ|jobs
Правило послуги → базовий відсоток → погодинна ставка. Якщо умови відсутні — 0 ₴. Після збереження перевірте суму в картці.|Правило услуги → базовый процент → почасовая ставка. Если условий нет — 0 ₴. После сохранения проверьте сумму в карточке.|Service rule → base commission → hourly rate. If no terms are set, pay is ₴0. Check the amount in the card after saving.
Умови фіксуються на цій роботі. Перерви не входять до погодинного розрахунку.|Условия фиксируются на этой работе. Перерывы не входят в почасовой расчёт.|Terms are fixed for this job. Breaks are excluded from hourly pay.
· виплачено|· выплачено|· paid
Внесіть гроші, які вже передали майстру. Сервіс не переказує кошти.|Укажите деньги, которые уже передали мастеру. Сервис не переводит средства.|Record money already paid to the professional. The service does not transfer funds.
Спосіб|Способ|Method
Оберіть майстра для перегляду.|Выберите мастера для просмотра.|Choose a professional to view.
З|С|From
Перерви:|Перерывы:|Breaks:
Історія з’явиться після першої зміни.|История появится после первой смены.|History appears after the first shift.
Запит на повторне надсилання прийнято. Перевірте вхідні та спам. Якщо email уже підтверджений, увійдіть зі своїм паролем.|Запрос на повторную отправку принят. Проверьте входящие и спам. Если email уже подтверждён, войдите со своим паролем.|Resend requested. Check your inbox and spam folder. If your email is already confirmed, sign in with your password.
Не вдалося з’єднатися із сервісом. Спробуйте ще раз.|Не удалось подключиться к сервису. Попробуйте ещё раз.|Could not connect. Please try again.
Сервіс не підключено до бази. Зверніться до адміністратора.|Сервис не подключён к базе. Обратитесь к администратору.|The service is not connected to its database. Contact the administrator.
Не вдалося з’єднатися із сервісом. Перевірте інтернет і спробуйте ще раз.|Не удалось подключиться к сервису. Проверьте интернет и попробуйте ещё раз.|Could not connect. Check your internet connection and try again.
Надіслати лист повторно|Отправить письмо повторно|Resend email
Увійдіть до робочого простору студії|Войдите в рабочее пространство студии|Sign in to your studio workspace
Подайте заявку та керуйте всією студією|Подайте заявку и управляйте всей студией|Apply to manage your entire studio
Якщо акаунт із цією адресою існує, ви отримаєте посилання для створення нового пароля. Перевірте також спам.|Если аккаунт с этим адресом существует, вы получите ссылку для создания нового пароля. Проверьте также спам.|If an account exists for this address, you will receive a password reset link. Check your spam folder too.
Зверніться до менеджера для уточнення.|Обратитесь к менеджеру для уточнения.|Contact the manager for details.
Менеджер Detailflow перевірить заявку, зв’яжеться з вами у вказаному месенджері та активує доступ до студії.|Менеджер Detailflow проверит заявку, свяжется в указанном мессенджере и активирует доступ к студии.|A Detailflow manager will review your application, contact you in your chosen messenger and activate studio access.
Паролі не збігаються.|Пароли не совпадают.|Passwords do not match.
Не вдалося зберегти пароль. Спробуйте ще раз.|Не удалось сохранить пароль. Попробуйте ещё раз.|Could not save the password. Try again.
Зберегти та увійти|Сохранить и войти|Save and sign in
Доступно без окремих фільтрів записів і витрат|Доступно без отдельных фильтров записей и расходов|Available without individual booking and expense filters
За весь обраний період|За весь выбранный период|Across the selected period
Майстри|Мастера|Professionals
Спеціалізація не вказана|Специализация не указана|No specialization specified
Не вдалося обробити заявку. Спробуйте ще раз.|Не удалось обработать заявку. Попробуйте ещё раз.|Could not process the request. Try again.
Запис підтверджено, але лист клієнту не вдалося надіслати.|Запись подтверждена, но письмо клиенту не удалось отправить.|Booking confirmed, but the client email could not be sent.
У майстра вже є запис на цей час. Перенесіть запис перед підтвердженням.|У мастера уже есть запись на это время. Перенесите запись перед подтверждением.|The professional is already booked at this time. Reschedule before confirming.
Не вдалося змінити статус. Оновіть сторінку та спробуйте ще раз.|Не удалось изменить статус. Обновите страницу и попробуйте ещё раз.|Could not change status. Refresh and try again.
Потрібне оновлення бази для описів і варіантів послуг (міграція 032).|Нужно обновление базы для описаний и вариантов услуг (миграция 032).|Service descriptions and options require database update 032.
Не вдалося зберегти послугу.|Не удалось сохранить услугу.|Could not save the service.
Клієнт із цим телефоном уже існує.|Клиент с этим телефоном уже существует.|A client with this phone number already exists.
Не вдалося зберегти клієнта.|Не удалось сохранить клиента.|Could not save the client.
Закупівля матеріалів|Закупка материалов|Materials purchase
Оприходування|Оприходование|Stock receipt
Майстра створено, але лист не надіслано.|Мастер создан, но письмо не отправлено.|Professional created, but the email was not sent.
Не вдалося оновити замовлення.|Не удалось обновить заказ.|Could not update the order.
Не вдалося підтвердити роботу.|Не удалось подтвердить работу.|Could not approve the work.
Такий номер рахунку вже існує. Створіть рахунок ще раз.|Такой номер счёта уже существует. Создайте счёт ещё раз.|This invoice number already exists. Create the invoice again.
Не вдалося створити рахунок.|Не удалось создать счёт.|Could not create the invoice.
Доступ міг бути заблокований власником. Перевірте прив’язку акаунта.|Доступ мог быть заблокирован владельцем. Проверьте привязку аккаунта.|The owner may have blocked access. Check the account link.
Адресу не вказано|Адрес не указан|No address specified
Г|Г|G
Ваш профіль|Ваш профиль|Your profile
Ви не увійшли|Вы не вошли|Not signed in
колего|коллега|colleague
Перевірте email і підтвердьте реєстрацію, потім увійдіть.|Проверьте email и подтвердите регистрацию, затем войдите.|Check your email, confirm registration, then sign in.
Вхід до студії|Вход в студию|Studio sign-in
Створити акаунт|Создать аккаунт|Create account
Зачекайте…|Подождите…|Please wait…
Немає акаунта? Зареєструватися|Нет аккаунта? Зарегистрироваться|No account? Register
Введіть адресу від 3 символів: латинські літери, цифри та дефіси.|Введите адрес от 3 символов: латинские буквы, цифры и дефисы.|Enter at least 3 characters: Latin letters, numbers and hyphens.
Така публічна адреса вже зайнята. Оберіть іншу.|Этот публичный адрес уже занят. Выберите другой.|This public address is already taken. Choose another.
Створюємо…|Создаём…|Creating…
Створити студію|Создать студию|Create studio
робота триває|работа выполняется|job in progress
роботи тривають|работы выполняются|jobs in progress
Немає активних робіт|Нет активных работ|No active work
Ще немає завершених робіт|Ещё нет завершённых работ|No completed work yet
Вільний сьогодні|Свободен сегодня|Free today
Вільний день|Свободный день|Free day
Зміни збережено.|Изменения сохранены.|Changes saved.
Не вдалося зберегти зміни.|Не удалось сохранить изменения.|Could not save changes.
Збереження…|Сохранение…|Saving…
Майстра додано, запрошення надіслано на email.|Мастер добавлен, приглашение отправлено на email.|Professional added; invitation emailed.
Майстра додано. Email можна додати при наступному редагуванні.|Мастер добавлен. Email можно добавить при следующем редактировании.|Professional added. You can add an email later.
Додати та надіслати запрошення|Добавить и отправить приглашение|Add and send invitation
поза зміною|вне смены|off shift
зараз не на зміні|сейчас не на смене|currently off shift
Майстер ще не розпочинав зміну сьогодні.|Мастер ещё не начинал смену сегодня.|This professional has not started a shift today.
Очікує завершення|Ожидает завершения|Awaiting completion
Обрано|Выбрано|Selected
Спочатку оберіть товар|Сначала выберите товар|Select a product first
Потрібно поповнити|Нужно пополнить|Restock needed
В наявності|В наличии|In stock
Не вдалося зберегти витрату. Перевірте з’єднання.|Не удалось сохранить расход. Проверьте соединение.|Could not save the expense. Check your connection.
Зберегти витрату|Сохранить расход|Save expense
Додайте та оберіть послугу.|Добавьте и выберите услугу.|Add and select a service.
Оберіть варіант послуги.|Выберите вариант услуги.|Choose a service option.
Цей майстер уже зайнятий у вибраний час. Оберіть інший слот.|Этот мастер уже занят в выбранное время. Выберите другой слот.|This professional is busy at the selected time. Choose another slot.
Термінове звернення|Срочное обращение|Urgent enquiry
Клієнта не вказано|Клиент не указан|No client specified
Не вдалося завантажити підписку. Перевірте оновлення бази 034.|Не удалось загрузить подписку. Проверьте обновление базы 034.|Could not load the subscription. Check database update 034.
Не вдалося створити платіж|Не удалось создать платёж|Could not create payment
Не вдалося відкрити оплату|Не удалось открыть оплату|Could not open payment
Оплачений період відсутній|Оплаченный период отсутствует|No paid period
Відкриваємо оплату…|Открываем оплату…|Opening payment…
Запис підтверджено.|Запись подтверждена.|Booking confirmed.
Заявку відхилено.|Заявка отклонена.|Request rejected.
Не вдалося зберегти зміни. Спробуйте знову.|Не удалось сохранить изменения. Попробуйте снова.|Could not save changes. Try again.
Операцію видалено.|Операция удалена.|Transaction deleted.
Без клієнта|Без клиента|No client
Виплату збережено в історії зарплати|Выплата сохранена в истории зарплаты|Payout saved in payroll history
Операцію збережено.|Операция сохранена.|Transaction saved.
Вкажіть назву та суму операції.|Укажите название и сумму операции.|Enter the transaction name and amount.
Наприклад, оплата оренди|Например, оплата аренды|For example, rent payment
Вкажіть назву, суму та щонайменше одну послугу.|Укажите название, сумму и хотя бы одну услугу.|Enter a name, price and at least one service.
Додати набір|Добавить набор|Add package
Додати товар на склад|Добавить товар на склад|Add inventory product
Товари ведуться через склад і доступні для продажу.|Товары учитываются на складе и доступны для продажи.|Products are managed in inventory and available for sale.
Ціни та склад робіт у одному місці.|Цены и состав работ в одном месте.|Prices and work details in one place.
Зберегти набір|Сохранить набор|Save package
від|от|from
Ціну не вказано|Цена не указана|No price specified
Набір деактивовано.|Набор деактивирован.|Package deactivated.
Не вдалося прочитати файл.|Не удалось прочитать файл.|Could not read the file.
Оберіть колонку|Выберите колонку|Select a column
Не імпортувати|Не импортировать|Do not import
Імпорт завершено.|Импорт завершён.|Import completed.
Імпортуємо… Не закривайте сторінку|Импортируем… Не закрывайте страницу|Importing… Keep this page open
Імпорт завершено|Импорт завершён|Import completed
Повторити імпорт|Повторить импорт|Retry import
Не вдалося завантажити клієнтів|Не удалось загрузить клиентов|Could not load clients
Телефон не вказано|Телефон не указан|No phone specified
Графік прибутку за оплатами. Точні суми в таблиці нижче.|График прибыли по оплатам. Точные суммы в таблице ниже.|Cash profit chart. Exact amounts are in the table below.
Графік надходжень і витрат. Точні суми в таблиці нижче.|График поступлений и расходов. Точные суммы в таблице ниже.|Income and expense chart. Exact amounts are in the table below.
Статус рахунку оновлено.|Статус счёта обновлён.|Invoice status updated.
Строк не вказано|Срок не указан|No deadline specified
Рахунок створено.|Счёт создан.|Invoice created.
Вкажіть призначення та суму рахунку.|Укажите назначение и сумму счёта.|Enter the invoice purpose and amount.
Створити рахунок|Создать счёт|Create invoice
Докупити|Докупить|Restock
У запасі|В запасе|In stock
Керування студією|Управление студией|Studio management
Особистий кабінет|Личный кабинет|Personal workspace
Бачте результат, а не збирайте звіти в чатах.|Следите за результатом, а не собирайте отчёты в чатах.|See results without collecting reports from chats.
Відкрив зміну. Побачив задачі. Почав роботу.|Открыл смену. Увидел задачи. Начал работу.|Start a shift. See your tasks. Get to work.
Розподіляйте роботу між майстрами та контролюйте кожен етап — від призначення до видачі авто.|Распределяйте работу между мастерами и контролируйте каждый этап — от назначения до выдачи авто.|Assign work and track every stage, from assignment to vehicle handover.
Усі призначення, інформація про авто та чеклісти доступні в одному місці, зокрема з телефона.|Все назначения, информация об авто и чек-листы доступны в одном месте, в том числе с телефона.|Assignments, vehicle details and checklists in one place, including on your phone.
Увійти як майстер|Войти как мастер|Sign in as a professional
Статус звернення оновлено.|Статус обращения обновлён.|Enquiry status updated.
Звернення видалено.|Обращение удалено.|Enquiry deleted.
Менеджера не призначено|Менеджер не назначен|No manager assigned
Вкажіть тему звернення.|Укажите тему обращения.|Enter the enquiry subject.
Створити звернення|Создать обращение|Create enquiry
Спочатку позначте всі пункти чек-листа.|Сначала отметьте все пункты чек-листа.|Complete all checklist items first.
Не розпочато|Не начато|Not started
Виконана робота|Выполненная работа|Completed work
Не вдалося зберегти профіль. Спробуйте ще раз.|Не удалось сохранить профиль. Попробуйте ещё раз.|Could not save the profile. Try again.
Зберегти та відкрити кабінет|Сохранить и открыть кабинет|Save and open workspace
Студію не знайдено|Студия не найдена|Studio not found
Не вдалося завантажити запис.|Не удалось загрузить запись.|Could not load booking.
Вкажіть ім’я та телефон із кодом країни.|Укажите имя и телефон с кодом страны.|Enter your name and phone number with country code.
Не вдалося надіслати заявку|Не удалось отправить заявку|Could not send the request
Не вдалося надіслати заявку. Спробуйте ще раз.|Не удалось отправить заявку. Попробуйте ещё раз.|Could not send the request. Try again.
Готуємо онлайн-запис…|Готовим онлайн-запись…|Preparing online booking…
Запис тимчасово недоступний|Запись временно недоступна|Booking temporarily unavailable
Завантажуємо послуги та графік студії.|Загружаем услуги и график студии.|Loading studio services and schedule.
Тривалість після вибору|Длительность после выбора|Duration after selection
Будь-який вільний майстер|Любой свободный мастер|Any available professional
Автомобіль уточнимо у студії|Автомобиль уточним в студии|Vehicle details to be confirmed at the studio
За цим запитом послуг немає. Спробуйте іншу назву.|По этому запросу услуг нет. Попробуйте другое название.|No services match. Try another name.
Студія ще не додала послуги для онлайн-запису.|Студия ещё не добавила услуги для онлайн-записи.|The studio has not added services for online booking yet.
Оберіть хоча б одну послугу|Выберите хотя бы одну услугу|Select at least one service
Майстер студії|Мастер студии|Studio professional
або будь-якого вільного майстра|или любого свободного мастера|or any available professional
Не вдалося завантажити чеки. Перевірте міграцію 036.|Не удалось загрузить чеки. Проверьте миграцию 036.|Could not load receipts. Check database update 036.
Не вдалося завантажити історію оплат|Не удалось загрузить историю оплат|Could not load payment history
Продаж збережено, залишки оновлено.|Продажа сохранена, остатки обновлены.|Sale saved and stock updated.
Оберіть товар, коректну кількість у межах залишку та ціну.|Выберите товар, корректное количество в пределах остатка и цену.|Select a product, a quantity within available stock and a price.
Додайте хоча б один товар.|Добавьте хотя бы один товар.|Add at least one product.
Вкажіть ціну|Укажите цену|Enter a price
Оформити продаж|Оформить продажу|Record sale
1 год|1 ч|1 h
Вкажіть назву та коректну ціну.|Укажите название и корректную цену.|Enter a name and valid price.
Не вдалося зберегти послугу. Спробуйте ще раз.|Не удалось сохранить услугу. Попробуйте ещё раз.|Could not save the service. Try again.
Редагувати послугу|Редактировать услугу|Edit service
Не вдалося завантажити адміністраторів. Перевірте міграцію 035.|Не удалось загрузить администраторов. Проверьте миграцию 035.|Could not load administrators. Check database update 035.
Помилка|Ошибка|Error
Не вдалося отримати заявки. Перевірте з’єднання та встановлення оновлення підтримки (031).|Не удалось получить заявки. Проверьте соединение и обновление поддержки (031).|Could not load applications. Check your connection and support update 031.
Студію активовано. Власник може увійти або оновити сторінку.|Студия активирована. Владелец может войти или обновить страницу.|Studio activated. The owner can sign in or refresh the page.
Не вдалося зберегти рішення.|Не удалось сохранить решение.|Could not save the decision.
Очікує підтвердження пошти|Ожидает подтверждения почты|Awaiting email confirmation
Месенджер|Мессенджер|Messenger
Статус завдання оновлено.|Статус задачи обновлён.|Task status updated.
Завдання видалено.|Задача удалена.|Task deleted.
Не вдалося надіслати лист.|Не удалось отправить письмо.|Could not send the email.
Не вдалося завантажити доступи.|Не удалось загрузить доступы.|Could not load account access.
Не вдалося змінити доступ.|Не удалось изменить доступ.|Could not change access.
Доступ майстра активовано.|Доступ мастера активирован.|Professional access activated.
Доступ майстра заблоковано.|Доступ мастера заблокирован.|Professional access blocked.
Надіслати запрошення|Отправить приглашение|Send invitation
Наступний лист можна запросити через хвилину.|Следующее письмо можно запросить через минуту.|You can request another email in one minute.
Повторний лист містить посилання для створення нового пароля. Поточний пароль не зміниться до підтвердження майстром.|Повторное письмо содержит ссылку для создания нового пароля. Текущий пароль не изменится до подтверждения мастером.|The new email includes a password reset link. The current password stays unchanged until the professional confirms.
Майстер отримає посилання для активації свого кабінету.|Мастер получит ссылку для активации своего кабинета.|The professional receives a link to activate their workspace.
Для збереження умов увійдіть до акаунта студії.|Для сохранения условий войдите в аккаунт студии.|Sign in to your studio account to save terms.
Не вдалося завантажити збережені умови. Перевірте підключення та повторіть спробу.|Не удалось загрузить сохранённые условия. Проверьте подключение и повторите попытку.|Could not load saved terms. Check your connection and try again.
Не вдалося зберегти умови. Спробуйте ще раз.|Не удалось сохранить условия. Попробуйте ещё раз.|Could not save terms. Try again.
Відсоток має бути від 0 до 100, ставка — не меншою за 0.|Процент должен быть от 0 до 100, ставка — не меньше 0.|Commission must be 0–100%; the rate cannot be negative.
· базовий|· базовый|· base
· індивідуальний|· индивидуальный|· custom
Оплату ще не задано|Оплата ещё не задана|Pay is not set yet
Базовий не задано|Базовый не задан|Base rate not set
Відсоток: 0–100. Сума: від 0 ₴.|Процент: 0–100. Сумма: от 0 ₴.|Commission: 0–100%. Amount: ₴0 or more.
Оберіть майстра.|Выберите мастера.|Select a professional.
Зміну збережено.|Смена сохранена.|Shift saved.
Зміну видалено.|Смена удалена.|Shift deleted.
Не вдалося завантажити спеціалізації. Потрібне оновлення бази 033.|Не удалось загрузить специализации. Нужно обновление базы 033.|Could not load specializations. Database update 033 is required.
Оберіть товар і вкажіть коректну кількість.|Выберите товар и укажите корректное количество.|Select a product and enter a valid quantity.
Прихід збережено.|Приход сохранён.|Stock receipt saved.
Інвентаризацію збережено.|Инвентаризация сохранена.|Stocktake saved.
Не вдалося зберегти операцію.|Не удалось сохранить операцию.|Could not save the transaction.
Прихід товару|Приход товара|Stock receipt
Кількість приходу|Количество прихода|Received quantity
Фактичний залишок|Фактический остаток|Actual stock
Наприклад, поставка від постачальника|Например, поставка от поставщика|For example, supplier delivery
Наприклад, фактичний перерахунок|Например, фактический пересчёт|For example, physical stock count
Авто видано.|Авто выдано.|Vehicle handed over.
Відкрито роботи автомобіля. Призначення та перевірка виконуються окремо для кожної роботи.|Открыты работы автомобиля. Назначение и проверка выполняются отдельно для каждой работы.|Vehicle jobs opened. Assign and review each job separately.
Статус роботи оновлено.|Статус работы обновлён.|Job status updated.
Не вдалося оновити|Не удалось обновить|Could not update
Статус замовлення оновлено.|Статус заказа обновлён.|Order status updated.
Не можна змінити майстра після нарахування.|Нельзя изменить мастера после начисления.|Cannot change the professional after earnings are accrued.
Майстра призначено.|Мастер назначен.|Professional assigned.
Підтвердження недоступне. Оновіть сторінку.|Подтверждение недоступно. Обновите страницу.|Approval unavailable. Refresh the page.
Роботу підтверджено, заробіток нараховано майстру.|Работа подтверждена, заработок начислен мастеру.|Work approved and earnings accrued to the professional.
Не вдалося підтвердити роботу. Оновіть список перед повторною спробою.|Не удалось подтвердить работу. Обновите список перед повторной попыткой.|Could not approve work. Refresh the list before retrying.
Підтверджене замовлення має нарахування — видалення недоступне.|В подтверждённом заказе есть начисления — удаление недоступно.|This approved order has earnings and cannot be deleted.
Замовлення видалено.|Заказ удалён.|Order deleted.
Без майстра|Без мастера|No professional
Майстра не призначено|Мастер не назначен|No professional assigned
Підтвердити оплату|Подтвердить оплату|Confirm payment
Оберіть клієнта.|Выберите клиента.|Select a client.
Передоплата не може бути більшою за суму замовлення.|Предоплата не может превышать сумму заказа.|The deposit cannot exceed the order total.
Створити замовлення|Создать заказ|Create order
Підтвердьте дію|Подтвердите действие|Confirm action
Повідомлення|Сообщение|Message
Зрозуміло|Понятно|Got it
Форма|Форма|Form
Не вдалося надіслати лист. Адміністратор має перевірити поштову службу.|Не удалось отправить письмо. Администратор должен проверить почтовую службу.|Could not send email. The administrator needs to check the mail service.
Немає прав на збереження клієнтів у цій студії.|Нет прав на сохранение клиентов в этой студии.|You do not have permission to save clients in this studio.
Структуру бази потрібно оновити.|Структуру базы нужно обновить.|The database structure needs updating.
Завантажуємо роботи для призначення…|Загружаем работы для назначения…|Loading jobs for assignment…
Роботи не завантажено. Натисніть «Оновити» або відкрийте «Роботи та перевірка».|Работы не загружены. Нажмите «Обновить» или откройте «Работы и проверка».|Jobs did not load. Select Refresh or open Work and review.
Призначення знято.|Назначение снято.|Assignment removed.
Не вдалося призначити майстра. Спробуйте ще раз.|Не удалось назначить мастера. Попробуйте ещё раз.|Could not assign the professional. Try again.
· на зміні|· на смене|· on shift
Не вдалося оновити дані. Перевірте з’єднання та натисніть «Оновити».|Не удалось обновить данные. Проверьте соединение и нажмите «Обновить».|Could not update data. Check your connection and select Refresh.
Не вдалося зберегти. Повторіть спробу.|Не удалось сохранить. Повторите попытку.|Could not save. Try again.
Перерва|Перерыв|Break
Керівник студії|Руководитель студии|Studio manager
Фото роботи|Фото работы|Work photo
Фото недоступне|Фото недоступно|Photo unavailable
Завантаження фото…|Загрузка фото…|Loading photo…
Без нарахування|Без начисления|No earnings
Очікувана оплата|Ожидаемая оплата|Expected pay
Результат перевірки|Результат проверки|Review result
Доопрацювання|Доработка|Rework
Завершіть перерву, щоб працювати.|Завершите перерыв, чтобы работать.|End your break to work.
Розпочніть зміну, щоб працювати.|Начните смену, чтобы работать.|Start your shift to work.
Виконання|Выполнение|Execution
Умови роботи|Условия работы|Job terms
Нова робота|Новая работа|New job
перерва|перерыв|on break
на зміні|на смене|on shift
Відсоток, %|Процент, %|Commission, %
За годину, ₴|За час, ₴|Per hour, ₴
Зберегти роботу|Сохранить работу|Save job
Попереднє нарахування|Предыдущее начисление|Previous accrual
Ваш робочий простір|Ваше рабочее пространство|Your workspace
Зміну не розпочато|Смена не начата|Shift not started
Завершити перерву|Закончить перерыв|End break
Призначені роботи|Назначенные работы|Assigned work
Всі мої роботи|Все мои работы|All my work
триває|продолжается|ongoing
Перевірте графік|Проверьте график|Check the schedule
Час графіка недоступний у цю дату. Перевірте перехід на літній час.|Время графика недоступно в эту дату. Проверьте переход на летнее время.|The scheduled time does not exist on this date. Check the daylight saving transition.
Виконується|Выполняется|In progress
Підготовка|Подготовка|Preparation
Виконання|Выполнение|Execution
Контроль якості|Контроль качества|Quality control
На перерві|На перерыве|On break
Спочатку перевірте й активуйте доступ адміністратора у команді.|Сначала проверьте и активируйте доступ администратора в команде.|First review and activate the administrator’s team access.
`;
export const messages:Record<string,[string,string]>=Object.fromEntries(rows.trim().split('\n').map(row=>{const [uk,ru,en]=row.split('|');return [uk,[ru,en]]}))
