import {messages} from './messages.ts'
export type Locale='uk'|'ru'|'en'
export function getLocale():Locale{try{const value=globalThis.localStorage?.getItem('detailflow.locale');return value==='ru'||value==='en'?value:'uk'}catch{return 'uk'}}
export const localeTag=()=>({uk:'uk-UA',ru:'ru-RU',en:'en-GB'})[getLocale()]
export function t(text:string,locale:Locale=getLocale()):string{
 if(locale==='uk')return text
 const key=text.replace(/\s+/g,' ').trim(),pair=Object.prototype.hasOwnProperty.call(messages,key)?messages[key]:undefined
 if(!pair)return text
 const value=pair[locale==='ru'?0:1]
 return (text.match(/^\s*/)?.[0]||'')+value+(text.match(/\s*$/)?.[0]||'')
}
