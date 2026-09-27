export function authErrorMessage(error: {code?: string; message: string}): string {
  switch(error.code) {
    case 'email_not_confirmed': return 'Email ще не підтверджено. Відкрийте лист або надішліть його повторно.'
    case 'invalid_credentials': return 'Не вдалося увійти. Перевірте email та пароль.'
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return 'Забагато запитів. Зачекайте кілька хвилин і повторіть. Якщо листів немає, адміністратор має перевірити поштову службу.'
    case 'email_address_not_authorized': return 'Поштова служба ще не налаштована для цієї адреси. Адміністратор має налаштувати надсилання листів.'
    case 'user_already_exists': return 'Акаунт уже існує. Перейдіть до входу.'
    default: return /sending.*email|smtp/i.test(error.message) ? 'Не вдалося надіслати лист. Адміністратор має перевірити поштову службу.' : error.message
  }
}
