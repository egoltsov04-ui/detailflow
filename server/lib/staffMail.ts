export type StaffMailAction='invite'|'resend'|'recovery'
export function staffMailDecision(staff:{active:boolean;user_id:string|null;invite_email:string|null},action:StaffMailAction,requestedEmail:string,accountEmail?:string){
 if(!staff.active)throw new Error('Спочатку активуйте доступ майстра.')
 const saved=(accountEmail||staff.invite_email||'').trim().toLowerCase()
 if(staff.user_id&&requestedEmail&&requestedEmail!==saved)throw new Error('Для прив’язаного акаунта використовується його поточний email.')
 const email=staff.user_id?saved:(requestedEmail||saved)
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Вкажіть коректний email майстра.')
 if(action==='recovery'&&!staff.user_id)throw new Error('Спочатку надішліть запрошення майстру.')
 return {email,kind:staff.user_id?'recovery' as const:'invite' as const}
}
