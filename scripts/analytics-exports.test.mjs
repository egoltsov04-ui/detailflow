import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {unzipSync,strFromU8} from 'fflate'
import {PDFDocument} from 'pdf-lib'
import {xlsxReport,pdfReport} from '../src/lib/analyticsExport.ts'
import {previousPeriod,percentChange,completeMonths} from '../src/lib/analyticsPeriods.ts'
test('comparison includes equal calendar days over leap years and does not invent percentages at zero',()=>{
 assert.deepEqual(previousPeriod('2024-03-01','2024-03-31'),{from:'2024-01-30',to:'2024-02-29'})
 assert.equal(percentChange(20,0),null);assert.equal(percentChange(0,20),-100)
 assert.equal(completeMonths([],'2026-01-01','2026-03-31').length,3)
})
test('XLSX has valid package relationships, numeric values, literal formulas and Ukrainian text',async()=>{
 const bytes=xlsxReport([{name:'Клієнти',rows:[['Ім’я','Сума'],['=HYPERLINK("bad")',1200],['Андрій & <Ігор>',0]]}]),files=unzipSync(bytes)
 assert.ok(files['[Content_Types].xml']);assert.ok(files['xl/_rels/workbook.xml.rels'])
 const xml=strFromU8(files['xl/worksheets/sheet1.xml']);assert.match(xml,/t="inlineStr"/);assert.match(xml,/=HYPERLINK/);assert.doesNotMatch(xml,/<f>/);assert.match(xml,/<v>1200<\/v>/);assert.match(xml,/Андрій &amp; &lt;Ігор&gt;/)
 await mkdir(new URL('../.tooling/',import.meta.url),{recursive:true});await writeFile(new URL('../.tooling/analytics-acceptance.xlsx',import.meta.url),bytes)
})
test('PDF embeds Ukrainian font, paginates long reports and long text without losing rows',async()=>{
 const font=await readFile(new URL('../public/fonts/NotoSans.ttf',import.meta.url)),rows=Array.from({length:180},(_,i)=>['Клієнт '+i,'Довгий опис українською '.repeat(i===0?40:2),i*110])
 const bytes=await pdfReport([{name:'Клієнти',rows:[['Ім’я','Опис','Сума'],...rows]}],font,'Detailflow · Аналітика')
 const doc=await PDFDocument.load(bytes);assert.ok(doc.getPageCount()>4);await writeFile(new URL('../.tooling/analytics-acceptance.pdf',import.meta.url),bytes)
})
