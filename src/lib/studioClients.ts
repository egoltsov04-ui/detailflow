type ClientRow={id:string;full_name:string;phone:string|null;tags:string[]|null;notes:string|null;source:string|null;vehicles:{make:string|null;model:string|null;plate_number:string|null;notes:string|null}[]|null}
export function mapStudioClient(item:ClientRow){
 return {id:item.id,name:item.full_name,phone:item.phone||'Не вказано',car:item.vehicles?.map(car=>[car.make,car.model,car.plate_number].filter(Boolean).join(' ')||car.notes).filter(Boolean).join(', ')||'Авто не вказано',visits:0,total:0,tags:item.tags||[],notes:item.notes||'',source:item.source||''}
}
