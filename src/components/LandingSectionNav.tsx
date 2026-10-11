import {useEffect,useState} from 'react'
import {t} from '../i18n/core'
export default function LandingSectionNav(){
 const [sections,setSections]=useState<{id:string;label:string}[]>([]),[active,setActive]=useState('')
 useEffect(()=>{
  const nodes=[...document.querySelectorAll<HTMLElement>('.landing [data-nav-label]')]
  const scan=()=>setSections(nodes.map(n=>({id:n.id,label:n.dataset.navLabel||''})))
  scan();setActive(nodes[0]?.id||'')
  const labels=new MutationObserver(scan);nodes.forEach(n=>labels.observe(n,{attributes:true,attributeFilter:['data-nav-label']}))
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible[0])setActive(visible[0].target.id)},{rootMargin:'-15% 0px -55% 0px',threshold:0})
  nodes.forEach(n=>observer.observe(n));return()=>{observer.disconnect();labels.disconnect()}
 },[])
 function jump(id:string){const node=document.getElementById(id);if(!node)return;const header=document.querySelector('.lp-header')?.getBoundingClientRect().height||0;window.scrollTo({top:scrollY+node.getBoundingClientRect().top-header-16,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});setActive(id)}
 return <nav className="lp-section-nav" aria-label={t('Навігація по сторінці')}>{sections.map(s=><button key={s.id} aria-label={s.label} aria-current={active===s.id?'true':undefined} onClick={()=>jump(s.id)}><span className="lp-nav-label">{s.label}</span><i/></button>)}</nav>
}
