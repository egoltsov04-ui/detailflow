import {type Page} from '@playwright/test'
export const studio='10000000-0000-4000-8000-000000000001',owner='10000000-0000-4000-8000-000000000002',client='10000000-0000-4000-8000-000000000003',staff='10000000-0000-4000-8000-000000000004',order='10000000-0000-4000-8000-000000000005'
const now=new Date().toISOString(),today=now.slice(0,10)
export const clients=[{id:client,tenant_id:studio,full_name:'Тестовий клієнт',phone:'+380000000000',email:'test@example.com',notes:'Перед видачею зателефонувати',tags:['Постійний'],followup_enabled:true,vehicles:[{id:'vehicle',make:'Mercedes-Benz',model:'GLE',plate_number:'TEST 001',year:2023,notes:''}]}]
const member={id:staff,tenant_id:studio,user_id:owner,full_name:'Тестовий майстер',specialty:'Мийка та полірування',color:'#a7d65c',compensation_percent:30,hourly_rate:0,profile_completed_at:now,all_services:true,staff_services:[]}
const service={id:'service',name:'Комплексне полірування',price:1500,duration_minutes:120,active:true,category:'Полірування',description:'Відновлення блиску кузова',variants:[]}
const baseOrder={id:order,tenant_id:studio,client_id:client,clients:clients[0],staff_id:staff,staff_profiles:member,title:'Комплексне полірування',vehicle_label:'Mercedes-Benz GLE · TEST 001',service_summary:'Полірування кузова',status:'review',total:1500,deposit:500,created_at:now,status_changed_at:now,checklist:[],post_id:'post',started_at:now,planned_duration_minutes:120,appointment_id:'appointment'}
const job={id:'job',tenant_id:studio,work_order_id:order,staff_id:staff,service_id:'service',title:service.name,stage:'Виконання',position:0,status:'review',price:1500,pay_mode:'percent',rate:30,checklist:[{id:'check',title:'Кузов підготовлено',done:true}],attachments:[],note:'',review_note:'',worked_seconds:7200,running_since:null,version:1,created_at:now,updated_at:now,submitted_at:now}
export async function mockService(page:Page,role:'owner'|'master'|'super_admin'|'guest'='owner'){
 const calls:{name:string;body:any}[]=[]
 let orders=[baseOrder,{...baseOrder,id:'ready-order',appointment_id:null,status:'ready',vehicle_label:'BMW X5 · READY',post_id:null},{...baseOrder,id:'archived-order',appointment_id:null,status:'issued',vehicle_label:'Archived Volvo',status_changed_at:'2020-01-01',post_id:null}]
 let jobs=[job],cards=structuredClone(clients)
 await page.addInitScript(({owner,role})=>{localStorage.setItem('detailflow.locale','uk');if(role!=='guest'){const exp=Math.floor(Date.now()/1000)+36000;const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:owner,exp,role:'authenticated'}))+'.test-signature';localStorage.setItem('sb-stxfbarigoutglfqqhwi-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:exp,expires_in:36000,token_type:'bearer',user:{id:owner,email:'test@example.com',aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{provider:'email'},created_at:new Date().toISOString()}}))}}, {owner,role})
 await page.routeWebSocket(/supabase/,ws=>ws.close())
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());let data:any
 const respond=(body:any)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body),headers:{'access-control-allow-origin':'*'}})
 if(url.pathname==='/api/push/public-key')return respond({publicKey:null})
 if(url.pathname==='/api/public/booking')return respond({studio:{name:'Test Detailflow',address:'Київ',timezone:'Europe/Kyiv'},services:[service],staff:[member],schedules:Array.from({length:7},(_,weekday)=>({staff_id:staff,weekday,starts_at:'08:00',ends_at:'20:00'})),appointments:[]})
 if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return route.continue()
 if(!url.hostname.endsWith('.supabase.co'))return route.abort()
 if(url.pathname.startsWith('/auth/'))return respond({user:{id:owner,email:'test@example.com'}})
 const name=url.pathname.split('/').at(-1)!,body=req.postDataJSON();calls.push({name,body})
 if(url.pathname.includes('/rpc/')){
 switch(name){
 case 'resolve_my_access':data={role,tenant_id:studio,finance_access:role!=='master'};break
 case 'job_workflow_version':data=1;break
 case 'close_overdue_shifts':data=0;break
 case 'get_studio_orders':data=orders;break
 case 'get_team_profiles':data=[member];break
 case 'get_workflow_snapshot':data={can_view_finance:role!=='master',jobs,shifts:[{id:'shift',staff_id:staff,started_at:now,ended_at:null,paused_at:null,pause_seconds:0,breaks:[]}],earnings:[],events:[],payouts:[],services:[service]};break
 case 'get_studio_billing':data={subscription:{plan:'studio',status:'active',current_period_end:'2027-01-01',trial_ends_at:null,staff_limit:10},staff_count:1,orders:[]};break
 case 'studio_setup':data={completed:true};break
 case 'support_list_studios':data=[{id:studio,name:'Нова студія без підписки',slug:'test',timezone:'Europe/Kyiv',phone:'+380000000000',email:'qa@example.com',plan:null,status:null,staff_count:1,client_count:1}];break
 case 'staff_calendar':data={timezone:'Europe/Kyiv',schedules:[],appointments:[]};break
 case 'save_client_card':cards=cards.map(c=>({...c,full_name:body.card.name,tags:body.card.tags}));data=client;break
 case 'record_order_payment':orders=orders.map(o=>o.id===body.order_input?{...o,deposit:o.deposit+body.amount_input}:o);data=null;break
 case 'act_work_job':jobs=jobs.map(j=>({...j,status:body.action_input==='approve'?'approved':j.status}));data=null;break
 case 'create_manual_booking':data={id:'created-appointment',client_id:client};break
 default:data=[]
 }
 }else{
 switch(name){
 case 'tenants':data={id:studio,name:'Test Studio',slug:'test',address:'Київ',timezone:'Europe/Kyiv',phone:'+380000000000',shift_max_hours:16,break_max_minutes:120,shift_close_time:null};break
 case 'clients':data=cards;break
 case 'services':data=[service];break
 case 'staff_profiles':data=[member];break
 case 'appointments':data=[{id:'appointment',client_id:client,staff_id:staff,starts_at:today+'T09:00:00Z',ends_at:today+'T11:00:00Z',status:'confirmed',source:'admin',clients:clients[0],staff_profiles:member,appointment_services:[{service_name:service.name,unit_price:1500,duration_minutes:120}],receipts:[],vehicles:clients[0].vehicles[0]}];break
 case 'studio_posts':data=[{id:'post',studio_id:studio,name:'Пост 1',position:1}];break
 case 'inventory_items':data=[{id:'inventory',name:'Автошампунь для делікатного миття',unit:'л',quantity:10,min_quantity:2,last_unit_cost:100,selling_price:200}];break
 case 'inventory_movements':data=[{id:'movement',inventory_item_id:'inventory',movement_type:'purchase',quantity:10,unit_cost:100,note:'Поставка матеріалів',created_at:now,inventory_items:{name:'Автошампунь для делікатного миття',unit:'л'}}];break
 case 'cash_transactions':data=[{id:'cash',transaction_date:today,direction:'income',amount:500,payment_method:'cash',category:'Інші надходження',title:'Надходження коштів до каси студії',note:'Тестовий запис для перевірки переносу рядків',client_id:client,clients:clients[0]}];break
 case 'order_receipts':data=[{id:'receipt',number:17,work_order_id:'archived-order',created_at:now,subtotal:1500,discount:20,total:1480,snapshot:{studio:'Test Studio',address:'Київ, тестова адреса студії',phone:'+380000000000',client:'Тестовий клієнт',client_id:client,client_phone:'+380000000000',vehicle:'Archived Volvo',order:'Полірування',lines:[{name:'Комплексне полірування кузова та захисне покриття автомобіля',amount:1500,staff_id:staff}]}}];break
 case 'leads':data=[{id:'lead',client_id:client,clients:clients[0],title:'Полірування',phone:'+380000000000',source:'Instagram',status:'new',priority:'normal',created_at:now}];break
 case 'subscriptions':data={plan:'studio',status:'active',current_period_end:'2027-01-01'};break
 case 'reminder_settings':data={email_enabled:false};break
 default:data=[]
 }
 }
 return respond(data)
 })
 return calls
}
