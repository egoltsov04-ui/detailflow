import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {resolveBookingServices,bookingTotals,serviceOptionsError} from '../src/lib/bookingAvailability.ts'
const variants=[{id:'m',name:'M',price:600,duration_minutes:60,description:'Седан'},{id:'xl',name:'XL',price:1200,duration_minutes:120,description:'SUV'}]
const catalog=[{id:'wash',name:'Мийка',price:600,duration_minutes:60,variants},{id:'inside',name:'Салон',price:800,duration_minutes:60}]
test('variant selection keeps parent service ID with a price, time and title snapshot',()=>{
 const chosen=resolveBookingServices(catalog,['wash','inside'],{wash:'xl'})
 assert.equal(chosen[0].id,'wash');assert.equal(chosen[0].name,'Мийка · XL')
 assert.deepEqual(bookingTotals(chosen),{price:2000,duration:180})
 assert.throws(()=>resolveBookingServices(catalog,['wash']),/Оберіть варіант/)
 assert.throws(()=>resolveBookingServices(catalog,['wash'],{wash:'foreign'}),/Оберіть варіант/)
 assert.throws(()=>resolveBookingServices(catalog,['inside'],{inside:'xl'}),/недоступний/)
 assert.throws(()=>resolveBookingServices(catalog,['wash'],{wash:'m',other:'xl'}))
})
test('editor validates variant values, duplicate labels and descriptions',()=>{
 assert.equal(serviceOptionsError({description:'Двофазна мийка',variants}),'')
 for(const v of [{...variants[0],price:-1},{...variants[0],price:NaN},{...variants[0],price:1.111},{...variants[0],duration_minutes:1.5},{...variants[0],duration_minutes:0},{...variants[0],description:'a'.repeat(501)}])assert.ok(serviceOptionsError({description:'',variants:[v]}))
 assert.ok(serviceOptionsError({description:'',variants:[variants[0],{...variants[1],name:' m '}]}))
 assert.equal(serviceOptionsError({description:'',variants:[]}),'')
})
test('variant migration is repeatable, preserves old services and rejects malformed options',async t=>{
 const db=new PGlite();t.after(()=>db.close())
 await db.exec(`create table public.services(id text primary key,name text,price numeric,duration_minutes integer);insert into services values('old','Мийка',500,60);`)
 const sql=await readFile(new URL('../supabase/migrations/032_service_variants.sql',import.meta.url),'utf8')
 await db.exec(sql);await db.exec(sql)
 const old=(await db.query("select * from services where id='old'")).rows[0]
 assert.equal(Number(old.price),500);assert.deepEqual(old.variants,[]);assert.equal(old.description,'')
 await db.query("update services set description='Мийка кузова',variants=$1 where id='old'",[JSON.stringify(variants)])
 assert.deepEqual((await db.query('select variants from services')).rows[0].variants,variants)
 for(const invalid of [{},[{}],[{...variants[0],duration_minutes:0}],[{...variants[0],price:-2}],[variants[0],variants[0]]])await assert.rejects(db.query('update services set variants=$1',[JSON.stringify(invalid)]))
})
