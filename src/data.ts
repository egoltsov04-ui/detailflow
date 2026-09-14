export type Status = 'Очікує підтвердження' | 'Підтверджено' | 'В роботі' | 'Завершено' | 'Скасовано' | 'Не прийшов'
export type PaymentMethod = 'Картка' | 'Готівка' | 'Переказ'
export type Booking = { id: number | string; clientId?:number|string; source?:'admin'|'public'|'phone'; date: string; time: string; client: string; car: string; service: string; tech: string; price: number; discount: number; paymentMethod: PaymentMethod; durationMinutes: number; status: Status; phone: string; email?: string }
export const technicians = [
  { name: 'Андрій Коваль', role: 'Детейлер', color: '#4378f4', load: 78, speciality: 'Полірування, кераміка' },
  { name: 'Олена Мельник', role: 'Майстер мийки', color: '#a1d930', load: 61, speciality: 'Мийка, хімчистка' },
  { name: 'Максим Левченко', role: 'Детейлер', color: '#f2ad46', load: 42, speciality: 'Полірування, тонування' }
]
export const seedBookings: Booking[] = [
  { id: 1, date: '2026-09-13', time: '09:00', client: 'Ігор Шевченко', car: 'BMW X5 · AA 2456 KT', service: 'Керамічне покриття', tech: 'Андрій Коваль', price: 18500, discount: 0, paymentMethod: 'Картка', durationMinutes: 960, status: 'В роботі', phone: '+380 67 245 80 12' },
  { id: 2, date: '2026-09-13', time: '10:30', client: 'Анна Бойко', car: 'Tesla Model 3 · KA 3391 HM', service: 'Детейлінг інтерʼєру', tech: 'Олена Мельник', price: 4200, discount: 300, paymentMethod: 'Переказ', durationMinutes: 240, status: 'Підтверджено', phone: '+380 93 126 45 78' },
  { id: 3, date: '2026-09-13', time: '13:00', client: 'Роман Гнатюк', car: 'Audi Q7 · AI 0088 MK', service: 'Полірування кузова', tech: 'Максим Левченко', price: 9400, discount: 0, paymentMethod: 'Готівка', durationMinutes: 480, status: 'Підтверджено', phone: '+380 50 387 19 23' },
  { id: 4, date: '2026-09-13', time: '16:00', client: 'Марія Савчук', car: 'Range Rover · AA 7780 PB', service: 'Преміум мийка', tech: 'Олена Мельник', price: 1600, discount: 0, paymentMethod: 'Картка', durationMinutes: 60, status: 'Підтверджено', phone: '+380 68 771 01 28' }
]
export const services: [string, string, string, number][] = [
  ['Преміум мийка', 'Мийка', '1 год', 1600],
  ['Детейлінг інтерʼєру', 'Хімчистка', '4 год', 4200],
  ['Полірування кузова', 'Полірування', '8 год', 9400],
  ['Керамічне покриття', 'Кераміка', '2 дні', 18500]
]
