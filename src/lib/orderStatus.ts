// Order and job status labels and badge tones shared by the kanban, calendar and the order panel.
export type OrderStatusKey='new'|'assigned'|'in_progress'|'waiting'|'review'|'ready'|'issued'|'cancelled'
export type BadgeTone='neutral'|'success'|'warning'|'danger'

export const orderStatusLabels:Record<OrderStatusKey,string>={new:'Потрібно призначити',assigned:'Призначено',in_progress:'У роботі',waiting:'Очікування',review:'На перевірці',ready:'Підтверджено',issued:'Видано',cancelled:'Скасовано'}
export const orderStatusTone:Record<OrderStatusKey,BadgeTone>={new:'neutral',assigned:'neutral',in_progress:'success',waiting:'warning',review:'warning',ready:'success',issued:'neutral',cancelled:'danger'}
export const jobStatusTone:Record<string,BadgeTone>={new:'neutral',assigned:'neutral',in_progress:'success',waiting:'warning',review:'warning',approved:'success'}
