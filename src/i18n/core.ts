import {messages} from './messages.ts'
export type Locale='uk'|'en'
export function getLocale():Locale{try{const value=globalThis.localStorage?.getItem('detailflow.locale');if(value&&value!=='uk'&&value!=='en')globalThis.localStorage?.setItem('detailflow.locale','uk');return value==='en'?'en':'uk'}catch{return 'uk'}}
export const localeTag=()=>({uk:'uk-UA',en:'en-GB'})[getLocale()]
export function t(text:string,locale:Locale=getLocale()):string{
 if(locale==='uk')return text
 const key=text.replace(/\s+/g,' ').trim(),pair=Object.prototype.hasOwnProperty.call(messages,key)?messages[key]:undefined
 if(!pair)return text
 const value=pair
 return (text.match(/^\s*/)?.[0]||'')+value+(text.match(/\s*$/)?.[0]||'')
}
