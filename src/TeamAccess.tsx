import { useEffect, useState } from 'react'
import { Ban, CheckCircle2 } from 'lucide-react'
import { supabase } from './lib/supabase'

type Member={id:string;name:string;specialty:string;active:boolean;userId:string|null}

export default function TeamAccess(){
  const [members,setMembers]=useState<Member[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState<string|null>(null)
  useEffect(()=>{if(!supabase)return;void (async()=>{const membership=await supabase.from('tenant_memberships').select('tenant_id').limit(1).maybeSingle();if(!membership.data)return;const {data,error}=await supabase.from('staff_profiles').select('id,full_name,specialty,active,user_id').eq('tenant_id',membership.data.tenant_id).order('full_name');if(error){setMessage('Не вдалося завантажити доступи.');return}setMembers((data||[]).map(row=>({id:row.id,name:row.full_name,specialty:row.specialty||'Майстер',active:row.active,userId:row.user_id})))})()},[])
  async function toggle(member:Member){if(!supabase)return;setBusy(member.id);const active=!member.active;const {error}=await supabase.from('staff_profiles').update({active}).eq('id',member.id);setBusy(null);if(error){setMessage('Не вдалося змінити доступ.');return}setMembers(list=>list.map(item=>item.id===member.id?{...item,active}:item));setMessage(active?'Доступ майстра активовано.':'Доступ майстра заблоковано.')}
  if(!members.length)return null
  return <section className="content team-access"><div className="page-title"><div><p>Адміністрування</p><h1>Доступ до кабінету майстра</h1></div></div>{message&&<p className="task-message" role="status">{message}</p>}<div className="access-list">{members.map(member=><article className="panel access-row" key={member.id}><div><b>{member.name}</b><small>{member.specialty}</small></div><span className={member.active?'access-state':'access-state blocked'}>{member.active?(member.userId?'Акаунт активний':'Запрошення очікує реєстрації'):'Доступ заблоковано'}</span><button className={member.active?'danger-btn':'primary'} disabled={busy===member.id} onClick={()=>void toggle(member)}>{member.active?<><Ban size={16}/> Заблокувати</>:<><CheckCircle2 size={16}/> Активувати</>}</button></article>)}</div></section>
}
