import type { WorkOrder, WorkOrderStatus } from '../WorkOrders'

export function transitionError(order: Pick<WorkOrder,'status'|'staffId'|'checklist'>, next: WorkOrderStatus): string {
  if(order.status===next)return ''
  if(['ready','issued'].includes(order.status)&&next!=='issued')return 'Підтверджене замовлення не можна повернути назад: заробіток уже нараховано.'
  if(next==='issued'&&order.status!=='ready')return 'Спочатку перевірте роботу та підтвердьте нарахування.'
  if(next==='ready'&&order.status!=='review')return 'Спочатку відправте роботу на перевірку.'
  if(['assigned','in_progress','review','ready'].includes(next)&&!order.staffId)return 'Спочатку призначте майстра.'
  if(next==='review'&&(!order.checklist.length||order.checklist.some(item=>!item.done)))return 'Перед перевіркою виконайте всі пункти чек-листа.'
  return ''
}
