import { Component, ReactNode, useEffect, useState } from 'react'

type Request={message:string;confirm:boolean;resolve:(answer:boolean)=>void}
let receiver:((request:Request)=>void)|null=null
export function confirmAction(message:string):Promise<boolean>{return new Promise(resolve=>receiver?receiver({message,confirm:true,resolve}):resolve(false))}
export function showNotice(message:string):void{receiver?.({message,confirm:false,resolve:()=>{}})}

export function Dialogs(){
 const [queue,setQueue]=useState<Request[]>([]),active=queue[0]
 useEffect(()=>{receiver=request=>setQueue(q=>[...q,request]);return()=>{receiver=null}},[])
 function close(answer:boolean){active.resolve(answer);setQueue(q=>q.slice(1))}
 return active?<div className="overlay app-confirm"><div className="modal"><h2>{active.confirm?'Підтвердьте дію':'Повідомлення'}</h2><p>{active.message}</p><div className="dialog-actions">{active.confirm&&<button className="text-btn modal-close-action" onClick={()=>close(false)}>Скасувати</button>}<button className="primary" onClick={()=>close(true)}>{active.confirm?'Підтвердити':'Зрозуміло'}</button></div></div></div>:null
}

// Shared keyboard behavior for the existing modal forms, without changing their data flows.
export function ModalAccessibility(){
 useEffect(()=>{
  let current:HTMLElement|null=null,previous:HTMLElement|null=null,overflow=''
  const selector='button:not(:disabled), input:not(:disabled):not([aria-hidden="true"]), select:not(:disabled):not([aria-hidden="true"]), textarea:not(:disabled), [tabindex="0"]'
  const update=()=>{const modals=document.querySelectorAll<HTMLElement>('.overlay .modal'),next=modals[modals.length-1]||null;if(current===next)return
   if(!current&&next){previous=document.activeElement as HTMLElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden'}
   current=next
   if(next){next.setAttribute('role','dialog');next.setAttribute('aria-modal','true');next.setAttribute('aria-label',next.querySelector('h2')?.textContent||'Форма');const close=next.querySelector('.modal-close');if(close&&!close.getAttribute('aria-label'))close.setAttribute('aria-label','Закрити вікно');const initial=next.querySelector<HTMLElement>('input:not(:disabled):not([aria-hidden="true"]),button[role="combobox"]:not(:disabled),select:not(:disabled):not([aria-hidden="true"])')||next.querySelector<HTMLElement>('.modal-close-action,button');initial?.focus()}
   else{document.body.style.overflow=overflow;previous?.isConnected&&previous.focus()}
  }
  const keys=(e:KeyboardEvent)=>{if(e.defaultPrevented||!current||document.querySelector('.date-popover,.select-popover'))return
   if(e.key==='Escape'){const close=current.querySelector<HTMLElement>('.modal-close,.modal-close-action');if(close){e.preventDefault();close.click()}}
   if(e.key==='Tab'){const nodes=Array.from(current.querySelectorAll<HTMLElement>(selector)).filter(node=>node.getClientRects().length),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
  }
  const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',keys);update()
  return()=>{observer.disconnect();document.removeEventListener('keydown',keys);if(current)document.body.style.overflow=overflow}
 },[])
 return null
}
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="access-portal"><section className="panel access-form"><h1>Не вдалося відкрити сторінку</h1><p>Оновіть сторінку. Якщо проблема повториться — зверніться до підтримки.</p><button className="primary" onClick={()=>window.location.reload()}>Оновити</button></section></main>:this.props.children}
}
