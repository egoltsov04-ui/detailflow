// Where a visitor came from: the UTM marks of the first visit (and the referring site) are kept in the browser
// until registration, so they survive browsing between pages. Sent with the studio application.
const KEY='df_utm',MARKS=['source','medium','campaign','content','term'] as const
export function captureUtm(){
 try{
  if(localStorage.getItem(KEY))return
  const params=new URLSearchParams(location.search),utm:Record<string,string>={}
  for(const k of MARKS){const v=params.get('utm_'+k)?.trim();if(v)utm[k]=v.slice(0,100)}
  const ref=document.referrer&&new URL(document.referrer).hostname
  if(ref&&ref!==location.hostname)utm.referrer=ref.slice(0,100)
  if(Object.keys(utm).length)localStorage.setItem(KEY,JSON.stringify(utm))
 }catch{/* storage unavailable: no marks */}
}
export function savedUtm():Record<string,string>|undefined{try{const v=localStorage.getItem(KEY);return v?JSON.parse(v):undefined}catch{return undefined}}
