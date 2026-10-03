/** Accept an ID copied from Telegram without treating the rest of the message as a name. */
export function studioSearch(value:string):string {
 return value.match(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/i)?.[0].toLowerCase()||value.trim().slice(0,100)
}
export function accessEnd(row:{status:string|null;trial_ends_at:string|null;current_period_end:string|null}){
 return row.status==='trialing'?row.trial_ends_at:row.current_period_end
}
export function accessActive(row:{status:string|null;trial_ends_at:string|null;current_period_end:string|null},now=Date.now()){
 const end=accessEnd(row);return ['active','trialing'].includes(row.status||'')&&!!end&&Date.parse(end)>now
}
