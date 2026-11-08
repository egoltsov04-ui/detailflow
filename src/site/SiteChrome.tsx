import {useEffect,useRef,useState,type ReactNode} from 'react'
import {ArrowRight,Mail,Menu,MessageCircle,Send,X} from 'lucide-react'
import LanguageSwitcher from '../i18n/LanguageSwitcher'
import {t} from '../i18n/core'
import '../landing.css'
import './site.css'

const telegramName=(import.meta.env.VITE_BILLING_TELEGRAM||'detailflow').replace(/^https:\/\/t\.me\//,'').replace(/^@/,'')
export const contacts={
 email:'support.detailflow@gmail.com',
 telegram:`https://t.me/${telegramName}`,
 telegramName:'@'+telegramName,
 instagram:'https://www.instagram.com/detailflow.ua/',
 owner:'Гольцов Єгор Ілліч',
}

/** Instagram glyph in the same stroke style as the lucide icons (the library has no brand icons). */
function Instagram({size=18}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>}

export function ConnectButton({small=false}:{small?:boolean}){return <a className={'lp-button'+(small?' lp-button-small':'')} href="/register">{t('Підключити студію')}<ArrowRight size={18}/></a>}

/** Fades sections in as they scroll into view. Without JS or with reduced motion everything is visible at once. */
function useReveal(){
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return
  const root=document.documentElement;root.classList.add('site-reveal')
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:0.08})
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el))
  return()=>{io.disconnect();root.classList.remove('site-reveal')}
 },[])
}

/** Tilts an element a little towards the mouse. Off on touch screens and with reduced motion. */
export function useTilt<T extends HTMLElement>(){
 const ref=useRef<T>(null)
 useEffect(()=>{
  const el=ref.current
  if(!el||matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches)return
  let frame=0
  const move=(e:PointerEvent)=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(1200px) rotateX(${(-y*5).toFixed(2)}deg) rotateY(${(x*7).toFixed(2)}deg)`})}
  const leave=()=>{cancelAnimationFrame(frame);el.style.transform=''}
  el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave)
  return()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);cancelAnimationFrame(frame)}
 },[])
 return ref
}

const sections=[['features','Можливості'],['workflow','Як це працює'],['pricing','Тарифи'],['questions','Запитання']] as const

export function SiteHeader({home=false}:{home?:boolean}){
 const [menu,setMenu]=useState(false),[active,setActive]=useState(''),[scrolled,setScrolled]=useState(false)
 useEffect(()=>{const on=()=>setScrolled(scrollY>8);on();addEventListener('scroll',on,{passive:true});return()=>removeEventListener('scroll',on)},[])
 useEffect(()=>{
  if(!home||!('IntersectionObserver' in window))return
  // the hero has no menu item: reaching it clears the highlight
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)setActive(e.target.id==='hero'?'':e.target.id)}),{rootMargin:'-45% 0px -50% 0px'})
  ;['hero',...sections.map(([id])=>id)].forEach(id=>{const el=document.getElementById(id);if(el)io.observe(el)})
  return()=>io.disconnect()
 },[home])
 return <header className={'lp-header site-header'+(scrolled?' is-scrolled':'')}><div className="lp-wrap lp-header-inner"><a className="lp-brand" href="/" aria-label={t('Detailflow — головна')}><i/>detailflow</a><LanguageSwitcher/><button className="lp-menu-toggle" aria-label={t(menu?'Закрити меню':'Відкрити меню')} aria-expanded={menu} aria-controls="lp-nav" onClick={()=>setMenu(v=>!v)}>{menu?<X/>:<Menu/>}</button><nav id="lp-nav" className={'lp-nav'+(menu?' is-open':'')} aria-label={t('Головна навігація')} onClick={()=>setMenu(false)}>{sections.map(([id,label])=><a key={id} href={(home?'':'/')+'#'+id} aria-current={active===id?'true':undefined}>{t(label)}</a>)}<a href="/login">{t('Увійти')}</a><ConnectButton small/></nav></div></header>
}

export function SiteFooter(){
 return <footer className="site-footer"><div className="lp-wrap site-footer-grid">
  <div className="site-footer-brand"><a className="lp-brand" href="/"><i/>detailflow</a><p>{t('Робочий простір детейлінг-студії: запис, роботи, команда і фінанси в одному місці.')}</p><div className="site-socials"><a href={contacts.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18}/></a><a href={contacts.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram"><Send size={18}/></a><a href={'mailto:'+contacts.email} aria-label={t('Пошта')}><Mail size={18}/></a></div></div>
  <nav aria-label={t('Продукт')}><h2>{t('Продукт')}</h2><a href="/#features">{t('Можливості')}</a><a href="/#workflow">{t('Як це працює')}</a><a href="/#pricing">{t('Тарифи')}</a><a href="/#import">{t('Перенесення клієнтів')}</a></nav>
  <nav aria-label={t('Компанія')}><h2>{t('Компанія')}</h2><a href="/about">{t('Про нас')}</a><a href="/contacts">{t('Контакти')}</a><a href="/login">{t('Увійти')}</a></nav>
  <nav aria-label={t('Підтримка')}><h2>{t('Підтримка')}</h2><a href="/#questions">{t('Запитання')}</a><a href="/privacy">{t('Політика конфіденційності')}</a><a href="/terms">{t('Умови користування')}</a><a href="/refund">{t('Обмін і повернення')}</a></nav>
 </div><div className="lp-wrap site-footer-bottom"><span>© 2026 Detailflow. {t('Усі права захищені.')}</span><span>{t(contacts.owner)} · <a href={'mailto:'+contacts.email}>{contacts.email}</a></span></div></footer>
}

export function SupportBubble(){
 const [open,setOpen]=useState(false)
 useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[open])
 return <div className="support-bubble">{open&&<div className="support-bubble-card" role="dialog" aria-label={t('Підтримка')}><b>{t('Є питання? Напишіть нам')}</b><p>{t('Пн–Пт 9:00–21:00, Сб–Нд 10:00–20:00 (за Києвом)')}</p><a className="lp-button lp-button-small" href={contacts.telegram} target="_blank" rel="noopener noreferrer"><Send size={16}/>{t('Написати в Telegram')}</a><a className="site-bubble-link" href={'mailto:'+contacts.email}><Mail size={16}/>{contacts.email}</a></div>}<button className="support-bubble-button" aria-expanded={open} aria-label={t(open?'Закрити підтримку':'Підтримка')} onClick={()=>setOpen(v=>!v)}>{open?<X size={22}/>:<MessageCircle size={22}/>}</button></div>
}

export function SiteShell({home=false,children}:{home?:boolean;children:ReactNode}){
 useReveal()
 return <div className="landing site"><a className="lp-skip" href="#lp-main">{t('Перейти до вмісту')}</a><SiteHeader home={home}/><main id="lp-main">{children}</main><SiteFooter/><SupportBubble/></div>
}
