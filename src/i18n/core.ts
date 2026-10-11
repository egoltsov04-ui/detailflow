import {messages} from './messages.ts'
export type Locale='uk'|'en'
export function getLocale():Locale{try{const value=globalThis.localStorage?.getItem('detailflow.locale');if(value&&value!=='uk'&&value!=='en')globalThis.localStorage?.setItem('detailflow.locale','uk');return value==='en'?'en':'uk'}catch{return 'uk'}}
export const localeTag=()=>({uk:'uk-UA',en:'en-GB'})[getLocale()]
const serverMessages:Record<string,string>={
 PLAN_FEATURE_REQUIRED:'Ця функція потребує тарифу Студія або Pro.',
 STAFF_LIMIT_REACHED:'Досягнуто ліміту майстрів. Змініть тариф або деактивуйте зайвий профіль.',
 ADMIN_LIMIT_REACHED:'Досягнуто ліміту адміністраторів. Змініть тариф або деактивуйте зайвий доступ.',
 SOLO_OWNER_ONLY:'На тарифі Solo працює лише власник студії.',
 SOLO_OWNER_REQUIRED:'Для тарифу Solo потрібен активний власник студії.',
 SUBSCRIPTION_EXPIRED:'Продовжіть підписку, щоб створювати нові записи й активувати майстрів.',
 STORAGE_LIMIT_REACHED:'Ліміт сховища вичерпано. Видаліть зайві файли або змініть тариф.'
}
export function t(text:string,locale:Locale=getLocale()):string{
 text=Object.prototype.hasOwnProperty.call(serverMessages,text)?serverMessages[text]:text
 if(locale==='uk')return text
 const key=text.replace(/\s+/g,' ').trim(),pair=Object.prototype.hasOwnProperty.call(messages,key)?messages[key]:undefined
 if(!pair)return text
 const value=pair
 return (text.match(/^\s*/)?.[0]||'')+value+(text.match(/\s*$/)?.[0]||'')
}
