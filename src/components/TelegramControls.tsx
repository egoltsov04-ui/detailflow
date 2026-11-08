import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
import {t} from '../i18n/core'

/** Work notifications in Telegram: a one-time link opens the bot, «Start» there links this account. Hidden until the server has a bot. */
export default function TelegramControls(){
 const [bot,setBot]=useState<string|null>(null),[linked,setLinked]=useState(false),[link,setLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function check(){if(!supabase)return;const r=await supabase.rpc('my_telegram_linked');if(!r.error){setLinked(!!r.data);if(r.data)setLink('')}}
 useEffect(()=>{let live=true;void fetch('/api/telegram').then(r=>r.json()).then(data=>{if(live&&typeof data.bot==='string'){setBot(data.bot);void check()}}).catch(()=>{});return()=>{live=false}},[])
 // Back from Telegram after «Start»: show the new state without a reload.
 useEffect(()=>{if(!link)return;const on=()=>{if(document.visibilityState==='visible')void check()};document.addEventListener('visibilitychange',on);return()=>document.removeEventListener('visibilitychange',on)},[link])
 async function run(action:'link'|'unlink'){if(!supabase||busy)return;setBusy(true);setError('')
  const r=action==='link'?await supabase.rpc('create_my_telegram_link'):await supabase.rpc('unlink_my_telegram')
  setBusy(false);if(r.error){setError(t('Не вдалося змінити Telegram. Спробуйте ще раз.'));return}
  if(action==='link')setLink(`https://t.me/${bot}?start=${r.data}`);else setLinked(false)
 }
 if(!bot)return null
 return <span className="telegram-controls"><b>Telegram</b>{linked?<><span>{t('Підключено: робочі сповіщення приходять у Telegram.')}</span><button className="secondary" disabled={busy} onClick={()=>void run('unlink')}>{t('Відключити Telegram')}</button></>:link?<><a className="primary" href={link} target="_blank" rel="noopener noreferrer">{t('Відкрити бота')}</a><span>{t('У боті натисніть «Start». Посилання діє 15 хвилин.')}</span></>:<button className="secondary" disabled={busy} onClick={()=>void run('link')}>{t('Підключити Telegram')}</button>}{error&&<span role="alert">{error}</span>}</span>
}
