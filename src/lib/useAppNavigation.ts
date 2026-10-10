import {useEffect,useState,useRef,useCallback,type Dispatch,type SetStateAction} from 'react'
import {pages,legacyRoutes,pageFromUrl,canonicalPage,sectionFor} from './navigation'
export function useAppNavigation(){
 const [page,setCurrent]=useState(()=>pageFromUrl(location.pathname,location.search)),[search,setSearch]=useState(location.search)
 const current=useRef({page,search});current.current={page,search}
 useEffect(()=>{const pop=()=>{const page=pageFromUrl(location.pathname,location.search);current.current={page,search:location.search};setCurrent(page);setSearch(location.search)};addEventListener('popstate',pop);return()=>removeEventListener('popstate',pop)},[])
 const navigate=useCallback((next:string,filters?:Record<string,string>)=>{
  const resolved=canonicalPage(next),previous=current.current,q=new URLSearchParams(filters||(sectionFor(resolved)==='work'&&sectionFor(previous.page)==='work'?previous.search:''));q.delete('page');q.delete('payment')
  const url=pages[resolved];if(!url)return
  const search=q.size?'?'+q.toString():''
  if(location.pathname+location.search!==url+search)history.pushState({},'',url+search)
  current.current={page:resolved,search};setCurrent(resolved);setSearch(search);if(resolved!==previous.page)window.scrollTo(0,0)
 },[])
 const setPage:Dispatch<SetStateAction<string>>=useCallback(value=>{const prev=current.current.page,next=typeof value==='function'?value(prev):value;if(next!==prev)navigate(next)},[navigate])
 useEffect(()=>{if(new URLSearchParams(location.search).has('page')||location.pathname.startsWith('/app')||!!legacyRoutes[location.pathname]||Object.values(pages).includes(location.pathname)){
  const q=new URLSearchParams(location.search);q.delete('page');const url=pages[page];if(url&&location.pathname!==url)history.replaceState({},'',url+(q.size?'?'+q.toString():'')+location.hash)
 }},[page])
 return {page,setPage,navigate,filters:new URLSearchParams(search)}
}
