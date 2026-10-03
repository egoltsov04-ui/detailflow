import {t,getLocale} from './i18n/core'
import { StrictMode, lazy, Suspense, useEffect, useState } from 'react'
import {supabase} from './lib/supabase'
import {observeSession} from './lib/session'
import { createRoot } from 'react-dom/client'
import './styles.css'
import PwaControls from './components/PwaControls'
import { Dialogs, ErrorBoundary, ModalAccessibility } from './components/Dialogs'
import './ux-polish.css'
import { entryRoute } from './lib/entryRoute'

document.documentElement.lang=getLocale()
const LandingPage = lazy(() => import('./LandingPage'))
const App = lazy(() => import('./App'))
const isLanding = entryRoute(window.location.pathname, window.location.search, window.location.hash) === 'landing'

function SessionEntry(){
 const [state,setState]=useState<'checking'|'guest'|'signed-in'>(supabase?'checking':'guest')
 useEffect(()=>{
  if(!supabase)return
  return observeSession(supabase.auth,session=>setState(session?'signed-in':'guest'))
 },[])
 if(state==='checking')return <main className="access-portal" role="status">{t('Відновлюємо вхід…')}</main>
 return state==='signed-in'?<App/>:<LandingPage/>
}

const Preview=import.meta.env.DEV?(window.location.pathname==='/__qa/booking'?lazy(()=>import('./dev/PublicBookingPreview')):window.location.pathname==='/__qa'?lazy(()=>import('./dev/ServicePreview')):null):null
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><Suspense fallback={<main className="access-portal">{t("Завантаження Detailflow…")}</main>}>{Preview?<Preview/>:isLanding?<SessionEntry/>:<App/>}</Suspense><PwaControls/><Dialogs/><ModalAccessibility/></ErrorBoundary></StrictMode>)
