// This request's email must not overwrite the shared CRM contact.
export function bookingEmail(notes:unknown,source:unknown,fallback:string|undefined):string|undefined {
  if(source!=='public'||typeof notes!=='string')return fallback
  const value=notes.split('\n')[0].replace(/^Email онлайн-запису: /,'').trim()
  return notes.startsWith('Email онлайн-запису: ')&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254?value:fallback
}
